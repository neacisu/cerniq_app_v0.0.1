import { existsSync, statSync, readFileSync, watchFile, unwatchFile } from "node:fs";
import { envConfig, refreshEnvConfig } from "./config.js";
import { initTelemetry, shutdownTelemetry } from "@cerniq/observability";
import {
  refreshDbConnection,
  closeDbConnection,
  runMigrations,
  runDrizzleMigrations,
} from "@cerniq/db";
import { buildApp } from "./app.js";
import { refreshRedisClient, closeRedisClient } from "./lib/refresh-token-store.js";
import { refreshRateLimitRedis } from "./plugins/index.js";
import { resetHealthRedis } from "./routes/health.js";
import {
  secretsFileAgeSeconds,
  secretsLastReloadTimestamp,
  secretsReloadTotal,
} from "./plugins/metrics.js";

function watchSecretsFile(
  path: string,
  onReload: () => void | Promise<void>,
  pollIntervalMs = 2000,
): () => void {
  let reloading = false;
  watchFile(path, { interval: pollIntervalMs }, async (curr, prev) => {
    if (reloading) return;
    if (curr.mtimeMs === prev.mtimeMs && curr.size === prev.size) return;
    if (!existsSync(path)) return;
    const content = readFileSync(path, "utf-8");
    if (!content.includes("OPENBAO_SECRETS_LOADED=true")) return;
    reloading = true;
    try {
      await onReload();
    } finally {
      reloading = false;
    }
  });
  return () => unwatchFile(path);
}

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

const app = await buildApp();

process.on("unhandledRejection", (reason, promise) => {
  app.log.fatal({ err: reason, promise }, "Unhandled rejection");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  app.log.fatal(err, "Uncaught exception");
  process.exit(1);
});

let isDraining = false;
let isReloading = false;

app.addHook("onRequest", async (request, reply) => {
  if (!isDraining) return;
  const payload = {
    status: "reloading",
    message: "Service is reloading credentials, retry shortly.",
    timestamp: new Date().toISOString(),
  };
  reply.status(503).send(payload);
});

try {
  await app.listen({ port: envConfig.PORT, host: "0.0.0.0" });
  app.log.info(`API server listening on port ${envConfig.PORT}`);
} catch (err) {
  app.log.fatal(err, "Failed to start server");
  process.exit(1);
}

const reloadAll = async () => {
  if (isReloading) return;
  isReloading = true;
  isDraining = true;
  app.log.info("Reloading secrets and service connections...");
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    refreshEnvConfig();
    await refreshDbConnection();
    await refreshRedisClient();
    await refreshRateLimitRedis();
    await resetHealthRedis();
    secretsReloadTotal.inc({ service: "api", status: "success" });
    secretsLastReloadTimestamp.set({ service: "api" }, Math.floor(Date.now() / 1000));
    app.log.info("Secrets and service connections reloaded successfully.");
  } catch (err) {
    secretsReloadTotal.inc({ service: "api", status: "failed" });
    app.log.error(err, "Failed to reload secrets/service connections");
  } finally {
    isDraining = false;
    isReloading = false;
  }
};

const secretsPath = process.env.SECRETS_PATH ?? "/secrets/api.env";
const updateSecretsFileAge = () => {
  if (!existsSync(secretsPath)) return;
  const ageSeconds = Math.max(0, Math.floor((Date.now() - statSync(secretsPath).mtimeMs) / 1000));
  secretsFileAgeSeconds.set({ service: "api" }, ageSeconds);
};
updateSecretsFileAge();
const ageInterval = setInterval(updateSecretsFileAge, 30000);
const stopSecretsWatch = watchSecretsFile(secretsPath, reloadAll, 2000);

process.on("SIGHUP", async () => {
  app.log.info("SIGHUP received, triggering secrets reload...");
  await reloadAll();
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
    stopSecretsWatch();
    clearInterval(ageInterval);
    await app.close();
    await closeDbConnection();
    await closeRedisClient();
    await resetHealthRedis();
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
