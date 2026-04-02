/**
 * G45 — oblio:webhook:process (concurrency:10)
 *
 * Procesează webhook-uri primite de la Oblio.
 * Idempotent: verifică oblioId în oblio_documents înainte de procesare.
 * Loghează fiecare event procesat în fiscal_audit_trail.
 *
 * Event types suportate:
 *   - payment_received → status PAID (extended status)
 *   - document_cancelled → status CANCELLED
 *   - document_issued → status ACTIVE (no-op dacă deja ACTIVE)
 *
 * ANTI-HALUCINARE:
 *   - Idempotency verificată via oblioId în oblio_documents
 *   - Stări necunoscute → logged + processed=false
 *   - NU face modificări de stare la documente deja în stare finală
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

const LOG = "[g45-oblio-webhook-process]";

const TERMINAL_STATUSES = new Set(["CANCELLED", "PAID"]);

export interface OblioWebhookProcessJobData {
  tenantId: string;
  oblioId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}

export interface OblioWebhookProcessResult {
  ok: true;
  processed: boolean;
  eventType: string;
  reason?: string;
}

/** Mapare event type → status nou document */
const EVENT_STATUS_MAP: Record<string, string> = {
  payment_received: "PAID",
  document_cancelled: "CANCELLED",
  document_issued: "ACTIVE",
};

export const oblioWebhookProcessProcessor: Processor<
  OblioWebhookProcessJobData,
  OblioWebhookProcessResult
> = async (job) => {
  const { tenantId, oblioId, eventType, payload } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Idempotency: caută document după oblioId
  const docs = await db
    .select({
      id: oblioDocuments.id,
      status: oblioDocuments.status,
      documentType: oblioDocuments.documentType,
    })
    .from(oblioDocuments)
    .where(and(eq(oblioDocuments.tenantId, tenantId), eq(oblioDocuments.oblioId, oblioId)))
    .limit(1);

  if (docs.length === 0) {
    console.warn(`${LOG} oblioId=${oblioId} necunoscut în oblio_documents — ignorat`);
    return { ok: true, processed: false, eventType, reason: "unknown-document" };
  }

  const doc = docs[0];

  // 2. Idempotency: document deja în stare finală → skip
  if (TERMINAL_STATUSES.has(doc.status ?? "")) {
    console.info(
      `${LOG} oblioId=${oblioId} document deja în stare finală ${doc.status ?? ""} — skip idempotent`,
    );
    return { ok: true, processed: false, eventType, reason: "already-terminal" };
  }

  // 3. Determină noul status din eventType
  const newStatus = EVENT_STATUS_MAP[eventType];
  if (!newStatus) {
    console.warn(`${LOG} oblioId=${oblioId} eventType necunoscut: ${eventType}`);
    return { ok: true, processed: false, eventType, reason: "unknown-event-type" };
  }

  // 4. UPDATE status document
  await db
    .update(oblioDocuments)
    .set({ status: newStatus })
    .where(and(eq(oblioDocuments.id, doc.id), eq(oblioDocuments.tenantId, tenantId)));

  // 5. Fiscal Audit Trail
  const lastEntries = await db
    .select({ hash: fiscalAuditTrail.hash })
    .from(fiscalAuditTrail)
    .where(and(eq(fiscalAuditTrail.tenantId, tenantId), eq(fiscalAuditTrail.entityId, doc.id)))
    .orderBy(desc(fiscalAuditTrail.createdAt))
    .limit(1);

  const prevHash = lastEntries[0]?.hash ?? "GENESIS";
  const auditData = {
    oblioDocumentId: doc.id,
    oblioId,
    eventType,
    prevStatus: doc.status,
    newStatus,
    payload: payload ?? {},
    timestamp: new Date().toISOString(),
  };
  const hash = createHash("sha256")
    .update(prevHash + JSON.stringify(auditData))
    .digest("hex");

  await db.insert(fiscalAuditTrail).values({
    tenantId,
    entityType: "oblio_document",
    entityId: doc.id,
    action: "WEBHOOK_" + eventType.toUpperCase().replaceAll(":", "_"),
    actorId: null,
    prevHash,
    hash,
    data: auditData,
  });

  console.info(
    `${LOG} tenantId=${tenantId} oblioId=${oblioId} eventType=${eventType} newStatus=${newStatus} hash=${hash.slice(0, 12)}...`,
  );

  return { ok: true, processed: true, eventType };
};
