/**
 * H50 — einvoice:retry:failed (CRON: "0 * * * *", concurrency:5)
 *
 * Reîncercă facturile eşuate (ERROR/REJECTED) sau escalează către HITL dacă retryCount >= 10.
 * Pași: fetch ERROR/REJECTED submissions →
 *   retryCount < 10 → sendInvoiceToSpv → UPDATE retryCount++ →
 *   retryCount >= 10 → HITL escalation cu tip "einvoice_max_retries_critical".
 *
 * ANTI-HALUCINARE:
 *   - MAX_RETRIES = 10 (nu 9, nu 11)
 *   - HITL escalation: QUEUES.HITL_ESCALATION ("hitl:escalate")
 *   - retryCount se incrementează și pentru retry eșuat (retryCount++)
 *   - "REJECTED" este status valid pentru retry
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
import { createQueue, QUEUES } from "@cerniq/worker-shared";
import { sendInvoiceToSpv } from "../lib/oblio-client.js";

const LOG = "[h50-einvoice-retry-failed]";
const MAX_RETRIES = 10;
const FAILED_STATUSES = ["ERROR", "REJECTED"] as const;

export interface EinvoiceRetryFailedJobData {
  tenantId: string;
  companyCif: string;
}

export interface EinvoiceRetryFailedResult {
  ok: boolean;
  retriedCount: number;
  escalatedCount: number;
}

export const einvoiceRetryFailedProcessor: Processor<
  EinvoiceRetryFailedJobData,
  EinvoiceRetryFailedResult
> = async (job) => {
  const { tenantId, companyCif } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Fetch submissions cu status ERROR sau REJECTED
  const submissions = await db
    .select({
      id: einvoiceSubmissions.id,
      oblioDocumentId: einvoiceSubmissions.oblioDocumentId,
      status: einvoiceSubmissions.status,
      retryCount: einvoiceSubmissions.retryCount,
    })
    .from(einvoiceSubmissions)
    .where(
      and(
        eq(einvoiceSubmissions.tenantId, tenantId),
        inArray(einvoiceSubmissions.status, [...FAILED_STATUSES]),
      ),
    );

  if (submissions.length === 0) {
    return { ok: true, retriedCount: 0, escalatedCount: 0 };
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

  // 3. Separă în retryable (< MAX_RETRIES) și escalatable (>= MAX_RETRIES)
  const retryable = submissions.filter((s) => (s.retryCount ?? 0) < MAX_RETRIES);
  const escalatable = submissions.filter((s) => (s.retryCount ?? 0) >= MAX_RETRIES);

  let retriedCount = 0;
  let escalatedCount = 0;

  // 4. Retry retryable
  for (const sub of retryable) {
    const doc = docMap.get(sub.oblioDocumentId);
    const series = doc?.series ?? "";
    const number = doc?.number ?? 0;

    const result = await sendInvoiceToSpv(companyCif, series, number);

    let newStatus: string;
    let errorMessage: string | null = null;

    if (result.code === 1) {
      newStatus = "SENT";
    } else if (result.code === 0) {
      newStatus = "SENDING";
    } else {
      newStatus = "ERROR";
      errorMessage = result.text;
    }

    const setData: Record<string, unknown> = {
      status: newStatus,
      retryCount: (sub.retryCount ?? 0) + 1,
      submittedAt: new Date(),
    };
    if (errorMessage) setData.errorMessage = errorMessage;

    await db.update(einvoiceSubmissions).set(setData).where(eq(einvoiceSubmissions.id, sub.id));

    retriedCount++;
  }

  // 5. Escalare HITL N76 CRITICAL pentru submissions cu retryCount >= MAX_RETRIES
  if (escalatable.length > 0) {
    const hitlQueue = createQueue(QUEUES.HITL_ESCALATION);
    try {
      for (const sub of escalatable) {
        await hitlQueue.add("hitl:escalate", {
          tenantId,
          type: "einvoice_max_retries_critical",
          entityType: "einvoice_submission",
          entityId: sub.id,
          message: "eFactura: max 10 retries depășit — intervenție umană OBLIGATORIE",
        });
        escalatedCount++;
      }
    } finally {
      await hitlQueue.close();
    }
  }

  console.info(
    `${LOG} tenantId=${tenantId} retriedCount=${retriedCount} escalatedCount=${escalatedCount}`,
  );

  return { ok: true, retriedCount, escalatedCount };
};
