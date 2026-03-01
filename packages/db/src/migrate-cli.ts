/**
 * CLI to run migrations and RLS. Usage:
 *   DATABASE_URL=postgresql://... pnpm run db:migrate
 *   DATABASE_URL=postgresql://... pnpm run db:migrate -- --rls  # also apply RLS policies
 */
import { runAllMigrations, closeMigrationDb } from "./migrate.js";

async function main() {
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
