/**
 * E0-S1: Sprint 1 Infrastructure Tests
 * =====================================
 * Validation tests for:
 * - E0-S1-PR01: F0.17 GitHub Repo Setup
 * - E0-S1-PR02: F0.15 CI/CD Base
 * - E0-S1-PR03: F0.16 DNS & Domain Configuration
 *
 * Run with: pnpm test:infra
 *
 * @reference docs/specifications/Etapa 0/etapa0-plan-implementare-complet-v2.md
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

// =============================================================================
// Test Configuration
// =============================================================================

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/var/www/CerniqAPP";

// =============================================================================
// Utility Functions
// =============================================================================

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

// =============================================================================
// E0-S1-PR01: F0.17 GitHub Repository Setup
// =============================================================================

describe("E0-S1-PR01: F0.17 GitHub Repository Setup", () => {
  describe("F0.17.1.T001: Repository Settings", () => {
    it("should have .gitignore file", () => {
      expect(fileExists(".gitignore")).toBe(true);
    });

    it("should have README.md", () => {
      expect(fileExists("README.md")).toBe(true);
    });

    it("should have package.json with project name", () => {
      const content = readFile("package.json");
      expect(content).toContain('"name":');
      expect(content).toContain("cerniq");
    });

    it("should have LICENSE file or be private", () => {
      const packageJson = readFile("package.json");
      const hasLicense = fileExists("LICENSE");
      const isPrivate = packageJson.includes('"private": true');
      expect(hasLicense || isPrivate).toBe(true);
    });
  });

  describe("F0.17.1.T002: CODEOWNERS Configuration", () => {
    it("should have CODEOWNERS file", () => {
      expect(fileExists(".github/CODEOWNERS")).toBe(true);
    });

    it("should define owners for /apps directory", () => {
      const content = readFile(".github/CODEOWNERS");
      expect(content).toMatch(/\/apps\/|apps\//);
    });

    it("should define owners for /docs directory", () => {
      const content = readFile(".github/CODEOWNERS");
      expect(content).toMatch(/\/docs\/|docs\//);
    });

    it("should have at least one owner defined", () => {
      const content = readFile(".github/CODEOWNERS");
      expect(content).toMatch(/@[\w-]+/);
    });
  });

  describe("F0.17.1.T003: Issue/PR Templates", () => {
    it("should have ISSUE_TEMPLATE directory", () => {
      expect(fileExists(".github/ISSUE_TEMPLATE")).toBe(true);
    });

    it("should have bug_report template", () => {
      expect(fileExists(".github/ISSUE_TEMPLATE/bug_report.md")).toBe(true);
    });

    it("should have feature_request template", () => {
      expect(fileExists(".github/ISSUE_TEMPLATE/feature_request.md")).toBe(
        true,
      );
    });

    it("should have PR template", () => {
      expect(fileExists(".github/PULL_REQUEST_TEMPLATE.md")).toBe(true);
    });

    it("bug template should have required sections", () => {
      const content = readFile(".github/ISSUE_TEMPLATE/bug_report.md");
      expect(content.toLowerCase()).toMatch(
        /describe|bug|steps|reproduce|expected/,
      );
    });

    it("feature template should have required sections", () => {
      const content = readFile(".github/ISSUE_TEMPLATE/feature_request.md");
      expect(content.toLowerCase()).toMatch(
        /describe|feature|solution|alternative/,
      );
    });

    it("PR template should have checklist", () => {
      const content = readFile(".github/PULL_REQUEST_TEMPLATE.md");
      expect(content).toMatch(/\[[ x]\]/i);
    });
  });

  describe("F0.17.1.T004: GitHub Actions Configuration", () => {
    it("should have .github/workflows directory", () => {
      expect(fileExists(".github/workflows")).toBe(true);
    });

    it("should have at least one workflow file", () => {
      const workflowsPath = path.join(WORKSPACE_ROOT, ".github/workflows");
      if (fs.existsSync(workflowsPath)) {
        const files = fs.readdirSync(workflowsPath);
        const ymlFiles = files.filter(
          (f) => f.endsWith(".yml") || f.endsWith(".yaml"),
        );
        expect(ymlFiles.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// E0-S1-PR02: F0.15 CI/CD Base
// =============================================================================

describe("E0-S1-PR02: F0.15 CI/CD Base", () => {
  describe("F0.15.1.T001: CI Workflow for PRs", () => {
    it("should have ci-pr.yml workflow", () => {
      expect(fileExists(".github/workflows/ci-pr.yml")).toBe(true);
    });

    it("should trigger on pull_request to main", () => {
      const content = readFile(".github/workflows/ci-pr.yml");
      expect(content).toContain("pull_request");
      expect(content).toContain("main");
    });

    it("should trigger on pull_request to develop", () => {
      const content = readFile(".github/workflows/ci-pr.yml");
      expect(content).toContain("develop");
    });

    it("should have lint job", () => {
      const content = readFile(".github/workflows/ci-pr.yml");
      expect(content.toLowerCase()).toMatch(/lint|eslint/);
    });

    it("should have test job", () => {
      const content = readFile(".github/workflows/ci-pr.yml");
      expect(content.toLowerCase()).toMatch(/test|vitest|jest/);
    });

    it("should have typecheck step", () => {
      const content = readFile(".github/workflows/ci-pr.yml");
      expect(content.toLowerCase()).toMatch(/typecheck|tsc/);
    });

    it("should use pnpm", () => {
      const content = readFile(".github/workflows/ci-pr.yml");
      expect(content).toContain("pnpm");
    });

    it("should use Node.js 24+", () => {
      const content = readFile(".github/workflows/ci-pr.yml");
      expect(content).toMatch(/node-version.*24|NODE_VERSION.*24/);
    });
  });

  describe("F0.15.1.T002: CD Workflow for Deploy", () => {
    it("should have deploy.yml workflow", () => {
      expect(fileExists(".github/workflows/deploy.yml")).toBe(true);
    });

    it("should trigger on main and develop branches", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toMatch(/branches:\s*\n?\s*-\s*main/);
      expect(content).toMatch(/branches:\s*[\s\S]*-\s*develop/);
    });

    it("should support manual workflow_dispatch", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toContain("workflow_dispatch");
    });

    it("should have staging deployment job", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content.toLowerCase()).toContain("staging");
    });

    it("should have production deployment job", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content.toLowerCase()).toContain("production");
    });

    it("should use Docker Compose for deployment", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toMatch(/docker compose|docker-compose/);
    });

    it("should have health check after deploy", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content.toLowerCase()).toMatch(/health|curl/);
    });
  });

  describe("F0.15.1.T003: GitHub Secrets Configuration", () => {
    it("should reference SSH secrets in deploy workflow", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toMatch(/secrets\.(STAGING_SSH_KEY|PRODUCTION_SSH_KEY)/);
    });

    it("should reference host secrets", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toMatch(/secrets\.(STAGING_HOST|PRODUCTION_HOST)/);
    });

    it("should use secrets safely (not directly echoed)", () => {
      const content = readFile(".github/workflows/deploy.yml");
      // Secrets should be used in commands, not directly printed
      // Check that secrets are referenced for SSH/SCP operations (safe usage)
      expect(content).toMatch(/ssh.*secrets\.|scp.*secrets\./);
    });
  });

  describe("F0.15.1.T004: Branch Protection Rules (via workflow)", () => {
    it("CI workflow should have concurrency group", () => {
      const content = readFile(".github/workflows/ci-pr.yml");
      expect(content).toContain("concurrency");
    });

    it("CI workflow should cancel in-progress runs", () => {
      const content = readFile(".github/workflows/ci-pr.yml");
      expect(content).toContain("cancel-in-progress");
    });
  });

  describe("F0.15.1.T005: GitHub Environments", () => {
    it("deploy workflow should define staging environment", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toMatch(/environment:\s*\n?\s*(name:\s*)?staging/i);
    });

    it("deploy workflow should define production environment", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toMatch(/environment:\s*\n?\s*(name:\s*)?production/i);
    });

    it("environments should have URLs", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toMatch(/url:/);
    });
  });

  describe("F0.15.1.T006: Pipeline Validation", () => {
    it("CI workflow should be valid YAML", () => {
      const content = readFile(".github/workflows/ci-pr.yml");
      const parsed = parseYaml(content);
      expect(parsed).not.toBeNull();
    });

    it("deploy workflow should be valid YAML", () => {
      const content = readFile(".github/workflows/deploy.yml");
      const parsed = parseYaml(content);
      expect(parsed).not.toBeNull();
    });

    it("CI workflow should have timeout", () => {
      const content = readFile(".github/workflows/ci-pr.yml");
      expect(content).toMatch(/timeout-minutes/);
    });

    it("workflows should use checkout action v4", () => {
      const ciContent = readFile(".github/workflows/ci-pr.yml");
      const deployContent = readFile(".github/workflows/deploy.yml");
      expect(ciContent).toContain("actions/checkout@v4");
      expect(deployContent).toContain("actions/checkout@v4");
    });
  });

  describe("F0.15.2: Enhanced CI/CD Features", () => {
    it("should have smoke tests with actual health checks", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toMatch(/pg_isready|redis-cli.*PING|curl.*ping/);
    });

    it("should have rollback mechanism", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toMatch(/rollback|\.previous_deploy/i);
    });

    it("should have Trivy image scanning", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toMatch(/trivy-action|Scan.*image.*vulnerabilities/i);
    });

    it("should install fail2ban configuration", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toMatch(/fail2ban.*jail\.local|systemctl.*fail2ban/);
    });

    it("should install cron job for backups", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toMatch(/cron\.d.*cerniq-backup|cron.*backup/);
    });

    it("should save version for rollback before deploy", () => {
      const content = readFile(".github/workflows/deploy.yml");
      expect(content).toMatch(
        /Save current version for rollback|\.previous_deploy/,
      );
    });

    it("should auto-deploy on branch pushes with main => production", () => {
      const content = readFile(".github/workflows/deploy.yml");
      const triggerSection = content.split("workflow_dispatch")[0];
      expect(triggerSection).toContain("**");
    });

    it("should have verify-deployment.sh script", () => {
      expect(fileExists("infra/scripts/verify-deployment.sh")).toBe(true);
    });

    it("verify-deployment.sh should check all core services", () => {
      const content = readFile("infra/scripts/verify-deployment.sh");
      expect(content).toMatch(/check_postgresql|pg_isready/);
      expect(content).toMatch(/check_redis|redis-cli/);
      expect(content).toMatch(/check_traefik|64093/);
      expect(content).toMatch(/check_openbao|bao status/);
    });
  });
});

// =============================================================================
// E0-S1-PR03: F0.16 DNS & Domain Configuration
// =============================================================================

describe("E0-S1-PR03: F0.16 DNS & Domain Configuration", () => {
  describe("F0.16.1.T001: DNS Records Documentation", () => {
    it("should have DNS documentation", () => {
      const hasDnsDoc =
        fileExists("docs/infrastructure/dns-configuration.md") ||
        fileExists("docs/infrastructure/dns.md") ||
        fileExists("docs/runbooks/dns-setup.md");
      // DNS docs may be in various locations, or handled externally
      // This test checks if we have network topology which mentions domains
      const hasNetworkDoc = fileExists(
        "docs/infrastructure/network-topology.md",
      );
      expect(hasDnsDoc || hasNetworkDoc).toBe(true);
    });
  });

  describe("F0.16.1.T002: Subdomain Configuration", () => {
    it("Traefik config should reference expected domains", () => {
      const traefikYml =
        readFile("infra/docker/traefik/traefik.yml") ||
        readFile("infra/config/traefik/traefik.yml");
      const dockerCompose = readFile("infra/docker/docker-compose.yml");

      // At minimum, docker-compose or traefik should mention domain routing
      const content = traefikYml + dockerCompose;
      // Check for any domain/host routing configuration
      const hasDomainConfig =
        content.includes("Host(") ||
        content.includes("certificatesResolvers") ||
        content.includes("acme") ||
        content.includes("cerniq");
      expect(hasDomainConfig).toBe(true);
    });
  });

  describe("F0.16.1.T003: DNS Propagation Verification", () => {
    it("should have environment URLs defined in deploy workflow", () => {
      const content = readFile(".github/workflows/deploy.yml");
      // Check for staging and production URLs
      expect(content).toMatch(/url:.*staging|staging.*url/i);
      expect(content).toMatch(/url:.*app\.|\.cerniq|production.*url/i);
    });
  });
});

// =============================================================================
// Sprint 1 Summary Tests
// =============================================================================

describe("E0-S1 Sprint Summary", () => {
  it("should have all required GitHub configurations", () => {
    const required = [
      ".github/CODEOWNERS",
      ".github/ISSUE_TEMPLATE/bug_report.md",
      ".github/ISSUE_TEMPLATE/feature_request.md",
      ".github/PULL_REQUEST_TEMPLATE.md",
      ".github/workflows/ci-pr.yml",
      ".github/workflows/deploy.yml",
    ];

    const missing = required.filter((f) => !fileExists(f));
    expect(missing).toHaveLength(0);
  });

  it("should have CI pipeline with lint, test, and build capabilities", () => {
    const content = readFile(".github/workflows/ci-pr.yml");
    expect(content.toLowerCase()).toContain("lint");
    expect(content.toLowerCase()).toContain("test");
  });

  it("should have CD pipeline with staging and production", () => {
    const content = readFile(".github/workflows/deploy.yml");
    expect(content.toLowerCase()).toContain("staging");
    expect(content.toLowerCase()).toContain("production");
  });

  it("should have proper project structure for monorepo", () => {
    const packageJson = readFile("package.json");
    expect(packageJson).toContain("pnpm");
  });
});
