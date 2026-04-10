/**
 * Verificări statice pentru migrații SQL (zero-downtime / lock-friendly).
 * Migrațiile cu prefix numeric < STRICT_MIGRATION_PREFIX sunt „grandfathered”.
 */
export const STRICT_MIGRATION_PREFIX = 70;

export function migrationFileNumericPrefix(filename: string): number {
  const m = /^(\d+)_/.exec(filename);
  return m ? Number.parseInt(m[1], 10) : 0;
}

export function splitDrizzleStatements(content: string): string[] {
  return content
    .split(/--> statement-breakpoint\n?/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Returnează mesaje de problemă (gol = OK). */
export function auditStrictMigrationFile(filename: string, sql: string): string[] {
  if (migrationFileNumericPrefix(filename) < STRICT_MIGRATION_PREFIX) {
    return [];
  }
  const issues: string[] = [];
  if (/\bDROP\s+COLUMN\b/i.test(sql)) {
    issues.push("DROP COLUMN interzis pentru migrații noi fără review explicit");
  }
  for (const chunk of splitDrizzleStatements(sql)) {
    if (/CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(chunk) && !/CONCURRENTLY/i.test(chunk)) {
      issues.push(`CREATE INDEX fără CONCURRENTLY: ${chunk.slice(0, 120).replaceAll(/\s+/g, " ")}`);
    }
  }
  return issues.map((i) => `${filename}: ${i}`);
}

export function auditAllDrizzleFiles(
  files: ReadonlyArray<{ name: string; content: string }>,
): string[] {
  const out: string[] = [];
  for (const f of files) {
    out.push(...auditStrictMigrationFile(f.name, f.content));
  }
  return out;
}
