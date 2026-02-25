/**
 * CLI to run migrations and RLS. Usage:
 *   DATABASE_URL=postgresql://... pnpm run db:migrate
 *   DATABASE_URL=postgresql://... pnpm run db:migrate -- --rls  # also apply RLS policies
 */
import { runMigrations, runDrizzleMigrations, applyRlsPolicies } from "./migrate.js";

async function main() {
  const applyRls = process.argv.includes("--rls");

  console.log("Running extensions and schemas...");
  await runMigrations();

  console.log("Running Drizzle SQL migrations...");
  await runDrizzleMigrations();

  if (applyRls) {
    console.log("Applying RLS policies...");
    await applyRlsPolicies();
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
