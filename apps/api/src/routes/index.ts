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
// E3 AI Sales routes
import { negotiationRoutes } from "./negotiation.js";
import { productRoutes } from "./product.js";
import { fiscalRoutes } from "./fiscal.js";
// E4 Post-Sale routes
import { orderRoutes } from "./order.js";
import { creditRoutes } from "./credit.js";
import { contractRoutes } from "./contract.js";
import { shipmentRoutes } from "./shipment.js";
// E5 Nurturing routes
import { nurturingRoutes } from "./nurturing.js";
import { referralRoutes } from "./referral.js";
import { churnRoutes } from "./churn.js";
import { graphRoutes } from "./graph.js";
import { e5AlertRoutes } from "./e5-alert.js";
import { gdprRoutes } from "./gdpr.js";
import { adminLlmCostsRoutes } from "./admin-llm-costs.js";
import { importLogsStreamRoutes } from "./import-logs-stream.js";
import { aiGuardrailsRoutes } from "./ai-guardrails.js";
import { postsaleRoutes } from "./postsale.js";
import { notificationsRoutes } from "./notifications.js";
import { systemProcessesRoutes } from "./system-processes.js";
import { clientErrorsRoutes } from "./client-errors.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(clientErrorsRoutes, { prefix: "/api/v1" });
  await app.register(notificationsRoutes, { prefix: "/api/v1/notifications" });
  await app.register(systemProcessesRoutes, { prefix: "/api/v1/system" });
  await app.register(adminMonitoringRoutes, { prefix: "/api/admin" });
  await app.register(enrichmentRoutes, { prefix: "/api/v1/enrichment" });
  await app.register(dashboardRoutes, { prefix: "/api/v1/dashboard" });
  await app.register(importsBronzeRoutes, { prefix: "/api/v1" });
  await app.register(importLogsStreamRoutes, { prefix: "/api/v1" });
  await app.register(silverGoldRoutes, { prefix: "/api/v1" });
  await app.register(outreachRoutes, { prefix: "/api/v1/outreach" });
  await app.register(webhooksRoutes, { prefix: "/api/v1/webhooks" });
  await app.register(complianceRoutes, { prefix: "/api/v1/ai" });
  await app.register(aiGuardrailsRoutes, { prefix: "/api/v1/ai" });
  await app.register(cognitiveBrainRoutes, { prefix: "/api/v1/brain" });
  // E3 AI Sales
  await app.register(negotiationRoutes, { prefix: "/api/v1/negotiation" });
  /** Alias REST plural — același contract ca `/negotiation` (specificații + suite E3). */
  await app.register(negotiationRoutes, { prefix: "/api/v1/negotiations" });
  await app.register(productRoutes, { prefix: "/api/v1/products" });
  await app.register(fiscalRoutes, { prefix: "/api/v1/fiscal" });
  // E4 Post-Sale
  await app.register(orderRoutes, { prefix: "/api/v1/orders" });
  await app.register(creditRoutes, { prefix: "/api/v1/credit" });
  await app.register(contractRoutes, { prefix: "/api/v1/contracts" });
  await app.register(shipmentRoutes, { prefix: "/api/v1/shipments" });
  await app.register(postsaleRoutes, { prefix: "/api/v1/postsale" });
  // E5 Nurturing
  await app.register(nurturingRoutes, { prefix: "/api/v1/nurturing" });
  await app.register(referralRoutes, { prefix: "/api/v1/referrals" });
  await app.register(churnRoutes, { prefix: "/api/v1/churn" });
  await app.register(graphRoutes, { prefix: "/api/v1/graph" });
  await app.register(e5AlertRoutes, { prefix: "/api/v1/e5/alerts" });
  await app.register(gdprRoutes, { prefix: "/api/v1/gdpr" });
  await app.register(adminLlmCostsRoutes, { prefix: "/api/v1/admin" });

  app.get("/", async () => ({
    success: true,
    data: {
      name: "Cerniq API",
      version: "0.0.1",
      status: "running",
    },
  }));
}
