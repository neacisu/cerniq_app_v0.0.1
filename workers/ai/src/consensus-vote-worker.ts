/**
 * Consensus multi-model — pipeline în 3 faze (Plan §XVI.A, orchestrare O):
 *
 * 1. `consensus:vote:request` — intrare: validează și trimite către COLLECT (fără apeluri LLM).
 * 2. `consensus:vote:collect` — colectare: vot paralel Qwen/infraq + Zod + majoritate (`runConsensusVotePipeline`).
 * 3. `consensus:vote:decide` — decizie: audit `audit_llm_calls`, metrici Prometheus, finalizare.
 *
 * Producătorii externi pun job-uri în principal pe REQUEST; COLLECT poate fi adresat direct
 * dacă ingress-ul nu e necesar (aceeași încărcare `VoteRequest`).
 */
import type { Job, Worker } from "bullmq";
import { auditLlmCalls, db, setSessionTenantId } from "@cerniq/db";
import {
  QUEUES,
  consensusVotesTotal,
  createQueue,
  createWorker,
  type VoteRequest,
  type VoteResult,
  runConsensusVotePipeline,
  promptHashSha256,
} from "@cerniq/worker-shared";

/** Payload job coada DECIDE (după COLLECT). */
export type ConsensusVoteDecideJob = {
  readonly request: VoteRequest;
  readonly result: VoteResult;
};

export function createConsensusVoteRequestWorker(): Worker {
  const collectQueue = createQueue<VoteRequest>(QUEUES.CONSENSUS_VOTE_COLLECT);

  const { worker } = createWorker(
    QUEUES.CONSENSUS_VOTE_REQUEST,
    async (job: Job<VoteRequest>) => {
      const req = job.data;
      await collectQueue.add("consensus-collect", req);
      return {
        forwarded: true as const,
        to: QUEUES.CONSENSUS_VOTE_COLLECT,
        taskId: req.taskId,
      };
    },
    { concurrency: 16 },
  );

  return worker;
}

export function createConsensusVoteCollectWorker(): Worker {
  const hitlQueue = createQueue(QUEUES.HUMAN_REVIEW_QUEUE);
  const decideQueue = createQueue<ConsensusVoteDecideJob>(QUEUES.CONSENSUS_VOTE_DECIDE);

  const { worker } = createWorker(
    QUEUES.CONSENSUS_VOTE_COLLECT,
    async (job: Job<VoteRequest>) => {
      const req = job.data;
      await setSessionTenantId(req.tenantId);

      const onDivergence = async (detail: string): Promise<void> => {
        await hitlQueue.add(
          "consensus-divergence",
          {
            tenantId: req.tenantId,
            taskId: req.taskId,
            trigger: req.triggerLabel ?? "consensus",
            detail,
            context: req.context,
            promptHash: promptHashSha256(req.prompt),
          },
          { removeOnComplete: 200 },
        );
      };

      const result = await runConsensusVotePipeline({
        request: req,
        onDivergence,
      });

      await decideQueue.add("consensus-decide", { request: req, result });

      return { collected: true as const, taskId: req.taskId, consensus: result.consensus };
    },
    { concurrency: 2 },
  );

  return worker;
}

export function createConsensusVoteDecideWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.CONSENSUS_VOTE_DECIDE,
    async (job: Job<ConsensusVoteDecideJob>) => {
      const { request: req, result } = job.data;
      if (!req?.tenantId || !req?.taskId || result === undefined || result === null) {
        throw new Error(
          "consensus:vote:decide — payload invalid (așteptat { request, result } după COLLECT)",
        );
      }

      await setSessionTenantId(req.tenantId);

      const allResponsesJson = result.votes.map((v) => ({
        model: v.model,
        latency_ms: v.latency_ms,
        snippet: v.response.slice(0, 4000),
      }));

      if (result.consensus && result.decision) {
        consensusVotesTotal.inc({
          decision_type: req.triggerLabel ?? "consensus_ok",
          winning_model: result.winningModel ?? result.votes[0]?.model ?? "unknown",
        });
      }

      await db.insert(auditLlmCalls).values({
        tenantId: req.tenantId,
        workerQueue: QUEUES.CONSENSUS_VOTE_DECIDE,
        modelUsed: result.votes.map((v) => v.model).join(",") || "consensus-mix",
        isSelfhosted: true,
        provider: "infraq",
        fallbackReason: result.escalateHitl ? "consensus_divergence" : null,
        promptHash: promptHashSha256(req.prompt),
        tokensInput: 0,
        tokensOutput: 0,
        latencyMs: result.votes.reduce((a, v) => a + v.latency_ms, 0) || 0,
        costUsd: "0",
        guardrailPassed: !result.escalateHitl,
        allResponses: allResponsesJson,
        regenerationAttempt: 0,
      });

      return result;
    },
    { concurrency: 8 },
  );

  return worker;
}
