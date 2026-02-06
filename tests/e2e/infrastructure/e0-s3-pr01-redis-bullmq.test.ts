/**
 * E0-S3-PR01: F0.3 Redis 8.4.0 + BullMQ Setup Tests
 * ================================================
 * Validation tests for all tasks in Sprint 3 PR01
 *
 * Run with: pnpm test
 *
 * Tests automatically detect environment:
 * - Local repo tests: Always run (validate configs exist)
 * - Server tests: Skip in CI, run when Docker available locally
 *
 * @reference docs/specifications/Etapa 0/etapa0-plan-implementare-complet-v2.md
 * @reference docs/adr/ADR Etapa 0/ADR-0006-Redis-BullMQ-Queue-Management.md
 * @reference docs/infrastructure/etapa0-port-matrix.md
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

// Expected Redis configuration (per ADR-0006, etapa0-port-matrix.md)
export const EXPECTED_REDIS_CONFIG = {
  version: "8.4",
  port: 64039, // ADR-0022 port allocation
  maxmemory: "8gb", // ADR-0006
  maxmemoryPolicy: "noeviction", // CRITICAL for BullMQ
  appendonly: "yes",
  appendfsync: "everysec",
  notifyKeyspaceEvents: "Ex",
  ipAddresses: {
    cerniq_data: "172.29.30.20",
    cerniq_backend: "172.29.20.20",
  },
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

function getRedisConfig(key: string): string {
  const passwordFile = path.join(WORKSPACE_ROOT, "secrets/redis_password.txt");
  let authArg = "";
  if (fs.existsSync(passwordFile)) {
    const password = fs.readFileSync(passwordFile, "utf-8").trim();
    authArg = `-a "${password}"`;
  }
  try {
    const result = execSync(
      `docker exec cerniq-redis redis-cli -p ${EXPECTED_REDIS_CONFIG.port} ${authArg} CONFIG GET ${key} 2>/dev/null | tail -1`,
      { encoding: "utf-8", timeout: 10000 },
    ).trim();
    return result;
  } catch {
    return "";
  }
}

function getRedisInfo(section: string): string {
  const passwordFile = path.join(WORKSPACE_ROOT, "secrets/redis_password.txt");
  let authArg = "";
  if (fs.existsSync(passwordFile)) {
    const password = fs.readFileSync(passwordFile, "utf-8").trim();
    authArg = `-a "${password}"`;
  }
  try {
    const result = execSync(
      `docker exec cerniq-redis redis-cli -p ${EXPECTED_REDIS_CONFIG.port} ${authArg} INFO ${section} 2>/dev/null`,
      { encoding: "utf-8", timeout: 10000 },
    ).trim();
    return result;
  } catch {
    return "";
  }
}

const DOCKER_AVAILABLE = isDockerAvailable();
const REDIS_RUNNING = DOCKER_AVAILABLE && isContainerRunning("cerniq-redis");

// =============================================================================
// F0.3.1.T001: Redis 8.4.0 Service in docker-compose.yml
// =============================================================================

describe("F0.3.1.T001: Redis Service in docker-compose.yml", () => {
  const dockerComposePath = "infra/docker/docker-compose.yml";
  let dockerCompose: Record<string, unknown> | null = null;
  let redisService: Record<string, unknown> | null = null;

  beforeAll(() => {
    const content = readFile(dockerComposePath);
    dockerCompose = parseYaml<Record<string, unknown>>(content);
    if (dockerCompose) {
      const services = dockerCompose.services as Record<string, unknown>;
      redisService = services?.redis as Record<string, unknown>;
    }
  });

  it("should have docker-compose.yml file", () => {
    expect(fileExists(dockerComposePath)).toBe(true);
  });

  it("should define redis service", () => {
    expect(dockerCompose).not.toBeNull();
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    expect(services).toHaveProperty("redis");
  });

  it("should use Redis 8.4.0 image", () => {
    expect(redisService?.image).toBe("redis:8.4.0");
  });

  it("should have container name cerniq-redis", () => {
    expect(redisService?.container_name).toBe("cerniq-redis");
  });

  it("should configure port 64039 (per ADR-0022)", () => {
    const command = redisService?.command as string[];
    expect(command).toBeDefined();
    const commandStr = Array.isArray(command)
      ? command.join(" ")
      : String(command);
    expect(commandStr).toContain("--port 64039");
  });

  it("should configure maxmemory 8gb (per ADR-0006)", () => {
    const command = redisService?.command as string[];
    const commandStr = Array.isArray(command)
      ? command.join(" ")
      : String(command);
    expect(commandStr).toContain("--maxmemory 8gb");
  });

  it("should configure maxmemory-policy noeviction (CRITICAL for BullMQ)", () => {
    const command = redisService?.command as string[];
    const commandStr = Array.isArray(command)
      ? command.join(" ")
      : String(command);
    expect(commandStr).toContain("--maxmemory-policy noeviction");
  });

  it("should configure appendonly yes for persistence", () => {
    const command = redisService?.command as string[];
    const commandStr = Array.isArray(command)
      ? command.join(" ")
      : String(command);
    expect(commandStr).toContain("--appendonly yes");
  });

  it("should configure notify-keyspace-events Ex for BullMQ", () => {
    const command = redisService?.command as string[];
    const commandStr = Array.isArray(command)
      ? command.join(" ")
      : String(command);
    expect(commandStr).toContain("--notify-keyspace-events Ex");
  });

  it("should mount redis_password.txt from secrets directory", () => {
    const volumes = redisService?.volumes as string[];
    const joined = Array.isArray(volumes) ? volumes.join(" ") : String(volumes);
    expect(joined).toContain("redis_password.txt");
  });

  it("should be on cerniq_data network with IP 172.29.30.20", () => {
    const networks = redisService?.networks as Record<string, unknown>;
    const dataNetwork = networks?.cerniq_data as Record<string, unknown>;
    expect(dataNetwork?.ipv4_address).toBe(
      EXPECTED_REDIS_CONFIG.ipAddresses.cerniq_data,
    );
  });

  it("should be on cerniq_backend network with IP 172.29.20.20", () => {
    const networks = redisService?.networks as Record<string, unknown>;
    const backendNetwork = networks?.cerniq_backend as Record<string, unknown>;
    expect(backendNetwork?.ipv4_address).toBe(
      EXPECTED_REDIS_CONFIG.ipAddresses.cerniq_backend,
    );
  });

  it("should NOT expose external ports (security)", () => {
    expect(redisService?.ports).toBeUndefined();
  });

  it("should have healthcheck configured", () => {
    const healthcheck = redisService?.healthcheck as Record<string, unknown>;
    expect(healthcheck).toBeDefined();
    expect(healthcheck?.test).toBeDefined();
  });

  it("should have healthcheck using port 64039", () => {
    const healthcheck = redisService?.healthcheck as Record<string, unknown>;
    const test = healthcheck?.test as string[];
    const testStr = Array.isArray(test) ? test.join(" ") : String(test);
    expect(testStr).toContain("64039");
  });

  it("should mount redis_data volume", () => {
    const volumes = redisService?.volumes as string[];
    expect(volumes).toEqual(
      expect.arrayContaining([expect.stringContaining("redis_data")]),
    );
  });

  it("should define redis_data volume in volumes section", () => {
    const volumes = (dockerCompose as Record<string, unknown>)
      ?.volumes as Record<string, unknown>;
    expect(volumes).toHaveProperty("redis_data");
  });

  it("should define redis_password secret in secrets section", () => {
    const secrets = (dockerCompose as Record<string, unknown>)
      ?.secrets as Record<string, unknown>;
    expect(secrets).toHaveProperty("redis_password");
    const redisSecret = secrets?.redis_password as Record<string, unknown>;
    expect(redisSecret?.file).toContain("redis_password.txt");
  });

  it("should have resource limits defined", () => {
    const deploy = redisService?.deploy as Record<string, unknown>;
    expect(deploy?.resources).toBeDefined();
  });
});

// =============================================================================
// F0.3.1.T002: Redis Container Running and Healthy
// =============================================================================

describe("F0.3.1.T002: Redis Container Running", () => {
  it.skipIf(!DOCKER_AVAILABLE)("should have Docker available", () => {
    expect(DOCKER_AVAILABLE).toBe(true);
  });

  it.skipIf(!DOCKER_AVAILABLE)(
    "should have cerniq-redis container running",
    () => {
      expect(REDIS_RUNNING).toBe(true);
    },
  );

  it.skipIf(!REDIS_RUNNING)("should have healthy container status", () => {
    const health = exec(
      `docker inspect -f '{{.State.Health.Status}}' cerniq-redis`,
    );
    expect(health).toBe("healthy");
  });

  it.skipIf(!REDIS_RUNNING)("should respond to PING", () => {
    const passwordFile = path.join(
      WORKSPACE_ROOT,
      "secrets/redis_password.txt",
    );
    const password = fs.existsSync(passwordFile)
      ? fs.readFileSync(passwordFile, "utf-8").trim()
      : "";
    const authArg = password ? `-a "${password}"` : "";
    const pong = exec(
      `docker exec cerniq-redis redis-cli -p ${EXPECTED_REDIS_CONFIG.port} ${authArg} ping 2>/dev/null`,
    );
    expect(pong).toBe("PONG");
  });

  it.skipIf(!REDIS_RUNNING)("should have Redis 8.x version", () => {
    const info = getRedisInfo("server");
    const versionMatch = info.match(/redis_version:(\d+\.\d+)/);
    expect(versionMatch).not.toBeNull();
    if (versionMatch) {
      const version = versionMatch[1];
      expect(version.startsWith("8.")).toBe(true);
    }
  });

  it.skipIf(!REDIS_RUNNING)("should have maxmemory set to 8gb", () => {
    const maxmemory = getRedisConfig("maxmemory");
    // 8GB = 8589934592 bytes
    expect(parseInt(maxmemory, 10)).toBeGreaterThanOrEqual(8000000000);
  });

  it.skipIf(!REDIS_RUNNING)(
    "should have maxmemory-policy noeviction (BullMQ CRITICAL)",
    () => {
      const policy = getRedisConfig("maxmemory-policy");
      expect(policy).toBe("noeviction");
    },
  );

  it.skipIf(!REDIS_RUNNING)("should have appendonly enabled", () => {
    const appendonly = getRedisConfig("appendonly");
    expect(appendonly).toBe("yes");
  });

  it.skipIf(!REDIS_RUNNING)(
    "should have notify-keyspace-events configured",
    () => {
      const events = getRedisConfig("notify-keyspace-events");
      expect(events).toContain("E");
    },
  );
});

// =============================================================================
// F0.3.1.T003: Network Connectivity Test
// =============================================================================

describe("F0.3.1.T003: Network Connectivity", () => {
  it.skipIf(!REDIS_RUNNING)(
    "should be accessible on cerniq_data network",
    () => {
      const result = exec(
        `docker network inspect cerniq_data --format '{{range .Containers}}{{.Name}} {{end}}'`,
      );
      expect(result).toContain("cerniq-redis");
    },
  );

  it.skipIf(!REDIS_RUNNING)(
    "should be accessible on cerniq_backend network",
    () => {
      const result = exec(
        `docker network inspect cerniq_backend --format '{{range .Containers}}{{.Name}} {{end}}'`,
      );
      expect(result).toContain("cerniq-redis");
    },
  );

  it.skipIf(!REDIS_RUNNING)(
    "should have correct IP on cerniq_data (172.29.30.20)",
    () => {
      const ip = exec(
        `docker inspect -f '{{(index .NetworkSettings.Networks "cerniq_data").IPAddress}}' cerniq-redis`,
      );
      expect(ip).toBe(EXPECTED_REDIS_CONFIG.ipAddresses.cerniq_data);
    },
  );

  it.skipIf(!REDIS_RUNNING)(
    "should have correct IP on cerniq_backend (172.29.20.20)",
    () => {
      const ip = exec(
        `docker inspect -f '{{(index .NetworkSettings.Networks "cerniq_backend").IPAddress}}' cerniq-redis`,
      );
      expect(ip).toBe(EXPECTED_REDIS_CONFIG.ipAddresses.cerniq_backend);
    },
  );

  it.skipIf(!REDIS_RUNNING)(
    "should be reachable from PostgreSQL container",
    () => {
      // Test TCP connectivity from postgres to redis using bash built-in
      // (netcat may not be installed in PostgreSQL container)
      const result = exec(
        `docker exec cerniq-postgres bash -c "timeout 2 bash -c '</dev/tcp/172.29.30.20/64039' 2>&1 && echo 'connected' || echo 'failed'"`,
      );
      // Should indicate connection worked
      expect(result).toContain("connected");
    },
  );

  it("should have network-verification.md documentation", () => {
    expect(fileExists("docs/architecture/network-verification.md")).toBe(true);
  });
});

// =============================================================================
// F0.3.2.T001: Redis AUTH with Docker Secret
// =============================================================================

describe("F0.3.2.T001: Redis AUTH Configuration", () => {
  const secretPath = "secrets/redis_password.txt";

  it("should have redis_password.txt secret file", () => {
    expect(fileExists(secretPath)).toBe(true);
  });

  it("should have password with minimum 32 characters", () => {
    const password = readFile(secretPath).trim();
    expect(password.length).toBeGreaterThanOrEqual(32);
  });

  it("should have alphanumeric password (no special chars)", () => {
    const password = readFile(secretPath).trim();
    expect(/^[a-zA-Z0-9]+$/.test(password)).toBe(true);
  });

  it("should have password with at least 64 characters (recommended)", () => {
    const password = readFile(secretPath).trim();
    expect(password.length).toBeGreaterThanOrEqual(64);
  });

  it.skipIf(!REDIS_RUNNING)(
    "should require authentication (NOAUTH error without password)",
    () => {
      const result = exec(
        `docker exec cerniq-redis redis-cli -p ${EXPECTED_REDIS_CONFIG.port} ping 2>&1`,
      );
      expect(result).toContain("NOAUTH");
    },
  );

  it.skipIf(!REDIS_RUNNING)(
    "should authenticate successfully with correct password",
    () => {
      const password = readFile(secretPath).trim();
      const result = exec(
        `docker exec cerniq-redis redis-cli -p ${EXPECTED_REDIS_CONFIG.port} -a "${password}" ping 2>&1`,
      );
      expect(result).toContain("PONG");
    },
  );

  it("should have redis-authentication.md documentation", () => {
    expect(fileExists("docs/infrastructure/redis-authentication.md")).toBe(
      true,
    );
  });
});

// =============================================================================
// F0.3.2.T002: BullMQ Compatibility Validation Script
// =============================================================================

describe("F0.3.2.T002: BullMQ Validation Script", () => {
  const scriptPath = "infra/scripts/check-redis-bullmq.sh";

  it("should have check-redis-bullmq.sh script", () => {
    expect(fileExists(scriptPath)).toBe(true);
  });

  it("should be executable (has shebang)", () => {
    const content = readFile(scriptPath);
    expect(content.startsWith("#!/bin/bash")).toBe(true);
  });

  it("should check maxmemory-policy", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("maxmemory-policy");
  });

  it("should check noeviction policy", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("noeviction");
  });

  it("should check appendonly setting", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("appendonly");
  });

  it("should check notify-keyspace-events", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("notify-keyspace-events");
  });

  it("should use port 64039 (per ADR-0022)", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("64039");
  });

  it("should support AUTH with password file", () => {
    const content = readFile(scriptPath);
    expect(content).toContain("redis_password");
  });

  it.skipIf(!REDIS_RUNNING)("should pass when executed", async () => {
    const result = exec(
      `chmod +x ${path.join(WORKSPACE_ROOT, scriptPath)} && ${path.join(WORKSPACE_ROOT, scriptPath)} cerniq-redis`,
    );
    expect(result).toContain("PASS");
    expect(result).not.toContain("CRITICAL");
  });
});

// =============================================================================
// F0.3.2.T003: RedisInsight Development Setup
// =============================================================================

describe("F0.3.2.T003: RedisInsight Dev Override", () => {
  const devComposePath = "infra/docker/docker-compose.dev.yml";
  let devCompose: Record<string, unknown> | null = null;
  let redisInsight: Record<string, unknown> | null = null;

  beforeAll(() => {
    const content = readFile(devComposePath);
    devCompose = parseYaml<Record<string, unknown>>(content);
    if (devCompose) {
      const services = devCompose.services as Record<string, unknown>;
      redisInsight = services?.redisinsight as Record<string, unknown>;
    }
  });

  it("should have docker-compose.dev.yml file", () => {
    expect(fileExists(devComposePath)).toBe(true);
  });

  it("should define redisinsight service", () => {
    expect(devCompose).not.toBeNull();
    const services = (devCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    expect(services).toHaveProperty("redisinsight");
  });

  it("should use RedisInsight v2 image", () => {
    expect(redisInsight?.image).toContain("redisinsight");
  });

  it("should expose port 8001 for web interface", () => {
    const ports = redisInsight?.ports as string[];
    expect(ports).toEqual(
      expect.arrayContaining([expect.stringContaining("8001")]),
    );
  });

  it("should have profiles: [dev] for conditional startup", () => {
    const profiles = redisInsight?.profiles as string[];
    expect(profiles).toContain("dev");
  });

  it("should depend on redis service", () => {
    const dependsOn = redisInsight?.depends_on;
    expect(dependsOn).toBeDefined();
    // Check if redis is in depends_on (either as string array or object)
    if (Array.isArray(dependsOn)) {
      expect(dependsOn).toContain("redis");
    } else {
      expect(dependsOn).toHaveProperty("redis");
    }
  });

  it("should be connected to cerniq_data network", () => {
    const networks = redisInsight?.networks;
    if (Array.isArray(networks)) {
      expect(networks).toContain("cerniq_data");
    } else {
      expect(networks).toHaveProperty("cerniq_data");
    }
  });

  it("should reference port 64039 in comments or config", () => {
    const content = readFile(devComposePath);
    expect(content).toContain("64039");
  });
});

// =============================================================================
// E0-S3-PR01 Sprint Summary
// =============================================================================

describe("E0-S3-PR01 Sprint Summary", () => {
  it("should have all F0.3.1 infrastructure files", () => {
    expect(fileExists("infra/docker/docker-compose.yml")).toBe(true);
    expect(fileExists("secrets/redis_password.txt")).toBe(true);
    expect(fileExists("docs/architecture/network-verification.md")).toBe(true);
  });

  it("should have all F0.3.2 operational files", () => {
    expect(fileExists("infra/scripts/check-redis-bullmq.sh")).toBe(true);
    expect(fileExists("infra/docker/docker-compose.dev.yml")).toBe(true);
    expect(fileExists("docs/infrastructure/redis-authentication.md")).toBe(
      true,
    );
  });

  it("should have Redis configured per ADR-0006", () => {
    const content = readFile("infra/docker/docker-compose.yml");
    expect(content).toContain("maxmemory-policy noeviction");
    expect(content).toContain("maxmemory 8gb");
    expect(content).toContain("appendonly yes");
  });

  it("should have Redis on correct port per etapa0-port-matrix.md", () => {
    const content = readFile("infra/docker/docker-compose.yml");
    expect(content).toContain("--port 64039");
  });

  it("should have complete BullMQ compatibility", () => {
    const content = readFile("infra/docker/docker-compose.yml");
    // CRITICAL requirements for BullMQ
    expect(content).toContain("noeviction"); // Jobs not evicted
    expect(content).toContain("notify-keyspace-events Ex"); // Delayed jobs
    expect(content).toContain("appendonly yes"); // Persistence
  });

  it.skipIf(!REDIS_RUNNING)(
    "should have fully operational Redis service",
    () => {
      // Container health
      const health = exec(
        `docker inspect -f '{{.State.Health.Status}}' cerniq-redis`,
      );
      expect(health).toBe("healthy");

      // AUTH working
      const password = readFile("secrets/redis_password.txt").trim();
      const pong = exec(
        `docker exec cerniq-redis redis-cli -p ${EXPECTED_REDIS_CONFIG.port} -a "${password}" ping 2>&1`,
      );
      expect(pong).toContain("PONG");

      // BullMQ config correct
      const policy = getRedisConfig("maxmemory-policy");
      expect(policy).toBe("noeviction");
    },
  );
});
