/**
 * H46 — einvoice:send (concurrency:5, rate:30/100s)
 *
 * Trimite o factură în SPV via Oblio API.
 * Pași: fetch oblioDocuments (trebuie INVOICE+ACTIVE) →
 *   sendInvoiceToSpv → map oblioCode→status →
 *   calculare deadlineAt (issuedAt+5 zile) → INSERT einvoice_submissions.
 *
 * AMENDĂ LEGALĂ: factura trebuie trimisă în SPV în maxim 5 zile calendaristice!
 *
 * ANTI-HALUCINARE:
 *   - documentType MUST be "INVOICE"
 *   - status MUST be "ACTIVE"
 *   - oblioCode -1 = SPV neconfigurat → throw
 *   - deadlineAt = issuedAt + 5 zile (sau new Date() dacă issuedAt null)
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, oblioDocuments, einvoiceSubmissions, eq, and } from "@cerniq/db";
import { sendInvoiceToSpv } from "../lib/oblio-client.js";

const LOG = "[h46-einvoice-send]";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEADLINE_DAYS = 5;

export interface EinvoiceSendJobData {
  tenantId: string;
  oblioDocumentId: string;
  companyCif: string;
  actorId?: string;
}

export interface EinvoiceSendResult {
  ok: true;
  submissionId: string;
  oblioCode: number;
  deadlineAt: Date;
  status: string;
}

export const einvoiceSendProcessor: Processor<EinvoiceSendJobData, EinvoiceSendResult> = async (
  job,
) => {
  const { tenantId, oblioDocumentId, companyCif } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Fetch oblioDocuments — trebuie să fie INVOICE și ACTIVE
  const docs = await db
    .select({
      id: oblioDocuments.id,
      documentType: oblioDocuments.documentType,
      status: oblioDocuments.status,
      series: oblioDocuments.series,
      number: oblioDocuments.number,
      issuedAt: oblioDocuments.issuedAt,
    })
    .from(oblioDocuments)
    .where(and(eq(oblioDocuments.id, oblioDocumentId), eq(oblioDocuments.tenantId, tenantId)))
    .limit(1);

  if (docs.length === 0) {
    throw new Error(`h46: oblioDocument ${oblioDocumentId} negăsit`);
  }

  const doc = docs[0];

  if (doc.documentType !== "INVOICE") {
    throw new Error(
      `h46: oblioDocument ${oblioDocumentId} nu e INVOICE (este ${doc.documentType})`,
    );
  }

  if (doc.status !== "ACTIVE") {
    throw new Error(`h46: oblioDocument ${oblioDocumentId} nu e ACTIVE (este ${doc.status})`);
  }

  const series = doc.series ?? "";
  const number = doc.number ?? 0;

  // 2. Trimite în SPV via Oblio API (HTTP real)
  const spvResult = await sendInvoiceToSpv(companyCif, series, number);
  const { code } = spvResult;

  if (code === -1) {
    throw new Error("SPV neconfigurat pe contul Oblio");
  }

  // 3. Map oblioCode → status DB
  let status: string;
  let errorMessage: string | null = null;

  if (code === 0) {
    status = "SENDING";
  } else if (code === 1) {
    status = "SENT";
  } else {
    status = "ERROR";
    errorMessage = spvResult.text;
  }

  // 4. Calculează deadlineAt = issuedAt + 5 zile (fallback new Date() dacă issuedAt null)
  const baseDate = doc.issuedAt ?? new Date();
  const deadlineAt = new Date(baseDate.getTime() + DEADLINE_DAYS * MS_PER_DAY);
  const indexSpv = `${series}/${number}`;

  // 5. INSERT einvoice_submissions
  const insertResult = await db
    .insert(einvoiceSubmissions)
    .values({
      tenantId,
      oblioDocumentId,
      status,
      indexSpv,
      deadlineAt,
      submittedAt: new Date(),
      errorMessage,
    })
    .returning({ id: einvoiceSubmissions.id });

  const submissionId = insertResult[0]?.id ?? "unknown";

  console.info(
    `${LOG} tenantId=${tenantId} oblioDocumentId=${oblioDocumentId} code=${code} status=${status} submissionId=${submissionId}`,
  );

  return { ok: true, submissionId, oblioCode: code, deadlineAt, status };
};
