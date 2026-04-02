/**
 * G40 — oblio:proforma:update (concurrency:5)
 *
 * Actualizează o proformă existentă în Oblio pe baza items-urilor modificate.
 * Recalculează subtotal, vat, total și loghează în fiscal_audit_trail.
 *
 * ANTI-HALUCINARE:
 *   - oblioDocuments.documentType trebuie să fie "PROFORMA"
 *   - oblioDocuments.status trebuie să fie "ACTIVE" (nu CANCELLED/REPLACED)
 *   - total = subtotal + vat (CHECK constraint)
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
import { oblioClient } from "../lib/oblio-client.js";

const LOG = "[g40-oblio-proforma-update]";
const VAT_RATE = 19;

export interface OblioProformaUpdateJobData {
  tenantId: string;
  oblioDocumentId: string;
  actorId: string;
  newSubtotal: number;
}

export interface OblioProformaUpdateResult {
  ok: true;
  oblioDocumentId: string;
  newTotal: number;
  hash: string;
}

export const oblioProformaUpdateProcessor: Processor<
  OblioProformaUpdateJobData,
  OblioProformaUpdateResult
> = async (job) => {
  const { tenantId, oblioDocumentId, actorId, newSubtotal } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Fetch document — trebuie PROFORMA + ACTIVE
  const docs = await db
    .select({
      id: oblioDocuments.id,
      documentType: oblioDocuments.documentType,
      status: oblioDocuments.status,
      oblioId: oblioDocuments.oblioId,
    })
    .from(oblioDocuments)
    .where(and(eq(oblioDocuments.id, oblioDocumentId), eq(oblioDocuments.tenantId, tenantId)))
    .limit(1);

  if (docs.length === 0) {
    throw new Error(`g40: oblioDocument ${oblioDocumentId} negăsit`);
  }

  const doc = docs[0];
  if (doc.documentType !== "PROFORMA") {
    throw new Error(`g40: document ${oblioDocumentId} nu e PROFORMA (este ${doc.documentType})`);
  }
  if (doc.status === "CANCELLED" || doc.status === "REPLACED") {
    throw new Error(`g40: proforma ${oblioDocumentId} este ${doc.status} — update imposibil`);
  }

  // 2. Recalculează totals
  const subtotalNum = Math.round(newSubtotal * 100) / 100;
  const vatNum = Math.round(subtotalNum * VAT_RATE * 100) / 10000;
  const totalNum = Math.round((subtotalNum + vatNum) * 100) / 100;

  // 3. Apel Oblio API (STUB)
  await oblioClient.updateProforma({
    oblioId: doc.oblioId ?? "",
    subtotal: subtotalNum,
    vat: vatNum,
    total: totalNum,
  });

  // 4. UPDATE oblioDocuments
  await db
    .update(oblioDocuments)
    .set({
      subtotal: String(subtotalNum.toFixed(2)),
      vat: String(vatNum.toFixed(2)),
      total: String(totalNum.toFixed(2)),
    })
    .where(and(eq(oblioDocuments.id, oblioDocumentId), eq(oblioDocuments.tenantId, tenantId)));

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
    oblioId: doc.oblioId,
    documentType: "PROFORMA",
    newSubtotal: subtotalNum,
    newVat: vatNum,
    newTotal: totalNum,
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
    action: "PROFORMA_UPDATED",
    actorId: actorId || null,
    prevHash,
    hash,
    data: auditData,
  });

  console.info(
    `${LOG} tenantId=${tenantId} oblioDocumentId=${oblioDocumentId} newTotal=${totalNum} hash=${hash.slice(0, 12)}...`,
  );

  return { ok: true, oblioDocumentId, newTotal: totalNum, hash };
};
