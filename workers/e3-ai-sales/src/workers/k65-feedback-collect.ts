/**
 * K65 — feedback:collect (concurrency:5, timeout:10s)
 *
 * Colectează feedback NPS 1-5 + free text de la client după interacțiuni AI
 * sau la finalul negocierii. Stochează în gold_negotiation_feedback.
 *
 * Validări:
 *   - nps BETWEEN 1 AND 5 (STRICT)
 *   - tenantId + negotiationId obligatorii
 *   - freeText opțional, trunchiat la 2000 caractere
 *
 * Quality monitoring: returnează aggregateNps (running avg din DB).
 * FAZA 7l — Plan L1905.
 */
import type { Processor } from "bullmq";
import { z } from "zod";
import { db, setSessionTenantId, goldNegotiationFeedback, eq, sql } from "@cerniq/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export const SOURCE_CHANNELS = ["WA", "EMAIL", "IN_APP", "API"] as const;
export type SourceChannel = (typeof SOURCE_CHANNELS)[number];

export interface FeedbackCollectJobData {
  tenantId: string;
  negotiationId: string;
  /** NPS score: 1 (foarte nemulțumit) — 5 (foarte mulțumit). */
  nps: number;
  freeText?: string;
  sourceChannel?: SourceChannel;
  /** ID-ul mesajului AI care a declanșat colectarea feedback-ului. */
  triggerMessageId?: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackCollectResult {
  ok: boolean;
  feedbackId: string;
  nps: number;
  /** Media NPS agregată pentru această negociere (quality monitoring). */
  aggregateNps: number | null;
}

// ── Zod Schema ─────────────────────────────────────────────────────────────────

const FeedbackInputSchema = z.object({
  tenantId: z.uuid(),
  negotiationId: z.uuid(),
  nps: z.number().int().min(1).max(5),
  freeText: z.string().max(2000).optional(),
  sourceChannel: z.enum(SOURCE_CHANNELS).optional(),
  triggerMessageId: z.uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── Processor ─────────────────────────────────────────────────────────────────

const LOG = "[k65:feedback:collect]";

export const feedbackCollectProcessor: Processor<
  FeedbackCollectJobData,
  FeedbackCollectResult
> = async (job) => {
  const input = FeedbackInputSchema.parse(job.data);
  const { tenantId, negotiationId, nps, freeText, sourceChannel, triggerMessageId, metadata } =
    input;

  await setSessionTenantId(tenantId);

  console.info(`${LOG} tenantId=${tenantId} negotiationId=${negotiationId} nps=${nps}`);

  // Inserare feedback
  const [inserted] = await db
    .insert(goldNegotiationFeedback)
    .values({
      tenantId,
      negotiationId,
      nps,
      freeText: freeText ?? null,
      sourceChannel: sourceChannel ?? null,
      triggerMessageId: triggerMessageId ?? null,
      metadata: metadata ?? null,
    })
    .returning({ id: goldNegotiationFeedback.id });

  // Calcul aggregateNps pentru quality monitoring
  const [aggRow] = await db
    .select({ avgNps: sql<string>`AVG(${goldNegotiationFeedback.nps})::numeric(4,2)` })
    .from(goldNegotiationFeedback)
    .where(eq(goldNegotiationFeedback.negotiationId, negotiationId))
    .limit(1);

  let aggregateNps: number | null = null;
  if (aggRow?.avgNps !== null && aggRow?.avgNps !== undefined) {
    aggregateNps = Number.parseFloat(aggRow.avgNps);
  }

  console.info(
    `${LOG} stored feedbackId=${inserted.id} nps=${nps} aggregateNps=${aggregateNps ?? "n/a"} negotiationId=${negotiationId}`,
  );

  return {
    ok: true,
    feedbackId: inserted.id,
    nps,
    aggregateNps,
  };
};
