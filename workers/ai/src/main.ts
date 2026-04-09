/**
 * Cerniq AI Worker — bootstrap TypeScript.
 *
 * Procesează pipeline consensus în 3 faze: request → collect (LLM) → decide (audit).
 * Alte cozi `ai:*` rămân la enrichment (j1–j4) și outreach (sentiment/response).
 *
 * Endpoints expuse:
 *   GET /health  → JSON cu status worker
 *   GET /metrics → Prometheus scrape endpoint (via createHealthServer din shared)
 *   GET /        → { ok: true }
 */
import {
  assertQueueRegistryComplete,
  createHealthServer,
  loadSecretsFromFile,
  queueRegistry,
  watchSecretsFile,
} from "@cerniq/worker-shared";
import {
  createConsensusVoteCollectWorker,
  createConsensusVoteDecideWorker,
  createConsensusVoteRequestWorker,
} from "./consensus-vote-worker.js";

const PORT = Number(process.env.PORT || "3000");
const SECRETS_PATH = process.env.SECRETS_PATH?.trim() || "/secrets/workers.env";

export async function bootstrap(): Promise<void> {
  loadSecretsFromFile(false, SECRETS_PATH);
  assertQueueRegistryComplete();

  const consensusRequest = createConsensusVoteRequestWorker();
  const consensusCollect = createConsensusVoteCollectWorker();
  const consensusDecide = createConsensusVoteDecideWorker();

  const aiQueueNames = queueRegistry.map((q) => q.name).filter((n) => n.startsWith("ai:"));

  const healthServer = createHealthServer(PORT, () => ({
    ok: true,
    service: "worker-ai",
    workerInstances: 3,
    registryQueues: queueRegistry.length,
    aiQueuesInRegistry: aiQueueNames,
    consensusQueues: ["consensus:vote:request", "consensus:vote:collect", "consensus:vote:decide"],
    note: "Consensus: request→collect (LLM)→decide (audit). Enrichment/outreach own ai:* queues.",
    timestamp: new Date().toISOString(),
  }));

  const stopWatchingSecrets = watchSecretsFile(SECRETS_PATH, async () => {
    loadSecretsFromFile(true, SECRETS_PATH);
    console.info("[worker-ai] secrets reloaded from file.");
  });

  const shutdown = async () => {
    console.info("[worker-ai] graceful shutdown initiated...");
    stopWatchingSecrets();
    await Promise.all([
      consensusRequest.close(),
      consensusCollect.close(),
      consensusDecide.close(),
    ]).catch(() => undefined);
    healthServer.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGHUP", async () => {
    try {
      loadSecretsFromFile(true, SECRETS_PATH);
      console.info("[worker-ai] SIGHUP: secrets reloaded.");
    } catch (err) {
      console.error("[worker-ai] SIGHUP reload failed:", err);
    }
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[worker-ai] unhandledRejection:", reason);
  });

  process.on("uncaughtException", (error) => {
    console.error("[worker-ai] uncaughtException:", error);
  });

  console.info(
    `[worker-ai] started: health :${PORT}, registry=${queueRegistry.length} queues, ai-queues=${aiQueueNames.length}`,
  );
}
