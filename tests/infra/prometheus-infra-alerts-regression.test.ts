/**
 * Regresie pentru reguli Prometheus infra — metrici reale (cAdvisor, pgbouncer-exporter, worker shared).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const ALERTS = path.join(ROOT, "infra", "config", "prometheus", "infra-cerniq-alerts.yml");

describe("infra-cerniq-alerts.yml — regresii metrici / expr", () => {
  it("nu folosește metrici cAdvisor inexistente pentru restart-uri", () => {
    const s = readFileSync(ALERTS, "utf8");
    expect(s).not.toContain("container_restart_count");
    expect(s).toContain("container_start_time_seconds");
    expect(s).toContain("CerniqContainerRestarting");
  });

  it("PgBouncer: nume aliniate cu prometheuscommunity/pgbouncer-exporter (pools + config)", () => {
    const s = readFileSync(ALERTS, "utf8");
    const block = s.split("PgBouncerPoolExhausted")[1]?.split("- alert:")[0] ?? "";
    expect(block).toContain("pgbouncer_pools_client_waiting_connections");
    expect(block).toContain("pgbouncer_pools_client_active_connections");
    expect(block).toContain("pgbouncer_config_max_client_connections");
    expect(block).not.toContain("pgbouncer_pool_client_wait_ratio");
  });

  it("NeuronStaleFiring: throughput zero cu backlog (nu absent() pe increase)", () => {
    const s = readFileSync(ALERTS, "utf8");
    const block = s.split("NeuronStaleFiring")[1]?.split("- alert:")[0] ?? "";
    expect(block).not.toContain("absent(increase(cerniq_worker_jobs_processed_total");
    expect(block).toContain('queue=~"ai:.*"');
    expect(block).toContain("cerniq_worker_queue_depth");
    expect(block).toContain("sum(increase(cerniq_worker_jobs_processed_total");
  });
});
