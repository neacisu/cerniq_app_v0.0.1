/**
 * Helpers pentru migrări SQL Drizzle (parsare idempotentă ADD CONSTRAINT, etc.).
 */
export const ADD_CONSTRAINT_PATTERN = /ADD\s+CONSTRAINT\s+"([^"]+)"/i;

export function extractAddConstraintName(statement: string): string | null {
  const m = ADD_CONSTRAINT_PATTERN.exec(statement);
  return m?.[1] ?? null;
}
