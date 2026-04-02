/**
 * F31 — stock:low:alert
 *
 * Responsabilitate (Plan FAZA 8g §IX F31):
 * Alertă stoc scăzut — threshold per produs, enqueue alert I43.
 *
 * Logica:
 * 1. Primește productId + currentStock + threshold (enqueue din F29 sau direct)
 * 2. INSERT audit log STOCK_LOW_ALERT
 * 3. Enqueue I43 (alert:stock) pentru notificare
 * 4. Incrementează metrica e4StockAlertsTotal
 */
import type { Processor } from "bullmq";
import { db, goldAuditLogsEtapa4, setSessionTenantId } from "@cerniq/db";
import { withCognitiveSpan, createQueue, QUEUES } from "@cerniq/worker-shared";
import { v4 as uuidv4 } from "uuid";
import { e4StockAlertsTotal } from "../e4-metrics.js";

export type StockLowAlertJobData = {
  tenantId: string;
  productId: string;
  sku?: string;
  currentStock: number;
  threshold: number;
  orderId?: string;
  correlationId?: string;
};

export type StockLowAlertResult = {
  ok: true;
  productId: string;
  alertDispatched: boolean;
};

export const stockLowAlertProcessor: Processor<StockLowAlertJobData> = async (
  job,
): Promise<StockLowAlertResult> => {
  return withCognitiveSpan(
    "e4:stock:low:alert",
    async (_span) => {
      const { tenantId, productId, sku, currentStock, threshold, orderId } = job.data;
      await setSessionTenantId(tenantId);

      job.log(
        `[F31] Stoc scăzut detectat: productId=${productId} sku=${sku ?? "N/A"} stock=${currentStock} threshold=${threshold}`,
      );

      // ── 1. Audit log STOCK_LOW_ALERT ───────────────────────────────────────
      await db.insert(goldAuditLogsEtapa4).values({
        id: uuidv4(),
        tenantId,
        actorId: null,
        actorType: "WORKER",
        eventType: "STOCK_LOW_ALERT",
        entityType: "gold_products",
        entityId: productId,
        newValues: {
          productId,
          sku,
          currentStock,
          threshold,
          orderId,
          alert: "LOW_STOCK",
        },
        prevHash: null,
        createdAt: new Date(),
      });

      // ── 2. Enqueue I43 (alert:stock) pentru notificare internă ─────────────
      const alertQueue = createQueue(QUEUES.E4_ALERT_STOCK);
      try {
        await alertQueue.add(
          "alert-stock-low",
          {
            tenantId,
            alertType: "STOCK_LOW",
            productId,
            sku,
            currentStock,
            threshold,
            orderId,
            severity: currentStock === 0 ? "CRITICAL" : "WARNING",
            message:
              currentStock === 0
                ? `Produsul ${sku ?? productId} este epuizat (stoc=0).`
                : `Stoc scăzut pentru produsul ${sku ?? productId}: ${currentStock} < ${threshold}.`,
          },
          { removeOnComplete: true },
        );
      } finally {
        await alertQueue.close();
      }

      e4StockAlertsTotal.inc({ tenant_id: tenantId });
      job.log(
        `[F31] Alert dispatched pentru productId=${productId} stock=${currentStock} threshold=${threshold}`,
      );

      return { ok: true, productId, alertDispatched: true };
    },
    { tenantId: job.data.tenantId },
  );
};
