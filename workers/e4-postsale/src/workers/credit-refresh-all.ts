/**
 * credit-refresh-all.ts — CRON Worker: Bulk refresh profile credit (0 3 * * *)
 *
 * Selectează toate profilurile unde:
 *   - autoRefreshEnabled = true
 *   - nextReviewAt <= NOW()
 *
 * Re-dispatchează fan-out C13 (FlowProducer C14+C15+C16→C17) pentru fiecare profil.
 * Necesită câmpul CUI din gold_companies (via clientId).
 *
 * Plan FAZA 8d §IX CRON L2125: `0 3 * * *`
 */
import type { Processor } from "bullmq";
import { FlowProducer } from "bullmq";
import { QUEUES, getRedisConnectionOptions, withCognitiveSpan } from "@cerniq/worker-shared";
import { db, goldCreditProfiles, goldCompanies, eq, and, lte, isNotNull } from "@cerniq/db";

const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? process.env.REDIS_DB ?? "4");

export const creditRefreshAllProcessor: Processor = async (_job) => {
  return withCognitiveSpan(
    "e4:credit:refresh-all",
    async (_span) => {
      // Cron job — nu are tenantId în payload; procesează cross-tenant cu RLS off
      // Anti-halucinare: setSessionTenantId nu e apelat → Postgres folosește default schema
      const rows = await db
        .select({
          id: goldCreditProfiles.id,
          tenantId: goldCreditProfiles.tenantId,
          clientId: goldCreditProfiles.clientId,
          cui: goldCompanies.cui,
        })
        .from(goldCreditProfiles)
        .leftJoin(goldCompanies, eq(goldCreditProfiles.clientId, goldCompanies.id))
        .where(
          and(
            eq(goldCreditProfiles.autoRefreshEnabled, true),
            lte(goldCreditProfiles.nextReviewAt, new Date()),
            isNotNull(goldCompanies.cui),
          ),
        )
        .limit(500);

      if (rows.length === 0) {
        console.info("[CRON credit:refresh-all] No profiles need refresh");
        return { ok: true, refreshed: 0 };
      }

      const flowProducer = new FlowProducer({
        connection: getRedisConnectionOptions({ db: REDIS_DB_E4 }),
      });

      let dispatched = 0;
      try {
        for (const row of rows) {
          const cui = row.cui ?? "";
          if (!cui || !row.tenantId) continue;

          const profileId = row.id;
          const childJobData = {
            tenantId: row.tenantId,
            clientId: row.clientId,
            cui,
            profileId,
          };
          const ts = Date.now();

          await flowProducer.add({
            name: "credit:score:calculate",
            queueName: QUEUES.E4_CREDIT_SCORE_CALCULATE,
            data: { ...childJobData },
            opts: { jobId: `c17:refresh:${profileId}:${ts}` },
            children: [
              {
                name: "credit:data:fetch-anaf",
                queueName: QUEUES.E4_CREDIT_DATA_FETCH_ANAF,
                data: { ...childJobData },
                opts: { jobId: `c14:refresh:${profileId}:${ts}` },
              },
              {
                name: "credit:data:fetch-bilant",
                queueName: QUEUES.E4_CREDIT_DATA_FETCH_BILANT,
                data: { ...childJobData },
                opts: { jobId: `c15:refresh:${profileId}:${ts}` },
              },
              {
                name: "credit:data:fetch-bpi",
                queueName: QUEUES.E4_CREDIT_DATA_FETCH_BPI,
                data: { ...childJobData },
                opts: { jobId: `c16:refresh:${profileId}:${ts}` },
              },
            ],
          });
          dispatched++;
        }
      } finally {
        await flowProducer.close();
      }

      console.info(
        `[CRON credit:refresh-all] Dispatched ${dispatched}/${rows.length} profiles for refresh`,
      );

      return { ok: true, refreshed: dispatched };
    },
    {},
  );
};
