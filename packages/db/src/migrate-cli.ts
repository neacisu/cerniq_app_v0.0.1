/**
 * CLI to run migrations and RLS. Usage:
 *   DATABASE_URL=postgresql://... pnpm run db:migrate
 *   DATABASE_URL=postgresql://... pnpm run db:migrate -- --rls  # also apply RLS policies
 */
import {
  runMigrations,
  runDrizzleMigrations,
  finalizeOwnership,
  closeMigrationDb,
} from "./migrate.js";

async function main() {
  try {
    console.log("Running extensions and schemas...");
    await runMigrations();

    console.log("Running Drizzle SQL migrations...");
    await runDrizzleMigrations();

    console.log("Finalizing table ownership...");
    await finalizeOwnership();

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
