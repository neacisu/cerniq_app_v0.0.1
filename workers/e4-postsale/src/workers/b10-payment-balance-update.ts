/**
 * B10 — payment:balance:update
 *
 * Responsabilitate (plan FAZA 8c §IX B10 — post-match):
 * - UPDATE gold_orders SET amountPaid = SUM(matched payments), status corect
 * - Status logic: amountPaid >= totalAmount → 'PAID', altfel → 'PARTIALLY_PAID'
 * - INSERT gold_audit_logs_etapa4 cu eventType='PAYMENT_MATCHED'
 * - Dacă fully PAID → enqueue notificare client (coada viitoare — logged)
 *
 * Acesta este finalul flow-ului de reconciliere pentru B7 (Tier1) și B8 (Tier2).
 * B9 (HITL) trigger B10 după decizie manuală via hitl-resume.
 */
import type { Processor } from "bullmq";
import {
  eq,
  and,
  inArray,
  sql,
  db,
  setSessionTenantId,
  goldOrders,
  goldPayments,
  goldAuditLogsEtapa4,
} from "@cerniq/db";
import { v4 as uuidv4 } from "uuid";

export type BalanceUpdateJobData = {
  paymentId: string;
  orderId: string;
  tenantId: string;
  matchType: "EXACT_REFERENCE" | "FUZZY_NAME_AMOUNT" | "MANUAL";
};

export type BalanceUpdateResult = {
  ok: true;
  orderId: string;
  paymentId: string;
  newAmountPaid: string;
  newStatus: "PAID" | "PARTIALLY_PAID";
  wasFullyPaid: boolean;
};

/** Statusuri reconciliere care contorizează ca plăți matched */
const MATCHED_STATUSES = ["MATCHED_EXACT", "MATCHED_FUZZY", "MANUAL_MATCHED"] as const;

export const paymentBalanceUpdateProcessor: Processor<BalanceUpdateJobData> = async (
  job,
): Promise<BalanceUpdateResult> => {
  const { paymentId, orderId, tenantId, matchType } = job.data;

  await setSessionTenantId(tenantId);

  // ── 1. Suma tuturor plăților matched pentru această comandă ────────────────
  // SUM(amount) WHERE orderId = orderId AND reconciliationStatus IN (matched statuses)
  const sumResult = await db
    .select({
      totalPaid: sql<string>`COALESCE(SUM(${goldPayments.amount}), 0)`,
    })
    .from(goldPayments)
    .where(
      and(
        eq(goldPayments.orderId, orderId),
        eq(goldPayments.tenantId, tenantId),
        inArray(goldPayments.reconciliationStatus, [...MATCHED_STATUSES]),
      ),
    );

  const totalPaidRaw = sumResult[0]?.totalPaid ?? "0";
  const totalPaid = Number.parseFloat(totalPaidRaw);

  // ── 2. Citește comanda pentru totalAmount ─────────────────────────────────
  const orderRows = await db
    .select({
      totalAmount: goldOrders.totalAmount,
      currentStatus: goldOrders.status,
    })
    .from(goldOrders)
    .where(and(eq(goldOrders.id, orderId), eq(goldOrders.tenantId, tenantId)))
    .limit(1);

  const order = orderRows[0];
  if (!order) {
    throw new Error(`[B10] Order ${orderId} not found for tenant ${tenantId}`);
  }

  const totalAmount = Number.parseFloat(String(order.totalAmount));
  const wasFullyPaid = totalPaid >= totalAmount;
  const newStatus: "PAID" | "PARTIALLY_PAID" = wasFullyPaid ? "PAID" : "PARTIALLY_PAID";

  // ── 3. UPDATE gold_orders ─────────────────────────────────────────────────
  await db
    .update(goldOrders)
    .set({
      amountPaid: String(totalPaid),
      amountDue: String(Math.max(0, totalAmount - totalPaid)),
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(and(eq(goldOrders.id, orderId), eq(goldOrders.tenantId, tenantId)));

  // ── 4. INSERT audit log PAYMENT_MATCHED ──────────────────────────────────
  const auditId = uuidv4();
  await db.insert(goldAuditLogsEtapa4).values({
    id: auditId,
    tenantId,
    actorId: null,
    actorType: "WORKER",
    eventType: "PAYMENT_MATCHED",
    entityType: "gold_orders",
    entityId: orderId,
    newValues: {
      paymentId,
      matchType,
      newAmountPaid: totalPaid,
      newStatus,
      totalAmount,
    },
    prevHash: null,
    createdAt: new Date(),
  });

  // ── 5. Dacă fully paid → log pentru notificare viitoare ───────────────────
  // NOTE: coada de notificări client (email/WA) va fi definită în FAZA 8d.
  // Comportamentul curent: logăm evenimentul, B10 rămâne idempotent.
  if (wasFullyPaid) {
    job.log(
      `[B10] Order ${orderId} FULLY PAID (${totalPaid}/${totalAmount} RON) — notification enqueue pending FAZA 8d`,
    );
  }

  job.log(
    `[B10] Balance updated: order=${orderId} amountPaid=${totalPaid}/${totalAmount} status=${newStatus} matchType=${matchType}`,
  );

  return {
    ok: true,
    orderId,
    paymentId,
    newAmountPaid: String(totalPaid),
    newStatus,
    wasFullyPaid,
  };
};
