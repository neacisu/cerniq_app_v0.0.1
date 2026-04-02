/**
 * D23 — negotiation:expire:check (concurrency: 5)
 *
 * CRON '0 * * * *' — detectează negocieri expirate pe TTL per stare:
 * PROPOSAL=7d, NEGOTIATION=30d, CLOSING=14d, PROFORMA_SENT=30d
 * → enqueue D26 negotiation:abandon:process
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, goldNegotiations, sql } from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS } from "@cerniq/worker-shared";

const LOG = "[d23-negotiation-expire-check]";

export interface NegotiationExpireCheckJobData {
  tenantId?: string;
}

export interface NegotiationExpireCheckResult {
  ok: true;
  expiredCount: number;
}

export const negotiationExpireCheckProcessor: Processor<
  NegotiationExpireCheckJobData,
  NegotiationExpireCheckResult
> = async (job) => {
  const { tenantId } = job.data;

  if (tenantId) {
    await setSessionTenantId(tenantId);
  }

  const expiredRows = await db
    .select({
      id: goldNegotiations.id,
      tenantId: goldNegotiations.tenantId,
      currentState: goldNegotiations.currentState,
    })
    .from(goldNegotiations)
    .where(
      sql`(
        (${goldNegotiations.currentState} = 'PROPOSAL'
          AND ${goldNegotiations.updatedAt} < NOW() - INTERVAL '7 days')
        OR
        (${goldNegotiations.currentState} = 'NEGOTIATION'
          AND ${goldNegotiations.updatedAt} < NOW() - INTERVAL '30 days')
        OR
        (${goldNegotiations.currentState} = 'CLOSING'
          AND ${goldNegotiations.updatedAt} < NOW() - INTERVAL '14 days')
        OR
        (${goldNegotiations.currentState} = 'PROFORMA_SENT'
          AND ${goldNegotiations.updatedAt} < NOW() - INTERVAL '30 days')
      )
      ${tenantId ? sql`AND ${goldNegotiations.tenantId} = ${tenantId}` : sql``}
      `,
    );

  if (expiredRows.length === 0) {
    console.info(`${LOG} no expired negotiations found`);
    return { ok: true, expiredCount: 0 };
  }

  const abandonQueue = createQueue("negotiation:abandon:process", {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  for (const neg of expiredRows) {
    console.info(`${LOG} expiring negotiation=${neg.id} state=${neg.currentState}`);
    await abandonQueue.add("negotiation:abandon:process", {
      tenantId: neg.tenantId,
      negotiationId: neg.id,
      reason: `TTL expired in state ${neg.currentState}`,
      triggeredBy: "expire",
    });
  }

  await abandonQueue.close();

  console.info(`${LOG} queued ${expiredRows.length} abandon jobs`);
  return { ok: true, expiredCount: expiredRows.length };
};
