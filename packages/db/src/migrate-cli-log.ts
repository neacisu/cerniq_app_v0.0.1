/**
 * CLI migrate: fără `@cerniq/observability` (ciclu db → observability → db).
 * Linii JSON pe stderr pentru agregare în Loki / grep.
 */
export function migrateCliLog(payload: Record<string, unknown>): void {
  process.stderr.write(`${JSON.stringify({ service: "db-migrate-cli", ...payload })}\n`);
}
