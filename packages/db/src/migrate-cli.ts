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
import { existsSync, readFileSync } from "node:fs";
import { runAllMigrations, closeMigrationDb } from "./migrate.js";

const SECRETS_SEARCH_PATHS = ["/opt/cerniq/runtime-secrets/api/api.env", "/secrets/api.env"];

function resolveSecretsPath(): string | null {
  if (process.env.SECRETS_PATH) {
    return existsSync(process.env.SECRETS_PATH) ? process.env.SECRETS_PATH : null;
  }
  return SECRETS_SEARCH_PATHS.find((p) => existsSync(p)) ?? null;
}

function loadSecretsFile(): void {
  if (process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL) return;

  const secretsPath = resolveSecretsPath();
  if (!secretsPath) {
    throw new Error(
      "Neither DATABASE_DIRECT_URL nor DATABASE_URL is set and no secrets file found.\n" +
        `  Searched: ${SECRETS_SEARCH_PATHS.join(", ")}\n` +
        "  Set DATABASE_DIRECT_URL directly or point SECRETS_PATH to the correct secrets file.",
    );
  }

  console.log(`Loading secrets from ${secretsPath}`);
  const content = readFileSync(secretsPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  if (!process.env.DATABASE_DIRECT_URL && !process.env.DATABASE_URL) {
    throw new Error(
      `Neither DATABASE_DIRECT_URL nor DATABASE_URL found in secrets file: ${secretsPath}`,
    );
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
