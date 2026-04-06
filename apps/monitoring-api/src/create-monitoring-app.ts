import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import type { QueueControlAction, QueueSnapshot } from "./queue-monitor.js";

export type MonitoringMonitor = {
  getAllQueues: () => Promise<QueueSnapshot[]>;
  getQueue: (name: string) => Promise<QueueSnapshot>;
  controlQueue: (name: string, action: QueueControlAction) => Promise<QueueSnapshot>;
};

/** Referință mutabilă pentru reload SIGHUP / secrets fără recreare Fastify. */
export type MonitorRef = { current: MonitoringMonitor };

export type MonitoringMetrics = { collect: () => Record<string, unknown> };

export type BuildMonitoringAppOptions = {
  monitorRef: MonitorRef;
  metrics: MonitoringMetrics;
  /** `false` dezactivează logger-ul (teste). */
  logger?: FastifyServerOptions["logger"];
};

function defaultLoggerConfig(): Exclude<FastifyServerOptions["logger"], undefined> {
  return {
    level: process.env.LOG_LEVEL ?? "info",
    transport: process.env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
  };
}

/**
 * Aplicație Fastify fără `listen` — folosită în producție (`index.ts`) și în teste (`inject`).
 */
export async function buildMonitoringApp(
  options: BuildMonitoringAppOptions,
): Promise<FastifyInstance> {
  const loggerOpt = options.logger ?? defaultLoggerConfig();
  const app = Fastify({
    logger: loggerOpt === false ? false : loggerOpt,
  });

  const { monitorRef, metrics } = options;

  await app.register(cors, { origin: true });
  await app.register(websocket);

  app.get("/api/queues", async () => ({
    success: true,
    data: await monitorRef.current.getAllQueues(),
  }));

  app.get("/api/queues/:name", async (request) => {
    const { name } = request.params as { name: string };
    return { success: true, data: await monitorRef.current.getQueue(name) };
  });

  app.get("/api/system/metrics", async () => ({
    success: true,
    data: metrics.collect(),
  }));

  app.get<{ Querystring: { limit?: string } }>("/api/logs", async (request) => {
    const raw = request.query?.limit;
    const parsed = raw !== undefined && raw !== "" ? Number(raw) : Number.NaN;
    const limit = Number.isFinite(parsed) ? Math.min(500, Math.max(1, Math.trunc(parsed))) : 100;
    return {
      success: true,
      data: [] as Array<{ timestamp: string; level: string; message: string; source?: string }>,
      meta: {
        limit,
        source: "stub",
        hint: "Integrare logs centrală ne-cabelată; nu returnăm linii inventate.",
      },
    };
  });

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
      const snapshot = await monitorRef.current.controlQueue(request.params.name, action);
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
              queues: await monitorRef.current.getAllQueues(),
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

  return app;
}
