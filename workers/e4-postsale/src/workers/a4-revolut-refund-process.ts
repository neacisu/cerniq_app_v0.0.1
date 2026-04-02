/**
 * A4 — revolut:refund:process
 *
 * Responsabilitate (plan §IX A4):
 * - Verifică eligibilitate rambursare (sumă, status comandă, politică return)
 * - Apel Revolut API POST /pay (plată inversă cu request_id unic pentru idempotency Revolut)
 * - UPDATE gold_refunds SET revolutRefundId, status='PROCESSING'
 * - La webhook confirmare (eveniment separat): status='COMPLETED' (via A1→A2→A3)
 *
 * Anti-halucinare: Revolut Business API nu are endpoint dedicat /refund în v1.
 * Rambursarea se face prin POST /pay cu receiver = counterparty-ul original.
 * Idempotency Revolut (request_id unic, valabil 2 săptămâni).
 */
import type { Processor } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { db, setSessionTenantId, goldRefunds, goldPayments, goldOrders, eq, and } from "@cerniq/db";
import { createRevolutPayment, getRevolutTransaction } from "../lib/revolut-client.js";

export type RefundProcessJobData = {
  /** ID intrare gold_refunds */
  refundId: string;
  tenantId: string;
};

export type RefundProcessResult =
  | { ok: true; action: "initiated"; refundId: string; revolutPaymentId: string }
  | { ok: false; action: "rejected"; refundId: string; reason: string };

/** Status-uri comandă eligibile pentru rambursare */
const REFUND_ELIGIBLE_ORDER_STATUSES = new Set([
  "DELIVERED",
  "RETURNED",
  "RETURN_PROCESSING",
  "PAID",
]);

export const revolutRefundProcessProcessor: Processor<RefundProcessJobData> = async (
  job,
): Promise<RefundProcessResult> => {
  const { refundId, tenantId } = job.data;

  await setSessionTenantId(tenantId);

  // ── 1. Fetch gold_refunds ────────────────────────────────────────────────
  const refundRows = await db
    .select()
    .from(goldRefunds)
    .where(and(eq(goldRefunds.id, refundId), eq(goldRefunds.tenantId, tenantId)))
    .limit(1);

  const refund = refundRows[0];
  if (!refund) {
    throw new Error(`[A4] Refund not found: refundId=${refundId}`);
  }

  if (refund.status !== "APPROVED") {
    return {
      ok: false,
      action: "rejected",
      refundId,
      reason: `refund_status_not_approved:${refund.status}`,
    };
  }

  // ── 2. Fetch gold_payments asociat rambursării ───────────────────────────
  const paymentRows = await db
    .select()
    .from(goldPayments)
    .where(and(eq(goldPayments.id, refund.paymentId), eq(goldPayments.tenantId, tenantId)))
    .limit(1);

  const payment = paymentRows[0];
  if (!payment) {
    throw new Error(`[A4] Payment not found: paymentId=${refund.paymentId}`);
  }

  // ── 3. Verifică eligibilitate comandă ────────────────────────────────────
  if (refund.orderId) {
    const orderRows = await db
      .select()
      .from(goldOrders)
      .where(and(eq(goldOrders.id, refund.orderId), eq(goldOrders.tenantId, tenantId)))
      .limit(1);

    const order = orderRows[0];
    if (!order) {
      throw new Error(`[A4] Order not found: orderId=${refund.orderId}`);
    }

    if (!REFUND_ELIGIBLE_ORDER_STATUSES.has(order.status)) {
      return {
        ok: false,
        action: "rejected",
        refundId,
        reason: `order_status_not_eligible:${order.status}`,
      };
    }
  }

  // ── 4. Verificare sumă eligibilă ─────────────────────────────────────────
  const refundAmount = Number.parseFloat(String(refund.amount));
  const originalAmount = Number.parseFloat(String(payment.amount));

  if (refundAmount > originalAmount) {
    return {
      ok: false,
      action: "rejected",
      refundId,
      reason: `refund_amount_exceeds_payment:${refundAmount}>=${originalAmount}`,
    };
  }

  // ── 5. Identificare counterparty Revolut din tranzacția originală ────────
  if (!payment.externalId) {
    throw new Error(`[A4] Payment ${payment.id} has no externalId (Revolut transaction ID)`);
  }

  const originalTx = await getRevolutTransaction(payment.externalId);
  const counterpartyId = originalTx.counterparty?.id;

  if (!counterpartyId) {
    throw new Error(
      `[A4] Cannot determine Revolut counterparty for transaction ${payment.externalId}`,
    );
  }

  // ── 6. Apel Revolut POST /pay — plată inversă (rambursare) ───────────────
  const requestId = uuidv4(); // idempotency Revolut (valabil 2 săptămâni)
  const REVOLUT_ACCOUNT_ID = process.env.REVOLUT_ACCOUNT_ID?.trim();

  if (!REVOLUT_ACCOUNT_ID) {
    throw new Error("[A4] Missing env REVOLUT_ACCOUNT_ID");
  }

  const revolutPayment = await createRevolutPayment({
    request_id: requestId,
    account_id: REVOLUT_ACCOUNT_ID,
    receiver: {
      counterparty_id: counterpartyId,
    },
    amount: refundAmount,
    currency: payment.currency,
    reference: `Rambursare #${refundId.slice(0, 8)}`,
  });

  // ── 7. UPDATE gold_refunds → status PROCESSING + revolutRefundId ─────────
  await db
    .update(goldRefunds)
    .set({
      revolutRefundId: revolutPayment.id,
      status: "PROCESSING",
      updatedAt: new Date(),
    })
    .where(eq(goldRefunds.id, refundId));

  job.log(
    `[A4] Refund initiated: refundId=${refundId} revolutPaymentId=${revolutPayment.id} amount=${refundAmount} ${payment.currency}`,
  );

  return {
    ok: true,
    action: "initiated",
    refundId,
    revolutPaymentId: revolutPayment.id,
  };
};
