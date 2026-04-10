/**
 * Verifică că shim-urile `src/*` către `apps/api` se rezolvă sub `tsconfig.json` rădăcină
 * (TS2307 pe @opentelemetry/api / fastify-plugin fără dependențe hoisted la root).
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const requireFromMonorepoRoot = createRequire(new URL("../../package.json", import.meta.url));
import { errorHandler } from "../../src/errors/handler.js";
import { metricsPlugin } from "../../src/metrics.js";
import { auditTrailPlugin } from "../../src/plugins/audit-trail.js";
import { requestLoggingPlugin } from "../../src/plugins/request-logging.js";
import { initTelemetry, shutdownTelemetry } from "../../src/init.js";
import { createServiceLogger } from "../../src/logger.js";
import { computeAuditEventHash } from "../../src/audit-writer.js";
import { createJobLogger } from "../../src/job-logger.js";
import { monitoringInternalFetch } from "../../src/lib/monitoring-internal-fetch.js";
import { metricsPlugin as metricsPluginFull } from "../../src/plugins/metrics.js";
import cognitiveBrainRoutes from "../../src/routes/cognitive-brain.js";
import { dashboardRoutes } from "../../src/routes/dashboard.js";
import { importLogsStreamRoutes } from "../../src/routes/import-logs-stream.js";
import { outreachRoutes } from "../../src/routes/outreach.js";
import {
  insertAuditLogRows,
  insertJobLogRows,
} from "../../packages/db/src/observability-buffer-inserts.js";

describe("root src/ → apps/api shims", () => {
  it("Node poate rezolva @opentelemetry/api și fastify-plugin din rădăcina monorepo-ului", () => {
    expect(() => requireFromMonorepoRoot.resolve("@opentelemetry/api")).not.toThrow();
    expect(() => requireFromMonorepoRoot.resolve("@opentelemetry/instrumentation")).not.toThrow();
    expect(() =>
      requireFromMonorepoRoot.resolve("@opentelemetry/auto-instrumentations-node"),
    ).not.toThrow();
    expect(() =>
      requireFromMonorepoRoot.resolve("@opentelemetry/instrumentation-http"),
    ).not.toThrow();
    expect(() => requireFromMonorepoRoot.resolve("@fastify/otel")).not.toThrow();
    expect(() => requireFromMonorepoRoot.resolve("fastify-plugin")).not.toThrow();
    expect(() => requireFromMonorepoRoot.resolve("@fastify/jwt")).not.toThrow();
    expect(() => requireFromMonorepoRoot.resolve("drizzle-orm")).not.toThrow();
  });

  it("package.json rădăcină declară dependențe pentru proiectul src/ (shim-uri API)", () => {
    const raw = readFileSync(new URL("../../package.json", import.meta.url), "utf8");
    const pkg = JSON.parse(raw) as { devDependencies?: Record<string, string> };
    expect(pkg.devDependencies?.["fastify-plugin"]).toBeDefined();
    expect(pkg.devDependencies?.["@fastify/jwt"]).toBeDefined();
    expect(pkg.devDependencies?.["@opentelemetry/api"]).toBeDefined();
    expect(pkg.devDependencies?.["@opentelemetry/instrumentation"]).toBeDefined();
    expect(pkg.devDependencies?.["@fastify/otel"]).toBeDefined();
    expect(pkg.devDependencies?.["@opentelemetry/auto-instrumentations-node"]).toBeDefined();
    expect(pkg.devDependencies?.["@opentelemetry/instrumentation-http"]).toBeDefined();
    expect(pkg.devDependencies?.["pino"]).toBeDefined();
    expect(pkg.devDependencies?.["drizzle-orm"]).toBe("0.45.2");
  });

  it("exportă handlerul de erori", () => {
    expect(typeof errorHandler).toBe("function");
  });

  it("exportă pluginul metrics", () => {
    expect(metricsPlugin).toBeDefined();
  });

  it("exportă pluginurile audit și request logging", () => {
    expect(auditTrailPlugin).toBeDefined();
    expect(requestLoggingPlugin).toBeDefined();
  });

  it("shim-uri observability (init, logger, audit-writer, job-logger) se rezolvă", () => {
    expect(typeof initTelemetry).toBe("function");
    expect(typeof shutdownTelemetry).toBe("function");
    expect(typeof createServiceLogger).toBe("function");
    expect(typeof computeAuditEventHash).toBe("function");
    expect(typeof createJobLogger).toBe("function");
  });

  it("shim-uri apps/api: lib/monitoring-internal-fetch, plugins/metrics (catalog), rute", () => {
    expect(typeof monitoringInternalFetch).toBe("function");
    expect(metricsPluginFull).toBeDefined();
    expect(typeof cognitiveBrainRoutes).toBe("function");
    expect(typeof dashboardRoutes).toBe("function");
    expect(typeof importLogsStreamRoutes).toBe("function");
    expect(typeof outreachRoutes).toBe("function");
  });

  it("pachetul db: insertAuditLogRows / insertJobLogRows (sursă, paritate export index)", () => {
    expect(typeof insertAuditLogRows).toBe("function");
    expect(typeof insertJobLogRows).toBe("function");
  });
});
