/**
 * D22 — negotiation:reminder:send (concurrency: 5)
 *
 * CRON '0 *\/6 * * *' — detectează negocieri stale și enqueue-ează reminder.
 * Stale: DISCOVERY/PROPOSAL neschimbate >48h, NEGOTIATION neschimbată >24h.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, goldNegotiations, sql } from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS } from "@cerniq/worker-shared";

const LOG = "[d22-negotiation-reminder-send]";

export interface NegotiationReminderSendJobData {
  tenantId?: string;
}

export interface NegotiationReminderSendResult {
  ok: true;
  remindersQueued: number;
}

export const negotiationReminderSendProcessor: Processor<
  NegotiationReminderSendJobData,
  NegotiationReminderSendResult
> = async (job) => {
  const { tenantId } = job.data;

  if (tenantId) {
    await setSessionTenantId(tenantId);
  }

  const staleRows = await db
    .select({
      id: goldNegotiations.id,
      tenantId: goldNegotiations.tenantId,
      currentState: goldNegotiations.currentState,
      updatedAt: goldNegotiations.updatedAt,
    })
    .from(goldNegotiations)
    .where(
      sql`(
        (${goldNegotiations.currentState} IN ('DISCOVERY', 'PROPOSAL')
          AND ${goldNegotiations.updatedAt} < NOW() - INTERVAL '48 hours')
        OR
        (${goldNegotiations.currentState} = 'NEGOTIATION'
          AND ${goldNegotiations.updatedAt} < NOW() - INTERVAL '24 hours')
      )
      AND ${goldNegotiations.currentState} NOT IN ('DEAD', 'PAID', 'INVOICED')
      ${tenantId ? sql`AND ${goldNegotiations.tenantId} = ${tenantId}` : sql``}
      `,
    );

  if (staleRows.length === 0) {
    console.info(`${LOG} no stale negotiations found`);
    return { ok: true, remindersQueued: 0 };
  }

  const sentimentQueue = createQueue("ai:sentiment:analyze", {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  let remindersQueued = 0;
  for (const neg of staleRows) {
    const updatedAt = neg.updatedAt instanceof Date ? neg.updatedAt : new Date(neg.updatedAt);
    const staleDays = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

    console.info(
      `${LOG} reminder: negotiationId=${neg.id}, state=${neg.currentState}, staleDays=${staleDays}`,
    );

    await sentimentQueue.add("ai:sentiment:analyze", {
      tenantId: neg.tenantId,
      context: "negotiation-reminder",
      negotiationId: neg.id,
      state: neg.currentState,
      staleDays,
    });
    remindersQueued++;
  }

  await sentimentQueue.close();

  console.info(`${LOG} queued ${remindersQueued} reminders`);
  return { ok: true, remindersQueued };
};
