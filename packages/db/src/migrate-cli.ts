/**
 * CLI to run migrations and RLS. Usage:
 *   pnpm run db:migrate
 *   pnpm run db:migrate -- --dry-run
 *   pnpm run db:migrate -- --rollback
 *
 * OpenBao credential injection (preferred in production):
 *   OpenBao agent writes secrets to a watched file (file injection pattern).
 *   This CLI waits for the `OPENBAO_SECRETS_LOADED=true` readiness marker
 *   before reading credentials — eliminating race conditions at cold start.
 *   When found, the OpenBao file is the AUTHORITATIVE source (overrides env vars).
 *
 * Connection priority:
 *   1. OpenBao secrets file (when OPENBAO_SECRETS_LOADED=true marker present)
 *      File paths searched in order:
 *        a. SECRETS_PATH env var (explicit override)
 *        b. /opt/cerniq/runtime-secrets/api/api.env  (host — OpenBao agent bind-mount)
 *        c. /secrets/api.env                          (in-container path)
 *   2. DATABASE_DIRECT_URL env var (bypasses PgBouncer — recommended for DDL)
 *   3. DATABASE_URL env var
 *
 * Env vars controlling OpenBao behavior:
 *   OPENBAO_SKIP=true              — skip OpenBao file lookup (local dev)
 *   OPENBAO_READY_TIMEOUT_MS=30000 — max ms to wait for OPENBAO_SECRETS_LOADED=true
 *   SECRETS_PATH                   — explicit secrets file path override
 *
 * Verificare pattern-uri blocking (migrații strict ≥ 0070):
 *   pnpm run db:migrate -- --check-locks
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMigrationCredentials } from "./migrate-openbao.js";
import { migrateCliLog } from "./migrate-cli-log.js";
import { auditAllDrizzleFiles } from "./migration-sql-audit.js";
import { runAllMigrations, closeMigrationDb } from "./migrate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function runCheckLocks(): number {
  const drizzleDir = join(__dirname, "..", "drizzle");
  const files = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .map((name) => ({
      name,
      content: readFileSync(join(drizzleDir, name), "utf-8"),
    }));
  const issues = auditAllDrizzleFiles(files);
  for (const detail of issues) {
    migrateCliLog({ level: "warn", event: "migration_lock_check_issue", detail });
  }
  if (issues.length > 0) {
    migrateCliLog({ level: "error", event: "migration_lock_check_failed", count: issues.length });
    return 1;
  }
  migrateCliLog({ level: "info", event: "migration_lock_check_ok" });
  return 0;
}

// ── Network error helpers ─────────────────────────────────────────────────────

type ConnectErr = NodeJS.ErrnoException & { address?: string; port?: number };

/** Walk Error.cause (incl. DrizzleQueryError → ECONNREFUSED etc.) */
function findNodeConnectError(err: unknown): ConnectErr | null {
  let current: unknown = err;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < 12 && current !== undefined && current !== null; depth++) {
    if (seen.has(current)) break;
    seen.add(current);
    if (typeof current === "object" && current !== null && "code" in current) {
      const code = (current as { code: unknown }).code;
      if (
        code === "ECONNREFUSED" ||
        code === "ENOTFOUND" ||
        code === "ETIMEDOUT" ||
        code === "EHOSTUNREACH"
      ) {
        return current as ConnectErr;
      }
    }
    if (current instanceof Error && current.cause !== undefined) {
      current = current.cause;
      continue;
    }
    break;
  }
  return null;
}

function printConnectFailureHint(sys: ConnectErr, connUrl: string): void {
  const host = sys.address ?? "(unknown host)";
  const port = sys.port ?? 5432;
  const safeUrl = connUrl.replace(/\/\/[^@]+@/, "//***@");
  if (sys.code === "ECONNREFUSED") {
    migrateCliLog({
      level: "error",
      event: "migrate_connect_refused",
      host,
      port,
      safeUrl,
      hint: "PostgreSQL did not accept the connection; check service, firewall, DATABASE_DIRECT_URL.",
    });
    return;
  }
  if (sys.code === "ENOTFOUND") {
    migrateCliLog({
      level: "error",
      event: "migrate_host_not_found",
      host,
      safeUrl,
    });
    return;
  }
  if (sys.code === "ETIMEDOUT" || sys.code === "EHOSTUNREACH") {
    migrateCliLog({
      level: "error",
      event: "migrate_network_unreachable",
      code: sys.code,
      host,
      port,
    });
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  const { source, filePath } = await loadMigrationCredentials();

  const connUrl = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? "";
  const safeUrl = connUrl.replace(/\/\/[^@]+@/, "//***@");
  const dbSource = process.env.DATABASE_DIRECT_URL ? "DATABASE_DIRECT_URL" : "DATABASE_URL";

  if (source === "openbao") {
    migrateCliLog({ level: "info", event: "openbao_secrets_loaded", filePath });
  }
  migrateCliLog({ level: "info", event: "migrate_using_db_url", dbSource, safeUrl });

  const args = new Set(process.argv.slice(2));
  if (args.has("--check-locks")) {
    process.exit(runCheckLocks());
  }
  const dryRun = args.has("--dry-run") || process.env.MIGRATION_DRY_RUN === "true";
  const rollback = args.has("--rollback") || process.env.MIGRATION_ROLLBACK === "true";

  try {
    await runAllMigrations({ dryRun, rollback });
    migrateCliLog({ level: "info", event: "migrate_done" });
  } finally {
    await closeMigrationDb();
  }
  process.exit(0);
}

try {
  await main();
} catch (err) {
  migrateCliLog({
    level: "error",
    event: "migrate_cli_failed",
    err: err instanceof Error ? err.message : String(err),
  });
  const sys = findNodeConnectError(err);
  if (sys) {
    const connUrl = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? "";
    printConnectFailureHint(sys, connUrl);
  }
  process.exit(1);
}
