import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { Processor } from "bullmq";
import { bronzeImportBatches, db, eq, sql } from "@cerniq/db";

export type ImportFileCleanupJobData = {
  tenantId?: string;
  olderThanDays?: number;
  correlationId?: string;
};

const DEFAULT_RETENTION_DAYS = Number(process.env.IMPORT_FILE_RETENTION_DAYS ?? "90");
const IMPORT_DIR = process.env.IMPORT_UPLOAD_DIR || "/app/data/imports";

async function cleanupTrackedFiles(tenantId: string | undefined, cutoff: Date) {
  const tenantFilter = tenantId ? sql`AND ${bronzeImportBatches.tenantId} = ${tenantId}` : sql``;

  const eligibleBatches = await db
    .select({
      id: bronzeImportBatches.id,
      metadata: bronzeImportBatches.metadata,
      status: bronzeImportBatches.status,
    })
    .from(bronzeImportBatches)
    .where(
      sql`${bronzeImportBatches.createdAt} < ${cutoff}
          AND ${bronzeImportBatches.status} IN ('completed', 'failed', 'cancelled')
          AND (${bronzeImportBatches.metadata}->>'storedPath') IS NOT NULL
          AND COALESCE((${bronzeImportBatches.metadata}->>'fileDeleted')::boolean, false) = false
          ${tenantFilter}`,
    )
    .limit(500);

  let deleted = 0;
  let failed = 0;
  const errors: string[] = [];
  const deletedAt = new Date().toISOString();

  for (const batch of eligibleBatches) {
    const meta = (batch.metadata as Record<string, unknown> | null) ?? {};
    const storedPath = typeof meta.storedPath === "string" ? meta.storedPath : null;
    if (!storedPath) continue;

    const deletedPatch = JSON.stringify({ fileDeleted: true, fileDeletedAt: deletedAt });
    const missingPatch = JSON.stringify({
      fileDeleted: true,
      fileDeletedAt: deletedAt,
      fileDeleteNote: "already_missing",
    });

    try {
      await unlink(storedPath);
      console.log(`[import-cleanup] deleted tracked file: ${storedPath}`);
      await db
        .update(bronzeImportBatches)
        .set({
          metadata: sql`${bronzeImportBatches.metadata} || ${deletedPatch}::jsonb`,
          updatedAt: new Date(),
        })
        .where(eq(bronzeImportBatches.id, batch.id));
      deleted++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("ENOENT")) {
        await db
          .update(bronzeImportBatches)
          .set({
            metadata: sql`${bronzeImportBatches.metadata} || ${missingPatch}::jsonb`,
            updatedAt: new Date(),
          })
          .where(eq(bronzeImportBatches.id, batch.id));
        deleted++;
      } else {
        failed++;
        errors.push(`${batch.id}: ${msg}`);
      }
    }
  }

  return { scanned: eligibleBatches.length, deleted, failed, errors };
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function tryDeleteOldFile(
  filePath: string,
  cutoffMs: number,
): Promise<"deleted" | "skipped" | "error"> {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) return "skipped";
  if (fileStat.mtimeMs >= cutoffMs) return "skipped";
  await unlink(filePath);
  console.log(
    `[import-cleanup] deleted orphaned file: ${filePath} (mtime: ${fileStat.mtime.toISOString()})`,
  );
  return "deleted";
}

async function cleanupOrphanedFiles(cutoffMs: number) {
  let fsScanned = 0;
  let fsDeleted = 0;
  let fsFailed = 0;
  const errors: string[] = [];

  let entries: string[];
  try {
    entries = await readdir(IMPORT_DIR);
  } catch (err: unknown) {
    const msg = errMsg(err);
    if (!msg.includes("ENOENT")) errors.push(`fs:readdir: ${msg}`);
    return { fsScanned, fsDeleted, fsFailed, errors };
  }

  for (const entry of entries) {
    try {
      const result = await tryDeleteOldFile(join(IMPORT_DIR, entry), cutoffMs);
      if (result === "deleted") fsDeleted++;
      if (result !== "skipped" || result === "skipped") fsScanned++;
    } catch (err: unknown) {
      fsFailed++;
      const msg = errMsg(err);
      if (!msg.includes("ENOENT")) errors.push(`fs:${entry}: ${msg}`);
    }
  }

  return { fsScanned, fsDeleted, fsFailed, errors };
}

export const importFileCleanupProcessor: Processor<ImportFileCleanupJobData> = async (job) => {
  const retentionDays = job.data.olderThanDays ?? DEFAULT_RETENTION_DAYS;
  const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const cutoff = new Date(cutoffMs);

  const dbResult = await cleanupTrackedFiles(job.data.tenantId, cutoff);
  const fsResult = await cleanupOrphanedFiles(cutoffMs);

  const allErrors = [...dbResult.errors, ...fsResult.errors];

  console.log(
    `[import-cleanup] done: db=${dbResult.deleted} deleted/${dbResult.scanned} scanned, fs=${fsResult.fsDeleted} deleted/${fsResult.fsScanned} scanned, retention=${retentionDays}d`,
  );

  return {
    ok: true,
    status: "success",
    scanned: dbResult.scanned,
    deleted: dbResult.deleted,
    failed: dbResult.failed,
    fsScanned: fsResult.fsScanned,
    fsDeleted: fsResult.fsDeleted,
    fsFailed: fsResult.fsFailed,
    errors: allErrors.slice(0, 10),
  };
};
