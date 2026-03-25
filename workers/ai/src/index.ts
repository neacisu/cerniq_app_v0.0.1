/**
 * Cerniq AI Worker — TypeScript bootstrap.
 *
 * Currently a minimal placeholder. The E1 AI queues (ai:structure:xai,
 * ai:merge:xai, ai:score:confidence, ai:fallback) are handled by the
 * enrichment worker process. This worker will host E3+ AI queues
 * (ai:agent:orchestrate, ai:response:generate, etc.) once implemented.
 */
import { createHealthServer, loadSecretsFromFile } from "@cerniq/worker-shared";

const PORT = Number(process.env.PORT || "3000");
const SECRETS_PATH = process.env.SECRETS_PATH?.trim() || "/secrets/workers.env";

loadSecretsFromFile(false, SECRETS_PATH);

const healthServer = createHealthServer(PORT, () => ({
  ok: true,
  service: "worker-ai",
  workerInstances: 0,
  note: "Placeholder for E3+ AI queues. E1 AI queues handled by enrichment workers.",
}));

async function shutdown() {
  healthServer.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

console.info(`[worker-ai] started: health :${PORT}, awaiting E3 queue implementations`);
