/**
 * E0-S2-PR02: External PostgreSQL (CT107) + PgBouncer (auth_query)
 * ===============================================================
 *
 * New infrastructure model:
 * - PostgreSQL runs on CT107 (10.0.1.107:5432), not as a local docker service.
 * - Cerniq CT109/CT110 run PgBouncer locally and connect to CT107.
 * - PgBouncer authentication is dynamic (auth_query) and secrets are rendered
 *   by OpenBao agents (no plaintext postgres_password.txt artifacts in repo).
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/var/www/CerniqAPP";

function fileExists(filePath: string): boolean {
  return fs.existsSync(path.join(WORKSPACE_ROOT, filePath));
}

function readFile(filePath: string): string {
  const fullPath = path.join(WORKSPACE_ROOT, filePath);
  if (!fs.existsSync(fullPath)) return "";
  return fs.readFileSync(fullPath, "utf-8");
}

function parseYaml<T>(content: string): T | null {
  try {
    return yaml.parse(content) as T;
  } catch {
    return null;
  }
}

describe("F0.2: External PostgreSQL via CT107", () => {
  it("base compose should NOT define a postgres service (externalized)", () => {
    const compose = parseYaml<Record<string, unknown>>(
      readFile("infra/docker/docker-compose.yml"),
    );
    expect(compose).not.toBeNull();
    const services = (compose as Record<string, unknown>).services as
      | Record<string, unknown>
      | undefined;
    expect(services || {}).not.toHaveProperty("postgres");
  });

  it("repo should include CT107 init SQL (idempotent)", () => {
    expect(fileExists("infra/config/postgres/init-ct107.sql")).toBe(true);
  });
});

describe("F0.2: PgBouncer external PG", () => {
  it("docker-compose.yml should define pgbouncer service", () => {
    const compose = parseYaml<Record<string, unknown>>(
      readFile("infra/docker/docker-compose.yml"),
    );
    expect(compose).not.toBeNull();
    const services = (compose as Record<string, unknown>).services as Record<
      string,
      unknown
    >;
    expect(services).toHaveProperty("pgbouncer");
  });

  it("pgbouncer should mount OpenBao-rendered config directory", () => {
    const content = readFile("infra/docker/docker-compose.yml");
    const idx = content.indexOf("pgbouncer:");
    expect(idx).toBeGreaterThanOrEqual(0);
    const section = content.substring(idx, idx + 2500);
    expect(section).toContain("/etc/pgbouncer");
    expect(section).toContain("CERNIQ_RENDERED_SECRETS_DIR");
  });

  it("pgbouncer should have extra_hosts for CT107 alias", () => {
    const content = readFile("infra/docker/docker-compose.yml");
    const idx = content.indexOf("pgbouncer:");
    expect(idx).toBeGreaterThanOrEqual(0);
    const section = content.substring(idx, idx + 2500);
    expect(section).toContain("ct107-postgres:10.0.1.107");
  });

  it("OpenBao template for pgbouncer.ini should use auth_query + scram", () => {
    const tpl = readFile("infra/config/openbao/templates/pgbouncer-ini.tpl");
    expect(tpl).toContain("auth_type = scram-sha-256");
    expect(tpl).toContain("auth_query =");
    expect(tpl).toContain("pool_mode = transaction");
    expect(tpl).toContain("max_client_conn = 1000");
    expect(tpl).toContain("default_pool_size = 50");
    expect(tpl).toContain("host=10.0.1.107");
    expect(tpl).toContain("port=5432");
  });
});

describe("F0.2: Validation scripts", () => {
  it("validate-postgres.sh should validate via DATABASE_URL (not local container)", () => {
    const content = readFile("infra/scripts/validate-postgres.sh");
    expect(content).toContain("DATABASE_URL");
    expect(content).toContain("Connectivity");
    expect(content).toContain("PgBouncer");
    expect(content).not.toContain("cerniq-postgres");
  });
});
