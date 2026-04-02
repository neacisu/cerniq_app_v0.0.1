/**
 * H47 — einvoice:status:check (CRON: "star/30 * * * *", concurrency:5)
 *
 * Verifică statusul facturilor trimise în SPV (SENDING/SENT/PROCESSING).
 * Pași: fetch submissions active → JOIN oblioDocuments pentru series+number →
 *   checkEinvoiceStatus pentru fiecare → UPDATE status.
 *
 * ANTI-HALUCINARE:
 *   - oblioCode 0 → PROCESSING
 *   - oblioCode 1 → VALIDATED + validatedAt=now
 *   - oblioCode 2 → ERROR + errorMessage
 *   - oblioCode -1 → PENDING (reset — SPV neconfigurat)
 */
import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  oblioDocuments,
  einvoiceSubmissions,
  eq,
  and,
  inArray,
} from "@cerniq/db";
import { checkEinvoiceStatus } from "../lib/oblio-client.js";

const LOG = "[h47-einvoice-status-check]";
const ACTIVE_STATUSES = ["SENDING", "SENT", "PROCESSING"] as const;

export interface EinvoiceStatusCheckJobData {
  tenantId: string;
  companyCif: string;
}

export interface EinvoiceStatusCheckResult {
  ok: boolean;
  checkedCount: number;
  validatedCount: number;
  errorCount: number;
  processingCount: number;
}

export const einvoiceStatusCheckProcessor: Processor<
  EinvoiceStatusCheckJobData,
  EinvoiceStatusCheckResult
> = async (job) => {
  const { tenantId, companyCif } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Fetch submissions active (SENDING/SENT/PROCESSING)
  const submissions = await db
    .select({
      id: einvoiceSubmissions.id,
      oblioDocumentId: einvoiceSubmissions.oblioDocumentId,
      status: einvoiceSubmissions.status,
    })
    .from(einvoiceSubmissions)
    .where(
      and(
        eq(einvoiceSubmissions.tenantId, tenantId),
        inArray(einvoiceSubmissions.status, [...ACTIVE_STATUSES]),
      ),
    );

  if (submissions.length === 0) {
    return { ok: true, checkedCount: 0, validatedCount: 0, errorCount: 0, processingCount: 0 };
  }

  // 2. Fetch oblioDocuments pentru series + number (JOIN separat)
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

  let validatedCount = 0;
  let errorCount = 0;
  let processingCount = 0;

  // 3. Verifică fiecare submission via Oblio API
  for (const sub of submissions) {
    const doc = docMap.get(sub.oblioDocumentId);
    const series = doc?.series ?? "";
    const number = doc?.number ?? 0;

    const result = await checkEinvoiceStatus(companyCif, series, number);

    let newStatus: string;
    let validatedAt: Date | null = null;
    let errorMessage: string | null = null;

    if (result.code === 0) {
      newStatus = "PROCESSING";
      processingCount++;
    } else if (result.code === 1) {
      newStatus = "VALIDATED";
      validatedAt = new Date();
      validatedCount++;
    } else if (result.code === 2) {
      newStatus = "ERROR";
      errorMessage = result.text;
      errorCount++;
    } else {
      // code -1: neconfigurat → reset la PENDING
      newStatus = "PENDING";
    }

    // 4. UPDATE einvoice_submissions
    const setData: Record<string, unknown> = { status: newStatus };
    if (validatedAt) setData.validatedAt = validatedAt;
    if (errorMessage) setData.errorMessage = errorMessage;

    await db.update(einvoiceSubmissions).set(setData).where(eq(einvoiceSubmissions.id, sub.id));
  }

  console.info(
    `${LOG} tenantId=${tenantId} checked=${submissions.length} validated=${validatedCount} error=${errorCount} processing=${processingCount}`,
  );

  return {
    ok: true,
    checkedCount: submissions.length,
    validatedCount,
    errorCount,
    processingCount,
  };
};
