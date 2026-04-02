/**
 * F36 — stock:sync:erp (CRON '* /15 * * * *')
 *
 * Sincronizează stocul din ERP extern via UPSERT în stock_inventory.
 * STUB: integrarea cu ERP extern (API call) este pending — procesează items pre-fetch-uite.
 * Dacă nu există items în payload (CRON autonom), loghează STUB și returnează 0 synced.
 * CRON: rulează la fiecare 15 minute.
 * DETERMINISTIC — fără LLM.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, stockInventory, eq, and, sql } from "@cerniq/db";

const LOG = "[f36-stock-sync-erp]";

export interface ErpStockItem {
  sku: string;
  productId: string;
  totalQuantity: number;
  warehouseLocation?: string;
}

export interface StockSyncErpJobData {
  tenantId: string;
  items?: ErpStockItem[];
}

export interface StockSyncErpResult {
  ok: true;
  syncedCount: number;
  note?: string;
}

export const stockSyncErpProcessor: Processor<StockSyncErpJobData, StockSyncErpResult> = async (
  job,
) => {
  const { tenantId, items } = job.data;

  await setSessionTenantId(tenantId);

  if (!items || items.length === 0) {
    // STUB: în producție, va apela ERP API pentru a fetcha stocul
    console.info(`${LOG} STUB tenantId=${tenantId} — integrare ERP externă pending`);
    return { ok: true, syncedCount: 0, note: "erp-sync-stub" };
  }

  let syncedCount = 0;

  for (const item of items) {
    // Check: există deja un rând în stoc pentru (tenantId, productId)?
    const existing = await db
      .select({ id: stockInventory.id })
      .from(stockInventory)
      .where(
        and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.productId, item.productId)),
      )
      .limit(1);

    if (existing.length > 0) {
      // UPDATE: actualizeză totalQuantity și lastSyncAt
      await db
        .update(stockInventory)
        .set({
          totalQuantity: item.totalQuantity,
          sku: item.sku,
          ...(item.warehouseLocation ? { warehouseLocation: item.warehouseLocation } : {}),
          lastSyncAt: sql`NOW()`,
        })
        .where(
          and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.productId, item.productId)),
        );
    } else {
      // INSERT: produs nou în inventar
      await db.insert(stockInventory).values({
        tenantId,
        productId: item.productId,
        sku: item.sku,
        totalQuantity: item.totalQuantity,
        reservedQuantity: 0,
        warehouseLocation: item.warehouseLocation ?? null,
        lastSyncAt: new Date(),
      });
    }

    syncedCount += 1;
  }

  console.info(`${LOG} tenantId=${tenantId} syncedCount=${syncedCount}`);

  return { ok: true, syncedCount };
};
