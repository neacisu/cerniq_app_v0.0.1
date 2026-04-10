import { loadSecretsFromFile, watchSecretsFile } from "@cerniq/worker-shared";
import { createServiceLogger, initTelemetry } from "@cerniq/observability";

const monitoringBootstrapLog = createServiceLogger("monitoring-api");

const MONITORING_SECRETS_PATH = process.env.SECRETS_PATH ?? "/secrets/api.env";

loadSecretsFromFile(false, MONITORING_SECRETS_PATH, { exitOnMissing: false });

const OTEL_BASE =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() || "https://otel-cerniq.neanelu.ro";
initTelemetry({
  serviceName: "cerniq-monitoring-api",
  otlpEndpoint: OTEL_BASE,
});

const { queueMonitor } = await import("./queue-monitor.js");
const { systemMetrics } = await import("./system-metrics.js");
const { buildMonitoringApp } = await import("./create-monitoring-app.js");

const PORT = Number(process.env.PORT ?? 64080);
const REDIS_URL: string = process.env.REDIS_URL ?? "";

if (!REDIS_URL) {
  monitoringBootstrapLog.error({
    event: "redis_url_missing",
    msg: "REDIS_URL is required. Ensure OpenBao agent has rendered secrets.",
  });
  process.exit(1);
}

const monitorRef = { current: queueMonitor(REDIS_URL) };
const metrics = systemMetrics();

async function start() {
  const app = await buildMonitoringApp({ monitorRef, metrics });

  const reloadMonitorFromSecrets = () => {
    loadSecretsFromFile(true, MONITORING_SECRETS_PATH);
    const nextRedisUrl = process.env.REDIS_URL ?? "";
    if (!nextRedisUrl) return;
    monitorRef.current = queueMonitor(nextRedisUrl);
    app.log.info("Monitoring secrets reloaded and queue monitor refreshed.");
  };

  const unwatchSecrets = watchSecretsFile(MONITORING_SECRETS_PATH, reloadMonitorFromSecrets);

  process.on("SIGHUP", () => {
    app.log.info("SIGHUP received, reloading monitoring secrets...");
    try {
      reloadMonitorFromSecrets();
    } catch (error) {
      app.log.error({ err: error }, "Monitoring SIGHUP reload failed.");
    }
  });

  app.addHook("onClose", (_instance, done) => {
    unwatchSecrets();
    done();
  });

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`Monitoring API listening on port ${PORT}`);
}

try {
  await start();
} catch (err) {
  monitoringBootstrapLog.error({ err, event: "monitoring_start_failed" }, "start() failed");
  process.exit(1);
}
