/**
 * F34 — stock:reserve:create (concurrency: 10) CRITICAL ANTI-OVERSELL
 *
 * Creează o rezervare de stoc cu TRANSACTION ISOLATION SERIALIZABLE.
 * Previne oversell prin SELECT ... FOR UPDATE + verificare disponibilitate în tranzacție.
 * TTL per stare: PROPOSAL=30min, NEGOTIATION=2h, CLOSING=24h, PROFORMA_SENT=7d.
 * DETERMINISTIC — fără LLM.
 */
import type { Processor } from "bullmq";
import { randomUUID } from "node:crypto";
import { db, stockInventory, stockReservations, eq, and, sql } from "@cerniq/db";

const LOG = "[f34-stock-reserve-create]";

export interface StockReserveCreateJobData {
  tenantId: string;
  inventoryId: string;
  negotiationId: string;
  quantity: number;
  negotiationState: string;
}

export interface StockReserveCreateResult {
  ok: true;
  reservationId: string;
  inventoryId: string;
  quantity: number;
  expiresAt: string | null;
}

export class OversellPreventionError extends Error {
  constructor(inventoryId: string, available: number, requested: number) {
    super(
      `OVERSELL_PREVENTED: disponibil=${available} < solicitat=${requested} pentru inventory=${inventoryId}`,
    );
    this.name = "OversellPreventionError";
  }
}

/** TTL per stare de negociere, conform plan L1729+L1757 și SQL get_reservation_ttl */
export const RESERVATION_TTL_MS: Record<string, number> = {
  PROPOSAL: 30 * 60 * 1000, // 30 min
  NEGOTIATION: 2 * 60 * 60 * 1000, // 2h
  CLOSING: 24 * 60 * 60 * 1000, // 24h
  PROFORMA_SENT: 7 * 24 * 60 * 60 * 1000, // 7d
};

/**
 * Calculează timestamp-ul de expirare pe baza stării de negociere.
 * Stări necunoscute primesc 1h TTL ca fallback defensiv.
 */
export function computeExpiresAt(negotiationState: string): Date {
  const ttlMs = RESERVATION_TTL_MS[negotiationState] ?? 60 * 60 * 1000;
  return new Date(Date.now() + ttlMs);
}

export const stockReserveCreateProcessor: Processor<
  StockReserveCreateJobData,
  StockReserveCreateResult
> = async (job) => {
  const { tenantId, inventoryId, negotiationId, quantity, negotiationState } = job.data;

  if (quantity <= 0) {
    throw new Error(`f34: quantity trebuie să fie > 0, primit=${quantity}`);
  }

  const { reservationId, expiresAt } = await db.transaction(
    async (tx) => {
      // Setare context RLS în interiorul tranzacției
      await tx.execute(sql`SET LOCAL app.current_tenant_id = ${tenantId}`);

      // SELECT ... FOR UPDATE — blochează rândul pentru anti-oversell SERIALIZABLE
      const invRows = await tx
        .select({
          id: stockInventory.id,
          totalQuantity: stockInventory.totalQuantity,
          reservedQuantity: stockInventory.reservedQuantity,
        })
        .from(stockInventory)
        .where(and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.id, inventoryId)))
        .limit(1)
        .for("update");

      if (invRows.length === 0) {
        throw new Error(`f34: inventory ${inventoryId} negăsit`);
      }

      const inv = invRows[0];
      const available = inv.totalQuantity - (inv.reservedQuantity ?? 0);

      if (available < quantity) {
        throw new OversellPreventionError(inventoryId, available, quantity);
      }

      const txExpiresAt = computeExpiresAt(negotiationState);
      const txReservationId = randomUUID();

      // INSERT rezervare activă cu TTL
      await tx.insert(stockReservations).values({
        id: txReservationId,
        tenantId,
        inventoryId,
        negotiationId,
        quantity,
        reservationState: "ACTIVE",
        expiresAt: txExpiresAt,
      });

      // UPDATE stoc rezervat (incrementare atomică)
      await tx
        .update(stockInventory)
        .set({
          reservedQuantity: sql`${stockInventory.reservedQuantity} + ${quantity}`,
        })
        .where(and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.id, inventoryId)));

      return { reservationId: txReservationId, expiresAt: txExpiresAt };
    },
    { isolationLevel: "serializable" },
  );

  const expiresIso = expiresAt.toISOString();

  console.info(
    `${LOG} reserved negotiation=${negotiationId} inventory=${inventoryId} qty=${quantity} state=${negotiationState} expiresAt=${expiresIso ?? "none"}`,
  );

  return {
    ok: true,
    reservationId,
    inventoryId,
    quantity,
    expiresAt: expiresIso,
  };
};
