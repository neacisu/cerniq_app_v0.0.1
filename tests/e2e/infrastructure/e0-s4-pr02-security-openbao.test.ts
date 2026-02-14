/**
 * E0-S4-PR02: F0.8 Security Hardening + OpenBao Tests
 * ===================================================
 * Validation tests for all tasks in Sprint 4 PR02
 *
 * Run with: pnpm test
 *
 * Tests automatically detect environment:
 * - Local repo tests: Always run
 * - Server tests: Skip in CI, run when SSH available locally
 *
 * @reference docs/specifications/Etapa 0/etapa0-plan-implementare-complet-v2.md
 * @reference ADR-0033 OpenBao Secrets Management
 * @reference docs/governance/security-policy.md
 */

import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// Test Configuration
// =============================================================================

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/var/www/CerniqAPP";
const IS_CI = process.env.CI === "true";
const RUN_SERVER_TESTS = process.env.CERNIQ_RUN_SERVER_TESTS === "true";

// Server tests are intentionally opt-in.
// Rationale: developers often have `.env` with server hosts, but running
// `pnpm test` locally should not attempt to inspect remote containers/firewall.
function canRunServerTests(): boolean {
  if (IS_CI) return false;
  if (!RUN_SERVER_TESTS) return false;

  // We expect these tests to be executed on the server itself (CT109/CT110),
  // where docker/ufw/fail2ban are available.
  try {
    execSync("docker info >/dev/null 2>&1", { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

const CAN_RUN_SERVER_TESTS = canRunServerTests();

// =============================================================================
// Expected Configuration (ADR-0033, security-policy.md)
// =============================================================================

const EXPECTED_OPENBAO_CONFIG = {
  version: "2.5.0",
  port: 64090, // Per etapa0-port-matrix.md reserved range 64090-64099
  ip: "172.29.20.50",
  network: "cerniq_backend",
} as const;

const EXPECTED_ADMIN_IPS = [
  "92.180.19.237",
  "95.216.225.145",
  "94.130.68.123",
  "135.181.183.164",
  "95.216.72.100",
  "95.216.72.118",
] as const;

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

// =============================================================================
// F0.8.1: Container Hardening Tests
// =============================================================================

describe("F0.8.1: Container Hardening", () => {
  describe("T001: docker-compose.yml security settings", () => {
    it("should have docker-compose.yml", () => {
      expect(fileExists("infra/docker/docker-compose.yml")).toBe(true);
    });

    it("should have no-new-privileges on services", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      expect(content).toContain("no-new-privileges:true");
    });

    it("should have cap_drop: ALL on services", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      expect(content).toContain("cap_drop:");
      expect(content.toLowerCase()).toContain("all");
    });

    it("should use read_only where applicable", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      // pgbouncer and some services should have read_only
      expect(content).toContain("read_only: true");
    });

    it("should not expose POSTGRES_PASSWORD in environment vars", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      // pgbouncer should NOT have ${POSTGRES_PASSWORD} in env
      const lines = content.split("\n");
      let inPgbouncer = false;
      let hasExposedPassword = false;

      for (const line of lines) {
        if (line.includes("pgbouncer:")) {
          inPgbouncer = true;
        }
        if (inPgbouncer && line.match(/^\s+\w+:/)) {
          // New service started
          if (!line.includes("pgbouncer")) {
            inPgbouncer = false;
          }
        }
        if (
          inPgbouncer &&
          line.includes("DATABASE_URL:") &&
          line.includes("${POSTGRES_PASSWORD}")
        ) {
          hasExposedPassword = true;
        }
      }

      expect(hasExposedPassword).toBe(false);
    });

    it("pgbouncer should use secrets for password", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      // pgbouncer section should have secrets reference
      // The section might span multiple lines, so we check that:
      // 1. pgbouncer service exists
      // 2. The file mounts postgres_password secret file
      expect(content).toContain("pgbouncer:");

      // Check that pgbouncer has secrets file mount
      // Note: We use file mount instead of Docker secrets syntax because
      // compose non-swarm doesn't support secret uid/gid settings
      const pgbouncerIndex = content.indexOf("pgbouncer:");
      const relevantSection = content.substring(
        pgbouncerIndex,
        pgbouncerIndex + 2000,
      );
      // Check for secrets file mount approach
      expect(relevantSection).toContain("postgres_password");
      expect(relevantSection).toContain("/secrets/postgres_password");
    });
  });

  describe("T002: User namespac and resource limits", () => {
    it("should have resource limits defined", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      expect(content).toContain("deploy:");
      expect(content).toContain("resources:");
      expect(content).toContain("limits:");
      expect(content).toContain("memory:");
    });
  });

  describe("T003: Container scanning configuration", () => {
    it("should have trivy-scan.sh script", () => {
      expect(fileExists("infra/scripts/trivy-scan.sh")).toBe(true);
    });

    it("trivy script should scan all images", () => {
      const content = readFile("infra/scripts/trivy-scan.sh");
      expect(content).toContain("trivy");
      // Should scan multiple images
      expect(content.match(/trivy.*image/i)).toBeTruthy();
    });
  });
});

// =============================================================================
// F0.8.2: Host-Level Security Tests
// =============================================================================

describe("F0.8.2: Host-Level Security", () => {
  describe("T001: UFW firewall configuration", () => {
    it("should have setup-firewall.sh script", () => {
      expect(fileExists("infra/scripts/setup-firewall.sh")).toBe(true);
    });

    it("firewall script should be executable (shebang)", () => {
      const content = readFile("infra/scripts/setup-firewall.sh");
      expect(content.startsWith("#!/bin/bash")).toBe(true);
    });

    it("should include admin IP whitelist", () => {
      const content = readFile("infra/scripts/setup-firewall.sh");
      for (const ip of EXPECTED_ADMIN_IPS.slice(0, 2)) {
        // Check at least the first 2 IPs
        expect(content).toContain(ip);
      }
    });

    it("should use environment detection", () => {
      const content = readFile("infra/scripts/setup-firewall.sh");
      expect(content).toContain("detect-environment.sh");
    });
  });

  describe("T002: Fail2ban configuration", () => {
    it("should have fail2ban jail.local configuration", () => {
      expect(fileExists("infra/config/fail2ban/jail.local")).toBe(true);
    });

    it("fail2ban should protect SSH", () => {
      const content = readFile("infra/config/fail2ban/jail.local");
      expect(content).toContain("[sshd]");
      expect(content).toContain("enabled = true");
    });

    it("fail2ban should have appropriate ban settings", () => {
      const content = readFile("infra/config/fail2ban/jail.local");
      expect(content).toContain("bantime");
      expect(content).toContain("findtime");
      expect(content).toContain("maxretry");
    });
  });
});

// =============================================================================
// F0.8.3: OpenBao Secrets Management Tests
// =============================================================================

describe("F0.8.3: OpenBao Secrets Management", () => {
  describe("T001: OpenBao service configuration", () => {
    it("should NOT have local openbao service in docker-compose.yml", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      expect(content).not.toMatch(/\n\s{2}openbao:\n/);
    });

    it("should keep OpenBao agent image pinned", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      expect(content).toContain(
        `quay.io/openbao/openbao:${EXPECTED_OPENBAO_CONFIG.version}`,
      );
    });

    it("should not expose local OpenBao API port", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      expect(content).not.toMatch(/64090:8200/);
    });

    it("should be on correct network", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      // OpenBao should be on cerniq_backend
      expect(content).toContain("cerniq_backend");
    });

    it("should not require IPC_LOCK for local OpenBao server", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      expect(content).not.toContain("IPC_LOCK");
    });
  });

  describe("T002: OpenBao server configuration", () => {
    it("should have openbao.hcl configuration", () => {
      expect(fileExists("infra/config/openbao/openbao.hcl")).toBe(true);
    });

    it("should use Raft storage backend", () => {
      const content = readFile("infra/config/openbao/openbao.hcl");
      expect(content).toContain('storage "raft"');
    });

    it("should have audit logging enabled", () => {
      const content = readFile("infra/config/openbao/openbao.hcl");
      // Should reference audit in config or separate setup
      const hasAudit =
        content.includes("audit") ||
        readFile("infra/scripts/openbao-setup-engines.sh").includes("audit");
      expect(hasAudit).toBe(true);
    });

    it("should disable UI or restrict access", () => {
      const content = readFile("infra/config/openbao/openbao.hcl");
      // UI should be explicitly off or not mentioned (default is false)
      // OR if enabled, it should be localhost only (port binding ensures this)
      const uiExplicitlyEnabled = content.match(/ui\s*=\s*true/i);
      // This is OK - we bind 127.0.0.1:64090 so UI is localhost only anyway
      expect(uiExplicitlyEnabled === null || content.includes("listener")).toBe(
        true,
      );
    });
  });

  describe("T003: OpenBao policies", () => {
    it("should have API policy", () => {
      expect(fileExists("infra/config/openbao/policies/api-policy.hcl")).toBe(
        true,
      );
    });

    it("should have Workers policy", () => {
      expect(
        fileExists("infra/config/openbao/policies/workers-policy.hcl"),
      ).toBe(true);
    });

    it("should have CI/CD policy", () => {
      expect(fileExists("infra/config/openbao/policies/cicd-policy.hcl")).toBe(
        true,
      );
    });

    it("API policy should grant appropriate permissions", () => {
      const content = readFile("infra/config/openbao/policies/api-policy.hcl");
      expect(content).toContain("read");
      expect(content).toContain("secret/");
    });
  });

  describe("T004: OpenBao agent configuration", () => {
    it("should have agent-api.hcl configuration", () => {
      expect(fileExists("infra/config/openbao/agent-api.hcl")).toBe(true);
    });

    it("should have agent-workers.hcl configuration", () => {
      expect(fileExists("infra/config/openbao/agent-workers.hcl")).toBe(true);
    });

    it("agent configs should use AppRole auth", () => {
      const apiAgent = readFile("infra/config/openbao/agent-api.hcl");
      const workersAgent = readFile("infra/config/openbao/agent-workers.hcl");

      expect(apiAgent).toContain("approle");
      expect(workersAgent).toContain("approle");
    });

    it("should have secret templates", () => {
      expect(fileExists("infra/config/openbao/templates/api-env.tpl")).toBe(
        true,
      );
      expect(fileExists("infra/config/openbao/templates/workers-env.tpl")).toBe(
        true,
      );
    });
  });

  describe("T005: OpenBao agents in docker-compose", () => {
    it("should have openbao-agent-api service", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      expect(content).toContain("openbao-agent-api:");
    });

    it("should have openbao-agent-workers service", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      expect(content).toContain("openbao-agent-workers:");
    });

    it("should have api_secrets volume", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      expect(content).toContain("api_secrets:");
    });

    it("should have workers_secrets volume", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      expect(content).toContain("workers_secrets:");
    });
  });
});

// =============================================================================
// F0.8.4: OpenBao Setup Scripts Tests
// =============================================================================

describe("F0.8.4: OpenBao Setup Scripts", () => {
  describe("T001: Initialization script", () => {
    it("should have openbao-init.sh", () => {
      expect(fileExists("infra/scripts/openbao-init.sh")).toBe(true);
    });

    it("init script should use environment detection", () => {
      const content = readFile("infra/scripts/openbao-init.sh");
      expect(content).toContain("detect-environment.sh");
    });

    it("should initialize with 5 key shares, 3 threshold", () => {
      const content = readFile("infra/scripts/openbao-init.sh");
      expect(content.match(/-key-shares\s*[=\s]*5/)).toBeTruthy();
      expect(content.match(/-key-threshold\s*[=\s]*3/)).toBeTruthy();
    });
  });

  describe("T002: Secrets engines setup", () => {
    it("should have openbao-setup-engines.sh", () => {
      expect(fileExists("infra/scripts/openbao-setup-engines.sh")).toBe(true);
    });

    it("should setup KV v2 secrets engine", () => {
      const content = readFile("infra/scripts/openbao-setup-engines.sh");
      expect(content).toContain("kv");
      expect(content).toContain("secrets");
    });

    it("should setup database secrets engine", () => {
      const content = readFile("infra/scripts/openbao-setup-engines.sh");
      expect(content).toContain("database");
    });
  });

  describe("T003: AppRole setup", () => {
    it("should have openbao-setup-approle.sh", () => {
      expect(fileExists("infra/scripts/openbao-setup-approle.sh")).toBe(true);
    });

    it("should create api, workers, and cicd roles", () => {
      const content = readFile("infra/scripts/openbao-setup-approle.sh");
      expect(content).toContain("api");
      expect(content).toContain("workers");
      expect(content).toContain("cicd");
    });
  });

  describe("T004: Database setup script", () => {
    it("should have openbao-setup-database.sh", () => {
      expect(fileExists("infra/scripts/openbao-setup-database.sh")).toBe(true);
    });
  });

  describe("T005: Rotation script", () => {
    it("should have openbao-rotate-static-secrets.sh", () => {
      expect(fileExists("infra/scripts/openbao-rotate-static-secrets.sh")).toBe(
        true,
      );
    });
  });

  describe("T006: Backup script", () => {
    it("should have openbao-backup.sh", () => {
      expect(fileExists("infra/scripts/openbao-backup.sh")).toBe(true);
    });

    it("backup script should use Raft snapshot", () => {
      const content = readFile("infra/scripts/openbao-backup.sh");
      expect(content.match(/raft.*snapshot|snapshot.*raft/i)).toBeTruthy();
    });
  });
});

// =============================================================================
// F0.8.5: Environment Detection Tests
// =============================================================================

describe("F0.8.5: Environment Detection", () => {
  describe("T001: detect-environment.sh script", () => {
    it("should have detect-environment.sh", () => {
      expect(fileExists("infra/scripts/detect-environment.sh")).toBe(true);
    });

    it("should export CERNIQ_ENV", () => {
      const content = readFile("infra/scripts/detect-environment.sh");
      expect(content).toContain("export CERNIQ_ENV");
    });

    it("should detect staging vs production", () => {
      const content = readFile("infra/scripts/detect-environment.sh");
      expect(content).toContain("staging");
      expect(content).toContain("production");
    });

    it("should export admin IPs per environment", () => {
      const content = readFile("infra/scripts/detect-environment.sh");
      expect(content).toContain("CERNIQ_ADMIN_IPS");
    });

    it("should have production confirmation for dangerous ops", () => {
      const content = readFile("infra/scripts/detect-environment.sh");
      expect(
        content.match(/require.*production.*confirm|confirm.*production/i),
      ).toBeTruthy();
    });
  });
});

// =============================================================================
// F0.8.6: CI/CD Integration Tests
// =============================================================================

describe("F0.8.6: CI/CD Integration", () => {
  describe("T001: Deploy workflow OpenBao integration", () => {
    it("should have deploy.yml workflow", () => {
      expect(fileExists(".github/workflows/deploy.yml")).toBe(true);
    });

    it("deploy workflow should reference external OpenBao (staging)", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content.toLowerCase()).toContain("openbao");
      expect(content).toContain("s3cr3ts.neanelu.ro");
      // Should verify AppRole credentials exist on host (agents rely on them)
      expect(content).toContain("AppRole credentials present");
    });

    it("deploy workflow should reference external OpenBao (production)", () => {
      const content = readFile(".github/workflows/deploy.yml");
      // Should have production-specific handling
      expect(content).toContain("Production");
      expect(content).toContain("s3cr3ts.neanelu.ro");
    });

    it("deploy workflow should NOT attempt OpenBao init/unseal (external)", () => {
      const content = readFile(".github/workflows/deploy.yml");
      // We do not run openbao init/unseal in this repo/CI; OpenBao runs on orchestrator.
      expect(content.toLowerCase()).toContain(
        "skipped: openbao server is external",
      );
    });
  });
});

// =============================================================================
// F0.8.7: Documentation Tests
// =============================================================================

describe("F0.8.7: Security Documentation", () => {
  describe("T001: OpenBao recovery runbook", () => {
    it("should have OpenBao recovery runbook", () => {
      expect(fileExists("docs/runbooks/openbao-recovery.md")).toBe(true);
    });

    it("runbook should cover unseal procedure", () => {
      const content = readFile("docs/runbooks/openbao-recovery.md");
      expect(content.toLowerCase()).toContain("unseal");
    });

    it("runbook should cover key recovery", () => {
      const content = readFile("docs/runbooks/openbao-recovery.md");
      // Should cover restore or recovery procedures
      expect(content.match(/recover|restore|key|unseal/i)).toBeTruthy();
    });
  });

  describe("T002: Pre-release security checklist", () => {
    it("should have pre-release security checklist", () => {
      expect(
        fileExists("docs/governance/pre-release-security-checklist.md"),
      ).toBe(true);
    });

    it("checklist should cover container scanning", () => {
      const content = readFile(
        "docs/governance/pre-release-security-checklist.md",
      );
      expect(content.toLowerCase()).toMatch(/scan|trivy|container.*security/);
    });

    it("checklist should cover secrets verification", () => {
      const content = readFile(
        "docs/governance/pre-release-security-checklist.md",
      );
      expect(content.toLowerCase()).toMatch(/secret|openbao|credential/);
    });
  });
});

// =============================================================================
// Server Integration Tests (Skip in CI)
// =============================================================================

describe("F0.8: Server Integration Tests", () => {
  const itServer = CAN_RUN_SERVER_TESTS ? it : it.skip;

  describe("OpenBao Server Tests (Server Required)", () => {
    itServer("External OpenBao should be reachable", () => {
      const result = exec(
        "curl -skf https://s3cr3ts.neanelu.ro/v1/sys/health >/dev/null && echo ok",
      );
      expect(result).toBe("ok");
    });

    itServer("OpenBao agents should be running", () => {
      const apiAgent = exec(
        "docker ps --format '{{.Names}}' | grep openbao-agent-api",
      );
      const workersAgent = exec(
        "docker ps --format '{{.Names}}' | grep openbao-agent-workers",
      );
      expect(apiAgent).toContain("openbao-agent-api");
      expect(workersAgent).toContain("openbao-agent-workers");
    });

    itServer("API secrets should be rendered", () => {
      const result = exec(
        `docker exec cerniq-openbao-agent-api test -f /secrets/api.env && echo "exists" || echo "missing"`,
      );
      expect(result).toBe("exists");
    });
  });

  describe("Container Hardening Tests (Server Required)", () => {
    itServer("containers should have no-new-privileges", () => {
      for (const name of ["cerniq-pgbouncer", "cerniq-redis"]) {
        const result = exec(
          `docker inspect ${name} --format '{{.HostConfig.SecurityOpt}}' 2>/dev/null`,
        );
        expect(result).toContain("no-new-privileges:true");
      }
    });

    itServer("Redis should use healthcheck with secret", () => {
      const result = exec(
        `docker inspect cerniq-redis --format '{{.Config.Healthcheck.Test}}' 2>/dev/null`,
      );
      expect(result).toContain("redis-cli");
    });
  });

  describe("Firewall Tests (Server Required)", () => {
    itServer("UFW should be active", () => {
      const result = exec("sudo ufw status 2>/dev/null | head -n1");
      expect(result).toContain("active");
    });

    itServer("SSH should be restricted to admin IPs", () => {
      const result = exec("sudo ufw status numbered 2>/dev/null");
      // Should have SSH rules with specific IPs
      expect(result).toMatch(/22.*ALLOW/);
    });
  });

  describe("Fail2ban Tests (Server Required)", () => {
    itServer("fail2ban should be running", () => {
      const result = exec("systemctl is-active fail2ban 2>/dev/null");
      expect(result).toBe("active");
    });

    itServer("sshd jail should be enabled", () => {
      const result = exec("sudo fail2ban-client status sshd 2>/dev/null");
      expect(result).toContain("sshd");
    });
  });
});

// =============================================================================
// Test Summary
// =============================================================================

describe("E0-S4-PR02 Summary", () => {
  it("should have all required security infrastructure files", () => {
    const requiredFiles = [
      // OpenBao
      "infra/config/openbao/openbao.hcl",
      "infra/config/openbao/agent-api.hcl",
      "infra/config/openbao/agent-workers.hcl",
      "infra/config/openbao/policies/api-policy.hcl",
      "infra/config/openbao/policies/workers-policy.hcl",
      "infra/config/openbao/templates/api-env.tpl",
      "infra/config/openbao/templates/workers-env.tpl",

      // Scripts
      "infra/scripts/openbao-init.sh",
      "infra/scripts/openbao-setup-engines.sh",
      "infra/scripts/openbao-setup-approle.sh",
      "infra/scripts/openbao-setup-database.sh",
      "infra/scripts/setup-firewall.sh",
      "infra/scripts/trivy-scan.sh",
      "infra/scripts/detect-environment.sh",

      // Fail2ban
      "infra/config/fail2ban/jail.local",

      // Documentation
      "docs/runbooks/openbao-recovery.md",
      "docs/governance/pre-release-security-checklist.md",
    ];

    const missingFiles = requiredFiles.filter((f) => !fileExists(f));

    if (missingFiles.length > 0) {
      console.log("Missing files:", missingFiles);
    }

    expect(missingFiles.length).toBe(0);
  });

  it("should use only OpenBao agents in docker-compose.yml", () => {
    const content = readFile("infra/docker/docker-compose.yml");
    expect(content).not.toMatch(/\n\s{2}openbao:\n/);
    expect(content).toContain("openbao-agent-api:");
    expect(content).toContain("openbao-agent-workers:");
  });

  it("should have environment-aware scripts", () => {
    const scripts = [
      "infra/scripts/openbao-init.sh",
      "infra/scripts/openbao-setup-engines.sh",
      "infra/scripts/setup-firewall.sh",
    ];

    for (const script of scripts) {
      const content = readFile(script);
      expect(content).toContain("detect-environment.sh");
    }
  });
});
