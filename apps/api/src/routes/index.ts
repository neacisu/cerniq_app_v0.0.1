import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";
import { authRoutes } from "./auth.js";
import { adminMonitoringRoutes } from "./admin-monitoring.js";
import { enrichmentRoutes } from "./enrichment.js";
import { dashboardRoutes } from "./dashboard.js";
import { importsBronzeRoutes } from "./imports-bronze.js";
import { silverGoldRoutes } from "./silver-gold.js";
import { outreachRoutes } from "./outreach.js";
import { webhooksRoutes } from "./webhooks.js";
import { complianceRoutes } from "./compliance.js";
import cognitiveBrainRoutes from "./cognitive-brain.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(adminMonitoringRoutes, { prefix: "/api/admin" });
  await app.register(enrichmentRoutes, { prefix: "/api/v1/enrichment" });
  await app.register(dashboardRoutes, { prefix: "/api/v1/dashboard" });
  await app.register(importsBronzeRoutes, { prefix: "/api/v1" });
  await app.register(silverGoldRoutes, { prefix: "/api/v1" });
  await app.register(outreachRoutes, { prefix: "/api/v1/outreach" });
  await app.register(webhooksRoutes, { prefix: "/api/v1/webhooks" });
  await app.register(complianceRoutes, { prefix: "/api/v1/ai" });
  await app.register(cognitiveBrainRoutes, { prefix: "/api/v1/brain" });

  app.get("/", async () => ({
    success: true,
    data: {
      name: "Cerniq API",
      version: "0.0.1",
      status: "running",
    },
  }));
}
