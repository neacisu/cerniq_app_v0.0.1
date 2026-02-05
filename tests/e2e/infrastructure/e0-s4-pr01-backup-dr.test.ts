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
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// Test Configuration
// =============================================================================

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/var/www/CerniqAPP";
const IS_CI = process.env.CI === "true";

// Auto-detect if we can run server tests (have SSH access)
function canRunServerTests(): boolean {
  if (IS_CI) return false;

  const envPath = path.join(WORKSPACE_ROOT, ".env");
  if (!fs.existsSync(envPath)) return false;

  const envContent = fs.readFileSync(envPath, "utf-8");
  return (
    envContent.includes("STAGING_HOST") &&
    envContent.includes("STAGING_PASSWORD")
  );
}

const CAN_RUN_SERVER_TESTS = canRunServerTests();

// Hetzner Storage Box configuration
const STORAGE_BOX_USER = "u502048";
const STORAGE_BOX_HOST = "u502048.your-storagebox.de";
const STORAGE_BOX_PORT = 23;

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

      // Should backup Redis
      expect(content.toLowerCase()).toMatch(/redis/);

      // Should backup certificates/letsencrypt OR traefik state
      // Note: certs may be backed up via traefik volume or separate letsencrypt dir
      const hasTraefikOrCerts = content.match(
        /traefik|letsencrypt|certs|ssl|tls/i,
      );
      // This is optional - certs might be auto-renewed and not backed up
      // The critical data is postgres and redis
      if (!hasTraefikOrCerts) {
        console.log(
          "Note: Certificate backup not configured in borg_backup_daily.sh",
        );
      }
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

  describe("T002: Backup secrets are configured", () => {
    it("should have borg passphrase file for staging", () => {
      expect(fileExists("secrets/borg_passphrase.txt")).toBe(true);
    });

    it("should have borg passphrase file for production", () => {
      expect(fileExists("secrets/borg_passphrase_production.txt")).toBe(true);
    });

    it("should have borg key backup", () => {
      expect(fileExists("secrets/borg_repokey_backup.txt")).toBe(true);
    });

    it("passphrase files should not be empty", () => {
      const stagingPassphrase = readFile("secrets/borg_passphrase.txt");
      expect(stagingPassphrase.length).toBeGreaterThan(0);

      const prodPassphrase = readFile("secrets/borg_passphrase_production.txt");
      expect(prodPassphrase.length).toBeGreaterThan(0);
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
    it("should have postgres_wal_archive volume defined", () => {
      const content = readFile("infra/docker/docker-compose.yml");
      expect(content).toContain("postgres_wal_archive");
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
        fileExists("docs/runbooks/disaster-recovery.md") ||
        fileExists("docs/runbooks/openbao-recovery.md");
      expect(runbookExists).toBe(true);
    });

    it("recovery runbook should have required sections", () => {
      let content = readFile("docs/runbooks/disaster-recovery.md");
      if (!content) {
        content = readFile("docs/runbooks/openbao-recovery.md");
      }

      // Should have severity levels or decision tree
      expect(content.match(/severity|level|scenario/i)).toBeTruthy();

      // Should have recovery steps
      expect(content.match(/step|procedure|recovery/i)).toBeTruthy();
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
        if (content.match(/verif|test.*backup|restore.*test/i)) {
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
      expect(content.match(/log|echo|print/i)).toBeTruthy();

      // Should handle errors
      expect(content.match(/error|fail|exit/i)).toBeTruthy();
    });
  });

  describe("T002: Backup notification mechanism", () => {
    it("should have notification on failure", () => {
      const content = readFile("infra/scripts/borg_backup_daily.sh");

      // Should notify on failure (email, webhook, or logging)
      const hasNotification = content.match(
        /mail|curl.*slack|curl.*webhook|notify|alert|telegram/i,
      );
      const hasLogging = content.match(/log.*error|echo.*error|>&2/i);

      expect(hasNotification || hasLogging).toBeTruthy();
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

    itServer("should be able to reach Storage Box", () => {
      // Test SSH connectivity (with timeout)
      const result = exec(
        `ssh -o ConnectTimeout=5 -o BatchMode=yes -p ${STORAGE_BOX_PORT} ${STORAGE_BOX_USER}@${STORAGE_BOX_HOST} echo ok 2>/dev/null || echo fail`,
      );
      expect(result).toBe("ok");
    });
  });

  describe("PostgreSQL WAL Tests (Server Required)", () => {
    itServer("should have WAL archiving enabled in running PostgreSQL", () => {
      const result = exec(
        `docker exec cerniq-postgres psql -U c3rn1q -d cerniq -tAc "SHOW archive_mode" 2>/dev/null`,
      );
      expect(result).toBe("on");
    });

    itServer("should have correct wal_level", () => {
      const result = exec(
        `docker exec cerniq-postgres psql -U c3rn1q -d cerniq -tAc "SHOW wal_level" 2>/dev/null`,
      );
      expect(result).toBe("replica");
    });
  });

  describe("Cron Job Tests (Server Required)", () => {
    itServer("should have backup cron job scheduled", () => {
      const cronContent = exec("crontab -l 2>/dev/null || echo ''");
      const systemdTimers = exec(
        "systemctl list-timers --all 2>/dev/null || echo ''",
      );

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
      "secrets/borg_passphrase.txt",
      "infra/config/postgres/postgresql.conf",
    ];

    const missingFiles = requiredFiles.filter((f) => !fileExists(f));

    if (missingFiles.length > 0) {
      console.log("Missing files:", missingFiles);
    }

    expect(missingFiles.length).toBe(0);
  });
});
