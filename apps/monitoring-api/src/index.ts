import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { readFileSync, existsSync, watchFile, unwatchFile } from "node:fs";
import { loadSecretsFromFile } from "@cerniq/worker-shared";
import { queueMonitor, type QueueControlAction } from "./queue-monitor.js";
import { systemMetrics } from "./system-metrics.js";

const OPENBAO_READY_MARKER = "OPENBAO_SECRETS_LOADED=true";

loadSecretsFromFile(false, process.env.SECRETS_PATH ?? "/secrets/api.env", {
  universalOverwrite: false,
});

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
    loadSecretsFromFile(true, secretsPath, { universalOverwrite: true });
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
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  async function handleControl(
    request: FastifyRequest<{ Params: { name: string } }>,
    reply: FastifyReply,
    action: QueueControlAction,
  ) {
    const adminKey = request.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_KEY) {
      return reply.status(403).send({ success: false, error: "Forbidden" });
    }
    try {
      const snapshot = await monitor.controlQueue(request.params.name, action);
      return { success: true, data: snapshot };
    } catch (error) {
      return reply.status(404).send({
        success: false,
        error: error instanceof Error ? error.message : "Queue control failed",
      });
    }
  }

  app.post("/api/queues/:name/pause", async (request, reply) =>
    handleControl(request as FastifyRequest<{ Params: { name: string } }>, reply, "pause"),
  );
  app.post("/api/queues/:name/resume", async (request, reply) =>
    handleControl(request as FastifyRequest<{ Params: { name: string } }>, reply, "resume"),
  );
  app.post("/api/queues/:name/retry-failed", async (request, reply) =>
    handleControl(request as FastifyRequest<{ Params: { name: string } }>, reply, "retry-failed"),
  );
  app.post("/api/queues/:name/drain", async (request, reply) =>
    handleControl(request as FastifyRequest<{ Params: { name: string } }>, reply, "drain"),
  );

  app.register(async function wsRoutes(fastify) {
    fastify.get("/ws/live", { websocket: true }, (socket) => {
      const interval = setInterval(async () => {
        try {
          const data = {
            type: "METRIC_UPDATE",
            payload: {
              timestamp: Date.now(),
              queues: await monitor.getAllQueues(),
              system: metrics.collect(),
            },
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
