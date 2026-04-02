/**
 * D21 — negotiation:items:update (concurrency: 10)
 *
 * Upsert sau delete items de negociere.
 * Triggerul update_negotiation_total() recalculează totalValue automat.
 */
import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  goldNegotiations,
  negotiationItems,
  eq,
  and,
  inArray,
} from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS } from "@cerniq/worker-shared";
import { randomUUID } from "node:crypto";

const LOG = "[d21-negotiation-items-update]";

const TERMINAL_STATES = new Set(["DEAD", "PAID"]);

export interface NegotiationItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
}

export interface NegotiationItemsUpdateJobData {
  tenantId: string;
  negotiationId: string;
  action: "upsert" | "delete";
  items?: NegotiationItemInput[];
  itemIdsToDelete?: string[];
}

export interface NegotiationItemsUpdateResult {
  ok: true;
  negotiationId: string;
  itemsUpdated: number;
}

export const negotiationItemsUpdateProcessor: Processor<
  NegotiationItemsUpdateJobData,
  NegotiationItemsUpdateResult
> = async (job) => {
  const { tenantId, negotiationId, action, items, itemIdsToDelete } = job.data;
  await setSessionTenantId(tenantId);

  const existing = await db
    .select({ id: goldNegotiations.id, currentState: goldNegotiations.currentState })
    .from(goldNegotiations)
    .where(and(eq(goldNegotiations.tenantId, tenantId), eq(goldNegotiations.id, negotiationId)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(`Negotiation not found: ${negotiationId}`);
  }

  const currentState = existing[0].currentState;
  if (TERMINAL_STATES.has(currentState)) {
    throw new Error(
      `Cannot update items: negotiation ${negotiationId} is in terminal state ${currentState}`,
    );
  }

  let itemsUpdated = 0;

  if (action === "delete" && itemIdsToDelete && itemIdsToDelete.length > 0) {
    await db
      .delete(negotiationItems)
      .where(
        and(
          eq(negotiationItems.tenantId, tenantId),
          eq(negotiationItems.negotiationId, negotiationId),
          inArray(negotiationItems.id, itemIdsToDelete),
        ),
      );
    itemsUpdated = itemIdsToDelete.length;
    console.info(`${LOG} deleted ${itemsUpdated} items negotiation=${negotiationId}`);
  }

  if (action === "upsert" && items && items.length > 0) {
    const marginQueue = createQueue("pricing:margin:check", {
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });

    for (const item of items) {
      const lineTotal = (item.unitPrice * item.quantity * (1 - item.discountPct / 100)).toFixed(2);

      await db.insert(negotiationItems).values({
        id: randomUUID(),
        tenantId,
        negotiationId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        discountPct: String(item.discountPct),
        lineTotal,
      });

      marginQueue
        .add("pricing:margin:check", {
          tenantId,
          productId: item.productId,
          unitPrice: item.unitPrice,
          discountPct: item.discountPct,
        })
        .catch((err: unknown) => {
          console.warn(
            `${LOG} margin check enqueue failed (non-blocking): ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    }

    await marginQueue.close();
    itemsUpdated = items.length;
    console.info(`${LOG} upserted ${itemsUpdated} items negotiation=${negotiationId}`);
  }

  return { ok: true, negotiationId, itemsUpdated };
};
