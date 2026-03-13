import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";
import { authRoutes } from "./auth.js";
import { adminMonitoringRoutes } from "./admin-monitoring.js";
import { enrichmentRoutes } from "./enrichment.js";
import { dashboardRoutes } from "./dashboard.js";
import { importsBronzeRoutes } from "./imports-bronze.js";
import { silverGoldRoutes } from "./silver-gold.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(adminMonitoringRoutes, { prefix: "/api/admin" });
  await app.register(enrichmentRoutes, { prefix: "/api/v1/enrichment" });
  await app.register(dashboardRoutes, { prefix: "/api/v1/dashboard" });
  await app.register(importsBronzeRoutes, { prefix: "/api/v1" });
  await app.register(silverGoldRoutes, { prefix: "/api/v1" });

  app.get("/", async () => ({
    success: true,
    data: {
      name: "Cerniq API",
      version: "0.0.1",
      status: "running",
    },
  }));
}
