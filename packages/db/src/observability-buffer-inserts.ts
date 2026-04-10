/**
 * Inserții batch folosite de `@cerniq/observability` (audit / job logs).
 * Rămân în `@cerniq/db` ca `db.insert` și tabelele să folosească aceeași instanță Drizzle
 * (evită TS2344 / TS2769 când IDE-ul sau path mapping-ul amestecă tipuri între pachete).
 */
import { db } from "./client.js";
import { auditLog, type AuditLogInsertRow } from "./schemas/audit.js";
import { errorLog, jobLogs, type JobLogInsertRow } from "./schemas/observability.js";

export async function insertAuditLogRows(rows: readonly AuditLogInsertRow[]): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(auditLog).values([...rows]);
}

export async function insertJobLogRows(rows: readonly JobLogInsertRow[]): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(jobLogs).values([...rows]);
}

export type ErrorLogInsertRow = typeof errorLog.$inferInsert;

export async function insertErrorLogRows(rows: readonly ErrorLogInsertRow[]): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(errorLog).values([...rows]);
}
