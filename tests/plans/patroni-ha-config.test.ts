/**
 * Validare minimă config Patroni / PgBouncer / Prometheus — fără a presupune runtime pe CT107.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const PATRONI_DIR = path.join(ROOT, "infra", "config", "patroni");

describe("Patroni HA — fișiere infra", () => {
  it("patroni.yml — același scope/etcd ca standby, primary CT107", () => {
    const s = readFileSync(path.join(PATRONI_DIR, "patroni.yml"), "utf8");
    expect(s).toContain("scope: cerniq-pg");
    expect(s).toContain("name: ct107-primary");
    expect(s).toContain("etcd3:");
    expect(s).toContain("ct108-etcd:2379");
    expect(s).toContain("scram-sha-256");
  });

  it("patroni-standby.yml — același scope, nod CT108", () => {
    const s = readFileSync(path.join(PATRONI_DIR, "patroni-standby.yml"), "utf8");
    expect(s).toContain("scope: cerniq-pg");
    expect(s).toContain("name: ct108-standby");
    expect(s).toContain("10.0.1.108:8008");
  });

  it("prometheus.yml — job cerniq-patroni scrape pe CT107 și CT108", () => {
    const s = readFileSync(
      path.join(ROOT, "infra", "config", "prometheus", "prometheus.yml"),
      "utf8",
    );
    const job = s.split("job_name: cerniq-patroni")[1]?.split("job_name:")[0] ?? "";
    expect(job).toContain("10.0.1.107:8008");
    expect(job).toContain("10.0.1.108:8008");
  });

  it("infra-cerniq-alerts.yml — alerte PatroniLeaderMissing / PatroniReplicaLag / PatroniFailover", () => {
    const s = readFileSync(
      path.join(ROOT, "infra", "config", "prometheus", "infra-cerniq-alerts.yml"),
      "utf8",
    );
    expect(s).toContain("PatroniLeaderMissing");
    expect(s).toContain("patroni_primary");
    expect(s).toContain("PatroniReplicaLag");
    expect(s).toContain("patroni_xlog_received_location");
    expect(s).toContain("PatroniFailover");
    expect(s).toContain("patroni_postgres_timeline");
  });

  it("pgbouncer-ini.tpl — host backend configurabil prin pgbouncer_postgres_host", () => {
    const s = readFileSync(
      path.join(ROOT, "infra", "config", "openbao", "templates", "pgbouncer-ini.tpl"),
      "utf8",
    );
    expect(s).toContain("pgbouncer_postgres_host");
    expect(s).toContain("* = host=");
  });
});
