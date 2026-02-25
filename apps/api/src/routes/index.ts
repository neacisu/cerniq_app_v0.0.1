import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";
import { authRoutes } from "./auth.js";
import { adminMonitoringRoutes } from "./admin-monitoring.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(adminMonitoringRoutes, { prefix: "/api/admin" });

  app.get("/", async () => ({
    success: true,
    data: {
      name: "Cerniq API",
      version: "0.0.1",
      status: "running",
    },
  }));
}
