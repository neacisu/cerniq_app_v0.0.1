/**
 * H49 — einvoice:archive:download (CRON: "0 0 * * *", concurrency:3)
 *
 * Descarcă arhivele ZIP SPV pentru facturile validate și le auditează în fiscal_audit_trail.
 * Pași: fetch VALIDATED submissions (validatedAt IS NOT NULL) →
 *   JOIN oblioDocuments → downloadSpvArchive → SHA-256 hash →
 *   INSERT fiscalAuditTrail cu hash chain.
 *
 * ANTI-HALUCINARE:
 *   - Doar submissions cu status VALIDATED și validatedAt NOT NULL
 *   - SHA-256 calculat din Buffer-ul arhivei (nu din alt hash)
 *   - prevHash="GENESIS" dacă nu există intrări anterioare pentru entitate
 *   - auditHash = sha256(prevHash + JSON.stringify(auditData))
 */
import type { Processor } from "bullmq";
import { createHash } from "node:crypto";
import {
  db,
  setSessionTenantId,
  oblioDocuments,
  einvoiceSubmissions,
  fiscalAuditTrail,
  eq,
  and,
  inArray,
  isNotNull,
  desc,
} from "@cerniq/db";
import { downloadSpvArchive } from "../lib/oblio-client.js";

const LOG = "[h49-einvoice-archive-download]";

export interface EinvoiceArchiveDownloadJobData {
  tenantId: string;
  companyCif: string;
}

export interface EinvoiceArchiveDownloadResult {
  ok: boolean;
  archivedCount: number;
  totalBytes: number;
}

export const einvoiceArchiveDownloadProcessor: Processor<
  EinvoiceArchiveDownloadJobData,
  EinvoiceArchiveDownloadResult
> = async (job) => {
  const { tenantId, companyCif } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Fetch VALIDATED submissions cu validatedAt NOT NULL
  const submissions = await db
    .select({
      id: einvoiceSubmissions.id,
      oblioDocumentId: einvoiceSubmissions.oblioDocumentId,
      validatedAt: einvoiceSubmissions.validatedAt,
    })
    .from(einvoiceSubmissions)
    .where(
      and(
        eq(einvoiceSubmissions.tenantId, tenantId),
        eq(einvoiceSubmissions.status, "VALIDATED"),
        isNotNull(einvoiceSubmissions.validatedAt),
      ),
    );

  if (submissions.length === 0) {
    return { ok: true, archivedCount: 0, totalBytes: 0 };
  }

  // 2. Fetch oblioDocuments pentru series + number
  const docIds = [...new Set(submissions.map((s) => s.oblioDocumentId))];
  const docs = await db
    .select({
      id: oblioDocuments.id,
      series: oblioDocuments.series,
      number: oblioDocuments.number,
    })
    .from(oblioDocuments)
    .where(inArray(oblioDocuments.id, docIds));

  const docMap = new Map(docs.map((d) => [d.id, d]));

  let archivedCount = 0;
  let totalBytes = 0;

  for (const sub of submissions) {
    const doc = docMap.get(sub.oblioDocumentId);
    const series = doc?.series ?? "";
    const number = doc?.number ?? 0;

    // 3. Descarcă arhiva ZIP SPV
    const buffer = await downloadSpvArchive(companyCif, series, number);
    totalBytes += buffer.length;

    // 4. SHA-256 hash al arhivei
    const archiveHash = createHash("sha256").update(buffer).digest("hex");

    // 5. Fiscal Audit Trail hash chain
    const lastEntries = await db
      .select({ hash: fiscalAuditTrail.hash })
      .from(fiscalAuditTrail)
      .where(and(eq(fiscalAuditTrail.tenantId, tenantId), eq(fiscalAuditTrail.entityId, sub.id)))
      .orderBy(desc(fiscalAuditTrail.createdAt))
      .limit(1);

    const prevHash = lastEntries[0]?.hash ?? "GENESIS";
    const auditData = {
      oblioDocumentId: sub.oblioDocumentId,
      series,
      number,
      archiveSize: buffer.length,
      archiveHash,
    };

    const auditHash = createHash("sha256")
      .update(prevHash + JSON.stringify(auditData))
      .digest("hex");

    await db.insert(fiscalAuditTrail).values({
      tenantId,
      entityType: "einvoice_submission",
      entityId: sub.id,
      action: "ARCHIVE_DOWNLOADED",
      prevHash,
      hash: auditHash,
      data: auditData,
    });

    archivedCount++;
  }

  console.info(
    `${LOG} tenantId=${tenantId} archivedCount=${archivedCount} totalBytes=${totalBytes}`,
  );

  return { ok: true, archivedCount, totalBytes };
};
