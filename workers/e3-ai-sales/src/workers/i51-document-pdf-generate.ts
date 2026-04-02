/**
 * I51 — document:pdf:generate (concurrency:5)
 *
 * Descarcă PDF-ul unui document fiscal generat de Oblio.
 * Oblio este cel care generează documentul (proformă/factură/notă de credit).
 * Noi descărcăm PDF-ul binar via Oblio API:
 *   1. GET /api/docs/invoice (sau /proforma) → obținem link-ul semnat
 *   2. Fetch link binar → PDF Buffer → base64
 *
 * PDF-ul este folosit ulterior de I52 (email) și I55 (arhivare fiscală).
 *
 * Tipul cognitiv: MotorNeuron
 *
 * ANTI-HALUCINARE: NU generăm PDF-ul cu Puppeteer sau alt tool.
 * Oblio generează documentul fiscal conform normelor legale RO.
 * Noi DESCĂRCĂM ce a generat Oblio.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, oblioDocuments, eq, and } from "@cerniq/db";
import { getDocumentDownloadLink, downloadDocumentPdf } from "../lib/oblio-client.js";

const LOG = "[i51-document-pdf-generate]";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocumentPdfGenerateJobData {
  tenantId: string;
  oblioDocumentId: string;
  /** CIF-ul firmei emitente (tenant) — necesar pentru Oblio API */
  companyCif: string;
}

export interface DocumentPdfGenerateResult {
  ok: true;
  pdfBase64: string;
  oblioDocumentId: string;
  sizeBytes: number;
  fileName: string;
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const documentPdfGenerateProcessor: Processor<
  DocumentPdfGenerateJobData,
  DocumentPdfGenerateResult
> = async (job) => {
  const { tenantId, oblioDocumentId, companyCif } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Fetch oblioDocuments pentru series, number, documentType
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
    throw new Error(`i51: oblioDocument ${oblioDocumentId} negăsit pentru tenantId=${tenantId}`);
  }

  const doc = docs[0];
  const { documentType, series, number } = doc;

  if (!series || number == null) {
    throw new Error(`i51: oblioDocument ${oblioDocumentId} are series/number lipsă`);
  }

  const resolvedDocType = (documentType ?? "INVOICE") as "INVOICE" | "PROFORMA" | "CREDIT_NOTE";

  // 2. Oblio API: obținem link-ul PDF semnat al documentului
  const link = await getDocumentDownloadLink(companyCif, resolvedDocType, series, number);

  // 3. Descarcăm conținutul binar PDF de la Oblio
  const pdfBuffer = await downloadDocumentPdf(link);
  const pdfBase64 = pdfBuffer.toString("base64");
  const sizeBytes = pdfBuffer.length;

  // fileName: ex: "factura-FCT-55.pdf", "proforma-PR-8.pdf"
  let docPrefix: string;
  if (resolvedDocType === "PROFORMA") {
    docPrefix = "proforma";
  } else if (resolvedDocType === "CREDIT_NOTE") {
    docPrefix = "nota-credit";
  } else {
    docPrefix = "factura";
  }
  const fileName = `${docPrefix}-${series}-${number}.pdf`;

  console.info(
    `${LOG} tenantId=${tenantId} oblioDocumentId=${oblioDocumentId} ` +
      `documentType=${resolvedDocType} sizeBytes=${sizeBytes} fileName=${fileName}`,
  );

  return { ok: true, pdfBase64, oblioDocumentId, sizeBytes, fileName };
};
