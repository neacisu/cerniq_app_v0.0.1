/**
 * G44 — oblio:stock:sync (CRON * /30 * * * *)
 *
 * Sincronizare bidirecțională stoc Oblio ↔ stock_inventory.
 * stock_inventory este source of truth.
 * CRON: rulează la fiecare 30 de minute.
 *
 * ANTI-HALUCINARE:
 *   - stock_inventory este source of truth (NU Oblio)
 *   - oblioClient.syncStock este STUB — NU face apel HTTP real
 *   - tenantId obligatoriu pentru tenant isolation
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, stockInventory, eq } from "@cerniq/db";
import { oblioClient } from "../lib/oblio-client.js";

const LOG = "[g44-oblio-stock-sync]";

export interface OblioStockSyncJobData {
  tenantId: string;
}

export interface OblioStockSyncResult {
  ok: true;
  syncedCount: number;
  note: string;
}

export const oblioStockSyncProcessor: Processor<
  OblioStockSyncJobData,
  OblioStockSyncResult
> = async (job) => {
  const { tenantId } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Fetch stoc curent din stock_inventory (source of truth)
  const inventoryRows = await db
    .select({
      sku: stockInventory.sku,
      totalQuantity: stockInventory.totalQuantity,
      reservedQuantity: stockInventory.reservedQuantity,
    })
    .from(stockInventory)
    .where(eq(stockInventory.tenantId, tenantId));

  if (inventoryRows.length === 0) {
    console.info(`${LOG} tenantId=${tenantId} niciun produs în inventar`);
    return { ok: true, syncedCount: 0, note: "no-inventory" };
  }

  // 2. Pregătește items pentru Oblio (stoc disponibil = total - rezervat)
  const oblioItems = inventoryRows
    .filter((row) => row.sku !== null)
    .map((row) => ({
      sku: String(row.sku),
      quantity: Math.max((row.totalQuantity ?? 0) - (row.reservedQuantity ?? 0), 0),
    }));

  // 3. Apel Oblio API — sync (STUB)
  const syncResult = await oblioClient.syncStock(tenantId, oblioItems);

  console.info(
    `${LOG} tenantId=${tenantId} items=${oblioItems.length} synced=${syncResult.synced} note=${syncResult.note}`,
  );

  return { ok: true, syncedCount: syncResult.synced, note: syncResult.note };
};
