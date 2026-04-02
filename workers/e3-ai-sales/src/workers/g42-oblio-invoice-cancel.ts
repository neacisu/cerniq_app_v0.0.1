/**
 * G42 — oblio:invoice:cancel (concurrency:2, rate:10/min)
 *
 * Anulează o factură (storno) în Oblio. HITL approval OBLIGATORIU.
 *
 * Flux în 2 faze:
 *   Faza 1 (fără approvalRef): enqueue hitl:escalate → return { pending: true }
 *   Faza 2 (cu approvalRef):   cancel + INSERT CREDIT_NOTE + fiscal audit trail
 *
 * ANTI-HALUCINARE:
 *   - document trebuie să fie INVOICE + ACTIVE
 *   - HITL approval non-negociabil (nu poate fi ocolit)
 *   - credit note are documentType="CREDIT_NOTE"
 *   - total = subtotal + vat (CHECK constraint) — copiat din factură
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
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";
import { oblioClient } from "../lib/oblio-client.js";

const LOG = "[g42-oblio-invoice-cancel]";

export interface OblioInvoiceCancelJobData {
  tenantId: string;
  oblioDocumentId: string;
  reason: string;
  actorId: string;
  approvalRef?: string;
}

export type OblioInvoiceCancelResult =
  | { ok: true; pending: true; hitlRef: string }
  | { ok: true; pending: false; creditNoteDocumentId: string; hash: string };

export const oblioInvoiceCancelProcessor: Processor<
  OblioInvoiceCancelJobData,
  OblioInvoiceCancelResult
> = async (job) => {
  const { tenantId, oblioDocumentId, reason, actorId, approvalRef } = job.data;

  await setSessionTenantId(tenantId);

  // Faza 1: fără approvalRef → HITL escalation obligatorie
  if (!approvalRef) {
    const hitlQueue = createQueue(QUEUES.HITL_ESCALATION);
    let hitlRef: string;
    try {
      const hitlJob = await hitlQueue.add(
        "hitl:escalate",
        {
          tenantId,
          type: "invoice_cancel_approval",
          entityType: "oblio_document",
          entityId: oblioDocumentId,
          reason,
          requestedBy: actorId,
          callbackQueue: QUEUES.E3_OBLIO_INVOICE_CANCEL,
          callbackData: {
            tenantId,
            oblioDocumentId,
            reason,
            actorId,
          },
        },
        DEFAULT_JOB_OPTIONS,
      );
      hitlRef = String(hitlJob?.id ?? "pending");
    } finally {
      await hitlQueue.close();
    }

    console.info(
      `${LOG} tenantId=${tenantId} oblioDocumentId=${oblioDocumentId} → HITL escalation hitlRef=${hitlRef}`,
    );

    return { ok: true, pending: true, hitlRef };
  }

  // Faza 2: approvalRef primit → execuție cancel

  // 1. Fetch invoice — trebuie INVOICE + ACTIVE
  const docs = await db
    .select({
      id: oblioDocuments.id,
      documentType: oblioDocuments.documentType,
      status: oblioDocuments.status,
      oblioId: oblioDocuments.oblioId,
      subtotal: oblioDocuments.subtotal,
      vat: oblioDocuments.vat,
      total: oblioDocuments.total,
      series: oblioDocuments.series,
      number: oblioDocuments.number,
    })
    .from(oblioDocuments)
    .where(and(eq(oblioDocuments.id, oblioDocumentId), eq(oblioDocuments.tenantId, tenantId)))
    .limit(1);

  if (docs.length === 0) {
    throw new Error(`g42: invoice ${oblioDocumentId} negăsit`);
  }

  const invoice = docs[0];
  if (invoice.documentType !== "INVOICE") {
    throw new Error(`g42: document ${oblioDocumentId} nu e INVOICE (este ${invoice.documentType})`);
  }
  if (invoice.status !== "ACTIVE") {
    throw new Error(
      `g42: invoice ${oblioDocumentId} nu e ACTIVE (este ${invoice.status ?? "null"})`,
    );
  }

  // 2. Apel Oblio API — cancel (STUB)
  const cancelResult = await oblioClient.cancelInvoice(invoice.oblioId ?? "", reason);

  // 3. UPDATE invoice status → CANCELLED
  await db
    .update(oblioDocuments)
    .set({ status: "CANCELLED" })
    .where(and(eq(oblioDocuments.id, oblioDocumentId), eq(oblioDocuments.tenantId, tenantId)));

  // 4. INSERT CREDIT_NOTE în oblio_documents (inversează valorile)
  const creditNoteRows = await db
    .insert(oblioDocuments)
    .values({
      tenantId,
      documentType: "CREDIT_NOTE",
      series: "CN",
      number: (invoice.number ?? 0) + 10000,
      oblioId: cancelResult.creditNoteOblioId,
      status: "ACTIVE",
      subtotal: String(invoice.subtotal),
      vat: String(invoice.vat),
      total: String(invoice.total),
      issuedAt: new Date(),
    })
    .returning({ id: oblioDocuments.id });

  const creditNoteDocumentId = creditNoteRows[0]?.id ?? "unknown";

  // 5. Fiscal Audit Trail
  const lastEntries = await db
    .select({ hash: fiscalAuditTrail.hash })
    .from(fiscalAuditTrail)
    .where(
      and(eq(fiscalAuditTrail.tenantId, tenantId), eq(fiscalAuditTrail.entityId, oblioDocumentId)),
    )
    .orderBy(desc(fiscalAuditTrail.createdAt))
    .limit(1);

  const prevHash = lastEntries[0]?.hash ?? "GENESIS";
  const auditData = {
    oblioDocumentId,
    invoiceOblioId: invoice.oblioId,
    creditNoteDocumentId,
    creditNoteOblioId: cancelResult.creditNoteOblioId,
    reason,
    approvalRef,
    actorId,
    timestamp: new Date().toISOString(),
  };
  const hash = createHash("sha256")
    .update(prevHash + JSON.stringify(auditData))
    .digest("hex");

  await db.insert(fiscalAuditTrail).values({
    tenantId,
    entityType: "oblio_document",
    entityId: oblioDocumentId,
    action: "INVOICE_CANCELLED",
    actorId: actorId || null,
    prevHash,
    hash,
    data: auditData,
  });

  console.info(
    `${LOG} tenantId=${tenantId} invoice=${oblioDocumentId} creditNote=${creditNoteDocumentId} approvalRef=${approvalRef} hash=${hash.slice(0, 12)}...`,
  );

  return { ok: true, pending: false, creditNoteDocumentId, hash };
};
