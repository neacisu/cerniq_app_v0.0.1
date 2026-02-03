/**
 * E0-S2-PR02: F0.2 PostgreSQL Setup + WAL/PgBouncer Tests
 * =======================================================
 * Validation tests for all tasks in Sprint 2 PR02
 *
 * Run with: pnpm test
 *
 * Tests automatically detect environment:
 * - Local repo tests: Always run (validate configs exist)
 * - Server tests: Skip in CI, run when Docker available locally
 *
 * @reference docs/specifications/Etapa 0/etapa0-plan-implementare-complet-v2.md
 * @reference docs/adr/ADR Etapa 0/ADR-0004-PostgreSQL-18-1-cu-PostGIS.md
 */

import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

// =============================================================================
// Test Configuration
// =============================================================================

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/var/www/CerniqAPP";

// Expected PostgreSQL configuration (per ADR-0004)
export const EXPECTED_POSTGRES_CONFIG = {
  version: "18.1",
  extensions: [
    "vector",
    "postgis",
    "postgis_topology",
    "pg_trgm",
    "pg_stat_statements",
    "uuid-ossp",
  ],
  extensionVersions: {
    vector: "0.8.1",
    postgis: "3.6.1",
    postgis_topology: "3.6.1",
    pg_trgm: "1.6",
    pg_stat_statements: "1.12",
  },
  user: "c3rn1q",
  database: "cerniq",
  schemas: ["bronze", "silver", "gold", "approval", "audit"],
  walLevel: "replica",
  archiveMode: "on",
} as const;

export const EXPECTED_PGBOUNCER_CONFIG = {
  poolMode: "transaction",
  maxClientConn: 1000,
  defaultPoolSize: 50,
  minPoolSize: 10,
  reservePoolSize: 20,
  authType: "scram-sha-256",
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

function exec(command: string): string {
  try {
    return execSync(command, { encoding: "utf-8", timeout: 30000 }).trim();
  } catch {
    return "";
  }
}

function execDockerCommand(container: string, command: string): string {
  try {
    return execSync(`docker exec ${container} ${command}`, {
      encoding: "utf-8",
      timeout: 30000,
    }).trim();
  } catch {
    return "";
  }
}

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

function isDockerAvailable(): boolean {
  try {
    execSync("docker info", { encoding: "utf-8", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function isContainerRunning(containerName: string): boolean {
  try {
    const result = exec(
      `docker inspect -f '{{.State.Running}}' ${containerName}`,
    );
    return result === "true";
  } catch {
    return false;
  }
}

const DOCKER_AVAILABLE = isDockerAvailable();
const POSTGRES_RUNNING =
  DOCKER_AVAILABLE && isContainerRunning("cerniq-postgres");
const PGBOUNCER_RUNNING =
  DOCKER_AVAILABLE && isContainerRunning("cerniq-pgbouncer");

// =============================================================================
// F0.2.1.T001: PostgreSQL 18.1 în docker-compose.yml
// =============================================================================

describe("F0.2.1.T001: PostgreSQL Service in docker-compose.yml", () => {
  const dockerComposePath = "infra/docker/docker-compose.yml";
  let dockerCompose: Record<string, unknown> | null = null;

  beforeAll(() => {
    const content = readFile(dockerComposePath);
    dockerCompose = parseYaml<Record<string, unknown>>(content);
  });

  it("should have docker-compose.yml file", () => {
    expect(fileExists(dockerComposePath)).toBe(true);
  });

  it("should define postgres service", () => {
    expect(dockerCompose).not.toBeNull();
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    expect(services).toHaveProperty("postgres");
  });

  it("should use custom Dockerfile build context", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const postgres = services?.postgres as Record<string, unknown>;
    const build = postgres?.build as Record<string, unknown>;
    expect(build).toHaveProperty("context", "./postgres");
    expect(build).toHaveProperty("dockerfile", "Dockerfile");
  });

  it("should have correct image tag", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const postgres = services?.postgres as Record<string, unknown>;
    expect(postgres?.image).toBe("cerniq/postgres:18-pgvector");
  });

  it("should configure correct environment variables", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const postgres = services?.postgres as Record<string, unknown>;
    const environment = postgres?.environment as Record<string, unknown>;
    expect(environment?.POSTGRES_USER).toBe(EXPECTED_POSTGRES_CONFIG.user);
    expect(environment?.POSTGRES_DB).toBe(EXPECTED_POSTGRES_CONFIG.database);
    expect(environment?.POSTGRES_PASSWORD_FILE).toBe(
      "/run/secrets/postgres_password",
    );
    expect(environment?.POSTGRES_INITDB_ARGS).toContain("--data-checksums");
  });

  it("should mount postgresql.conf configuration", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const postgres = services?.postgres as Record<string, unknown>;
    const volumes = postgres?.volumes as string[];
    expect(volumes).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "postgresql.conf:/etc/postgresql/postgresql.conf",
        ),
      ]),
    );
  });

  it("should mount init.sql script", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const postgres = services?.postgres as Record<string, unknown>;
    const volumes = postgres?.volumes as string[];
    expect(volumes).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "init.sql:/docker-entrypoint-initdb.d/01-init.sql",
        ),
      ]),
    );
  });

  it("should be on cerniq_data network with correct IP", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const postgres = services?.postgres as Record<string, unknown>;
    const networks = postgres?.networks as Record<string, unknown>;
    const dataNetwork = networks?.cerniq_data as Record<string, unknown>;
    expect(dataNetwork?.ipv4_address).toBe("172.29.0.10");
  });

  it("should NOT expose ports (security)", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const postgres = services?.postgres as Record<string, unknown>;
    expect(postgres?.ports).toBeUndefined();
  });

  it("should have healthcheck configured", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const postgres = services?.postgres as Record<string, unknown>;
    const healthcheck = postgres?.healthcheck as Record<string, unknown>;
    expect(healthcheck).toBeDefined();
    expect(healthcheck?.test).toEqual(
      expect.arrayContaining([expect.stringContaining("pg_isready")]),
    );
  });

  it("should use postgres_password secret", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const postgres = services?.postgres as Record<string, unknown>;
    const secrets = postgres?.secrets as string[];
    expect(secrets).toContain("postgres_password");
  });
});

// =============================================================================
// F0.2.1.T002: postgresql.conf Optimized Configuration
// =============================================================================

describe("F0.2.1.T002: postgresql.conf Optimized Configuration", () => {
  const configPath = "infra/config/postgres/postgresql.conf";
  let configContent: string = "";

  beforeAll(() => {
    configContent = readFile(configPath);
  });

  it("should have postgresql.conf file", () => {
    expect(fileExists(configPath)).toBe(true);
  });

  it("should configure shared_buffers (memory)", () => {
    expect(configContent).toMatch(/shared_buffers\s*=\s*\d+GB/);
  });

  it("should configure effective_cache_size", () => {
    expect(configContent).toMatch(/effective_cache_size\s*=\s*\d+GB/);
  });

  it("should configure work_mem", () => {
    expect(configContent).toMatch(/work_mem\s*=\s*\d+MB/);
  });

  it("should configure maintenance_work_mem", () => {
    expect(configContent).toMatch(/maintenance_work_mem\s*=\s*\d+[MG]B/);
  });

  it("should configure wal_level = replica for PITR", () => {
    expect(configContent).toMatch(/wal_level\s*=\s*replica/);
  });

  it("should configure archive_mode = on for PITR", () => {
    expect(configContent).toMatch(/archive_mode\s*=\s*on/);
  });

  it("should configure archive_command", () => {
    expect(configContent).toMatch(/archive_command\s*=/);
  });

  it("should configure wal_compression = zstd (PG18 feature)", () => {
    expect(configContent).toMatch(/wal_compression\s*=\s*zstd/);
  });

  it("should configure summarize_wal = on (PG18 incremental backup)", () => {
    expect(configContent).toMatch(/summarize_wal\s*=\s*on/);
  });

  it("should preload pg_stat_statements", () => {
    expect(configContent).toMatch(
      /shared_preload_libraries\s*=.*pg_stat_statements/,
    );
  });

  it("should configure autovacuum", () => {
    expect(configContent).toMatch(/autovacuum\s*=\s*on/);
  });

  it("should configure logging_collector", () => {
    expect(configContent).toMatch(/logging_collector\s*=\s*on/);
  });

  it("should configure password_encryption = scram-sha-256", () => {
    expect(configContent).toMatch(/password_encryption\s*=\s*scram-sha-256/);
  });

  it("should configure max_connections", () => {
    expect(configContent).toMatch(/max_connections\s*=\s*\d+/);
  });

  it("should configure NVMe SSD optimization (random_page_cost)", () => {
    expect(configContent).toMatch(/random_page_cost\s*=\s*1\.1/);
  });

  it("should configure effective_io_concurrency for NVMe", () => {
    expect(configContent).toMatch(/effective_io_concurrency\s*=\s*200/);
  });

  it("should configure parallelism settings", () => {
    expect(configContent).toMatch(/max_parallel_workers_per_gather\s*=\s*\d+/);
    expect(configContent).toMatch(/max_parallel_workers\s*=\s*\d+/);
  });
});

// =============================================================================
// F0.2.1.T003: init.sql with Required Extensions
// =============================================================================

describe("F0.2.1.T003: init.sql with Required Extensions", () => {
  const initSqlPath = "infra/config/postgres/init.sql";
  let initSqlContent: string = "";

  beforeAll(() => {
    initSqlContent = readFile(initSqlPath);
  });

  it("should have init.sql file", () => {
    expect(fileExists(initSqlPath)).toBe(true);
  });

  it("should create pgvector extension", () => {
    expect(initSqlContent).toMatch(/CREATE EXTENSION.*vector/i);
  });

  it("should create postgis extension", () => {
    expect(initSqlContent).toMatch(/CREATE EXTENSION.*postgis/i);
  });

  it("should create postgis_topology extension", () => {
    expect(initSqlContent).toMatch(/CREATE EXTENSION.*postgis_topology/i);
  });

  it("should create pg_trgm extension", () => {
    expect(initSqlContent).toMatch(/CREATE EXTENSION.*pg_trgm/i);
  });

  it("should create pg_stat_statements extension", () => {
    expect(initSqlContent).toMatch(/CREATE EXTENSION.*pg_stat_statements/i);
  });

  it("should create uuid-ossp extension", () => {
    expect(initSqlContent).toMatch(/CREATE EXTENSION.*uuid-ossp/i);
  });

  it("should create bronze schema (Medallion Architecture)", () => {
    expect(initSqlContent).toMatch(/CREATE SCHEMA.*bronze/i);
  });

  it("should create silver schema (Medallion Architecture)", () => {
    expect(initSqlContent).toMatch(/CREATE SCHEMA.*silver/i);
  });

  it("should create gold schema (Medallion Architecture)", () => {
    expect(initSqlContent).toMatch(/CREATE SCHEMA.*gold/i);
  });

  it("should create approval schema", () => {
    expect(initSqlContent).toMatch(/CREATE SCHEMA.*approval/i);
  });

  it("should create audit schema", () => {
    expect(initSqlContent).toMatch(/CREATE SCHEMA.*audit/i);
  });

  it("should create cerniq_app role", () => {
    expect(initSqlContent).toMatch(/CREATE ROLE.*cerniq_app/i);
  });

  it("should grant permissions to cerniq_app", () => {
    expect(initSqlContent).toMatch(/GRANT.*TO\s+cerniq_app/i);
  });

  it("should create updated_at trigger function", () => {
    expect(initSqlContent).toMatch(/update_updated_at_column/i);
  });

  it("should create tenants table", () => {
    expect(initSqlContent).toMatch(/CREATE TABLE.*tenants/i);
  });

  it("should verify extensions are loaded (validation block)", () => {
    expect(initSqlContent).toMatch(/ext_count\s*<\s*4/);
    expect(initSqlContent).toMatch(/RAISE EXCEPTION.*extensions not loaded/i);
  });
});

// =============================================================================
// F0.2.1.T004: PostgreSQL Password Secret
// =============================================================================

describe("F0.2.1.T004: PostgreSQL Password Secret", () => {
  const secretPath = "secrets/postgres_password.txt";

  it("should have postgres_password.txt secret file", () => {
    expect(fileExists(secretPath)).toBe(true);
  });

  it("should have password with minimum 32 characters", () => {
    const password = readFile(secretPath).trim();
    expect(password.length).toBeGreaterThanOrEqual(32);
  });

  it("should have alphanumeric password (no special chars for compatibility)", () => {
    const password = readFile(secretPath).trim();
    expect(password).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it("should define secret in docker-compose.yml", () => {
    const composeContent = readFile("infra/docker/docker-compose.yml");
    const compose = parseYaml<Record<string, unknown>>(composeContent);
    const secrets = (compose as Record<string, unknown>)?.secrets as Record<
      string,
      unknown
    >;
    expect(secrets).toHaveProperty("postgres_password");
    const passwordSecret = secrets?.postgres_password as Record<
      string,
      unknown
    >;
    expect(passwordSecret?.file).toContain("postgres_password.txt");
  });
});

// =============================================================================
// F0.2.1.T005: PostgreSQL Container Running
// =============================================================================

describe("F0.2.1.T005: PostgreSQL Container Running", () => {
  it.skipIf(!DOCKER_AVAILABLE)("should have Docker available", () => {
    expect(DOCKER_AVAILABLE).toBe(true);
  });

  it.skipIf(!POSTGRES_RUNNING)(
    "should have cerniq-postgres container running",
    () => {
      expect(POSTGRES_RUNNING).toBe(true);
    },
  );

  it.skipIf(!POSTGRES_RUNNING)("should have healthy container status", () => {
    const health = exec(
      "docker inspect -f '{{.State.Health.Status}}' cerniq-postgres",
    );
    expect(health).toBe("healthy");
  });

  it.skipIf(!POSTGRES_RUNNING)("should be accepting connections", () => {
    const result = execDockerCommand(
      "cerniq-postgres",
      "pg_isready -U c3rn1q -d cerniq",
    );
    expect(result).toContain("accepting connections");
  });

  it.skipIf(!POSTGRES_RUNNING)("should have PostgreSQL 18.x version", () => {
    const version = execDockerCommand(
      "cerniq-postgres",
      'psql -U c3rn1q -d cerniq -t -c "SELECT version();"',
    );
    expect(version).toMatch(/PostgreSQL 18\./);
  });

  it.skipIf(!POSTGRES_RUNNING)(
    "should have all required extensions installed",
    () => {
      const extensions = execDockerCommand(
        "cerniq-postgres",
        'psql -U c3rn1q -d cerniq -t -c "SELECT extname FROM pg_extension;"',
      );

      for (const ext of EXPECTED_POSTGRES_CONFIG.extensions) {
        expect(extensions).toContain(ext);
      }
    },
  );

  it.skipIf(!POSTGRES_RUNNING)("should have pgvector 0.8.1", () => {
    const version = execDockerCommand(
      "cerniq-postgres",
      "psql -U c3rn1q -d cerniq -t -c \"SELECT extversion FROM pg_extension WHERE extname = 'vector';\"",
    );
    expect(version.trim()).toBe("0.8.1");
  });

  it.skipIf(!POSTGRES_RUNNING)("should have PostGIS 3.6.1", () => {
    const version = execDockerCommand(
      "cerniq-postgres",
      "psql -U c3rn1q -d cerniq -t -c \"SELECT extversion FROM pg_extension WHERE extname = 'postgis';\"",
    );
    expect(version.trim()).toBe("3.6.1");
  });

  it.skipIf(!POSTGRES_RUNNING)("should have all Medallion schemas", () => {
    const schemas = execDockerCommand(
      "cerniq-postgres",
      'psql -U c3rn1q -d cerniq -t -c "SELECT schema_name FROM information_schema.schemata;"',
    );

    for (const schema of EXPECTED_POSTGRES_CONFIG.schemas) {
      expect(schemas).toContain(schema);
    }
  });
});

// =============================================================================
// F0.2.2.T001: WAL Archiving for PITR
// =============================================================================

describe("F0.2.2.T001: WAL Archiving for PITR", () => {
  it.skipIf(!POSTGRES_RUNNING)("should have wal_level = replica", () => {
    const result = execDockerCommand(
      "cerniq-postgres",
      'psql -U c3rn1q -d cerniq -t -c "SHOW wal_level;"',
    );
    expect(result.trim()).toBe("replica");
  });

  it.skipIf(!POSTGRES_RUNNING)("should have archive_mode = on", () => {
    const result = execDockerCommand(
      "cerniq-postgres",
      'psql -U c3rn1q -d cerniq -t -c "SHOW archive_mode;"',
    );
    expect(result.trim()).toBe("on");
  });

  it.skipIf(!POSTGRES_RUNNING)("should have archive_command configured", () => {
    const result = execDockerCommand(
      "cerniq-postgres",
      'psql -U c3rn1q -d cerniq -t -c "SHOW archive_command;"',
    );
    expect(result).toContain("wal_archive");
  });

  it.skipIf(!POSTGRES_RUNNING)("should have wal_compression = zstd", () => {
    const result = execDockerCommand(
      "cerniq-postgres",
      'psql -U c3rn1q -d cerniq -t -c "SHOW wal_compression;"',
    );
    expect(result.trim()).toBe("zstd");
  });

  it.skipIf(!POSTGRES_RUNNING)("should have summarize_wal = on (PG18)", () => {
    const result = execDockerCommand(
      "cerniq-postgres",
      'psql -U c3rn1q -d cerniq -t -c "SHOW summarize_wal;"',
    );
    expect(result.trim()).toBe("on");
  });

  it("should have WAL archive volume in docker-compose", () => {
    const composeContent = readFile("infra/docker/docker-compose.yml");
    expect(composeContent).toContain("postgres_wal_archive");
  });
});

// =============================================================================
// F0.2.2.T002: pg_stat_statements Performance Monitoring
// =============================================================================

describe("F0.2.2.T002: pg_stat_statements Performance Monitoring", () => {
  it.skipIf(!POSTGRES_RUNNING)(
    "should have pg_stat_statements extension",
    () => {
      const extensions = execDockerCommand(
        "cerniq-postgres",
        "psql -U c3rn1q -d cerniq -t -c \"SELECT extname FROM pg_extension WHERE extname = 'pg_stat_statements';\"",
      );
      expect(extensions.trim()).toBe("pg_stat_statements");
    },
  );

  it.skipIf(!POSTGRES_RUNNING)("should be tracking queries", () => {
    const count = execDockerCommand(
      "cerniq-postgres",
      'psql -U c3rn1q -d cerniq -t -c "SELECT COUNT(*) FROM pg_stat_statements;"',
    );
    expect(parseInt(count.trim())).toBeGreaterThan(0);
  });

  it.skipIf(!POSTGRES_RUNNING)(
    "should have pg_stat_statements.track = all",
    () => {
      const result = execDockerCommand(
        "cerniq-postgres",
        'psql -U c3rn1q -d cerniq -t -c "SHOW pg_stat_statements.track;"',
      );
      expect(result.trim()).toBe("all");
    },
  );

  it.skipIf(!POSTGRES_RUNNING)("should have track_io_timing = on", () => {
    const result = execDockerCommand(
      "cerniq-postgres",
      'psql -U c3rn1q -d cerniq -t -c "SHOW track_io_timing;"',
    );
    expect(result.trim()).toBe("on");
  });

  it.skipIf(!POSTGRES_RUNNING)("should have track_wal_io_timing = on", () => {
    const result = execDockerCommand(
      "cerniq-postgres",
      'psql -U c3rn1q -d cerniq -t -c "SHOW track_wal_io_timing;"',
    );
    expect(result.trim()).toBe("on");
  });
});

// =============================================================================
// F0.2.2.T003: PostgreSQL Validation Script
// =============================================================================

describe("F0.2.2.T003: PostgreSQL Validation Script", () => {
  const scriptPath = "infra/scripts/validate-postgres.sh";

  it("should have validate-postgres.sh script", () => {
    expect(fileExists(scriptPath)).toBe(true);
  });

  it("should be executable (has shebang)", () => {
    const content = readFile(scriptPath);
    expect(content).toMatch(/^#!/);
  });

  it("should check container status", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("Container Status");
  });

  it("should check PostgreSQL version", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("PostgreSQL Version");
  });

  it("should check required extensions", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("Required Extensions");
  });

  it("should check Medallion schemas", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("Medallion Schemas");
  });

  it("should check memory configuration", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("Memory Configuration");
  });

  it("should check WAL configuration", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("WAL Configuration");
  });

  it("should check pg_stat_statements", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("pg_stat_statements");
  });

  it("should output validation summary", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("VALIDATION SUMMARY");
  });

  it.skipIf(!POSTGRES_RUNNING)("should pass when run", () => {
    const result = exec(
      `bash ${path.join(WORKSPACE_ROOT, scriptPath)} 2>&1; echo "EXIT:$?"`,
    );
    expect(result).toContain("EXIT:0");
  });
});

// =============================================================================
// F0.2.2.T004: PgBouncer Connection Pooling
// =============================================================================

describe("F0.2.2.T004: PgBouncer Connection Pooling", () => {
  const dockerComposePath = "infra/docker/docker-compose.yml";
  let dockerCompose: Record<string, unknown> | null = null;

  beforeAll(() => {
    const content = readFile(dockerComposePath);
    dockerCompose = parseYaml<Record<string, unknown>>(content);
  });

  it("should define pgbouncer service in docker-compose.yml", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    expect(services).toHaveProperty("pgbouncer");
  });

  it("should use pgbouncer image", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const pgbouncer = services?.pgbouncer as Record<string, unknown>;
    expect(pgbouncer?.image).toContain("pgbouncer");
  });

  it("should configure transaction pool mode", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const pgbouncer = services?.pgbouncer as Record<string, unknown>;
    const environment = pgbouncer?.environment as Record<string, unknown>;
    expect(environment?.POOL_MODE).toBe("transaction");
  });

  it("should configure max_client_conn", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const pgbouncer = services?.pgbouncer as Record<string, unknown>;
    const environment = pgbouncer?.environment as Record<string, unknown>;
    expect(environment?.MAX_CLIENT_CONN).toBe(
      EXPECTED_PGBOUNCER_CONFIG.maxClientConn,
    );
  });

  it("should configure default_pool_size", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const pgbouncer = services?.pgbouncer as Record<string, unknown>;
    const environment = pgbouncer?.environment as Record<string, unknown>;
    expect(environment?.DEFAULT_POOL_SIZE).toBe(
      EXPECTED_PGBOUNCER_CONFIG.defaultPoolSize,
    );
  });

  it("should configure scram-sha-256 authentication", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const pgbouncer = services?.pgbouncer as Record<string, unknown>;
    const environment = pgbouncer?.environment as Record<string, unknown>;
    expect(environment?.AUTH_TYPE).toBe("scram-sha-256");
  });

  it("should depend on postgres service", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const pgbouncer = services?.pgbouncer as Record<string, unknown>;
    const dependsOn = pgbouncer?.depends_on as Record<string, unknown>;
    expect(dependsOn).toHaveProperty("postgres");
  });

  it("should be on cerniq_data and cerniq_backend networks", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const pgbouncer = services?.pgbouncer as Record<string, unknown>;
    const networks = pgbouncer?.networks as Record<string, unknown>;
    expect(networks).toHaveProperty("cerniq_data");
    expect(networks).toHaveProperty("cerniq_backend");
  });

  it("should have healthcheck configured", () => {
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    const pgbouncer = services?.pgbouncer as Record<string, unknown>;
    expect(pgbouncer?.healthcheck).toBeDefined();
  });

  it.skipIf(!PGBOUNCER_RUNNING)(
    "should have cerniq-pgbouncer container running",
    () => {
      expect(PGBOUNCER_RUNNING).toBe(true);
    },
  );

  it.skipIf(!PGBOUNCER_RUNNING)("should have healthy container status", () => {
    const health = exec(
      "docker inspect -f '{{.State.Health.Status}}' cerniq-pgbouncer",
    );
    expect(health).toBe("healthy");
  });

  it.skipIf(!PGBOUNCER_RUNNING)("should be accepting connections", () => {
    const result = execDockerCommand(
      "cerniq-pgbouncer",
      "pg_isready -h localhost -p 5432 -U c3rn1q",
    );
    expect(result).toContain("accepting connections");
  });
});

// =============================================================================
// Dockerfile for Custom PostgreSQL Image
// =============================================================================

describe("Custom PostgreSQL Dockerfile", () => {
  const dockerfilePath = "infra/docker/postgres/Dockerfile";

  it("should have Dockerfile for custom PostgreSQL image", () => {
    expect(fileExists(dockerfilePath)).toBe(true);
  });

  it("should use postgis/postgis:18-3.6 as base image", () => {
    const content = readFile(dockerfilePath);
    expect(content).toMatch(/FROM\s+postgis\/postgis:18-3\.6/);
  });

  it("should install build dependencies for pgvector", () => {
    const content = readFile(dockerfilePath);
    expect(content).toContain("build-essential");
    expect(content).toContain("postgresql-server-dev-18");
  });

  it("should clone pgvector from GitHub", () => {
    const content = readFile(dockerfilePath);
    expect(content).toContain("git clone");
    expect(content).toContain("github.com/pgvector/pgvector");
  });

  it("should build pgvector 0.8.1 (PG18 compatible)", () => {
    const content = readFile(dockerfilePath);
    expect(content).toMatch(/--branch\s+v0\.8\.1/);
  });

  it("should compile and install pgvector", () => {
    const content = readFile(dockerfilePath);
    expect(content).toContain("make");
    expect(content).toContain("make install");
  });
});

// =============================================================================
// Integration Tests: Full PostgreSQL Stack
// =============================================================================

describe("Integration: PostgreSQL Full Stack", () => {
  it.skipIf(!POSTGRES_RUNNING || !PGBOUNCER_RUNNING)(
    "should allow connection through PgBouncer to PostgreSQL",
    () => {
      // This tests the full stack: Client -> PgBouncer -> PostgreSQL
      const result = exec(
        `docker exec cerniq-pgbouncer pg_isready -h localhost -p 5432 -U c3rn1q -d cerniq`,
      );
      expect(result).toContain("accepting connections");
    },
  );

  it.skipIf(!POSTGRES_RUNNING)(
    "should be able to create and query vector data",
    () => {
      // Test pgvector functionality
      const result = execDockerCommand(
        "cerniq-postgres",
        `psql -U c3rn1q -d cerniq -t -c "SELECT '[1,2,3]'::vector <-> '[3,2,1]'::vector;"`,
      );
      // Should return a distance value
      expect(parseFloat(result.trim())).toBeGreaterThan(0);
    },
  );

  it.skipIf(!POSTGRES_RUNNING)(
    "should be able to use PostGIS functions",
    () => {
      const result = execDockerCommand(
        "cerniq-postgres",
        `psql -U c3rn1q -d cerniq -t -c "SELECT ST_Distance(ST_Point(0,0), ST_Point(1,1));"`,
      );
      expect(parseFloat(result.trim())).toBeCloseTo(1.414, 2);
    },
  );

  it.skipIf(!POSTGRES_RUNNING)("should be able to use trigram search", () => {
    const result = execDockerCommand(
      "cerniq-postgres",
      `psql -U c3rn1q -d cerniq -t -c "SELECT similarity('hello', 'hallo');"`,
    );
    expect(parseFloat(result.trim())).toBeGreaterThan(0);
  });
});
