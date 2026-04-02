/**
 * c14-credit-data-fetch-anaf.ts — Worker C14: Fetch date ANAF (status fiscal + TVA)
 *
 * Child job în FlowProducer C13. Se execută în paralel cu C15 și C16.
 * Rezultatul este accesibil de C17 via job.getChildrenValues().
 *
 * Date returnate (componenta anafStatus 15p):
 *   - isActivFiscal: boolean
 *   - isTvaActiv: boolean
 *   - stareInregistrare: string
 *
 * Plan FAZA 8d §IX L2052: "C14: ANAF API → cache Redis TTL 24h"
 * Anti-halucinare: refolosește logica din E1 d1-anaf-fiscal.ts
 */
import type { Processor } from "bullmq";
import { withCognitiveSpan, sanitizeCui } from "@cerniq/worker-shared";
import { db, goldCreditProfiles, setSessionTenantId, sql, eq } from "@cerniq/db";
import { fetchAnafByCui, parseAnafForCredit, type AnafCreditData } from "../lib/anaf-client.js";

export type CreditDataFetchAnafJobData = {
  tenantId: string;
  clientId: string;
  cui: string;
  profileId: string;
  correlationId?: string;
};

export type CreditDataFetchAnafResult = {
  ok: true;
  status: "fetched" | "not_found";
  anafData: AnafCreditData | null;
};

export const creditDataFetchAnafProcessor: Processor<
  CreditDataFetchAnafJobData,
  CreditDataFetchAnafResult
> = async (job) => {
  return withCognitiveSpan(
    "e4:credit:data:fetch-anaf",
    async (_span) => {
      const { tenantId, profileId, cui } = job.data;
      await setSessionTenantId(tenantId);

      const cleanCui = sanitizeCui(cui);
      const record = await fetchAnafByCui(cleanCui);

      if (!record) {
        console.warn(`[C14] ANAF record not found for CUI=${cleanCui}, profileId=${profileId}`);

        await db
          .update(goldCreditProfiles)
          .set({
            scoreComponents: sql`jsonb_set(
              COALESCE(${goldCreditProfiles.scoreComponents}, '{}'::jsonb),
              '{anafData}',
              ${JSON.stringify({ isActivFiscal: false, isTvaActiv: false, stareInregistrare: "NOT_FOUND" })}::jsonb
            )`,
            updatedAt: new Date(),
          })
          .where(eq(goldCreditProfiles.id, profileId));

        return { ok: true, status: "not_found", anafData: null };
      }

      const anafData = parseAnafForCredit(record);

      await db
        .update(goldCreditProfiles)
        .set({
          scoreComponents: sql`jsonb_set(
            COALESCE(${goldCreditProfiles.scoreComponents}, '{}'::jsonb),
            '{anafData}',
            ${JSON.stringify(anafData)}::jsonb
          )`,
          updatedAt: new Date(),
        })
        .where(eq(goldCreditProfiles.id, profileId));

      console.info(
        `[C14] ANAF fetched for CUI=${cleanCui}: activFiscal=${anafData.isActivFiscal}, TVA=${anafData.isTvaActiv}`,
      );

      return { ok: true, status: "fetched", anafData };
    },
    { tenantId: job.data.tenantId },
  );
};
