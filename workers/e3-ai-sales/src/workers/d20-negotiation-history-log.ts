/**
 * D20 — negotiation:history:log (concurrency: 20)
 *
 * Append-only: inserează o înregistrare în negotiation_state_history.
 * NICIODATĂ update sau delete.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, negotiationStateHistory } from "@cerniq/db";

const LOG = "[d20-negotiation-history-log]";

export interface NegotiationHistoryLogJobData {
  tenantId: string;
  negotiationId: string;
  fromState: string | null;
  toState: string;
  changedBy?: string | null;
  reason?: string | null;
}

export interface NegotiationHistoryLogResult {
  ok: true;
  historyId: string;
}

export const negotiationHistoryLogProcessor: Processor<
  NegotiationHistoryLogJobData,
  NegotiationHistoryLogResult
> = async (job) => {
  const { tenantId, negotiationId, fromState, toState, changedBy, reason } = job.data;
  await setSessionTenantId(tenantId);

  const rows = await db
    .insert(negotiationStateHistory)
    .values({
      tenantId,
      negotiationId,
      fromState: fromState ?? null,
      toState,
      changedBy: changedBy ?? null,
      reason: reason ?? null,
    })
    .returning({ id: negotiationStateHistory.id });

  const historyId = rows[0]?.id ?? "unknown";

  console.info(
    `${LOG} logged ${fromState ?? "null"} → ${toState} negotiation=${negotiationId} historyId=${historyId}`,
  );

  return { ok: true, historyId };
};
