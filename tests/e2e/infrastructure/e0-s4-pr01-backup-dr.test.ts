/**
 * E0-S4-PR01: F0.7 Backup & Disaster Recovery Tests
 * =================================================
 * Validation tests for all tasks in Sprint 4 PR01
 *
 * Run with: pnpm test
 *
 * Tests automatically detect environment:
 * - Local repo tests: Always run
 * - Server tests: Skip in CI, run when SSH available locally
 *
 * @reference docs/specifications/Etapa 0/etapa0-plan-implementare-complet-v2.md
 * @reference ADR-0028 Backup & DR Strategy
 */

import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

// =============================================================================
// Test Configuration
// =============================================================================

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/var/www/CerniqAPP";
const IS_CI = process.env.CI === "true";
const RUN_SERVER_TESTS = process.env.CERNIQ_RUN_SERVER_TESTS === "true";

// Server tests are intentionally opt-in and should be executed on the server.
function canRunServerTests(): boolean {
  if (IS_CI) return false;
  if (!RUN_SERVER_TESTS) return false;

  try {
    execSync("docker info >/dev/null 2>&1", { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

const CAN_RUN_SERVER_TESTS = canRunServerTests();

// Hetzner Storage Box configuration
const STORAGE_BOX_USER = "u502048";
const STORAGE_BOX_HOST = "u502048.your-storagebox.de";
const STORAGE_BOX_PORT = 23;

// Check if Storage Box is reachable (requires SSH keys configured)
function canReachStorageBox(): boolean {
  if (IS_CI) return false;
  try {
    const result = execSync(
      `ssh -o ConnectTimeout=3 -o BatchMode=yes -p ${STORAGE_BOX_PORT} ${STORAGE_BOX_USER}@${STORAGE_BOX_HOST} echo ok 2>/dev/null`,
      { encoding: "utf-8", timeout: 5000 },
    ).trim();
    return result === "ok";
  } catch {
    return false;
  }
}

const CAN_REACH_STORAGE_BOX = canReachStorageBox();

// Port Matrix per ADR-0022 is provided by shared test helpers.

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
// F0.7.1: Backup Script Configuration Tests
// =============================================================================

describe("F0.7.1: Backup Script Configuration", () => {
  describe("T001: Borg daily backup script exists and is correct", () => {
    it("should have borg_backup_daily.sh script", () => {
      expect(fileExists("infra/scripts/borg_backup_daily.sh")).toBe(true);
    });

    it("should be executable (have shebang)", () => {
      const content = readFile("infra/scripts/borg_backup_daily.sh");
      expect(content.startsWith("#!/bin/bash")).toBe(true);
    });

    it("should include all backup targets", () => {
      const content = readFile("infra/scripts/borg_backup_daily.sh");

      // Should backup PostgreSQL
      expect(content.toLowerCase()).toMatch(/postgres/);

      // Redis este shared pe orchestrator in infra noua; backup-ul lui nu este in scope-ul CT109/CT110.

      // In infra noua, TLS/certificates sunt gestionate de Traefik pe orchestrator,
      // deci nu fac parte din backup-ul stack-ului Cerniq de pe CT109/CT110.
    });

    it("should include OpenBao backup", () => {
      const content = readFile("infra/scripts/borg_backup_daily.sh");
      expect(content.toLowerCase()).toContain("openbao");
    });

    it("should use Hetzner Storage Box", () => {
      const content = readFile("infra/scripts/borg_backup_daily.sh");
      expect(content).toContain(STORAGE_BOX_USER);
      expect(content).toContain(STORAGE_BOX_HOST);
    });

    it("should implement retention policy", () => {
      const content = readFile("infra/scripts/borg_backup_daily.sh");
      // Should have prune command with retention settings
      expect(content).toMatch(/borg.*prune/);
      expect(content).toMatch(/--keep-(daily|weekly|monthly)/);
    });
  });

  describe("T002: Backup secrets are not tracked in git", () => {
    it("secrets/ should be gitignored", () => {
      const ignore = readFile(".gitignore");
      expect(ignore).toMatch(/^secrets\/$/m);
    });

    it("secrets/ should not be tracked", () => {
      const tracked = exec("git ls-files secrets || true");
      expect(tracked.trim()).toBe("");
    });

    it("borg script should not reference repo secrets/ folder", () => {
      const content = readFile("infra/scripts/borg_backup_daily.sh");
      expect(content).not.toContain("/var/www/CerniqAPP/secrets");
      // Allow server-local secrets path (/opt/cerniq/secrets/...), but not repo-relative secrets/
      expect(content).not.toMatch(/(^|\s)secrets\/borg_/m);
    });
  });
});

// =============================================================================
// F0.7.2: PostgreSQL PITR Configuration Tests
// =============================================================================

describe("F0.7.2: PostgreSQL Point-in-Time Recovery", () => {
  describe("T001: WAL archiving configuration", () => {
    it("should have postgresql.conf with WAL settings", () => {
      expect(fileExists("infra/config/postgres/postgresql.conf")).toBe(true);
    });

    it("should enable WAL archiving", () => {
      const content = readFile("infra/config/postgres/postgresql.conf");
      expect(content).toContain("archive_mode");
      expect(content).toMatch(/archive_mode\s*=\s*on/i);
    });

    it("should configure archive command", () => {
      const content = readFile("infra/config/postgres/postgresql.conf");
      expect(content).toContain("archive_command");
    });

    it("should set appropriate wal_level", () => {
      const content = readFile("infra/config/postgres/postgresql.conf");
      expect(content).toMatch(/wal_level\s*=\s*replica/i);
    });
  });

  describe("T002: WAL archive volume in docker-compose", () => {
    it("should not require local postgres_wal_archive volume (external CT107)", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      expect(content).not.toContain("postgres_wal_archive");
    });
  });
});

// =============================================================================
// F0.7.3: Disaster Recovery Documentation Tests
// =============================================================================

describe("F0.7.3: Disaster Recovery Documentation", () => {
  describe("T001: DR runbook documentation", () => {
    it("should have recovery runbook", () => {
      const runbookExists =
        fileExists("docs/runbooks/disaster-recovery-complete.md") ||
        fileExists("docs/runbooks/disaster-recovery.md") ||
        fileExists("docs/runbooks/openbao-recovery.md");
      expect(runbookExists).toBe(true);
    });

    it("disaster-recovery-complete.md should reference real scripts and topology", () => {
      const content = readFile("docs/runbooks/disaster-recovery-complete.md");
      expect(content.length).toBeGreaterThan(500);
      expect(content).toContain("infra/scripts/disaster_recovery_full.sh");
      expect(content).toContain("10.0.1.107");
      expect(content).toContain("64080");
      expect(content).toMatch(/RTO|RPO/i);
    });

    it("credential-exposure-incident.md should reference rotation and OpenBao", () => {
      const content = readFile("docs/runbooks/credential-exposure-incident.md");
      expect(content).toContain("openbao-rotate-static-secrets.sh");
      expect(content).toContain("disaster-recovery-complete.md");
    });

    it("recovery runbook should have required sections", () => {
      let content = readFile("docs/runbooks/disaster-recovery-complete.md");
      if (!content) {
        content = readFile("docs/runbooks/disaster-recovery.md");
      }
      if (!content) {
        content = readFile("docs/runbooks/openbao-recovery.md");
      }

      expect(/scenario|scenarii|RTO|RPO/i.exec(content)).not.toBeNull();
      expect(/procedure|procedur|recovery|restaurare/i.exec(content)).not.toBeNull();
    });
  });

  describe("T002: Backup verification documentation", () => {
    it("should document backup verification procedure", () => {
      const paths = [
        "docs/runbooks/disaster-recovery.md",
        "docs/runbooks/openbao-recovery.md",
        "docs/runbooks/backup-verification.md",
        "docs/infrastructure/backup-strategy.md",
      ];

      let hasVerification = false;
      for (const docPath of paths) {
        const content = readFile(docPath);
        if (/verif|test.*backup|restore.*test/i.exec(content)) {
          hasVerification = true;
          break;
        }
      }

      expect(hasVerification).toBe(true);
    });
  });
});

// =============================================================================
// F0.7.4: Backup Monitoring Tests
// =============================================================================

describe("F0.7.4: Backup Monitoring & Alerting", () => {
  describe("T001: Backup success logging", () => {
    it("backup script should log success/failure", () => {
      const content = readFile("infra/scripts/borg_backup_daily.sh");

      // Should have logging
      expect(/log|echo|print/i.exec(content)).not.toBeNull();

      // Should handle errors
      expect(/error|fail|exit/i.exec(content)).not.toBeNull();
    });
  });

  describe("T002: Backup notification mechanism", () => {
    it("should have notification on failure", () => {
      const content = readFile("infra/scripts/borg_backup_daily.sh");

      // Should notify on failure (email, webhook, or logging)
      const hasNotification = /mail|curl.*slack|curl.*webhook|notify|alert|telegram/i.exec(content);
      const hasLogging = /log.*error|echo.*error|>&2/i.exec(content);

      expect(hasNotification !== null || hasLogging !== null).toBe(true);
    });
  });
});

// =============================================================================
// Server Integration Tests (Skip in CI)
// =============================================================================

describe("F0.7: Server Integration Tests", () => {
  const itServer = CAN_RUN_SERVER_TESTS ? it : it.skip;

  describe("Borg Repository Tests (Server Required)", () => {
    itServer("should have borg installed", () => {
      const version = exec("borg --version");
      expect(version).toMatch(/borg\s+\d+\.\d+/i);
    });

    it.skipIf(!CAN_REACH_STORAGE_BOX)("should be able to reach Storage Box", () => {
      // Test SSH connectivity (with timeout)
      // Skip this test if Storage Box SSH keys are not configured
      const result = exec(
        `ssh -o ConnectTimeout=5 -o BatchMode=yes -p ${STORAGE_BOX_PORT} ${STORAGE_BOX_USER}@${STORAGE_BOX_HOST} echo ok 2>/dev/null || echo fail`,
      );
      expect(result).toBe("ok");
    });
  });

  describe("PostgreSQL WAL Tests (Server Required)", () => {
    // Architecture note: PostgreSQL runs natively on CT107 (10.0.1.107:5432),
    // not as a local Docker container. WAL settings are queried via SSH to
    // CT107, running psql as the postgres system user.
    itServer("should have WAL archiving enabled in running PostgreSQL", () => {
      const result = exec(
        "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 10.0.1.107 " +
          "su - postgres -c \"psql -tAc 'SHOW archive_mode'\" 2>/dev/null",
      );
      expect(result).toBe("on");
    });

    itServer("should have correct wal_level", () => {
      const result = exec(
        "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 10.0.1.107 " +
          "su - postgres -c \"psql -tAc 'SHOW wal_level'\" 2>/dev/null",
      );
      expect(result).toBe("replica");
    });
  });

  describe("Cron Job Tests (Server Required)", () => {
    itServer("should have backup cron job scheduled", () => {
      const cronContent = exec("crontab -l 2>/dev/null || echo ''");
      const systemdTimers = exec("systemctl list-timers --all 2>/dev/null || echo ''");

      const hasBackupSchedule =
        cronContent.includes("borg_backup") ||
        cronContent.includes("backup") ||
        systemdTimers.includes("borg") ||
        systemdTimers.includes("backup");

      expect(hasBackupSchedule).toBe(true);
    });
  });
});

// =============================================================================
// Test Summary
// =============================================================================

describe("E0-S4-PR01 Summary", () => {
  it("should have all required backup infrastructure files", () => {
    const requiredFiles = [
      "infra/scripts/borg_backup_daily.sh",
      "infra/config/postgres/postgresql.conf",
      "infra/scripts/dr-test-monthly.sh",
      "docs/runbooks/disaster-recovery-complete.md",
      "docs/runbooks/credential-exposure-incident.md",
    ];

    const missingFiles = requiredFiles.filter((f) => !fileExists(f));

    if (missingFiles.length > 0) {
      console.log("Missing files:", missingFiles);
    }

    expect(missingFiles.length).toBe(0);
  });

  it("dr-test-monthly.sh should orchestrate backup_health_check and expose Prometheus metrics", () => {
    const content = readFile("infra/scripts/dr-test-monthly.sh");
    expect(content).toContain("backup_health_check.sh");
    expect(content).toContain("disaster_recovery_full.sh");
    expect(content).toContain("backup_dr_test_success");
    expect(content).toContain("TEXTFILE_DIR");
  });

  it("Prometheus should define DRTestStale on backup_dr_test_last_success_timestamp", () => {
    const alerts = readFile("infra/config/prometheus/infra-cerniq-alerts.yml");
    expect(alerts).toContain("DRTestStale");
    expect(alerts).toContain("backup_dr_test_last_success_timestamp");
    expect(alerts).toContain("dr-test-monthly.sh");
  });
});
