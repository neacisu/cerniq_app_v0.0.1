/**
 * F38 — stock:replenish:request (concurrency: 5)
 *
 * Creează o cerere de reaprovizionare pentru un produs cu stoc scăzut.
 * Verifică existența inventarului și calculează stocul curent disponibil.
 * STUB: tabelul replenishment_requests nu există încă — loghează cererea.
 * DETERMINISTIC — fără LLM.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, stockInventory, eq, and, sql } from "@cerniq/db";

const LOG = "[f38-stock-replenish-request]";

export interface StockReplenishRequestJobData {
  tenantId: string;
  inventoryId: string;
  requestedQuantity: number;
  requestedBy: string;
  reason?: string;
}

export interface StockReplenishRequestResult {
  ok: true;
  inventoryId: string;
  requestedQuantity: number;
  currentAvailable: number;
  note: string;
}

export const stockReplenishRequestProcessor: Processor<
  StockReplenishRequestJobData,
  StockReplenishRequestResult
> = async (job) => {
  const { tenantId, inventoryId, requestedQuantity, requestedBy, reason } = job.data;

  if (requestedQuantity <= 0) {
    throw new Error(`f38: requestedQuantity trebuie să fie > 0, primit=${requestedQuantity}`);
  }

  await setSessionTenantId(tenantId);

  // Verifică existența inventarului și calculează stocul disponibil
  const invRows = await db
    .select({
      id: stockInventory.id,
      sku: stockInventory.sku,
      totalQuantity: stockInventory.totalQuantity,
      reservedQuantity: stockInventory.reservedQuantity,
    })
    .from(stockInventory)
    .where(and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.id, inventoryId)))
    .limit(1);

  if (invRows.length === 0) {
    throw new Error(`f38: inventory ${inventoryId} negăsit pentru tenantId=${tenantId}`);
  }

  const inv = invRows[0];
  const currentAvailable = Math.max((inv.totalQuantity ?? 0) - (inv.reservedQuantity ?? 0), 0);

  // STUB: INSERT în replenishment_requests (tabelul va fi creat în FAZA 8)
  // În producție: db.insert(replenishmentRequests).values({ tenantId, inventoryId, requestedQuantity, ... })
  console.info(
    `${LOG} STUB tenantId=${tenantId} inventory=${inventoryId} sku=${inv.sku ?? "N/A"} ` +
      `requestedQty=${requestedQuantity} currentAvailable=${currentAvailable} ` +
      `requestedBy=${requestedBy} reason=${reason ?? "N/A"}`,
  );

  // Raportare SQL: stoc curent pentru audit trail
  const availResult = await db.execute(sql`SELECT gold.get_available_stock(${inv.sku ?? ""})`);
  const availRows = (availResult as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
  const confirmedAvailable = inv.sku
    ? Number(availRows[0]?.get_available_stock ?? currentAvailable)
    : currentAvailable;

  return {
    ok: true,
    inventoryId,
    requestedQuantity,
    currentAvailable: confirmedAvailable,
    note: "replenish-request-stub",
  };
};
