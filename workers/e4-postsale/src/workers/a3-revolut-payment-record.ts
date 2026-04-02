/**
 * A3 — revolut:payment:record
 *
 * Responsabilitate (plan §IX A3):
 * - INSERT gold_payments cu externalSource='REVOLUT', reconciliationStatus='PENDING'
 * - Enqueue B7 `payment:reconcile:auto` cu paymentId (queue B7 va fi definit în FAZA 8c)
 * - INSERT gold_audit_logs_etapa4 cu eventType='PAYMENT_RECEIVED'
 */
import type { Processor } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { createQueue } from "@cerniq/worker-shared";
import { db, setSessionTenantId, goldPayments, goldAuditLogsEtapa4 } from "@cerniq/db";
import {
  e4RevolutPaymentsRecordedTotal,
  e4OrdersCreatedTotal,
  e4OrdersValueTotal,
  e4PaymentsReceivedTotal,
} from "../e4-metrics.js";

export type PaymentRecordJobData = {
  webhookId: string;
  tenantId: string;
  externalId: string;
  amount: number;
  currency: string;
  counterpartyName?: string;
  counterpartyIban?: string;
  reference?: string;
  receivedAt?: string;
  internalType: "payment_received" | "transfer_initiated" | "refund_processed" | "unknown";
};

export type PaymentRecordResult = {
  ok: true;
  paymentId: string;
  reconcileJobId: string;
  webhookId: string;
};

/**
 * Coadă B7 payment:reconcile:auto — definită în FAZA 8c.
 * Enqueued cu paymentId pentru reconciliere automată.
 */
const PAYMENT_RECONCILE_QUEUE = "payment:reconcile:auto";

export const revolutPaymentRecordProcessor: Processor<PaymentRecordJobData> = async (
  job,
): Promise<PaymentRecordResult> => {
  const {
    webhookId,
    tenantId,
    externalId,
    amount,
    currency,
    counterpartyName,
    counterpartyIban,
    reference,
    receivedAt,
  } = job.data;

  await setSessionTenantId(tenantId);

  // ── INSERT gold_payments ─────────────────────────────────────────────────
  const paymentId = uuidv4();
  const receivedAtDate = receivedAt ? new Date(receivedAt) : new Date();

  await db.insert(goldPayments).values({
    id: paymentId,
    tenantId,
    externalId,
    externalSource: "REVOLUT",
    amount: String(amount),
    currency,
    reconciliationStatus: "PENDING",
    counterpartyName: counterpartyName ?? null,
    counterpartyIban: counterpartyIban ?? null,
    reference: reference ?? null,
    receivedAt: receivedAtDate,
  });

  // ── INSERT gold_audit_logs_etapa4 ────────────────────────────────────────
  const auditId = uuidv4();
  const now = new Date();

  await db.insert(goldAuditLogsEtapa4).values({
    id: auditId,
    tenantId,
    actorId: null,
    actorType: "WORKER",
    eventType: "PAYMENT_RECEIVED",
    entityType: "gold_payments",
    entityId: paymentId,
    newValues: {
      webhookId,
      externalId,
      amount,
      currency,
      source: "REVOLUT",
    },
    prevHash: null,
    createdAt: now,
  });

  // ── Enqueue B7 payment:reconcile:auto ───────────────────────────────────
  const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? "4");
  const reconcileQueue = createQueue(PAYMENT_RECONCILE_QUEUE, { db: REDIS_DB_E4 });

  const reconcileJob = await reconcileQueue.add(
    "reconcile",
    { paymentId, tenantId, externalId, amount, currency },
    { jobId: `reconcile:${paymentId}` },
  );

  await reconcileQueue.close();

  e4RevolutPaymentsRecordedTotal.inc({ currency, tenant_id: tenantId });
  e4OrdersCreatedTotal.inc({ tenant_id: tenantId, payment_method: "REVOLUT", status: "PENDING" });
  e4OrdersValueTotal.inc({ tenant_id: tenantId, currency }, amount);
  e4PaymentsReceivedTotal.inc({
    tenant_id: tenantId,
    source: "REVOLUT",
    reconciliation_status: "PENDING",
  });
  job.log(
    `[A3] paymentId=${paymentId} externalId=${externalId} B7 jobId=${reconcileJob.id ?? "?"}`,
  );

  return {
    ok: true,
    paymentId,
    reconcileJobId: reconcileJob.id ?? `reconcile:${paymentId}`,
    webhookId,
  };
};
