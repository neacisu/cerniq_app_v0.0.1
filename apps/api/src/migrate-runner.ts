/**
 * Run DB migrations (extensions, schemas, Drizzle SQL, RLS).
 * Used by CD pipeline: mount runtime-secrets at /secrets and set SECRETS_PATH=/secrets/api.env.
 * Usage: node dist/migrate-runner.js
 */
import "./config.js";
import {
  runMigrations,
  runDrizzleMigrations,
  finalizeOwnership,
  closeMigrationDb,
} from "@cerniq/db";

async function main() {
  try {
    console.log("Running extensions and schemas...");
    await runMigrations();

    console.log("Running Drizzle SQL migrations...");
    await runDrizzleMigrations();

    console.log("Finalizing table ownership...");
    await finalizeOwnership();

    console.log("Migrations completed successfully.");
  } finally {
    await closeMigrationDb();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
