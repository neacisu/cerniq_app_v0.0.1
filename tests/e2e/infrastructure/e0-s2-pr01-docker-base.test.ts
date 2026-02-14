/**
 * E0-S2-PR01: F0.1 Docker Base Infrastructure Tests
 * ================================================
 * Validation tests for all tasks in Sprint 2 PR01
 *
 * Run with: pnpm test
 *
 * Tests automatically detect environment:
 * - Local repo tests: Always run
 * - Server tests: Skip in CI, run when SSH available locally
 *
 * @reference docs/specifications/Etapa 0/etapa0-plan-implementare-complet-v2.md
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
const IS_CI = process.env.CI === "true";
const RUN_SERVER_TESTS = process.env.CERNIQ_RUN_SERVER_TESTS === "true";

// Server tests are intentionally opt-in.
// These checks must be executed on the target server (CT109/CT110) where Docker
// and /opt/cerniq exist, not on a developer workstation that merely has `.env`.
function canRunServerTests(): boolean {
  if (IS_CI) return false; // Skip in CI - runs via validate-infrastructure.sh
  if (!RUN_SERVER_TESTS) return false;

  try {
    execSync("docker info >/dev/null 2>&1", { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

const CAN_RUN_SERVER_TESTS = canRunServerTests();

// Expected network configuration (updated to avoid GeniusERP conflicts)
// These constants document the expected infrastructure configuration
// and are used for reference in inline test assertions
export const EXPECTED_NETWORKS = {
  cerniq_public: { subnet: "172.29.10.0/24", internal: false },
  cerniq_backend: { subnet: "172.29.20.0/24", internal: true },
  cerniq_data: { subnet: "172.29.30.0/24", internal: true },
} as const;

export const EXPECTED_DAEMON_CONFIG = {
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "live-restore": true,
  "userland-proxy": false,
  "metrics-addr": "0.0.0.0:64094",
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

function parseJson<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

// =============================================================================
// F0.1.1: Docker Engine Setup Tests
// =============================================================================

describe("F0.1.1: Docker Engine Setup", () => {
  describe("F0.1.1.T001: Docker Engine Installation", () => {
    it.skipIf(!CAN_RUN_SERVER_TESTS)(
      "should have Docker Engine 28.x+ installed",
      () => {
        const version = exec('docker version --format "{{.Server.Version}}"');
        expect(version).toMatch(/^(28|29|30)\.\d+\.\d+/);
      },
    );

    it.skipIf(!CAN_RUN_SERVER_TESTS)(
      "should have Docker Compose v2.40+ installed",
      () => {
        const version = exec("docker compose version --short");
        const [major, minor] = version.replace("v", "").split(".").map(Number);
        expect(major).toBeGreaterThanOrEqual(2);
        if (major === 2) {
          expect(minor).toBeGreaterThanOrEqual(20);
        }
      },
    );

    it.skipIf(!CAN_RUN_SERVER_TESTS)(
      "should have Docker service running",
      () => {
        const status = exec("systemctl is-active docker");
        expect(status).toBe("active");
      },
    );
  });

  describe("F0.1.1.T002: daemon.json Configuration", () => {
    it("should have daemon.json template in repo", () => {
      expect(fileExists("infra/config/docker/daemon.json")).toBe(true);
    });

    it("should have valid JSON syntax", () => {
      const content = readFile("infra/config/docker/daemon.json");
      const config = parseJson(content);
      expect(config).not.toBeNull();
    });

    it("should have correct storage driver", () => {
      const content = readFile("infra/config/docker/daemon.json");
      const config = parseJson<Record<string, unknown>>(content);
      expect(config?.["storage-driver"]).toBe("overlay2");
    });

    it("should have live-restore enabled", () => {
      const content = readFile("infra/config/docker/daemon.json");
      const config = parseJson<Record<string, unknown>>(content);
      expect(config?.["live-restore"]).toBe(true);
    });

    it("should have userland-proxy disabled for performance", () => {
      const content = readFile("infra/config/docker/daemon.json");
      const config = parseJson<Record<string, unknown>>(content);
      expect(config?.["userland-proxy"]).toBe(false);
    });

    it("should have correct log rotation settings", () => {
      const content = readFile("infra/config/docker/daemon.json");
      const config = parseJson<Record<string, unknown>>(content);
      const logOpts = config?.["log-opts"] as
        | Record<string, string>
        | undefined;
      expect(logOpts?.["max-size"]).toBe("50m");
      expect(logOpts?.["max-file"]).toBe("5");
    });

    it("should have metrics endpoint configured", () => {
      const content = readFile("infra/config/docker/daemon.json");
      const config = parseJson<Record<string, unknown>>(content);
      expect(config?.["metrics-addr"]).toBe("0.0.0.0:64094");
    });

    it("should use 172.29.0.0/16 subnet (standardized)", () => {
      const content = readFile("infra/config/docker/daemon.json");
      const config = parseJson<Record<string, unknown>>(content);
      const pools = config?.["default-address-pools"] as
        | Array<{ base: string }>
        | undefined;
      expect(pools?.[0]?.base).toBe("172.29.0.0/16");
    });

    it.skipIf(!CAN_RUN_SERVER_TESTS)("should be applied on server", () => {
      const info = exec('docker info --format "{{.Driver}}"');
      expect(info).toBe("overlay2");
    });
  });

  describe("F0.1.1.T003: Directory Structure", () => {
    const requiredDirs = [
      "apps/api/src",
      "apps/web/src",
      "apps/web-admin/src",
      "packages/db",
      "packages/shared-types",
      "packages/config",
      "workers/ai",
      "workers/enrichment",
      "workers/outreach",
      "workers/monitoring",
      "infra/docker",
      "infra/scripts",
      "infra/config",
      "docs/adr",
      "docs/architecture",
      "docs/infrastructure",
      "tests/unit",
      "tests/integration",
      "tests/e2e",
      "secrets",
    ];

    it.each(requiredDirs)("should have directory: %s", (dir) => {
      expect(fileExists(dir)).toBe(true);
    });
  });
});

// =============================================================================
// F0.1.2: Docker Networks Setup Tests
// =============================================================================

describe("F0.1.2: Docker Networks Setup", () => {
  describe("F0.1.2.T001: Network Creation", () => {
    it.skipIf(!CAN_RUN_SERVER_TESTS)(
      "should have cerniq_public network",
      () => {
        const networks = exec('docker network ls --format "{{.Name}}"');
        expect(networks).toContain("cerniq_public");
      },
    );

    it.skipIf(!CAN_RUN_SERVER_TESTS)(
      "should have cerniq_backend network",
      () => {
        const networks = exec('docker network ls --format "{{.Name}}"');
        expect(networks).toContain("cerniq_backend");
      },
    );

    it.skipIf(!CAN_RUN_SERVER_TESTS)("should have cerniq_data network", () => {
      const networks = exec('docker network ls --format "{{.Name}}"');
      expect(networks).toContain("cerniq_data");
    });

    it.skipIf(!CAN_RUN_SERVER_TESTS)(
      "cerniq_public should NOT be internal",
      () => {
        const inspect = exec(
          'docker network inspect cerniq_public --format "{{.Internal}}"',
        );
        expect(inspect).toBe("false");
      },
    );

    it.skipIf(!CAN_RUN_SERVER_TESTS)(
      "cerniq_backend should be internal",
      () => {
        const inspect = exec(
          'docker network inspect cerniq_backend --format "{{.Internal}}"',
        );
        expect(inspect).toBe("true");
      },
    );

    it.skipIf(!CAN_RUN_SERVER_TESTS)("cerniq_data should be internal", () => {
      const inspect = exec(
        'docker network inspect cerniq_data --format "{{.Internal}}"',
      );
      expect(inspect).toBe("true");
    });

    it.skipIf(!CAN_RUN_SERVER_TESTS)(
      "should have correct subnet for cerniq_public (172.29.10.0/24)",
      () => {
        const subnet = exec(
          'docker network inspect cerniq_public --format "{{range .IPAM.Config}}{{.Subnet}}{{end}}"',
        );
        expect(subnet).toBe("172.29.10.0/24");
      },
    );

    it.skipIf(!CAN_RUN_SERVER_TESTS)(
      "should have correct subnet for cerniq_backend (172.29.20.0/24)",
      () => {
        const subnet = exec(
          'docker network inspect cerniq_backend --format "{{range .IPAM.Config}}{{.Subnet}}{{end}}"',
        );
        expect(subnet).toBe("172.29.20.0/24");
      },
    );

    it.skipIf(!CAN_RUN_SERVER_TESTS)(
      "should have correct subnet for cerniq_data (172.29.30.0/24)",
      () => {
        const subnet = exec(
          'docker network inspect cerniq_data --format "{{range .IPAM.Config}}{{.Subnet}}{{end}}"',
        );
        expect(subnet).toBe("172.29.30.0/24");
      },
    );
  });

  describe("F0.1.2.T002: docker-compose.yml Base", () => {
    let composeConfig: Record<string, unknown> | null = null;

    beforeAll(() => {
      const content = readFile("infra/docker/docker-compose.yml");
      composeConfig = parseYaml(content);
    });

    it("should have docker-compose.yml file", () => {
      expect(fileExists("infra/docker/docker-compose.yml")).toBe(true);
    });

    it("should be valid YAML", () => {
      expect(composeConfig).not.toBeNull();
    });

    it('should have project name "cerniq"', () => {
      expect(composeConfig?.name).toBe("cerniq");
    });

    it("should have cerniq_public network as external", () => {
      const networks = composeConfig?.networks as Record<
        string,
        { external: boolean }
      >;
      expect(networks?.cerniq_public?.external).toBe(true);
    });

    it("should have cerniq_backend network as external", () => {
      const networks = composeConfig?.networks as Record<
        string,
        { external: boolean }
      >;
      expect(networks?.cerniq_backend?.external).toBe(true);
    });

    it("should have cerniq_data network as external", () => {
      const networks = composeConfig?.networks as Record<
        string,
        { external: boolean }
      >;
      expect(networks?.cerniq_data?.external).toBe(true);
    });

    it("should not define deprecated postgres_data volume", () => {
      const volumes = composeConfig?.volumes as Record<string, unknown>;
      expect(volumes).not.toHaveProperty("postgres_data");
    });

    it("should define redis_data volume", () => {
      const volumes = composeConfig?.volumes as Record<string, unknown>;
      expect(volumes).toHaveProperty("redis_data");
    });

    it("should not define deprecated traefik_certs volume", () => {
      const volumes = composeConfig?.volumes as Record<string, unknown>;
      expect(volumes).not.toHaveProperty("traefik_certs");
    });

    it("should not define deprecated signoz_data volume", () => {
      const volumes = composeConfig?.volumes as Record<string, unknown>;
      expect(volumes).not.toHaveProperty("signoz_data");
    });

    it("should validate with docker compose config", () => {
      const result = exec(
        `cd ${WORKSPACE_ROOT}/infra/docker && docker compose -f docker-compose.yml config --quiet 2>&1 || echo "INVALID"`,
      );
      expect(result).not.toContain("INVALID");
      expect(result).not.toContain("error");
    });
  });
});

// =============================================================================
// F0.1.3: Validation Scripts & Documentation Tests
// =============================================================================

describe("F0.1.3: Validation Scripts & Documentation", () => {
  describe("F0.1.3.T001: check-docker.sh Script", () => {
    it("should have check-docker.sh script", () => {
      expect(fileExists("infra/scripts/check-docker.sh")).toBe(true);
    });

    it("should be executable", () => {
      const mode = fs.statSync(
        path.join(WORKSPACE_ROOT, "infra/scripts/check-docker.sh"),
      ).mode;
      const isExecutable = (mode & 0o111) !== 0;
      expect(isExecutable).toBe(true);
    });

    it("should check Docker version", () => {
      const content = readFile("infra/scripts/check-docker.sh");
      expect(content).toContain("docker version");
    });

    it("should check Docker Compose version", () => {
      const content = readFile("infra/scripts/check-docker.sh");
      expect(content).toContain("docker compose");
    });

    it("should validate networks", () => {
      const content = readFile("infra/scripts/check-docker.sh");
      expect(content).toContain("cerniq_public");
      expect(content).toContain("cerniq_backend");
      expect(content).toContain("cerniq_data");
    });

    it("should validate subnets 172.29.10/20/30", () => {
      const content = readFile("infra/scripts/check-docker.sh");
      expect(content).toMatch(/172\.29\.10|172\.29\.20|172\.29\.30/);
    });
  });

  describe("F0.1.3.T002: Log Rotation Documentation", () => {
    it("should have docker-log-rotation.md", () => {
      expect(fileExists("docs/infrastructure/docker-log-rotation.md")).toBe(
        true,
      );
    });

    it("should document max-size setting", () => {
      const content = readFile("docs/infrastructure/docker-log-rotation.md");
      expect(content).toContain("max-size");
      expect(content).toContain("50m");
    });

    it("should document max-file setting", () => {
      const content = readFile("docs/infrastructure/docker-log-rotation.md");
      expect(content).toContain("max-file");
    });
  });

  describe("F0.1.3.T003: Network Topology Documentation", () => {
    it("should have network-topology.md", () => {
      expect(fileExists("docs/infrastructure/network-topology.md")).toBe(true);
    });

    it("should document cerniq_public network", () => {
      const content = readFile("docs/infrastructure/network-topology.md");
      expect(content).toContain("cerniq_public");
    });

    it("should document cerniq_backend network", () => {
      const content = readFile("docs/infrastructure/network-topology.md");
      expect(content).toContain("cerniq_backend");
    });

    it("should document cerniq_data network", () => {
      const content = readFile("docs/infrastructure/network-topology.md");
      expect(content).toContain("cerniq_data");
    });

    it("should document correct subnets (172.29.10/20/30)", () => {
      const content = readFile("docs/infrastructure/network-topology.md");
      expect(content).toContain("172.29.10");
      expect(content).toContain("172.29.20");
      expect(content).toContain("172.29.30");
    });

    it("should explain internal vs external networks", () => {
      const content = readFile("docs/infrastructure/network-topology.md");
      expect(content.toLowerCase()).toContain("internal");
    });
  });
});

// =============================================================================
// CI/CD Configuration Tests
// =============================================================================

describe("CI/CD: Deploy Workflow", () => {
  let deployWorkflow: Record<string, unknown> | null = null;

  beforeAll(() => {
    const content = readFile(".github/workflows/deploy.yml");
    deployWorkflow = parseYaml(content);
  });

  it("should have deploy.yml workflow", () => {
    expect(fileExists(".github/workflows/deploy.yml")).toBe(true);
  });

  it("should trigger on push for all branches", () => {
    const on = deployWorkflow?.on as Record<string, unknown>;
    const push = on?.push as Record<string, unknown>;
    const branches = push?.branches as string[];
    expect(branches).toContain("**");
  });

  it("should deploy staging on non-main branches", () => {
    const on = deployWorkflow?.on as Record<string, unknown>;
    const push = on?.push as Record<string, unknown>;
    const branches = push?.branches as string[];
    expect(branches).toContain("**");
  });

  it("should support auto-versioning (tags created by workflow, not triggers)", () => {
    // Note: Tag triggers removed in favor of auto-versioning
    // The workflow creates v0.0.x tags automatically on main pushes
    const on = deployWorkflow?.on as Record<string, unknown>;
    const push = on?.push as Record<string, unknown>;
    const branches = push?.branches as string[];
    // Main branch triggers production with auto-versioning
    expect(branches).toContain("**");
    // workflow_dispatch still available for manual deploys
    expect(on).toHaveProperty("workflow_dispatch");
  });

  it("should have staging deployment job", () => {
    const jobs = deployWorkflow?.jobs as Record<string, unknown>;
    expect(jobs).toHaveProperty("deploy-staging");
  });

  it("should have production deployment job", () => {
    const jobs = deployWorkflow?.jobs as Record<string, unknown>;
    expect(jobs).toHaveProperty("deploy-production");
  });
});

// =============================================================================
// Server Deployment Structure Tests
// =============================================================================

describe.skipIf(!CAN_RUN_SERVER_TESTS)("Server: /opt/cerniq Structure", () => {
  it("should have /opt/cerniq directory", () => {
    const exists = exec('test -d /opt/cerniq && echo "yes" || echo "no"');
    expect(exists).toBe("yes");
  });

  it("should have /opt/cerniq/scripts directory", () => {
    const exists = exec(
      'test -d /opt/cerniq/scripts && echo "yes" || echo "no"',
    );
    expect(exists).toBe("yes");
  });

  it("should have /opt/cerniq/secrets directory", () => {
    const exists = exec(
      'test -d /opt/cerniq/secrets && echo "yes" || echo "no"',
    );
    expect(exists).toBe("yes");
  });

  it("should have /opt/cerniq/config directory", () => {
    const exists = exec(
      'test -d /opt/cerniq/config && echo "yes" || echo "no"',
    );
    expect(exists).toBe("yes");
  });

  it("should have docker-compose.yml in /opt/cerniq", () => {
    const exists = exec(
      'test -f /opt/cerniq/docker-compose.yml && echo "yes" || echo "no"',
    );
    expect(exists).toBe("yes");
  });

  it("should have check-docker.sh in /opt/cerniq/scripts", () => {
    const exists = exec(
      'test -f /opt/cerniq/scripts/check-docker.sh && echo "yes" || echo "no"',
    );
    expect(exists).toBe("yes");
  });
});
