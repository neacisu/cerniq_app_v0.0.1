/**
 * G41 — oblio:invoice:create (concurrency:5)
 *
 * Convertește o proformă în factură în Oblio.
 * Pași: fetch proforma → convertProformaToInvoice (STUB) → INSERT INVOICE →
 *   UPDATE proforma → REPLACED → enqueue negotiation:state:transition → INVOICED →
 *   enqueue einvoice:spv:send (H46) → fiscal_audit_trail hash chain.
 *
 * ANTI-HALUCINARE:
 *   - proforma trebuie să fie documentType="PROFORMA" + status="ACTIVE"
 *   - invoice nou are documentType="INVOICE"
 *   - trigger PROFORMA_SENT→INVOICED prin negotiation:state:transition
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

const LOG = "[g41-oblio-invoice-create]";

export interface OblioInvoiceCreateJobData {
  tenantId: string;
  oblioDocumentId: string;
  negotiationId: string;
  actorId: string;
}

export interface OblioInvoiceCreateResult {
  ok: true;
  invoiceDocumentId: string;
  oblioId: string;
  hash: string;
}

export const oblioInvoiceCreateProcessor: Processor<
  OblioInvoiceCreateJobData,
  OblioInvoiceCreateResult
> = async (job) => {
  const { tenantId, oblioDocumentId, negotiationId, actorId } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Fetch proforma — trebuie PROFORMA + ACTIVE
  const docs = await db
    .select({
      id: oblioDocuments.id,
      documentType: oblioDocuments.documentType,
      status: oblioDocuments.status,
      oblioId: oblioDocuments.oblioId,
      subtotal: oblioDocuments.subtotal,
      vat: oblioDocuments.vat,
      total: oblioDocuments.total,
    })
    .from(oblioDocuments)
    .where(and(eq(oblioDocuments.id, oblioDocumentId), eq(oblioDocuments.tenantId, tenantId)))
    .limit(1);

  if (docs.length === 0) {
    throw new Error(`g41: proforma ${oblioDocumentId} negăsită`);
  }

  const proforma = docs[0];
  if (proforma.documentType !== "PROFORMA") {
    throw new Error(
      `g41: document ${oblioDocumentId} nu e PROFORMA (este ${proforma.documentType})`,
    );
  }
  if (proforma.status !== "ACTIVE") {
    throw new Error(
      `g41: proforma ${oblioDocumentId} nu e ACTIVE (este ${proforma.status ?? "null"})`,
    );
  }

  // 2. Apel Oblio API — conversie proformă → factură (STUB)
  const convertResult = await oblioClient.convertProformaToInvoice(proforma.oblioId ?? "");

  // 3. INSERT INVOICE în oblio_documents
  const invoiceRows = await db
    .insert(oblioDocuments)
    .values({
      tenantId,
      documentType: "INVOICE",
      series: convertResult.series,
      number: convertResult.number,
      oblioId: convertResult.invoiceOblioId,
      status: "ACTIVE",
      subtotal: String(proforma.subtotal),
      vat: String(proforma.vat),
      total: String(proforma.total),
      issuedAt: new Date(),
    })
    .returning({ id: oblioDocuments.id });

  const invoiceDocumentId = invoiceRows[0]?.id ?? "unknown";

  // 4. UPDATE proforma status → REPLACED
  await db
    .update(oblioDocuments)
    .set({ status: "REPLACED" })
    .where(and(eq(oblioDocuments.id, oblioDocumentId), eq(oblioDocuments.tenantId, tenantId)));

  // 5. Enqueue negotiation:state:transition → INVOICED
  const transitionQueue = createQueue(QUEUES.E3_NEGOTIATION_STATE_TRANSITION);
  try {
    await transitionQueue.add(
      "negotiation:state:transition",
      {
        tenantId,
        negotiationId,
        toState: "INVOICED",
        changedBy: actorId,
        reason: "invoice_created:" + invoiceDocumentId,
      },
      DEFAULT_JOB_OPTIONS,
    );
  } finally {
    await transitionQueue.close();
  }

  // 6. Fiscal Audit Trail — SHA-256 hash chain pe INVOICE
  const lastEntries = await db
    .select({ hash: fiscalAuditTrail.hash })
    .from(fiscalAuditTrail)
    .where(
      and(
        eq(fiscalAuditTrail.tenantId, tenantId),
        eq(fiscalAuditTrail.entityId, invoiceDocumentId),
      ),
    )
    .orderBy(desc(fiscalAuditTrail.createdAt))
    .limit(1);

  const prevHash = lastEntries[0]?.hash ?? "GENESIS";
  const auditData = {
    invoiceDocumentId,
    invoiceOblioId: convertResult.invoiceOblioId,
    proformaDocumentId: oblioDocumentId,
    proformaOblioId: proforma.oblioId,
    negotiationId,
    documentType: "INVOICE",
    total: proforma.total,
    actorId,
    timestamp: new Date().toISOString(),
  };
  const hash = createHash("sha256")
    .update(prevHash + JSON.stringify(auditData))
    .digest("hex");

  await db.insert(fiscalAuditTrail).values({
    tenantId,
    entityType: "oblio_document",
    entityId: invoiceDocumentId,
    action: "INVOICE_CREATED",
    actorId: actorId || null,
    prevHash,
    hash,
    data: auditData,
  });

  console.info(
    `${LOG} tenantId=${tenantId} proforma=${oblioDocumentId} invoice=${invoiceDocumentId} hash=${hash.slice(0, 12)}...`,
  );

  return { ok: true, invoiceDocumentId, oblioId: convertResult.invoiceOblioId, hash };
};
