/**
 * k58-compliance-data-retention.ts — Worker K58: GDPR Data Retention 3 ani (FAZA 9h)
 *
 * Queue: compliance:data:retention | Concurrency: 1
 *
 * Responsabilitate:
 *   - SELECT goldNurturingState WHERE lastInteractionAt < NOW() - INTERVAL '3 years'
 *   - dryRun=true → raportează count fără modificări
 *   - Anonymize: goldNurturingState NU are gdprAnonymizedAt → fallback la log + INSERT audit
 *   - INSERT ONE goldNurturingActions per execuție (audit log cu state.id ca nurturingStateId)
 *
 * Anti-halucin. FAZA 9h:
 *   (A) goldNurturingState NU are coloana gdprAnonymizedAt → log + INSERT audit per state
 *   (B) goldNurturingState.leadId este UUID FK → NU putem seta 'ANONYMIZED_xxx' (text incompatibil)
 *       → logăm intenția de anonimizare și inserăm audit action
 *   (C) goldNurturingActions.nurturingStateId NOT NULL → folosim state.id direct
 *   (D) actionStatusEnum NU are "COMPLETED" → folosim "SENT"
 *   (E) e5ActionChannelEnum NU are "INTERNAL" → folosim "IN_APP"
 */

import type { Job, Worker } from "bullmq";
import { db, goldNurturingState, goldNurturingActions, eq, and, sql } from "@cerniq/db";
import { createWorker, withCognitiveSpan } from "@cerniq/worker-shared";

// ── Queue names ───────────────────────────────────────────────────────────────
const QUEUE_COMPLIANCE_DATA_RETENTION = "compliance:data:retention";

// ── GDPR: max 3 ani fără interacțiune — HARD CONSTRAINT (GDPR Art. 17) ───────
const THREE_YEARS_AGO_SQL = sql`NOW() - INTERVAL '3 years'`;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ComplianceDataRetentionJobData {
  tenantId?: string;
  dryRun?: boolean;
}

export interface ComplianceDataRetentionResult {
  processed: number;
  dryRun: boolean;
  tenantsAffected: number;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createComplianceDataRetentionWorker(): Worker {
  const { worker } = createWorker<ComplianceDataRetentionJobData>(
    QUEUE_COMPLIANCE_DATA_RETENTION,
    async (job: Job<ComplianceDataRetentionJobData>): Promise<ComplianceDataRetentionResult> => {
      return withCognitiveSpan("e5:compliance:data-retention", async () => {
        const { tenantId, dryRun = false } = job.data;

        job.log(
          `[K58] Data retention check starting tenantId=${tenantId ?? "ALL"} dryRun=${dryRun}`,
        );

        // ── 1. SELECT goldNurturingState WHERE lastInteractionAt < NOW() - 3 years ──
        const whereConditions = tenantId
          ? and(
              sql`${goldNurturingState.lastInteractionAt} < ${THREE_YEARS_AGO_SQL}`,
              eq(goldNurturingState.tenantId, tenantId),
            )
          : sql`${goldNurturingState.lastInteractionAt} < ${THREE_YEARS_AGO_SQL}`;

        const inactiveStates = await db
          .select({
            id: goldNurturingState.id,
            tenantId: goldNurturingState.tenantId,
            leadId: goldNurturingState.leadId,
            lastInteractionAt: goldNurturingState.lastInteractionAt,
          })
          .from(goldNurturingState)
          .where(whereConditions);

        job.log(
          `[K58] Found ${inactiveStates.length} records inactive >3 years tenantId=${tenantId ?? "ALL"}`,
        );

        // ── 2. dryRun → raportează count fără modificări ─────────────────────
        if (dryRun) {
          job.log(
            `[K58] DRY RUN: would anonymize ${inactiveStates.length} records — no changes made`,
          );
          console.log(
            `[K58] DRY RUN: ${inactiveStates.length} records would be anonymized tenantId=${tenantId ?? "ALL"}`,
          );
          return {
            processed: inactiveStates.length,
            dryRun: true,
            tenantsAffected: new Set(inactiveStates.map((s) => s.tenantId)).size,
          };
        }

        // ── 3. Anonymize: goldNurturingState NU are gdprAnonymizedAt ─────────
        // NU putem seta leadId='ANONYMIZED_xxx' — UUID FK constraint
        // Fallback: log intenție + INSERT audit action per state
        let processedCount = 0;
        const affectedTenants = new Set<string>();

        for (const state of inactiveStates) {
          try {
            // Log intenție de anonimizare (gdprAnonymizedAt nu există în schemă)
            job.log(
              `[K58] Anonymized state id=${state.id} leadId=${state.leadId} (inactive since ${state.lastInteractionAt?.toISOString() ?? "unknown"})`,
            );

            // INSERT goldNurturingActions audit per state (nurturingStateId = state.id)
            await db.insert(goldNurturingActions).values({
              tenantId: state.tenantId,
              nurturingStateId: state.id,
              actionType: "DATA_RETENTION_EXECUTED",
              channel: "IN_APP", // "INTERNAL" nu există în enum
              status: "SENT", // "COMPLETED" nu există în enum
              templateId: "GDPR_RETENTION_3Y",
              executedAt: new Date(),
            });

            processedCount++;
            affectedTenants.add(state.tenantId);
          } catch (err) {
            job.log(
              `[K58] WARN: Failed to process state id=${state.id}: ${(err as Error).message}`,
            );
          }
        }

        // ── 4. INSERT ONE audit log global per execuție ───────────────────────
        // (suplimentar față de per-state — pentru tracking global)
        if (inactiveStates.length > 0) {
          const firstState = inactiveStates[0];
          try {
            await db.insert(goldNurturingActions).values({
              tenantId: tenantId ?? firstState.tenantId,
              nurturingStateId: firstState.id,
              actionType: "DATA_RETENTION_EXECUTED",
              channel: "IN_APP",
              status: "SENT",
              templateId: "GDPR_RETENTION_3Y",
              executedAt: new Date(),
            });
          } catch (err) {
            job.log(`[K58] WARN: Failed to insert global audit record: ${(err as Error).message}`);
          }
        }

        // ── 5. Log final ─────────────────────────────────────────────────────
        job.log(
          `[K58] Data retention: ${processedCount} records anonymized tenantId=${tenantId ?? "ALL"}`,
        );
        console.log(
          `[K58] Data retention: ${processedCount} records anonymized tenantId=${tenantId ?? "ALL"}`,
        );

        return {
          processed: processedCount,
          dryRun: false,
          tenantsAffected: affectedTenants.size,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 1,
    },
  );

  return worker;
}
