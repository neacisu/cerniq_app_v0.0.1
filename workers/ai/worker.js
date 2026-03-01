/**
 * Cerniq AI Worker - BullMQ skeleton.
 * Queues: ai-scoring, negotiation-suggestions, llm-processing
 * Loads REDIS_URL from SECRETS_PATH (/secrets/workers.env) at startup and on SIGHUP.
 */
import { Worker } from "bullmq";
import http from "http";
import fs from "fs";

const SECRETS_PATH = process.env.SECRETS_PATH || "/secrets/workers.env";
const REDIS_KEYS = ["REDIS_URL", "REDIS_PASSWORD", "REDIS_PREFIX", "BULLMQ_PREFIX"];
const OPENBAO_READY_MARKER = "OPENBAO_SECRETS_LOADED=true";

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function loadSecretsFromFile(forceOverwrite = false) {
  if (!fs.existsSync(SECRETS_PATH)) return;
  const content = fs.readFileSync(SECRETS_PATH, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    const isSecret = REDIS_KEYS.includes(key);
    if (forceOverwrite && isSecret) process.env[key] = value;
    else if (!process.env[key]) process.env[key] = value;
  }
}

const PORT = Number(process.env.PORT) || 3000;
const queues = ["ai-scoring", "negotiation-suggestions", "llm-processing"];
const stats = { processed: 0, failed: 0, lastJob: null };

function getRedisConnection() {
  const url = getRequiredEnv("REDIS_URL");
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port, 10) || 6379,
    username: u.username || undefined,
    password: u.password || undefined,
    ...(u.pathname && u.pathname !== "/" ? { db: parseInt(u.pathname.slice(1), 10) || 0 } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

function processJob(job) {
  stats.processed += 1;
  stats.lastJob = { name: job.name, id: job.id, timestamp: new Date().toISOString() };
  console.log(`[AI] Job ${job.name} ${job.id} completed (stub)`);
  return { ok: true };
}

let workers = [];

function startWorkers() {
  const conn = getRedisConnection();
  const prefix = process.env.BULLMQ_PREFIX?.trim() || process.env.REDIS_PREFIX?.trim();
  if (!prefix) throw new Error("Missing required environment variable: BULLMQ_PREFIX or REDIS_PREFIX");
  workers = queues.map(
    (name) =>
      new Worker(
        name,
        async (job) => {
          try {
            return await processJob(job);
          } catch (err) {
            stats.failed += 1;
            throw err;
          }
        },
        { connection: conn, prefix, concurrency: 2 },
      ),
  );
  workers.forEach((w) => {
    w.on("failed", (_, err) => console.error("[AI] Job failed:", err.message));
    w.on("error", (err) => console.error("[AI] Worker error:", err));
  });
}

async function stopWorkers() {
  await Promise.all(workers.map((w) => w.close()));
  workers = [];
}

async function reloadWorkersFromSecrets() {
  if (!fs.existsSync(SECRETS_PATH)) return;
  const content = fs.readFileSync(SECRETS_PATH, "utf-8");
  if (!content.includes(OPENBAO_READY_MARKER)) return;
  loadSecretsFromFile(true);
  await stopWorkers();
  startWorkers();
}

loadSecretsFromFile();
startWorkers();

const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/health/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        service: "cerniq-worker-ai",
        status: "running",
        queues,
        ...stats,
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Cerniq AI Worker", queues }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Worker listening on ${PORT}, queues: ${queues.join(", ")}`);
});

process.on("SIGHUP", async () => {
  console.log("[AI] SIGHUP: reloading secrets and Redis connection...");
  try {
    await reloadWorkersFromSecrets();
    console.log("[AI] Secrets and Redis connection reloaded.");
  } catch (err) {
    console.error("[AI] SIGHUP reload failed:", err);
  }
});

fs.watchFile(SECRETS_PATH, { interval: 2000 }, async (curr, prev) => {
  if (curr.mtimeMs === prev.mtimeMs) return;
  try {
    await reloadWorkersFromSecrets();
    console.log("[AI] Secret file change detected and reloaded.");
  } catch (err) {
    console.error("[AI] Secret file reload failed:", err);
  }
});

async function shutdown() {
  fs.unwatchFile(SECRETS_PATH);
  server.close();
  await stopWorkers();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
