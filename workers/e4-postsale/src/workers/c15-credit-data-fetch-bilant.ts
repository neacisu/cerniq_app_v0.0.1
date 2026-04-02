/**
 * c15-credit-data-fetch-bilant.ts — Worker C15: Fetch bilanț Termene.ro (3 ani)
 *
 * Child job în FlowProducer C13. Se execută în paralel cu C14 și C16.
 * Rezultatul este accesibil de C17 via job.getChildrenValues().
 *
 * Date returnate (componenta financialHealth 30p):
 *   - years: TermeneBilantYear[] (max 3 ani: CA, profit, equity, current ratio)
 *
 * Plan FAZA 8d §IX L2053: "C15: Termene.ro API → bilanțuri 3 ani → parsare CA, profit, equity"
 * Anti-halucinare: endpoint /firme/{cui}/bilant confirmat în E1 termene-api-client.ts
 */
import type { Processor } from "bullmq";
import { withCognitiveSpan, sanitizeCui } from "@cerniq/worker-shared";
import { db, goldCreditProfiles, setSessionTenantId, sql, eq } from "@cerniq/db";
import { getTermeneBilant, parseBilant, type TermeneBilantParsed } from "../lib/termene-client.js";

export type CreditDataFetchBilantJobData = {
  tenantId: string;
  clientId: string;
  cui: string;
  profileId: string;
  correlationId?: string;
};

export type CreditDataFetchBilantResult = {
  ok: true;
  status: "fetched" | "not_found";
  bilantData: TermeneBilantParsed;
};

export const creditDataFetchBilantProcessor: Processor<
  CreditDataFetchBilantJobData,
  CreditDataFetchBilantResult
> = async (job) => {
  return withCognitiveSpan(
    "e4:credit:data:fetch-bilant",
    async (_span) => {
      const { tenantId, profileId, cui } = job.data;
      await setSessionTenantId(tenantId);

      const cleanCui = sanitizeCui(cui);
      const raw = await getTermeneBilant(cleanCui);

      const bilantData: TermeneBilantParsed = raw ? parseBilant(raw) : { years: [] };

      if (!raw || bilantData.years.length === 0) {
        console.warn(`[C15] Bilanț not found/empty for CUI=${cleanCui}, profileId=${profileId}`);
      }

      await db
        .update(goldCreditProfiles)
        .set({
          scoreComponents: sql`jsonb_set(
            COALESCE(${goldCreditProfiles.scoreComponents}, '{}'::jsonb),
            '{bilantData}',
            ${JSON.stringify(bilantData)}::jsonb
          )`,
          updatedAt: new Date(),
        })
        .where(eq(goldCreditProfiles.id, profileId));

      console.info(
        `[C15] Bilanț fetched for CUI=${cleanCui}: ${bilantData.years.length} ani disponibili`,
      );

      return {
        ok: true,
        status: raw ? "fetched" : "not_found",
        bilantData,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
