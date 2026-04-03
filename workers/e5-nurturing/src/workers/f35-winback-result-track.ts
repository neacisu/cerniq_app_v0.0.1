/**
 * f35-winback-result-track.ts — Worker F35: Winback Result Tracking (Plan §X FAZA 9f)
 *
 * Queue: winback:result:track (REDIS_DB_E5=5)
 * Timeout: 60s
 * Concurrency: 5
 *
 * Responsabilitate:
 *   - Verifică dacă clientul a plasat un nou ordin după campania de winback
 *   - Marchează campania SUCCESS dacă totalOrders > 0 și currentState != 'CHURNED'
 *   - Marchează campania FAILED dacă toți pașii au fost executați fără conversie
 *
 * Anti-halucin. FAZA 9f:
 *   (A) totalOrders > 0 ca proxy pentru re-conversie (fără timestamp exact per ordin)
 *   (B) Status COMPLETED/CANCELLED sunt stări finale — nu se mai procesează
 *   (C) Merge strategy cu outcome + trackedAt
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
import { QUEUES, createWorker, withCognitiveSpan } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface WinbackResultTrackJobData {
  tenantId: string;
  campaignId: string;
  correlationId?: string;
}

export interface WinbackResultTrackResult {
  ok: boolean;
  campaignId: string;
  status: string;
  outcome?: string;
  alreadyFinal?: boolean;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createWinbackResultTrackWorker(): Worker {
  const { worker } = createWorker<WinbackResultTrackJobData>(
    QUEUES.E5_WINBACK_RESULT_TRACK,
    async (job: Job<WinbackResultTrackJobData>): Promise<WinbackResultTrackResult> => {
      return withCognitiveSpan("e5:winback:result-track", async () => {
        const { tenantId, campaignId } = job.data;

        // ── 1. Set tenant context ──────────────────────────────────────────
        await setSessionTenantId(tenantId);

        job.log(`[F35] Tracking winback result: campaignId=${campaignId}, tenantId=${tenantId}`);

        // ── 2. SELECT campanie winback ─────────────────────────────────────
        const campaigns = await db
          .select({
            id: goldWinbackCampaigns.id,
            clientId: goldWinbackCampaigns.clientId,
            status: goldWinbackCampaigns.status,
            steps: goldWinbackCampaigns.steps,
            currentStep: goldWinbackCampaigns.currentStep,
            strategy: goldWinbackCampaigns.strategy,
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
          throw new Error(`[F35] Campaign not found: ${campaignId}`);
        }

        const campaign = campaigns[0];
        const { clientId, status, steps, currentStep, strategy } = campaign;

        // ── 3. GUARD: stări finale ─────────────────────────────────────────
        if (status === "COMPLETED" || status === "CANCELLED") {
          job.log(`[F35] Campaign already in final state: ${status}`);
          return { ok: true, campaignId, status, alreadyFinal: true };
        }

        // ── 4. SELECT nurturing state pentru client ────────────────────────
        const nurturingStates = await db
          .select({
            totalOrders: goldNurturingState.totalOrders,
            currentState: goldNurturingState.currentState,
          })
          .from(goldNurturingState)
          .where(
            and(eq(goldNurturingState.leadId, clientId), eq(goldNurturingState.tenantId, tenantId)),
          )
          .limit(1);

        const nurturingState = nurturingStates[0] ?? null;
        const totalOrders = nurturingState?.totalOrders ?? 0;
        const currentState = nurturingState?.currentState ?? "UNKNOWN";

        const stepsArray = Array.isArray(steps) ? steps : [];
        const stepsLength = stepsArray.length;

        let newStatus: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED" = status;
        let outcome: string | undefined;

        // ── 5. Verificare reconvertire ─────────────────────────────────────
        if (totalOrders > 0 && currentState !== "CHURNED") {
          // Client reconvertit — campania e SUCCESS
          newStatus = "COMPLETED";
          outcome = "SUCCESS";

          const mergedStrategy = {
            ...(typeof strategy === "object" && strategy !== null ? strategy : {}),
            outcome: "SUCCESS",
            trackedAt: new Date().toISOString(),
          };

          await db
            .update(goldWinbackCampaigns)
            .set({
              status: "COMPLETED",
              strategy: mergedStrategy,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(goldWinbackCampaigns.id, campaignId),
                eq(goldWinbackCampaigns.tenantId, tenantId),
              ),
            );

          job.log(
            `[F35] Campaign SUCCESS: client ${clientId} has ${totalOrders} orders, state=${currentState}`,
          );
        } else if (
          currentStep !== null &&
          currentStep !== undefined &&
          stepsLength > 0 &&
          Number(currentStep) >= stepsLength
        ) {
          // Toți pașii executați fără conversie — FAILED
          newStatus = "COMPLETED";
          outcome = "FAILED";

          const mergedStrategy = {
            ...(typeof strategy === "object" && strategy !== null ? strategy : {}),
            outcome: "FAILED",
            trackedAt: new Date().toISOString(),
          };

          await db
            .update(goldWinbackCampaigns)
            .set({
              status: "COMPLETED",
              strategy: mergedStrategy,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(goldWinbackCampaigns.id, campaignId),
                eq(goldWinbackCampaigns.tenantId, tenantId),
              ),
            );

          job.log(`[F35] Campaign FAILED: all ${stepsLength} steps executed, client still CHURNED`);
        } else {
          // Campania în curs
          job.log(
            `[F35] Campaign in progress: step ${String(currentStep)}/${stepsLength}, ` +
              `totalOrders=${totalOrders}, clientState=${currentState}`,
          );
        }

        return { ok: true, campaignId, status: newStatus, outcome };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 5,
    },
  );

  return worker;
}
