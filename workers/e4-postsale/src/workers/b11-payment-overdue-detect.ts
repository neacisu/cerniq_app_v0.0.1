/**
 * B11 — payment:overdue:detect
 *
 * Responsabilitate (plan FAZA 8c §IX B11, Cron L2124):
 * - Cron: 0 9 * * * (zilnic la ora 09:00)
 * - SELECT gold_orders WHERE status IN ('INVOICED','PARTIALLY_PAID')
 *     AND payment_due_at < NOW() - INTERVAL '1 day'
 * - Mark status='OVERDUE'
 * - Enqueue B12 per fiecare comandă restantă
 *
 * Câmpul payment_due_at adăugat în migrația 0047_e4_payment_due_date.sql (FAZA 8c).
 * Default la creare: created_at + 30 zile.
 *
 * Anti-halucinare (D): NU procesează comenzi deja OVERDUE (idempotency).
 */
import type { Processor } from "bullmq";
import {
  and,
  eq,
  inArray,
  lt,
  sql,
  isNotNull,
  db,
  setSessionTenantId,
  goldOrders,
  goldAuditLogsEtapa4,
} from "@cerniq/db";
import { createQueue, QUEUES } from "@cerniq/worker-shared";
import { v4 as uuidv4 } from "uuid";
import { e4OverdueOrdersDetectedTotal } from "../e4-metrics.js";

export type OverdueDetectJobData = Record<string, never>;

export type OverdueDetectResult = {
  ok: true;
  overdueCount: number;
  processedOrderIds: string[];
  tenantId?: string;
};

const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? "4");
/** Interval grație: comandă overdue dacă payment_due_at < NOW() - 1 zi */
const OVERDUE_GRACE_DAYS = 1;

/**
 * Creează processor B11 cu tenant ID opțional.
 * Dacă nu este specificat, procesează toate tenant-urile (cron global).
 */
export function createB11Processor(tenantIdOverride?: string): Processor<OverdueDetectJobData> {
  return async (job): Promise<OverdueDetectResult> => {
    const tenantId = tenantIdOverride ?? process.env.DEFAULT_TENANT_ID?.trim();

    if (tenantId) {
      await setSessionTenantId(tenantId);
    }

    // ── 1. Selectare comenzi overdue ────────────────────────────────────────
    const overdueThreshold = new Date(Date.now() - OVERDUE_GRACE_DAYS * 24 * 60 * 60 * 1000);

    const whereConditions = [
      inArray(goldOrders.status, ["INVOICED", "PARTIALLY_PAID"]),
      isNotNull(goldOrders.paymentDueAt),
      lt(goldOrders.paymentDueAt, overdueThreshold),
      sql`${goldOrders.deletedAt} IS NULL`,
    ];

    // Filtru tenant opțional
    if (tenantId) {
      whereConditions.push(eq(goldOrders.tenantId, tenantId));
    }

    const overdueOrders = await db
      .select({
        id: goldOrders.id,
        tenantId: goldOrders.tenantId,
        orderNumber: goldOrders.orderNumber,
        status: goldOrders.status,
        paymentDueAt: goldOrders.paymentDueAt,
        totalAmount: goldOrders.totalAmount,
        amountPaid: goldOrders.amountPaid,
        currency: goldOrders.currency,
      })
      .from(goldOrders)
      .where(and(...whereConditions))
      .limit(500); // batch maxim per rulare cron

    if (overdueOrders.length === 0) {
      job.log(`[B11] No overdue orders detected`);
      return { ok: true, overdueCount: 0, processedOrderIds: [], tenantId };
    }

    // ── 2. Mark OVERDUE + enqueue B12 ────────────────────────────────────────
    const b12Queue = createQueue(QUEUES.E4_PAYMENT_OVERDUE_ESCALATE, { db: REDIS_DB_E4 });
    const processedIds: string[] = [];

    for (const order of overdueOrders) {
      // Mark status OVERDUE
      await db
        .update(goldOrders)
        .set({ status: "OVERDUE", updatedAt: new Date() })
        .where(
          and(
            eq(goldOrders.id, order.id),
            eq(goldOrders.tenantId, order.tenantId),
            inArray(goldOrders.status, ["INVOICED", "PARTIALLY_PAID"]),
          ),
        );

      // Audit log
      await db.insert(goldAuditLogsEtapa4).values({
        id: uuidv4(),
        tenantId: order.tenantId,
        actorId: null,
        actorType: "CRON",
        eventType: "ORDER_MARKED_OVERDUE",
        entityType: "gold_orders",
        entityId: order.id,
        newValues: {
          previousStatus: order.status,
          newStatus: "OVERDUE",
          paymentDueAt: order.paymentDueAt?.toISOString() ?? null,
          overdueBy: order.paymentDueAt
            ? `${Math.floor((Date.now() - order.paymentDueAt.getTime()) / 86_400_000)} zile`
            : "unknown",
        },
        prevHash: null,
        createdAt: new Date(),
      });

      // Enqueue B12
      const overdueByMs = order.paymentDueAt ? Date.now() - order.paymentDueAt.getTime() : 0;
      const overdueByDays = Math.floor(overdueByMs / 86_400_000);

      await b12Queue.add(
        "escalate",
        {
          orderId: order.id,
          tenantId: order.tenantId,
          orderNumber: order.orderNumber,
          overdueByDays,
          totalAmount: String(order.totalAmount),
          amountPaid: String(order.amountPaid),
          currency: order.currency,
          paymentDueAt: order.paymentDueAt?.toISOString() ?? null,
        },
        { jobId: `b12:${order.id}` },
      );

      e4OverdueOrdersDetectedTotal.inc({ tenant_id: order.tenantId });
      processedIds.push(order.id);
    }

    await b12Queue.close();

    job.log(`[B11] Detected ${overdueOrders.length} overdue orders, enqueued B12 for each`);

    return {
      ok: true,
      overdueCount: overdueOrders.length,
      processedOrderIds: processedIds,
      tenantId,
    };
  };
}
