import { envConfig, refreshEnvConfig } from "./config.js";
import { initTelemetry, shutdownTelemetry } from "@cerniq/observability";
import { refreshDbConnection, closeDbConnection } from "@cerniq/db";
import { buildApp } from "./app.js";

initTelemetry({
  serviceName: "cerniq-api",
  otlpEndpoint: envConfig.OTEL_EXPORTER_OTLP_ENDPOINT,
});

async function main() {
  const app = await buildApp();

  process.on("unhandledRejection", (reason, promise) => {
    app.log.fatal({ err: reason, promise }, "Unhandled rejection");
    process.exit(1);
  });

  process.on("uncaughtException", (err) => {
    app.log.fatal(err, "Uncaught exception");
    process.exit(1);
  });

  try {
    await app.listen({ port: envConfig.PORT, host: "0.0.0.0" });
    app.log.info(`API server listening on port ${envConfig.PORT}`);
  } catch (err) {
    app.log.fatal(err, "Failed to start server");
    process.exit(1);
  }

  process.on("SIGHUP", async () => {
    app.log.info("SIGHUP received, reloading secrets and DB connection...");
    try {
      refreshEnvConfig();
      await refreshDbConnection();
      app.log.info("Secrets and DB connection reloaded successfully.");
    } catch (err) {
      app.log.error(err, "Failed to reload secrets/DB connection");
    }
  });

  const shutdown = async (signal: string) => {
    app.log.info(
      `Received ${signal}, shutting down gracefully (timeout ${envConfig.SHUTDOWN_TIMEOUT_MS}ms)...`,
    );
    const t = setTimeout(() => {
      app.log.warn("Shutdown timeout reached, exiting");
      process.exit(1);
    }, envConfig.SHUTDOWN_TIMEOUT_MS);

    try {
      await app.close();
      await closeDbConnection();
      await shutdownTelemetry();
      clearTimeout(t);
      app.log.info("Shutdown complete");
      process.exit(0);
    } catch (err) {
      app.log.error(err, "Error during shutdown");
      clearTimeout(t);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
