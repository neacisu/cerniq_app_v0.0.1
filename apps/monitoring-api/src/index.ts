import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { readFileSync, existsSync, watchFile, unwatchFile } from "node:fs";
import { queueMonitor } from "./queue-monitor.js";
import { systemMetrics } from "./system-metrics.js";

const OPENBAO_READY_MARKER = "OPENBAO_SECRETS_LOADED=true";

function loadSecrets(forceOverwrite = false): void {
  const secretsPath = process.env.SECRETS_PATH ?? "/secrets/api.env";
  if (!existsSync(secretsPath)) {
    console.warn(`Secrets file not found: ${secretsPath} — using env vars only`);
    return;
  }
  const content = readFileSync(secretsPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (forceOverwrite) {
      process.env[key] = value;
    } else if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadSecrets();

const PORT = Number(process.env.PORT ?? 64080);
const REDIS_URL: string = process.env.REDIS_URL ?? "";

if (!REDIS_URL) {
  console.error("REDIS_URL is required. Ensure OpenBao agent has rendered secrets.");
  process.exit(1);
}

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport: process.env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
  },
});

async function start() {
  await app.register(cors, { origin: true });
  await app.register(websocket);

  let monitor = queueMonitor(REDIS_URL);
  const metrics = systemMetrics();

  const reloadMonitorFromSecrets = () => {
    const secretsPath = process.env.SECRETS_PATH ?? "/secrets/api.env";
    if (!existsSync(secretsPath)) return;
    const content = readFileSync(secretsPath, "utf-8");
    if (!content.includes(OPENBAO_READY_MARKER)) return;
    loadSecrets(true);
    const nextRedisUrl = process.env.REDIS_URL ?? "";
    if (!nextRedisUrl) return;
    monitor = queueMonitor(nextRedisUrl);
    app.log.info("Monitoring secrets reloaded and queue monitor refreshed.");
  };

  const secretsPath = process.env.SECRETS_PATH ?? "/secrets/api.env";
  watchFile(secretsPath, { interval: 2000 }, (curr, prev) => {
    if (curr.mtimeMs === prev.mtimeMs && curr.size === prev.size) return;
    try {
      reloadMonitorFromSecrets();
    } catch (error) {
      app.log.error({ err: error }, "Monitoring secrets reload failed.");
    }
  });

  process.on("SIGHUP", () => {
    app.log.info("SIGHUP received, reloading monitoring secrets...");
    try {
      reloadMonitorFromSecrets();
    } catch (error) {
      app.log.error({ err: error }, "Monitoring SIGHUP reload failed.");
    }
  });

  app.get("/api/queues", async () => ({
    success: true,
    data: await monitor.getAllQueues(),
  }));
  app.get("/api/queues/:name", async (request) => {
    const { name } = request.params as { name: string };
    return { success: true, data: await monitor.getQueue(name) };
  });
  app.get("/api/system/metrics", async () => ({
    success: true,
    data: metrics.collect(),
  }));

  app.post("/api/control/pause", async (request, reply) => {
    const adminKey = request.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_KEY) {
      return reply.status(403).send({ success: false, error: "Forbidden" });
    }
    const { queue, action } = request.body as {
      queue: string;
      action: "pause" | "resume";
    };
    await monitor.controlQueue(queue, action);
    return { success: true };
  });

  app.register(async function wsRoutes(fastify) {
    fastify.get("/ws/live", { websocket: true }, (socket) => {
      const interval = setInterval(async () => {
        try {
          const data = {
            type: "METRIC_UPDATE",
            queues: await monitor.getAllQueues(),
            system: metrics.collect(),
            timestamp: new Date().toISOString(),
          };
          socket.send(JSON.stringify(data));
        } catch {
          /* client disconnected */
        }
      }, 2000);

      socket.on("close", () => clearInterval(interval));
    });
  });

  app.get("/health/live", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  app.addHook("onClose", (_instance, done) => {
    unwatchFile(secretsPath);
    done();
  });

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`Monitoring API listening on port ${PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
