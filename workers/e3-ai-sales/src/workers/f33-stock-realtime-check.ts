/**
 * F33 — stock:realtime:check (concurrency: 20)
 *
 * Verifică stocul disponibil în timp real via SQL function get_available_stock.
 * Formula: available = total_quantity - SUM(rezervări ACTIVE/RESERVED neexpirate) ≥ 0.
 * Response target: <5ms via SQL function indexată.
 * DETERMINISTIC — fără LLM, fără randomness.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, stockInventory, eq, and, sql } from "@cerniq/db";

const LOG = "[f33-stock-realtime-check]";

export interface StockRealtimeCheckJobData {
  tenantId: string;
  productId?: string;
  sku?: string;
}

export interface StockRealtimeCheckResult {
  ok: true;
  sku: string;
  available: number;
  isOutOfStock: boolean;
}

export const stockRealtimeCheckProcessor: Processor<
  StockRealtimeCheckJobData,
  StockRealtimeCheckResult
> = async (job) => {
  const { tenantId, productId, sku: skuInput } = job.data;

  if (!productId && !skuInput) {
    throw new Error("f33: productId sau sku sunt obligatorii");
  }

  await setSessionTenantId(tenantId);

  let sku = skuInput;

  if (!sku) {
    // Rezolvă SKU-ul din stocul inventarului pe baza productId
    const invRows = await db
      .select({ sku: stockInventory.sku })
      .from(stockInventory)
      .where(
        and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.productId, productId ?? "")),
      )
      .limit(1);

    if (invRows.length === 0 || !invRows[0].sku) {
      throw new Error(`f33: SKU negăsit pentru productId=${productId}`);
    }
    sku = invRows[0].sku;
  }

  // Apel SQL function — citește tenantId din sesiunea RLS setată mai sus
  const execResult = await db.execute(sql`SELECT gold.get_available_stock(${sku})`);
  const rows = (execResult as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
  const available = Number(rows[0]?.get_available_stock ?? 0);
  const isOutOfStock = available === 0;

  console.info(
    `${LOG} tenantId=${tenantId} sku=${sku} available=${available} isOutOfStock=${isOutOfStock}`,
  );

  return { ok: true, sku, available, isOutOfStock };
};
