/**
 * F29 — stock:deduct
 *
 * Responsabilitate (Plan FAZA 8g §IX F29):
 * Trigger la order DELIVERED — deduct stock per produs din goldOrderItems.
 *
 * Logica:
 * 1. SELECT goldOrderItems WHERE orderId (tabela dedicată)
 * 2. UPDATE goldProducts.metadata.stockCount -= quantity per produs
 * 3. Dacă stockCount < lowStockThreshold → enqueue F31 alert
 * 4. INSERT audit log STOCK_DEDUCTED
 */
import type { Processor } from "bullmq";
import {
  db,
  goldProducts,
  goldOrderItems,
  goldAuditLogsEtapa4,
  setSessionTenantId,
  sql,
  eq,
  and,
} from "@cerniq/db";
import { withCognitiveSpan, createQueue, QUEUES } from "@cerniq/worker-shared";
import { v4 as uuidv4 } from "uuid";
import { e4StockDeductionsTotal } from "../e4-metrics.js";

export type StockDeductJobData = {
  tenantId: string;
  orderId: string;
  correlationId?: string;
};

export type StockDeductResult = {
  ok: true;
  orderId: string;
  deductedProducts: number;
  lowStockAlerts: number;
};

/** Default threshold stoc scăzut dacă nu este setat per produs */
const DEFAULT_LOW_STOCK_THRESHOLD = 10;

export const stockDeductProcessor: Processor<StockDeductJobData> = async (
  job,
): Promise<StockDeductResult> => {
  return withCognitiveSpan(
    "e4:stock:deduct",
    async (_span) => {
      const { tenantId, orderId } = job.data;
      await setSessionTenantId(tenantId);

      // ── 1. Obține order items din goldOrderItems ──────────────────────────
      const items = await db
        .select({
          productId: goldOrderItems.productId,
          quantity: goldOrderItems.quantity,
        })
        .from(goldOrderItems)
        .where(eq(goldOrderItems.orderId, orderId));

      if (items.length === 0) {
        job.log(`[F29] Niciun item pentru orderId=${orderId} — skip deduct`);
        return { ok: true, orderId, deductedProducts: 0, lowStockAlerts: 0 };
      }

      let deductedProducts = 0;
      let lowStockAlerts = 0;

      const alertQueue = createQueue(QUEUES.E4_STOCK_LOW_ALERT);

      try {
        for (const item of items) {
          if (!item.productId) continue;

          const productRows = await db
            .select({
              id: goldProducts.id,
              sku: goldProducts.sku,
              metadata: goldProducts.metadata,
            })
            .from(goldProducts)
            .where(and(eq(goldProducts.tenantId, tenantId), eq(goldProducts.id, item.productId)))
            .limit(1);

          const product = productRows[0];
          if (!product) {
            job.log(`[F29] Produs nu găsit: productId=${item.productId} — skip`);
            continue;
          }

          const meta = (product.metadata as Record<string, unknown>) ?? {};
          const currentStock = typeof meta.stockCount === "number" ? meta.stockCount : 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          const threshold =
            typeof meta.lowStockThreshold === "number"
              ? meta.lowStockThreshold
              : DEFAULT_LOW_STOCK_THRESHOLD;

          await db
            .update(goldProducts)
            .set({
              metadata: sql`jsonb_set(
                COALESCE(${goldProducts.metadata}, '{}'::jsonb),
                '{stockCount}',
                ${JSON.stringify(newStock)}::jsonb
              )`,
              updatedAt: new Date(),
            })
            .where(eq(goldProducts.id, product.id));

          deductedProducts++;
          e4StockDeductionsTotal.inc({ tenant_id: tenantId });

          // ── 3. Dacă stoc scăzut → enqueue F31 alert ──────────────────────
          if (newStock < threshold) {
            await alertQueue.add(
              "stock-low-alert",
              {
                tenantId,
                productId: product.id,
                sku: product.sku ?? undefined,
                currentStock: newStock,
                threshold,
                orderId,
              },
              { removeOnComplete: true },
            );
            lowStockAlerts++;
            job.log(
              `[F29] Stoc scăzut: productId=${product.id} stock=${newStock} < threshold=${threshold} → enqueue F31`,
            );
          }
        }
      } finally {
        await alertQueue.close();
      }

      // ── 4. Audit log STOCK_DEDUCTED ───────────────────────────────────────
      await db.insert(goldAuditLogsEtapa4).values({
        id: uuidv4(),
        tenantId,
        actorId: null,
        actorType: "WORKER",
        eventType: "STOCK_DEDUCTED",
        entityType: "gold_orders",
        entityId: orderId,
        newValues: {
          orderId,
          deductedProducts,
          lowStockAlerts,
          itemCount: items.length,
        },
        prevHash: null,
        createdAt: new Date(),
      });

      job.log(
        `[F29] Stock deduct complet: orderId=${orderId} deducted=${deductedProducts} alerts=${lowStockAlerts}`,
      );

      return { ok: true, orderId, deductedProducts, lowStockAlerts };
    },
    { tenantId: job.data.tenantId },
  );
};
