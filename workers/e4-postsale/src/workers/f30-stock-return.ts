/**
 * F30 — stock:return
 *
 * Responsabilitate (Plan FAZA 8g §IX F30):
 * Trigger la order RETURNED — reverse deduct stock (restituire cantitate).
 *
 * Logica:
 * 1. Preia items din goldOrderItems WHERE orderId
 * 2. UPDATE goldProducts.metadata.stockCount += quantity per produs (reverse)
 * 3. INSERT audit log STOCK_RETURNED
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
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { v4 as uuidv4 } from "uuid";
import { e4StockReturnsTotal } from "../e4-metrics.js";

export type StockReturnJobData = {
  tenantId: string;
  orderId: string;
  correlationId?: string;
};

export type StockReturnResult = {
  ok: true;
  orderId: string;
  returnedProducts: number;
};

export const stockReturnProcessor: Processor<StockReturnJobData> = async (
  job,
): Promise<StockReturnResult> => {
  return withCognitiveSpan(
    "e4:stock:return",
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
        job.log(`[F30] Niciun item pentru orderId=${orderId} — skip return`);
        return { ok: true, orderId, returnedProducts: 0 };
      }

      let returnedProducts = 0;

      for (const item of items) {
        if (!item.productId) continue;

        const productRows = await db
          .select({
            id: goldProducts.id,
            metadata: goldProducts.metadata,
          })
          .from(goldProducts)
          .where(and(eq(goldProducts.tenantId, tenantId), eq(goldProducts.id, item.productId)))
          .limit(1);

        const product = productRows[0];
        if (!product) {
          job.log(`[F30] Produs nu găsit: productId=${item.productId} — skip`);
          continue;
        }

        const meta = (product.metadata as Record<string, unknown>) ?? {};
        const currentStock = typeof meta.stockCount === "number" ? meta.stockCount : 0;
        const newStock = currentStock + item.quantity;

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

        returnedProducts++;
        e4StockReturnsTotal.inc({ tenant_id: tenantId });
        job.log(
          `[F30] Stoc restituit: productId=${product.id} stock: ${currentStock} → ${newStock}`,
        );
      }

      // ── 3. Audit log STOCK_RETURNED ───────────────────────────────────────
      await db.insert(goldAuditLogsEtapa4).values({
        id: uuidv4(),
        tenantId,
        actorId: null,
        actorType: "WORKER",
        eventType: "STOCK_RETURNED",
        entityType: "gold_orders",
        entityId: orderId,
        newValues: {
          orderId,
          returnedProducts,
          itemCount: items.length,
        },
        prevHash: null,
        createdAt: new Date(),
      });

      job.log(
        `[F30] Stock return complet: orderId=${orderId} returnedProducts=${returnedProducts}`,
      );

      return { ok: true, orderId, returnedProducts };
    },
    { tenantId: job.data.tenantId },
  );
};
