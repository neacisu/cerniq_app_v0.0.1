/**
 * Cerniq AI Worker — bootstrap TypeScript.
 *
 * Context: Toate cozile AI din queue-registry sunt deja acoperite de alți workers:
 *   - Etapa 1 (enrichment): ai:structure:xai, ai:merge:xai, ai:score:confidence, ai:fallback
 *                           → workers/enrichment/src/main.ts (j1-j4)
 *   - Etapa 2 (outreach):   ai:sentiment:analyze (includes intent), ai:response:generate
 *                           → workers/outreach/src/index.ts (ai-sentiment.ts)
 *                           (ai:intent:classify unified into ai:sentiment:analyze — removed from registry)
 *
 * Nu există cozi AI libere în registry. Acest worker pornește fără procesori activi
 * și va fi populat cu cozi E3/Cognitive Brain când vor fi adăugate în queue-registry.
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

const PORT = Number(process.env.PORT || "3000");
const SECRETS_PATH = process.env.SECRETS_PATH?.trim() || "/secrets/workers.env";

export async function bootstrap(): Promise<void> {
  loadSecretsFromFile(false, SECRETS_PATH);
  assertQueueRegistryComplete();

  const aiQueueNames = queueRegistry.map((q) => q.name).filter((n) => n.startsWith("ai:"));

  const healthServer = createHealthServer(PORT, () => ({
    ok: true,
    service: "worker-ai",
    workerInstances: 0,
    registryQueues: queueRegistry.length,
    aiQueuesInRegistry: aiQueueNames,
    note: "AI queues are processed by enrichment (j1-j4) and outreach (sentiment/response/intent). Ready for E3 cognitive queues.",
    timestamp: new Date().toISOString(),
  }));

  const stopWatchingSecrets = watchSecretsFile(SECRETS_PATH, async () => {
    loadSecretsFromFile(true, SECRETS_PATH);
    console.info("[worker-ai] secrets reloaded from file.");
  });

  const shutdown = async () => {
    console.info("[worker-ai] graceful shutdown initiated...");
    stopWatchingSecrets();
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
