/**
 * J46 — audit:chain:verify
 *
 * Responsabilitate (Plan FAZA 8g §IX J46, ADR-0095):
 * Cron `0 6 * * *` (zilnic la 6:00) — verificare integritate hash chain audit per tenant.
 *
 * Logica:
 * 1. SELECT toți tenants activi
 * 2. Per tenant: SELECT entries ORDER BY createdAt ASC
 * 3. Verifică lanțul: recalculează hash pentru fiecare entry
 *    și compară cu prevHash din entry-ul următor
 * 4. Dacă MISMATCH → CRITICAL alert AuditChainIntegrity (Plan L2167)
 *    + update gauge e4AuditChainIntegrityGauge = 0
 * 5. Dacă OK → gauge = 1
 *
 * ANTI-HALUCINARE:
 * - Gauge: 1=OK, 0=BROKEN (Plan L2167)
 * - Cron EXACT: 0 6 * * * (Plan L2133)
 * - NU modifică entries — verificare read-only
 */
import type { Processor } from "bullmq";
import { db, goldAuditLogsEtapa4, setSessionTenantId, sql } from "@cerniq/db";
import { withCognitiveSpan, createQueue, QUEUES } from "@cerniq/worker-shared";
import { computeAuditHash, GENESIS_HASH } from "../lib/audit-chain.js";
import { e4AuditChainIntegrityGauge } from "../e4-metrics.js";

export type AuditChainVerifyJobData = {
  tenantId: string;
  correlationId?: string;
};

export type AuditChainVerifyResult = {
  ok: true;
  tenantId: string;
  totalEntries: number;
  valid: boolean;
  firstBrokenIndex?: number;
};

export const auditChainVerifyProcessor: Processor<AuditChainVerifyJobData> = async (
  job,
): Promise<AuditChainVerifyResult> => {
  return withCognitiveSpan(
    "e4:audit:chain:verify",
    async (_span) => {
      const { tenantId } = job.data;
      await setSessionTenantId(tenantId);

      // ── 1. SELECT toate entries pentru tenant ORDER BY createdAt ASC ──────
      const entries = await db
        .select({
          id: goldAuditLogsEtapa4.id,
          eventType: goldAuditLogsEtapa4.eventType,
          entityId: goldAuditLogsEtapa4.entityId,
          createdAt: goldAuditLogsEtapa4.createdAt,
          prevHash: goldAuditLogsEtapa4.prevHash,
        })
        .from(goldAuditLogsEtapa4)
        .where(sql`${goldAuditLogsEtapa4.tenantId} = ${tenantId}`)
        .orderBy(goldAuditLogsEtapa4.createdAt);

      if (entries.length === 0) {
        job.log(`[J46] Niciun entry audit pentru tenant=${tenantId} — lanț valid (gol)`);
        e4AuditChainIntegrityGauge.set({ tenant_id: tenantId }, 1);
        return { ok: true, tenantId, totalEntries: 0, valid: true };
      }

      // ── 2. Verifică integritatea lanțului ─────────────────────────────────
      let valid = true;
      let firstBrokenIndex: number | undefined;

      for (let i = 0; i < entries.length - 1; i++) {
        const current = entries[i];
        const next = entries[i + 1];

        const expectedNextPrevHash = computeAuditHash({
          id: current.id,
          eventType: current.eventType,
          entityId: current.entityId,
          createdAt: current.createdAt,
          prevHash: current.prevHash ?? GENESIS_HASH,
        });

        if (next.prevHash !== expectedNextPrevHash) {
          valid = false;
          firstBrokenIndex = i + 1;
          job.log(
            `[J46] CHAIN BROKEN la index=${i + 1}: entry=${next.id} ` +
              `expected prevHash=${expectedNextPrevHash.slice(0, 16)}... ` +
              `actual prevHash=${(next.prevHash ?? "NULL").slice(0, 16)}...`,
          );
          break;
        }
      }

      // ── 3. Actualizează gauge + alert dacă lanțul este rupt ───────────────
      if (valid) {
        e4AuditChainIntegrityGauge.set({ tenant_id: tenantId }, 1);
        job.log(`[J46] Lanț audit VALID: tenant=${tenantId} entries=${entries.length}`);
      } else {
        e4AuditChainIntegrityGauge.set({ tenant_id: tenantId }, 0);
        job.log(
          `[J46] CRITICAL: Lanț audit RUPT la index=${firstBrokenIndex} pentru tenant=${tenantId}`,
        );

        // Enqueue alertă CRITICAL AuditChainIntegrity (Plan L2167)
        const alertQueue = createQueue(QUEUES.E4_AUDIT_LOG_WRITE);
        try {
          await alertQueue.add(
            "audit-chain-integrity-alert",
            {
              tenantId,
              eventType: "AUDIT_CHAIN_INTEGRITY_BREACH",
              entityType: "gold_audit_logs_etapa4",
              entityId: tenantId,
              actorType: "CRON",
              newValues: {
                severity: "CRITICAL",
                alert: "AuditChainIntegrity",
                firstBrokenIndex,
                totalEntries: entries.length,
                message: `CRITICAL: Lanțul de audit al tenant ${tenantId} este compromis la entry index ${firstBrokenIndex}.`,
              },
            },
            { removeOnComplete: true },
          );
        } finally {
          await alertQueue.close();
        }
      }

      return {
        ok: true,
        tenantId,
        totalEntries: entries.length,
        valid,
        firstBrokenIndex,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
