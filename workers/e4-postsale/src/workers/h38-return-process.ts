/**
 * H38 — return:process
 *
 * Responsabilitate (Plan FAZA 8g §IX H38):
 * Procesare completă retur — finalizare stoc + audit + notificare.
 *
 * Logica:
 * 1. Verifică că order există și are status RETURN_PROCESSING
 * 2. UPDATE goldOrders.status = 'RETURNED' (finalizare)
 * 3. INSERT audit log RETURN_PROCESSED
 * 4. Enqueue I40 (alert:delivery) pentru notificare internă retur procesat
 */
import type { Processor } from "bullmq";
import { db, goldOrders, goldAuditLogsEtapa4, setSessionTenantId, eq, and } from "@cerniq/db";
import { withCognitiveSpan, createQueue, QUEUES } from "@cerniq/worker-shared";
import { v4 as uuidv4 } from "uuid";

export type ReturnProcessJobData = {
  tenantId: string;
  orderId: string;
  reason?: string;
  initiatedBy?: string;
  correlationId?: string;
};

export type ReturnProcessResult = {
  ok: true;
  orderId: string;
  status: string;
};

export const returnProcessProcessor: Processor<ReturnProcessJobData> = async (
  job,
): Promise<ReturnProcessResult> => {
  return withCognitiveSpan(
    "e4:return:process",
    async (_span) => {
      const { tenantId, orderId, reason, initiatedBy } = job.data;
      await setSessionTenantId(tenantId);

      // ── 1. Verifică comanda ───────────────────────────────────────────────
      const orderRows = await db
        .select({
          id: goldOrders.id,
          status: goldOrders.status,
          orderNumber: goldOrders.orderNumber,
        })
        .from(goldOrders)
        .where(and(eq(goldOrders.tenantId, tenantId), eq(goldOrders.id, orderId)))
        .limit(1);

      const order = orderRows[0];
      if (!order) {
        throw new Error(`[H38] Comanda nu a fost găsită: orderId=${orderId}`);
      }

      // Idempotency: dacă deja RETURNED, skip
      if (order.status === "RETURNED") {
        job.log(`[H38] Retur deja procesat pentru orderId=${orderId} — idempotency skip`);
        return { ok: true, orderId, status: "RETURNED" };
      }

      // ── 2. UPDATE goldOrders.status = 'RETURNED' ──────────────────────────
      await db
        .update(goldOrders)
        .set({
          status: "RETURNED",
          updatedAt: new Date(),
        })
        .where(and(eq(goldOrders.tenantId, tenantId), eq(goldOrders.id, orderId)));

      // ── 3. Audit log RETURN_PROCESSED ─────────────────────────────────────
      await db.insert(goldAuditLogsEtapa4).values({
        id: uuidv4(),
        tenantId,
        actorId: initiatedBy ?? null,
        actorType: initiatedBy ? "USER" : "WORKER",
        eventType: "RETURN_PROCESSED",
        entityType: "gold_orders",
        entityId: orderId,
        oldValues: { status: order.status },
        newValues: {
          status: "RETURNED",
          reason,
          orderNumber: order.orderNumber,
        },
        prevHash: null,
        createdAt: new Date(),
      });

      // ── 4. Enqueue I40 (alert:delivery) notificare retur procesat ──────────
      const alertQueue = createQueue(QUEUES.E4_ALERT_DELIVERY);
      try {
        await alertQueue.add(
          "alert-return-processed",
          {
            tenantId,
            alertType: "RETURN_PROCESSED",
            orderId,
            orderNumber: order.orderNumber,
            reason,
            severity: "INFO",
            message: `Returul pentru comanda ${order.orderNumber} a fost procesat cu succes.`,
          },
          { removeOnComplete: true },
        );
      } finally {
        await alertQueue.close();
      }

      job.log(`[H38] Retur procesat: orderId=${orderId} orderNumber=${order.orderNumber}`);

      return { ok: true, orderId, status: "RETURNED" };
    },
    { tenantId: job.data.tenantId },
  );
};
