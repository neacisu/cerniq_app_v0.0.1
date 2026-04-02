/**
 * F37 — stock:low:alert (CRON '0 * * * *')
 *
 * Detectează produse cu stoc scăzut (available < low_stock_threshold) sau OUT_OF_STOCK (available=0).
 * Threshold default = 10 unități.
 * CRON: rulează o dată pe oră.
 * STUB: notificarea echipei (email/push) este pending — loghează alert.
 * DETERMINISTIC — fără LLM.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, stockInventory, sql } from "@cerniq/db";

const LOG = "[f37-stock-low-alert]";

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;

export interface StockLowAlertJobData {
  tenantId?: string;
  lowStockThreshold?: number;
}

export interface StockLowAlertItem {
  inventoryId: string;
  tenantId: string;
  productId: string;
  sku: string | null;
  available: number;
  status: "OUT_OF_STOCK" | "LOW_STOCK";
}

export interface StockLowAlertResult {
  ok: true;
  lowStockCount: number;
  outOfStockCount: number;
  alerts: StockLowAlertItem[];
}

export const stockLowAlertProcessor: Processor<StockLowAlertJobData, StockLowAlertResult> = async (
  job,
) => {
  const { tenantId, lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD } = job.data;

  if (tenantId) {
    await setSessionTenantId(tenantId);
  }

  // Interogare: produse cu stoc disponibil ≤ threshold
  // available = total_quantity - COALESCE(reserved_quantity, 0)
  const whereCondition = tenantId
    ? sql`
        ${stockInventory.tenantId} = ${tenantId}::uuid
        AND ${stockInventory.totalQuantity} - COALESCE(${stockInventory.reservedQuantity}, 0) <= ${lowStockThreshold}
      `
    : sql`
        ${stockInventory.totalQuantity} - COALESCE(${stockInventory.reservedQuantity}, 0) <= ${lowStockThreshold}
      `;

  const lowRows = await db
    .select({
      id: stockInventory.id,
      tenantId: stockInventory.tenantId,
      productId: stockInventory.productId,
      sku: stockInventory.sku,
      totalQuantity: stockInventory.totalQuantity,
      reservedQuantity: stockInventory.reservedQuantity,
    })
    .from(stockInventory)
    .where(whereCondition);

  const alerts: StockLowAlertItem[] = lowRows.map((row) => {
    const available = (row.totalQuantity ?? 0) - (row.reservedQuantity ?? 0);
    const status: "OUT_OF_STOCK" | "LOW_STOCK" = available <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK";
    return {
      inventoryId: row.id,
      tenantId: row.tenantId,
      productId: row.productId,
      sku: row.sku,
      available: Math.max(available, 0),
      status,
    };
  });

  const outOfStockCount = alerts.filter((a) => a.status === "OUT_OF_STOCK").length;
  const lowStockCount = alerts.filter((a) => a.status === "LOW_STOCK").length;

  if (alerts.length > 0) {
    for (const alert of alerts) {
      // STUB: înlocuiește cu notificare reală (email/push/webhook) în producție
      console.warn(
        `${LOG} [${alert.status}] tenantId=${alert.tenantId} productId=${alert.productId} sku=${alert.sku ?? "N/A"} available=${alert.available}`,
      );
    }
  } else {
    const tenantSuffix = tenantId ? " tenantId=" + tenantId : "";
    console.info(
      `${LOG} niciun produs cu stoc scăzut${tenantSuffix} threshold=${lowStockThreshold}`,
    );
  }

  return { ok: true, lowStockCount, outOfStockCount, alerts };
};
