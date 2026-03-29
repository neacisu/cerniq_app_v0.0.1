/**
 * CLI to run migrations and RLS. Usage:
 *   pnpm run db:migrate
 *   pnpm run db:migrate -- --dry-run
 *   pnpm run db:migrate -- --rollback
 *
 * Connection priority (first wins):
 *   1. DATABASE_DIRECT_URL env var (bypasses PgBouncer — recommended for DDL)
 *   2. DATABASE_URL env var
 *   3. DATABASE_DIRECT_URL from auto-detected secrets file
 *   4. DATABASE_URL from auto-detected secrets file
 *
 * Secrets file search order:
 *   1. SECRETS_PATH env var (explicit override)
 *   2. /opt/cerniq/runtime-secrets/api/api.env  (host — OpenBao agent bind-mount)
 *   3. /secrets/api.env                          (in-container path)
 */
import { readFileSync, existsSync } from "node:fs";
import { runAllMigrations, closeMigrationDb } from "./migrate.js";

const SECRETS_SEARCH_PATHS = ["/opt/cerniq/runtime-secrets/api/api.env", "/secrets/api.env"];

/**
 * Inline secrets loader for migrate-cli — avoids a circular workspace
 * dependency (@cerniq/db ↔ @cerniq/worker-shared).
 * Parses KEY=VALUE lines, ignores comments/empty lines.
 * Skips load entirely if DATABASE_DIRECT_URL or DATABASE_URL already set.
 */
function loadSecretsFile(): void {
  if (process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL) return;

  const explicitPath = process.env.SECRETS_PATH;
  const candidates = explicitPath ? [explicitPath] : SECRETS_SEARCH_PATHS;
  const found = candidates.find((p) => existsSync(p));

  if (found) {
    const lines = readFileSync(found, "utf8").split("\n");
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx < 1) continue;
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim();
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
  }

  if (!process.env.DATABASE_DIRECT_URL && !process.env.DATABASE_URL) {
    throw new Error(
      "Neither DATABASE_DIRECT_URL nor DATABASE_URL is set and no secrets file found.\n" +
        `  Searched: ${candidates.join(", ")}\n` +
        "  Set DATABASE_DIRECT_URL directly or point SECRETS_PATH to the correct secrets file.",
    );
  }
}

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

async function main() {
  loadSecretsFile();

  const connUrl = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? "";
  const safeUrl = connUrl.replace(/\/\/[^@]+@/, "//***@");
  const source = process.env.DATABASE_DIRECT_URL ? "DATABASE_DIRECT_URL" : "DATABASE_URL";
  console.log(`Using ${source}: ${safeUrl}`);

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
