/**
 * Punct de intrare API: încarcă config + pornește OTel înainte de orice modul care importă Fastify.
 * Vezi: docs/developer-guide/http-server-opentelemetry-enterprise.md
 */
import { envConfig } from "./config.js";
import { createServiceLogger, initTelemetry } from "@cerniq/observability";
import { runMigrations, runDrizzleMigrations } from "@cerniq/db";

initTelemetry({
  serviceName: "cerniq-api",
  otlpEndpoint: envConfig.OTEL_EXPORTER_OTLP_ENDPOINT,
});

const apiBootstrapLog = createServiceLogger("api-server");

if (envConfig.NODE_ENV === "development") {
  try {
    await runMigrations();
    await runDrizzleMigrations();
    apiBootstrapLog.info({ event: "dev_migrations_applied" }, "Development: migrations applied.");
  } catch (err) {
    apiBootstrapLog.error(
      { err, event: "dev_migrations_failed" },
      "Development: migrations failed (continuing anyway)",
    );
  }
}

await import("./server-runtime.js");
