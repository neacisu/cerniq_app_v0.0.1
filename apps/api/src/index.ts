/**
 * Punct de intrare API: încarcă config + pornește OTel înainte de orice modul care importă Fastify.
 * Vezi: docs/developer-guide/http-server-opentelemetry-enterprise.md
 */
import { envConfig } from "./config.js";
import { initTelemetry } from "@cerniq/observability";
import { runMigrations, runDrizzleMigrations } from "@cerniq/db";

initTelemetry({
  serviceName: "cerniq-api",
  otlpEndpoint: envConfig.OTEL_EXPORTER_OTLP_ENDPOINT,
});

if (envConfig.NODE_ENV === "development") {
  try {
    await runMigrations();
    await runDrizzleMigrations();
    console.log("Development: migrations applied.");
  } catch (err) {
    console.error("Development: migrations failed (continuing anyway):", err);
  }
}

await import("./server-runtime.js");
