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
 */
import { loadMigrationCredentials } from "./migrate-openbao.js";
import { runAllMigrations, closeMigrationDb } from "./migrate.js";

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
    console.error(`
[migrate] TCP connection refused at ${host}:${port}
  This is not a SQL migration failure — PostgreSQL did not accept the connection.
  Check: service running on that host, listen_addresses, firewall, VPN/network route.
  URL in use (redacted): ${safeUrl}
  Override for local/staging: export DATABASE_DIRECT_URL='postgresql://user:pass@reachable-host:5432/cerniq'
`);
    return;
  }
  if (sys.code === "ENOTFOUND") {
    console.error(`
[migrate] Host not found (DNS): ${host}
  Verify DATABASE_DIRECT_URL / DATABASE_URL hostname. URL (redacted): ${safeUrl}
`);
    return;
  }
  if (sys.code === "ETIMEDOUT" || sys.code === "EHOSTUNREACH") {
    console.error(`
[migrate] Network unreachable or timed out (${sys.code}) toward ${host}:${port}
  Check routing, security groups, and whether PostgreSQL listens on that interface.
`);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  const { source, filePath } = await loadMigrationCredentials();

  const connUrl = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? "";
  const safeUrl = connUrl.replace(/\/\/[^@]+@/, "//***@");
  const dbSource = process.env.DATABASE_DIRECT_URL ? "DATABASE_DIRECT_URL" : "DATABASE_URL";

  if (source === "openbao") {
    console.log(`[migrate] OpenBao secrets loaded from: ${filePath}`);
  }
  console.log(`Using ${dbSource}: ${safeUrl}`);

  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run") || process.env.MIGRATION_DRY_RUN === "true";
  const rollback = args.has("--rollback") || process.env.MIGRATION_ROLLBACK === "true";

  try {
    await runAllMigrations({ dryRun, rollback });
    console.log("Done.");
  } finally {
    await closeMigrationDb();
  }
  process.exit(0);
}

try {
  await main();
} catch (err) {
  console.error(err);
  const sys = findNodeConnectError(err);
  if (sys) {
    const connUrl = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? "";
    printConnectFailureHint(sys, connUrl);
  }
  process.exit(1);
}
