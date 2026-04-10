/**
 * Plan §XIII — vot consensus advisory pentru scor credit borderline [50,60].
 * NU modifică scorul determinist C17; la divergență → HITL_ESCALATION.
 */
import {
  QUEUES,
  buildDefaultConsensusModelRunners,
  consensusStructuredVote,
  createQueue,
  DEFAULT_JOB_OPTIONS,
  shouldTriggerLlmConsensusVote,
} from "@cerniq/worker-shared";
import { createServiceLogger } from "@cerniq/observability";
import { z } from "zod";

const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? process.env.REDIS_DB ?? "4");
const c17ConsensusLog = createServiceLogger("e4-c17-credit-consensus-advisory", { etapa: "e4" });

export async function runCreditBorderlineConsensusIfNeeded(ctx: {
  readonly tenantId: string;
  readonly clientId: string;
  readonly profileId: string;
  readonly creditScore: number;
}): Promise<void> {
  if (!shouldTriggerLlmConsensusVote({ creditScore: ctx.creditScore })) return;
  const models = buildDefaultConsensusModelRunners();
  if (models.length < 2) return;

  const vote = await consensusStructuredVote({
    schema: z.object({ borderlineElevatedRisk: z.boolean() }),
    messages: [
      {
        role: "system",
        content:
          'You assess credit borderline cases. Return ONLY JSON: {"borderlineElevatedRisk":true|false}.',
      },
      {
        role: "user",
        content: `Deterministic credit score (0-100)=${ctx.creditScore} for clientId=${ctx.clientId}. Advisory only.`,
      },
    ],
    models,
    triggerLabel: "credit_borderline",
    onDivergence: async (detail) => {
      const q = createQueue(QUEUES.HITL_ESCALATION, { db: REDIS_DB_E4 });
      try {
        await q.add(
          "hitl:escalate",
          {
            discriminator: "credit-consensus-divergence",
            tenantId: ctx.tenantId,
            clientId: ctx.clientId,
            profileId: ctx.profileId,
            creditScore: ctx.creditScore,
            detail,
          },
          { ...DEFAULT_JOB_OPTIONS, attempts: 1 },
        );
      } finally {
        await q.close();
      }
    },
  });

  if (vote.ok) {
    c17ConsensusLog.info(
      { agreeingModelIds: vote.agreeingModelIds.join(",") },
      "credit_borderline_consensus_advisory_ok",
    );
  }
}
