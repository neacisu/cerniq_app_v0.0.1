/**
 * f32-winback-campaign-create.ts — Worker F32: Winback Campaign Create (FAZA 9f)
 *
 * Queue: winback:campaign:create (REDIS_DB_E5=5)
 * Timeout: 60s
 * Concurrency: 5
 *
 * Responsabilitate:
 *   - Citește totalRevenue din gold_nurturing_state
 *   - Determină strategia campaniei (PERSONAL_CALL / DISCOUNT / PRODUCT_UPDATE)
 *   - Inserează gold_winback_campaigns cu steps și status='DRAFT' → ACTIVE
 *   - Enqueue F33 (winback:step:execute) sau F36 (winback:escalate:hitl)
 *
 * Thresholds:
 *   Revenue > 10_000 RON → PERSONAL_CALL, 15% discount, requiresHitl=true
 *   Revenue > 5_000 RON  → DISCOUNT, 10% discount
 *   Rest                 → PRODUCT_UPDATE, 0% discount
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldWinbackCampaigns,
  goldNurturingState,
  eq,
  and,
  setSessionTenantId,
} from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface WinbackCampaignCreateJobData {
  tenantId: string;
  clientId: string;
  churnReason?: string;
  correlationId?: string;
}

export interface WinbackCampaignCreateResult {
  ok: boolean;
  campaignId?: string;
  strategy: "PERSONAL_CALL" | "DISCOUNT" | "PRODUCT_UPDATE";
  requiresHitl: boolean;
  stepsCount: number;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createWinbackCampaignCreateWorker(): Worker {
  const stepExecuteQueue = createQueue("winback:step:execute", { db: 5 });
  const escalateHitlQueue = createQueue("winback:escalate:hitl", { db: 5 });

  const { worker } = createWorker<WinbackCampaignCreateJobData>(
    "winback:campaign:create",
    async (job: Job<WinbackCampaignCreateJobData>): Promise<WinbackCampaignCreateResult> => {
      return withCognitiveSpan("e5:winback:campaign-create", async () => {
        const { tenantId, clientId, churnReason } = job.data;

        await setSessionTenantId(tenantId);

        job.log(`[F32] Winback campaign create: clientId=${clientId}, tenantId=${tenantId}`);

        // ── 1. SELECT goldNurturingState pentru totalRevenue ───────────────
        const nurturingRows = await db
          .select({
            totalRevenue: goldNurturingState.totalRevenue,
          })
          .from(goldNurturingState)
          .where(
            and(eq(goldNurturingState.tenantId, tenantId), eq(goldNurturingState.leadId, clientId)),
          )
          .limit(1);

        const totalRevenue = nurturingRows.length > 0 ? Number(nurturingRows[0].totalRevenue) : 0;

        job.log(`[F32] totalRevenue=${totalRevenue} RON for clientId=${clientId}`);

        // ── 2. Determină strategia pe baza thresholds exacte ─────────────
        let strategy: "PERSONAL_CALL" | "DISCOUNT" | "PRODUCT_UPDATE";
        let offerValue: number;
        let requiresHitl: boolean;

        if (totalRevenue > 10_000) {
          strategy = "PERSONAL_CALL";
          offerValue = 15;
          requiresHitl = true;
        } else if (totalRevenue > 5_000) {
          strategy = "DISCOUNT";
          offerValue = 10;
          requiresHitl = false;
        } else {
          strategy = "PRODUCT_UPDATE";
          offerValue = 0;
          requiresHitl = false;
        }

        job.log(
          `[F32] Strategy=${strategy}, offerValue=${offerValue}%, requiresHitl=${requiresHitl}`,
        );

        // ── 3. Construiește steps array ────────────────────────────────────
        const steps = [
          { day: 0, action: "INITIAL_EMAIL", executed: false },
          { day: 3, action: "WA_MESSAGE", executed: false },
          { day: 7, action: "OFFER", executed: false },
          {
            day: 14,
            action: strategy === "PERSONAL_CALL" ? "PHONE_CALL" : "FINAL_EMAIL",
            executed: false,
          },
        ];

        // ── 4. INSERT gold_winback_campaigns cu status='DRAFT' ─────────────
        const inserted = await db
          .insert(goldWinbackCampaigns)
          .values({
            tenantId,
            clientId,
            campaignType: strategy,
            strategy: { churnReason: churnReason ?? null, offerPercent: offerValue },
            offerValue: offerValue > 0 ? String(offerValue) : null,
            steps,
            currentStep: 0,
            requiresHitl,
            status: "DRAFT",
          })
          .returning({ id: goldWinbackCampaigns.id });

        if (inserted.length === 0) {
          throw new Error(`[F32] INSERT goldWinbackCampaigns returned no rows`);
        }

        const campaignId = inserted[0].id;

        job.log(`[F32] Campaign created: campaignId=${campaignId}, status=DRAFT`);

        // ── 5. UPDATE status='ACTIVE' ─────────────────────────────────────
        await db
          .update(goldWinbackCampaigns)
          .set({ status: "ACTIVE", updatedAt: new Date() })
          .where(
            and(
              eq(goldWinbackCampaigns.id, campaignId),
              eq(goldWinbackCampaigns.tenantId, tenantId),
            ),
          );

        job.log(`[F32] Campaign activated: campaignId=${campaignId}`);

        // ── 6. Enqueue în funcție de requiresHitl ─────────────────────────
        if (requiresHitl) {
          await escalateHitlQueue.add(
            "winback-escalate-hitl",
            {
              tenantId,
              campaignId,
              clientId,
              totalRevenue,
              churnReason: churnReason ?? null,
              proposedStrategy: strategy,
            },
            {
              jobId: `winback-hitl-${tenantId}-${campaignId}`,
            },
          );
          job.log(`[F32] Enqueued winback:escalate:hitl for campaignId=${campaignId}`);
        } else {
          await stepExecuteQueue.add(
            "winback-step-execute",
            { tenantId, campaignId, correlationId: job.data.correlationId },
            {
              jobId: `winback-step-0-${tenantId}-${campaignId}`,
              delay: 0,
            },
          );
          job.log(`[F32] Enqueued winback:step:execute (delay=0) for campaignId=${campaignId}`);
        }

        return {
          ok: true,
          campaignId,
          strategy,
          requiresHitl,
          stepsCount: steps.length,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 5,
    },
  );

  return worker;
}
