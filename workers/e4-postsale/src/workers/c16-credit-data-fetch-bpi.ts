/**
 * c16-credit-data-fetch-bpi.ts — Worker C16: Fetch proceduri insolvență BPI via Termene.ro
 *
 * Child job în FlowProducer C13. Se execută în paralel cu C14 și C15.
 * Rezultatul este accesibil de C17 via job.getChildrenValues().
 *
 * Date returnate (componente bpiStatus 20p + litigation 10p):
 *   - proceduri_insolventa_active, proceduri_insolventa_inchise
 *   - dosare_parat_active, dosare_parat_inactive
 *
 * Plan FAZA 8d §IX L2054: "C16: BPI (Buletinul Procedurilor de Insolvență) via Termene.ro"
 * Anti-halucinare: endpoint /firme/{cui}/dosare confirmat în termene-api-client.ts existent.
 * Un singur apel returnează atât proceduri insolvență cât și dosare litigii (câmpuri separate).
 */
import type { Processor } from "bullmq";
import { withCognitiveSpan, sanitizeCui } from "@cerniq/worker-shared";
import { db, goldCreditProfiles, setSessionTenantId, sql, eq } from "@cerniq/db";
import { getTermeneDosare, parseDosare, type TermeneDosareParsed } from "../lib/termene-client.js";

export type CreditDataFetchBpiJobData = {
  tenantId: string;
  clientId: string;
  cui: string;
  profileId: string;
  correlationId?: string;
};

export type CreditDataFetchBpiResult = {
  ok: true;
  status: "fetched" | "not_found";
  bpiData: TermeneDosareParsed;
};

const EMPTY_DOSARE: TermeneDosareParsed = {
  proceduri_insolventa_active: 0,
  proceduri_insolventa_inchise: 0,
  dosare_parat_active: 0,
  dosare_parat_inactive: 0,
};

function resolveBpiStatus(bpiData: TermeneDosareParsed): "ACTIVE" | "CLOSED" | "NONE" {
  if (bpiData.proceduri_insolventa_active > 0) return "ACTIVE";
  if (bpiData.proceduri_insolventa_inchise > 0) return "CLOSED";
  return "NONE";
}

export const creditDataFetchBpiProcessor: Processor<
  CreditDataFetchBpiJobData,
  CreditDataFetchBpiResult
> = async (job) => {
  return withCognitiveSpan(
    "e4:credit:data:fetch-bpi",
    async (_span) => {
      const { tenantId, profileId, cui } = job.data;
      await setSessionTenantId(tenantId);

      const cleanCui = sanitizeCui(cui);
      const raw = await getTermeneDosare(cleanCui);

      const bpiData: TermeneDosareParsed = raw ? parseDosare(raw) : EMPTY_DOSARE;

      if (!raw) {
        console.warn(
          `[C16] Dosare/BPI not found for CUI=${cleanCui}, profileId=${profileId} — using ZERO default`,
        );
      }

      await db
        .update(goldCreditProfiles)
        .set({
          bpiStatus: resolveBpiStatus(bpiData),
          scoreComponents: sql`jsonb_set(
            COALESCE(${goldCreditProfiles.scoreComponents}, '{}'::jsonb),
            '{bpiData}',
            ${JSON.stringify(bpiData)}::jsonb
          )`,
          updatedAt: new Date(),
        })
        .where(eq(goldCreditProfiles.id, profileId));

      console.info(
        `[C16] BPI/Dosare fetched for CUI=${cleanCui}: insolventa_active=${bpiData.proceduri_insolventa_active}, dosare_parat_active=${bpiData.dosare_parat_active}`,
      );

      return {
        ok: true,
        status: raw ? "fetched" : "not_found",
        bpiData,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
