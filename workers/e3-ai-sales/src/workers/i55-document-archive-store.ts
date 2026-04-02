/**
 * I55 — document:archive:store (concurrency:5)
 *
 * Arhivare documente fiscale cu stocare 10 ani (cerință legislativă RO).
 * Hash chain SHA-256 pentru integritate audit fiscal.
 * Stocare fizică în object storage — FAZA 14 (placeholder în log).
 *
 * ANTI-HALUCINARE: hash chain deterministă — GENESIS pentru prima intrare.
 * Tipul cognitiv: ComplianceNeuron
 */
import type { Processor } from "bullmq";
import { createHash } from "node:crypto";
import {
  db,
  setSessionTenantId,
  oblioDocuments,
  fiscalAuditTrail,
  eq,
  and,
  desc,
} from "@cerniq/db";

const LOG = "[i55-document-archive-store]";

export interface DocumentArchiveStoreJobData {
  tenantId: string;
  oblioDocumentId: string;
  documentContent: string;
  contentType: "pdf" | "html";
  actorId?: string;
}

export interface DocumentArchiveStoreResult {
  ok: true;
  oblioDocumentId: string;
  hash: string;
  archivedAt: string;
}

export const documentArchiveStoreProcessor: Processor<
  DocumentArchiveStoreJobData,
  DocumentArchiveStoreResult
> = async (job) => {
  const { tenantId, oblioDocumentId, documentContent, contentType, actorId } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Verifică că oblioDocuments există
  const docs = await db
    .select({
      id: oblioDocuments.id,
      documentType: oblioDocuments.documentType,
      series: oblioDocuments.series,
      number: oblioDocuments.number,
    })
    .from(oblioDocuments)
    .where(and(eq(oblioDocuments.id, oblioDocumentId), eq(oblioDocuments.tenantId, tenantId)))
    .limit(1);

  if (docs.length === 0) {
    throw new Error(`i55: oblioDocument ${oblioDocumentId} negăsit pentru tenantId=${tenantId}`);
  }

  const doc = docs[0];
  const validTypes = ["INVOICE", "PROFORMA", "CREDIT_NOTE"];
  if (!validTypes.includes(doc.documentType ?? "")) {
    throw new Error(
      `i55: documentType invalid "${doc.documentType}" — acceptat: ${validTypes.join(", ")}`,
    );
  }

  // 2. SHA-256 hash al conținutului documentului
  const contentHash = createHash("sha256").update(documentContent).digest("hex");
  const contentSize = documentContent.length;
  const archivedAt = new Date().toISOString();

  // 3. Obține prevHash din ultima intrare audit pentru hash chain
  const lastEntries = await db
    .select({ hash: fiscalAuditTrail.hash })
    .from(fiscalAuditTrail)
    .where(
      and(eq(fiscalAuditTrail.tenantId, tenantId), eq(fiscalAuditTrail.entityId, oblioDocumentId)),
    )
    .orderBy(desc(fiscalAuditTrail.createdAt))
    .limit(1);

  const prevHash = lastEntries[0]?.hash ?? "GENESIS";

  // 4. Construiește data audit
  const auditData = {
    oblioDocumentId,
    documentType: doc.documentType ?? "",
    series: doc.series ?? "",
    number: doc.number ?? 0,
    contentType,
    contentHash,
    contentSize,
    archivedAt,
    retentionYears: 10,
    note: "object-storage-phase-14",
  };

  // 5. Calculează hash chain: SHA-256(prevHash + JSON(auditData))
  const hash = createHash("sha256")
    .update(prevHash + JSON.stringify(auditData))
    .digest("hex");

  // 6. INSERT fiscalAuditTrail
  await db.insert(fiscalAuditTrail).values({
    tenantId,
    entityType: "oblio_document",
    entityId: oblioDocumentId,
    action: "DOCUMENT_ARCHIVED",
    actorId: actorId ?? null,
    prevHash,
    hash,
    data: auditData,
  });

  // NOTĂ: Stocare fizică 10 ani (cerință fiscală RO) — implementare object storage în FAZA 14
  console.info(
    `${LOG} tenantId=${tenantId} oblioDocumentId=${oblioDocumentId} ` +
      `contentType=${contentType} contentSize=${contentSize} ` +
      `hash=${hash.slice(0, 12)}... prevHash=${prevHash.slice(0, 12)}... ` +
      `[retention: 10 ani — object storage FAZA 14]`,
  );

  return { ok: true, oblioDocumentId, hash, archivedAt };
};
