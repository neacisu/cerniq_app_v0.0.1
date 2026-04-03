/**
 * f34-winback-offer-generate.ts — Worker F34: Winback Offer Generate (FAZA 9f)
 *
 * Queue: winback:offer:generate (REDIS_DB_E5=5)
 * Timeout: 30s
 * Concurrency: 10
 *
 * Responsabilitate:
 *   - Generează discount code unic pentru campania de winback
 *   - PRODUCT_UPDATE → discountCode='PRODUCT_UPDATE_NEWSLETTER', offerValue=0
 *   - DISCOUNT / PERSONAL_CALL → WB-{clientId[:8]}-{hex(3)} code
 *   - offerValidUntil = 30 zile de la momentul generării
 *   - UPDATE gold_winback_campaigns cu offerValidUntil + discountCode în strategy jsonb
 */

import { randomBytes } from "node:crypto";
import type { Job, Worker } from "bullmq";
import { db, goldWinbackCampaigns, sql, eq, and, setSessionTenantId } from "@cerniq/db";
import { createWorker, withCognitiveSpan } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface WinbackOfferGenerateJobData {
  tenantId: string;
  campaignId: string;
  correlationId?: string;
}

export interface WinbackOfferGenerateResult {
  ok: boolean;
  campaignId: string;
  discountCode: string;
  offerValidUntil: string; // ISO date
  offerValue: number;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createWinbackOfferGenerateWorker(): Worker {
  const { worker } = createWorker<WinbackOfferGenerateJobData>(
    "winback:offer:generate",
    async (job: Job<WinbackOfferGenerateJobData>): Promise<WinbackOfferGenerateResult> => {
      return withCognitiveSpan("e5:winback:offer-generate", async () => {
        const { tenantId, campaignId } = job.data;

        await setSessionTenantId(tenantId);

        job.log(`[F34] Winback offer generate: campaignId=${campaignId}`);

        // ── 1. SELECT campania ────────────────────────────────────────────
        const campaignRows = await db
          .select({
            clientId: goldWinbackCampaigns.clientId,
            campaignType: goldWinbackCampaigns.campaignType,
            offerValue: goldWinbackCampaigns.offerValue,
          })
          .from(goldWinbackCampaigns)
          .where(
            and(
              eq(goldWinbackCampaigns.id, campaignId),
              eq(goldWinbackCampaigns.tenantId, tenantId),
            ),
          )
          .limit(1);

        if (campaignRows.length === 0) {
          throw new Error(`[F34] Campaign not found: campaignId=${campaignId}`);
        }

        const { clientId, campaignType } = campaignRows[0];
        const offerValueRaw = campaignRows[0].offerValue;

        // ── 2. Determină discount code și offerValue ──────────────────────
        let discountCode: string;
        let offerValue: number;

        if (campaignType === "PRODUCT_UPDATE") {
          // GUARD: fără discount real pentru PRODUCT_UPDATE
          discountCode = "PRODUCT_UPDATE_NEWSLETTER";
          offerValue = 0;
        } else {
          // Generează code unic: WB-{clientId[:8].toUpperCase()}-{hex(3).toUpperCase()}
          const hexSuffix = randomBytes(3).toString("hex").toUpperCase();
          discountCode = `WB-${clientId.slice(0, 8).toUpperCase()}-${hexSuffix}`;
          offerValue = offerValueRaw == null ? 0 : Number(offerValueRaw);
        }

        // ── 3. offerValidUntil = now + 30 zile ───────────────────────────
        const offerValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();

        job.log(
          `[F34] Generated offer: code=${discountCode}, value=${offerValue}%, ` +
            `validUntil=${offerValidUntil.toISOString()}`,
        );

        // ── 4. UPDATE goldWinbackCampaigns cu offerValidUntil + discountCode ─
        // JSON merge în drizzle/postgres folosind || operator jsonb
        await db
          .update(goldWinbackCampaigns)
          .set({
            offerValidUntil,
            strategy: sql`${goldWinbackCampaigns.strategy} || ${JSON.stringify({ discountCode, generatedAt: now.toISOString() })}::jsonb`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(goldWinbackCampaigns.id, campaignId),
              eq(goldWinbackCampaigns.tenantId, tenantId),
            ),
          );

        job.log(
          `[F34] Updated campaign ${campaignId} with discountCode=${discountCode} and offerValidUntil`,
        );

        return {
          ok: true,
          campaignId,
          discountCode,
          offerValidUntil: offerValidUntil.toISOString(),
          offerValue,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 10,
    },
  );

  return worker;
}
