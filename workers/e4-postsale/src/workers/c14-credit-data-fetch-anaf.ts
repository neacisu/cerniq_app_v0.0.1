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
import { createServiceLogger } from "@cerniq/observability";
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

const c14Log = createServiceLogger("e4-c14-credit-data-fetch-anaf", { etapa: "e4" });

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
        c14Log.warn({ cui: cleanCui, profileId }, "anaf_record_not_found");

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

      c14Log.info(
        { cui: cleanCui, activFiscal: anafData.isActivFiscal, tva: anafData.isTvaActiv },
        "anaf_fetched",
      );

      return { ok: true, status: "fetched", anafData };
    },
    { tenantId: job.data.tenantId },
  );
};
