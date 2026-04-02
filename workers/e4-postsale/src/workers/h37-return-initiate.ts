/**
 * H37 — return:initiate
 *
 * Responsabilitate (Plan FAZA 8g §IX H37):
 * Inițiere retur — trigger la order RETURNED, creare retur request în goldOrders.
 *
 * Logica:
 * 1. Verifică că order există și are status RETURNED
 * 2. UPDATE goldOrders.status = 'RETURN_PROCESSING'
 * 3. INSERT audit log RETURN_INITIATED
 * 4. Enqueue F30 (stock:return) pentru restituire stoc
 * 5. Enqueue H38 (return:process) pentru procesare completă retur
 */
import type { Processor } from "bullmq";
import { db, goldOrders, goldAuditLogsEtapa4, setSessionTenantId, eq, and } from "@cerniq/db";
import { withCognitiveSpan, createQueue, QUEUES } from "@cerniq/worker-shared";
import { v4 as uuidv4 } from "uuid";

export type ReturnInitiateJobData = {
  tenantId: string;
  orderId: string;
  reason?: string;
  initiatedBy?: string;
  correlationId?: string;
};

export type ReturnInitiateResult = {
  ok: true;
  orderId: string;
  status: string;
};

export const returnInitiateProcessor: Processor<ReturnInitiateJobData> = async (
  job,
): Promise<ReturnInitiateResult> => {
  return withCognitiveSpan(
    "e4:return:initiate",
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
        throw new Error(`[H37] Comanda nu a fost găsită: orderId=${orderId}`);
      }

      // ── 2. UPDATE goldOrders.status = 'RETURN_PROCESSING' ────────────────
      await db
        .update(goldOrders)
        .set({
          status: "RETURN_PROCESSING",
          updatedAt: new Date(),
        })
        .where(and(eq(goldOrders.tenantId, tenantId), eq(goldOrders.id, orderId)));

      // ── 3. Audit log RETURN_INITIATED ─────────────────────────────────────
      await db.insert(goldAuditLogsEtapa4).values({
        id: uuidv4(),
        tenantId,
        actorId: initiatedBy ?? null,
        actorType: initiatedBy ? "USER" : "WORKER",
        eventType: "RETURN_INITIATED",
        entityType: "gold_orders",
        entityId: orderId,
        oldValues: { status: order.status },
        newValues: {
          status: "RETURN_PROCESSING",
          reason,
          initiatedBy,
          orderNumber: order.orderNumber,
        },
        prevHash: null,
        createdAt: new Date(),
      });

      // ── 4. Enqueue F30 (stock:return) ─────────────────────────────────────
      const stockReturnQueue = createQueue(QUEUES.E4_STOCK_RETURN);
      const returnProcessQueue = createQueue(QUEUES.E4_RETURN_PROCESS);

      try {
        await stockReturnQueue.add(
          "stock-return",
          { tenantId, orderId, correlationId: job.data.correlationId },
          { removeOnComplete: true },
        );

        // ── 5. Enqueue H38 (return:process) ───────────────────────────────
        await returnProcessQueue.add(
          "return-process",
          {
            tenantId,
            orderId,
            reason,
            initiatedBy,
            correlationId: job.data.correlationId,
          },
          { removeOnComplete: true },
        );
      } finally {
        await stockReturnQueue.close();
        await returnProcessQueue.close();
      }

      job.log(
        `[H37] Retur inițiat: orderId=${orderId} orderNumber=${order.orderNumber} reason=${reason ?? "N/A"}`,
      );

      return { ok: true, orderId, status: "RETURN_PROCESSING" };
    },
    { tenantId: job.data.tenantId },
  );
};
