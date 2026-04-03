/**
 * f36-winback-escalate-hitl.ts — Worker F36: Winback HITL Escalation (Plan §X FAZA 9f)
 *
 * Queue: winback:escalate:hitl (REDIS_DB_E5=5)
 * Timeout: 30s
 * Concurrency: 10
 *
 * Responsabilitate:
 *   - Escalare campanie winback la HITL pentru revenue > 10K (SALES_MANAGER)
 *   - Pune campania în PAUSED + requiresHitl=true
 *   - Enqueue hitl:winback:review cu payload complet pentru revizie manuală
 *
 * Anti-halucin. FAZA 9f:
 *   (E) HITL OBLIGATORIU pentru totalRevenue > 10_000
 *   (F) approverRole 'SALES_MANAGER' la >10K, 'AUTO' altfel
 *   (G) Guard: dacă status = 'PAUSED' → skip (deja escalat)
 */

import type { Job, Worker } from "bullmq";
import { db, goldWinbackCampaigns, eq, and, setSessionTenantId } from "@cerniq/db";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface WinbackEscalateHitlJobData {
  tenantId: string;
  campaignId: string;
  clientId: string;
  totalRevenue: number;
  churnReason?: string;
  proposedStrategy: "PERSONAL_CALL" | "DISCOUNT" | "PRODUCT_UPDATE";
  correlationId?: string;
}

export interface WinbackEscalateHitlResult {
  ok: boolean;
  campaignId: string;
  hitlEnqueued: boolean;
  approverRole: "SALES_MANAGER" | "AUTO";
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createWinbackEscalateHitlWorker(): Worker {
  const hitlQueue = createQueue(QUEUES.E5_HITL_WINBACK_REVIEW, { db: 5 });

  const { worker } = createWorker<WinbackEscalateHitlJobData>(
    QUEUES.E5_WINBACK_ESCALATE_HITL,
    async (job: Job<WinbackEscalateHitlJobData>): Promise<WinbackEscalateHitlResult> => {
      return withCognitiveSpan("e5:winback:escalate-hitl", async () => {
        const { tenantId, campaignId, clientId, totalRevenue, churnReason, proposedStrategy } =
          job.data;

        // ── 1. Set tenant context ──────────────────────────────────────────
        await setSessionTenantId(tenantId);

        job.log(
          `[F36] Escalating winback to HITL: campaignId=${campaignId}, ` +
            `clientId=${clientId}, revenue=${totalRevenue}`,
        );

        // ── 2. SELECT campanie winback ─────────────────────────────────────
        const campaigns = await db
          .select({
            id: goldWinbackCampaigns.id,
            status: goldWinbackCampaigns.status,
          })
          .from(goldWinbackCampaigns)
          .where(
            and(
              eq(goldWinbackCampaigns.id, campaignId),
              eq(goldWinbackCampaigns.tenantId, tenantId),
            ),
          )
          .limit(1);

        if (campaigns.length === 0) {
          throw new Error(`[F36] Campaign not found: ${campaignId}`);
        }

        const { status } = campaigns[0];

        // ── 3. GUARD: deja escalat ─────────────────────────────────────────
        if (status === "PAUSED") {
          job.log(`[F36] Campaign already PAUSED (already escalated): ${campaignId}`);
          const approverRole: "SALES_MANAGER" | "AUTO" =
            totalRevenue > 10_000 ? "SALES_MANAGER" : "AUTO";
          return { ok: true, campaignId, hitlEnqueued: false, approverRole };
        }

        // ── 4. UPDATE status → PAUSED + requiresHitl=true ─────────────────
        await db
          .update(goldWinbackCampaigns)
          .set({
            status: "PAUSED",
            requiresHitl: true,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(goldWinbackCampaigns.id, campaignId),
              eq(goldWinbackCampaigns.tenantId, tenantId),
            ),
          );

        // ── 5. Construiește HITL task payload ──────────────────────────────
        const approverRole: "SALES_MANAGER" | "AUTO" =
          totalRevenue > 10_000 ? "SALES_MANAGER" : "AUTO";

        const hitlPayload = {
          tenantId,
          campaignId,
          clientId,
          totalRevenue,
          churnReason: churnReason ?? "UNKNOWN",
          proposedStrategy,
          approverRole,
          createdAt: new Date().toISOString(),
        };

        // ── 6. Enqueue hitl:winback:review ──────────────────────────────────
        await hitlQueue.add("hitl-winback-review", hitlPayload, {
          jobId: `hitl-winback-${campaignId}-${Date.now()}`,
        });

        // ── 7. Log info ────────────────────────────────────────────────────
        job.log(
          `[F36] HITL enqueued: campaignId=${campaignId}, approverRole=${approverRole}, ` +
            `revenue=${totalRevenue}, strategy=${proposedStrategy}`,
        );

        return { ok: true, campaignId, hitlEnqueued: true, approverRole };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 10,
    },
  );

  return worker;
}
