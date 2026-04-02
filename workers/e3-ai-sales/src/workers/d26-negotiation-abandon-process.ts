/**
 * D26 — negotiation:abandon:process (concurrency: 5)
 *
 * Abandonează o negociere: eliberează stocul rezervat și tranziționează spre DEAD.
 * Declanșat de D23 (expire) sau de user/sistem.
 */
import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  goldNegotiations,
  stockReservations,
  stockInventory,
  sql,
  eq,
  and,
} from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS } from "@cerniq/worker-shared";

const LOG = "[d26-negotiation-abandon-process]";

const TERMINAL_STATES = new Set(["DEAD", "PAID"]);

export interface NegotiationAbandonProcessJobData {
  tenantId: string;
  negotiationId: string;
  reason?: string;
  triggeredBy?: "expire" | "user" | "system";
}

export interface NegotiationAbandonProcessResult {
  ok: true;
  negotiationId: string;
  stockReleased: boolean;
  skipped?: boolean;
  reason?: string;
}

export const negotiationAbandonProcessProcessor: Processor<
  NegotiationAbandonProcessJobData,
  NegotiationAbandonProcessResult
> = async (job) => {
  const { tenantId, negotiationId, reason, triggeredBy } = job.data;
  await setSessionTenantId(tenantId);

  const rows = await db
    .select({
      id: goldNegotiations.id,
      currentState: goldNegotiations.currentState,
    })
    .from(goldNegotiations)
    .where(and(eq(goldNegotiations.tenantId, tenantId), eq(goldNegotiations.id, negotiationId)))
    .limit(1);

  if (rows.length === 0) {
    throw new Error(`Negotiation not found: ${negotiationId}`);
  }

  const currentState = rows[0].currentState;

  if (TERMINAL_STATES.has(currentState)) {
    console.info(
      `${LOG} skip: negotiation=${negotiationId} already in terminal state=${currentState}`,
    );
    return { ok: true, negotiationId, stockReleased: false, skipped: true };
  }

  const activeReservations = await db
    .select({
      id: stockReservations.id,
      inventoryId: stockReservations.inventoryId,
      quantity: stockReservations.quantity,
    })
    .from(stockReservations)
    .where(
      and(
        eq(stockReservations.tenantId, tenantId),
        eq(stockReservations.negotiationId, negotiationId),
        eq(stockReservations.reservationState, "ACTIVE"),
      ),
    );

  for (const reservation of activeReservations) {
    await db
      .update(stockReservations)
      .set({ reservationState: "RELEASED" })
      .where(eq(stockReservations.id, reservation.id));

    if (reservation.inventoryId && reservation.quantity !== null && reservation.quantity > 0) {
      await db
        .update(stockInventory)
        .set({
          reservedQuantity: sql`${stockInventory.reservedQuantity} - ${reservation.quantity}`,
        })
        .where(
          and(
            eq(stockInventory.tenantId, tenantId),
            eq(stockInventory.id, reservation.inventoryId),
          ),
        );
    }
  }

  if (activeReservations.length > 0) {
    console.info(
      `${LOG} released ${activeReservations.length} reservations for negotiation=${negotiationId}`,
    );
  }

  const transitionQueue = createQueue("negotiation:state:transition", {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  await transitionQueue.add("negotiation:state:transition", {
    tenantId,
    negotiationId,
    toState: "DEAD",
    reason: reason ?? `Abandoned by ${triggeredBy ?? "system"}`,
  });
  await transitionQueue.close();

  const historyQueue = createQueue("negotiation:history:log", {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  await historyQueue.add("negotiation:history:log", {
    tenantId,
    negotiationId,
    fromState: currentState,
    toState: "DEAD",
    reason: reason ?? `Abandoned by ${triggeredBy ?? "system"}`,
  });
  await historyQueue.close();

  console.info(
    `${LOG} [STUB] ai:sentiment:analyze intent: negotiation=${negotiationId} trigger=abandon`,
  );

  console.info(
    `${LOG} abandoned negotiation=${negotiationId} fromState=${currentState} triggeredBy=${triggeredBy ?? "system"}`,
  );

  return { ok: true, negotiationId, stockReleased: true, reason };
};
