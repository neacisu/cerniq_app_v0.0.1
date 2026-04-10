/**
 * c13-credit-profile-create.ts — Worker C13: Creare profil credit la client:created
 *
 * FLUX (Plan FAZA 8d §IX L2051-2054):
 * 1. CREATE gold_credit_profiles (score=0, riskTier=BLOCKED, scoreComponents={})
 * 2. FlowProducer fan-out: C17 (parent) → C14 + C15 + C16 (children parallel)
 *    - C14: fetch ANAF status fiscal + TVA
 *    - C15: fetch bilanț Termene.ro (3 ani CA/profit/equity)
 *    - C16: fetch dosare + BPI via Termene.ro
 * 3. C17 se execută automat după C14+C15+C16 complete (FlowProducer guarantee)
 *
 * Anti-halucinare:
 * - FlowProducer din BullMQ — NU polling manual
 * - score=0/riskTier='BLOCKED' la creare (schema are default 50/MEDIUM → override explicit)
 * - Idempotency: upsert pe (tenantId, clientId)
 */
import type { Processor } from "bullmq";
import { FlowProducer } from "bullmq";
import { createServiceLogger } from "@cerniq/observability";
import { QUEUES, getRedisConnectionOptions, withCognitiveSpan } from "@cerniq/worker-shared";
import { db, goldCreditProfiles, setSessionTenantId, eq, and } from "@cerniq/db";

const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? process.env.REDIS_DB ?? "4");
const c13Log = createServiceLogger("e4-c13-credit-profile-create", { etapa: "e4" });

export type CreditProfileCreateJobData = {
  tenantId: string;
  clientId: string;
  cui: string;
  correlationId?: string;
  httpCorrelationId?: string;
  causationJobId?: string;
};

export const creditProfileCreateProcessor: Processor<CreditProfileCreateJobData> = async (job) => {
  return withCognitiveSpan(
    "e4:credit:profile:create",
    async (_span) => {
      const { tenantId, clientId, cui } = job.data;
      await setSessionTenantId(tenantId);

      // ── 1. Upsert profil credit cu stare inițială BLOCKED ─────────────────
      const existing = await db
        .select({ id: goldCreditProfiles.id })
        .from(goldCreditProfiles)
        .where(
          and(eq(goldCreditProfiles.tenantId, tenantId), eq(goldCreditProfiles.clientId, clientId)),
        )
        .limit(1);

      let profileId: string;

      if (existing.length > 0 && existing[0]) {
        profileId = existing[0].id;
        c13Log.info({ clientId, tenantId }, "profile_exists_retrigger_scoring");
      } else {
        const inserted = await db
          .insert(goldCreditProfiles)
          .values({
            tenantId,
            clientId,
            creditScore: 0,
            riskTier: "BLOCKED",
            creditLimit: "0",
            creditUsed: "0",
            scoreComponents: {},
            autoRefreshEnabled: true,
            nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          })
          .onConflictDoNothing()
          .returning({ id: goldCreditProfiles.id });

        if (inserted[0]) {
          profileId = inserted[0].id;
        } else {
          const retry = await db
            .select({ id: goldCreditProfiles.id })
            .from(goldCreditProfiles)
            .where(
              and(
                eq(goldCreditProfiles.tenantId, tenantId),
                eq(goldCreditProfiles.clientId, clientId),
              ),
            )
            .limit(1);

          const row = retry[0];
          if (!row) {
            throw new Error(
              `[C13] Failed to create or find credit profile for clientId=${clientId}`,
            );
          }
          profileId = row.id;
        }

        c13Log.info({ profileId, clientId, tenantId }, "credit_profile_created");
      }

      // ── 2. FlowProducer: parent=C17, children=C14+C15+C16 ─────────────────
      const flowProducer = new FlowProducer({
        connection: getRedisConnectionOptions({ db: REDIS_DB_E4 }),
      });

      try {
        const cid = job.data.correlationId;
        const childJobData = {
          tenantId,
          clientId,
          cui,
          profileId,
          correlationId: cid,
          httpCorrelationId: job.data.httpCorrelationId ?? cid,
          causationJobId: job.id,
        };

        await flowProducer.add({
          name: "credit:score:calculate",
          queueName: QUEUES.E4_CREDIT_SCORE_CALCULATE,
          data: { ...childJobData },
          opts: {
            jobId: `c17:${profileId}:${Date.now()}`,
            priority: 2,
          },
          children: [
            {
              name: "credit:data:fetch-anaf",
              queueName: QUEUES.E4_CREDIT_DATA_FETCH_ANAF,
              data: { ...childJobData },
              opts: { jobId: `c14:${profileId}:${Date.now()}` },
            },
            {
              name: "credit:data:fetch-bilant",
              queueName: QUEUES.E4_CREDIT_DATA_FETCH_BILANT,
              data: { ...childJobData },
              opts: { jobId: `c15:${profileId}:${Date.now()}` },
            },
            {
              name: "credit:data:fetch-bpi",
              queueName: QUEUES.E4_CREDIT_DATA_FETCH_BPI,
              data: { ...childJobData },
              opts: { jobId: `c16:${profileId}:${Date.now()}` },
            },
          ],
        });

        c13Log.info({ profileId, tenantId }, "flowproducer_dispatched_c14_c15_c16_to_c17");
      } finally {
        await flowProducer.close();
      }

      return {
        ok: true,
        profileId,
        clientId,
        status: existing.length > 0 ? "re-triggered" : "created",
      };
    },
    { tenantId: job.data.tenantId },
  );
};
