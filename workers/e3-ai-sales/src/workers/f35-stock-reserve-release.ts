/**
 * F35 — stock:reserve:release (CRON '* /5 * * * *')
 *
 * Eliberează rezervările de stoc expirate (expiresAt < NOW()).
 * Setează reservation_state = 'EXPIRED' și decrementează reserved_quantity în inventar.
 * CRON: rulează la fiecare 5 minute.
 * DETERMINISTIC — fără LLM.
 */
import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  stockInventory,
  stockReservations,
  eq,
  and,
  sql,
} from "@cerniq/db";

const LOG = "[f35-stock-reserve-release]";

export interface StockReserveReleaseJobData {
  tenantId?: string;
}

export interface StockReserveReleaseResult {
  ok: true;
  releasedCount: number;
}

export const stockReserveReleaseProcessor: Processor<
  StockReserveReleaseJobData,
  StockReserveReleaseResult
> = async (job) => {
  const { tenantId } = job.data;

  if (tenantId) {
    await setSessionTenantId(tenantId);
  }

  // Găsește rezervările ACTIVE sau RESERVED expirate
  const whereCondition = tenantId
    ? sql`
        ${stockReservations.tenantId} = ${tenantId}::uuid
        AND ${stockReservations.reservationState} IN ('ACTIVE', 'RESERVED')
        AND ${stockReservations.expiresAt} IS NOT NULL
        AND ${stockReservations.expiresAt} < NOW()
      `
    : sql`
        ${stockReservations.reservationState} IN ('ACTIVE', 'RESERVED')
        AND ${stockReservations.expiresAt} IS NOT NULL
        AND ${stockReservations.expiresAt} < NOW()
      `;

  const expiredRows = await db
    .select({
      id: stockReservations.id,
      tenantId: stockReservations.tenantId,
      inventoryId: stockReservations.inventoryId,
      quantity: stockReservations.quantity,
    })
    .from(stockReservations)
    .where(whereCondition);

  if (expiredRows.length === 0) {
    const suffix = tenantId ? ` pentru tenantId=${tenantId}` : "";
    console.info(`${LOG} nicio rezervare expirată${suffix}`);
    return { ok: true, releasedCount: 0 };
  }

  let releasedCount = 0;

  for (const res of expiredRows) {
    // Marchează rezervarea ca EXPIRED
    await db
      .update(stockReservations)
      .set({ reservationState: "EXPIRED" })
      .where(and(eq(stockReservations.tenantId, res.tenantId), eq(stockReservations.id, res.id)));

    // Eliberează cantitatea din inventar (dacă quantity > 0)
    const qty = res.quantity ?? 0;
    if (qty > 0) {
      await db
        .update(stockInventory)
        .set({
          reservedQuantity: sql`GREATEST(${stockInventory.reservedQuantity} - ${qty}, 0)`,
        })
        .where(
          and(eq(stockInventory.tenantId, res.tenantId), eq(stockInventory.id, res.inventoryId)),
        );
    }

    releasedCount += 1;
  }

  console.info(`${LOG} eliberate=${releasedCount}${tenantId ? " tenantId=" + tenantId : ""}`);

  return { ok: true, releasedCount };
};
