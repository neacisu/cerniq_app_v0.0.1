/**
 * G39 — oblio:proforma:create (concurrency:5, rate:60/min)
 *
 * Creează o proformă în Oblio pe baza unei negocieri în stare CLOSING.
 * Pași: fetch negociere + items + produse → calcul totals (TVA 19%) →
 *   oblioClient.createProforma (STUB) → INSERT oblio_documents PROFORMA →
 *   enqueue negotiation:state:transition → PROFORMA_SENT →
 *   fiscal_audit_trail SHA-256 hash chain.
 *
 * ANTI-HALUCINARE:
 *   - document_type = "PROFORMA" (ENUM din e3.ts L53)
 *   - total = subtotal + vat (CHECK constraint e3.ts L423)
 *   - negocierea trebuie să fie în stare CLOSING
 */
import type { Processor } from "bullmq";
import { createHash } from "node:crypto";
import {
  db,
  setSessionTenantId,
  goldNegotiations,
  negotiationItems,
  goldProducts,
  oblioDocuments,
  fiscalAuditTrail,
  eq,
  and,
  inArray,
  desc,
} from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";
import { oblioClient } from "../lib/oblio-client.js";

const LOG = "[g39-oblio-proforma-create]";
const REQUIRED_STATE = "CLOSING";
const VAT_RATE = 19; // procent TVA standard RO

export interface OblioProformaCreateJobData {
  tenantId: string;
  negotiationId: string;
  actorId: string;
}

export interface OblioProformaCreateResult {
  ok: true;
  oblioDocumentId: string;
  oblioId: string;
  total: number;
  hash: string;
}

export const oblioProformaCreateProcessor: Processor<
  OblioProformaCreateJobData,
  OblioProformaCreateResult
> = async (job) => {
  const { tenantId, negotiationId, actorId } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Fetch negociere — trebuie să fie în stare CLOSING
  const negotiations = await db
    .select({
      id: goldNegotiations.id,
      currentState: goldNegotiations.currentState,
      leadId: goldNegotiations.leadId,
      totalValue: goldNegotiations.totalValue,
    })
    .from(goldNegotiations)
    .where(and(eq(goldNegotiations.id, negotiationId), eq(goldNegotiations.tenantId, tenantId)))
    .limit(1);

  if (negotiations.length === 0) {
    throw new Error(`g39: negociere ${negotiationId} negăsită`);
  }

  const negotiation = negotiations[0];
  if (negotiation.currentState !== REQUIRED_STATE) {
    throw new Error(
      `g39: negociere ${negotiationId} nu e în ${REQUIRED_STATE} (curentă: ${negotiation.currentState})`,
    );
  }

  // 2. Fetch items negociere
  const items = await db
    .select({
      id: negotiationItems.id,
      productId: negotiationItems.productId,
      quantity: negotiationItems.quantity,
      unitPrice: negotiationItems.unitPrice,
      discountPct: negotiationItems.discountPct,
      lineTotal: negotiationItems.lineTotal,
    })
    .from(negotiationItems)
    .where(
      and(
        eq(negotiationItems.negotiationId, negotiationId),
        eq(negotiationItems.tenantId, tenantId),
      ),
    );

  if (items.length === 0) {
    throw new Error(`g39: negociere ${negotiationId} nu are items — proformă imposibilă`);
  }

  // 3. Fetch produse pentru names (Oblio cere descriere linie)
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await db
    .select({ id: goldProducts.id, name: goldProducts.name, sku: goldProducts.sku })
    .from(goldProducts)
    .where(inArray(goldProducts.id, productIds));

  const productMap = new Map(products.map((p) => [p.id, p]));

  // 4. Calculează totals — TVA 19%
  const subtotalNum =
    Math.round(
      items.reduce((sum, i) => sum + Number.parseFloat(String(i.lineTotal ?? "0")), 0) * 100,
    ) / 100;
  const vatNum = Math.round(subtotalNum * VAT_RATE * 100) / 10000;
  const totalNum = Math.round((subtotalNum + vatNum) * 100) / 100;

  // 5. Construiește payload Oblio
  const oblioItems = items.map((i) => {
    const product = productMap.get(i.productId);
    return {
      name: product?.name ?? "Produs",
      code: product?.sku ?? undefined,
      quantity: i.quantity ?? 1,
      unitPrice: Number.parseFloat(String(i.unitPrice ?? "0")),
      discountPct: Number.parseFloat(String(i.discountPct ?? "0")),
      vatRate: VAT_RATE,
    };
  });

  // 6. Apel Oblio API (STUB)
  const oblioResult = await oblioClient.createProforma({
    tenantId,
    clientCui: negotiation.leadId, // CUI din goldCompanies — self-hosted Regula 6
    clientName: negotiation.leadId, // Înlocuit cu nombre real în FAZA 13
    items: oblioItems,
    subtotal: subtotalNum,
    vat: vatNum,
    total: totalNum,
    currency: "RON",
  });

  // 7. INSERT oblio_documents PROFORMA
  const docRows = await db
    .insert(oblioDocuments)
    .values({
      tenantId,
      documentType: "PROFORMA",
      series: oblioResult.series,
      number: oblioResult.number,
      oblioId: oblioResult.oblioId,
      status: "ACTIVE",
      subtotal: String(subtotalNum.toFixed(2)),
      vat: String(vatNum.toFixed(2)),
      total: String(totalNum.toFixed(2)),
      issuedAt: new Date(),
    })
    .returning({ id: oblioDocuments.id });

  const oblioDocumentId = docRows[0]?.id ?? "unknown";

  // 8. Enqueue negotiation:state:transition → PROFORMA_SENT
  const transitionQueue = createQueue(QUEUES.E3_NEGOTIATION_STATE_TRANSITION);
  try {
    await transitionQueue.add(
      "negotiation:state:transition",
      {
        tenantId,
        negotiationId,
        toState: "PROFORMA_SENT",
        changedBy: actorId,
        reason: "proforma_created:" + oblioDocumentId,
      },
      DEFAULT_JOB_OPTIONS,
    );
  } finally {
    await transitionQueue.close();
  }

  // 9. Fiscal Audit Trail — SHA-256 hash chain
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
    oblioId: oblioResult.oblioId,
    negotiationId,
    documentType: "PROFORMA",
    subtotal: subtotalNum,
    vat: vatNum,
    total: totalNum,
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
    action: "PROFORMA_CREATED",
    actorId: actorId || null,
    prevHash,
    hash,
    data: auditData,
  });

  console.info(
    `${LOG} tenantId=${tenantId} negotiationId=${negotiationId} oblioDocumentId=${oblioDocumentId} total=${totalNum} hash=${hash.slice(0, 12)}...`,
  );

  return { ok: true, oblioDocumentId, oblioId: oblioResult.oblioId, total: totalNum, hash };
};
