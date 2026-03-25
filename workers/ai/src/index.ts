/**
 * AI worker stub — health only until E3 queues exist in queue-registry.
 * Former worker.js listened to placeholder queues (ai-scoring, negotiation-suggestions, llm-processing).
 */
import { createHealthServer } from "@cerniq/worker-shared/health";
import { loadSecretsFromFile } from "@cerniq/worker-shared/secrets";

const PORT = Number(process.env.PORT || "3000");
const SECRETS_PATH = process.env.SECRETS_PATH?.trim() || "/secrets/workers.env";

loadSecretsFromFile(false, SECRETS_PATH);

const healthServer = createHealthServer(PORT, () => ({
  ok: true,
  service: "cerniq-worker-ai",
  stub: true,
}));

const shutdown = async () => {
  console.info("[worker-ai] shutdown...");
  healthServer.close();
  process.exit(0);
};

process.on("SIGTERM", () => {
  void shutdown();
});
process.on("SIGINT", () => {
  void shutdown();
});

console.info(`[worker-ai] started (stub): health :${PORT}`);
