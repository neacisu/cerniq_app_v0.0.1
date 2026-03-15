/**
 * Run DB migrations (extensions, schemas, Drizzle SQL, RLS).
 * Used by CD pipeline: mount runtime-secrets at /secrets and set SECRETS_PATH=/secrets/api.env.
 * Usage: node dist/migrate-runner.js
 */
import "./config.js";
import { runAllMigrations, closeMigrationDb } from "@cerniq/db";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || process.env.MIGRATION_DRY_RUN === "true";
const rollback = args.has("--rollback") || process.env.MIGRATION_ROLLBACK === "true";

let exitCode = 0;
try {
  await runAllMigrations({ dryRun, rollback });
  console.log("Migrations completed successfully.");
} catch (err) {
  console.error("Migration failed:", err);
  exitCode = 1;
} finally {
  await closeMigrationDb();
}
process.exit(exitCode);
