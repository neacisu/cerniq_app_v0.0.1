/**
 * e25-sameday-cod-process.ts — Worker E25: sameday:cod:process
 *
 * Trigger: enqueue din E24 la DELIVERED (pentru expedieri cu COD)
 * Scop:
 *   1. Verifică dacă codAmount > 0 și codCollected = false (idempotent)
 *   2. INSERT gold_cod_collections
 *   3. UPDATE gold_shipments.codCollected = true
 *   4. UPDATE gold_orders.amountPaid += codAmount (dacă fully paid → status = 'PAID')
 * Plan FAZA 8e §IX L2072-2087 — E25
 */
import type { Processor } from "bullmq";
import {
  db,
  goldCodCollections,
  goldOrders,
  goldShipments,
  setSessionTenantId,
  eq,
  and,
  inArray,
  sql,
} from "@cerniq/db";
import { e4CodCollectionsTotal } from "../e4-metrics.js";

export type SamedayCodProcessJobData = {
  tenantId: string;
  shipmentId: string;
  orderId: string;
};

export const samedayCodProcessProcessor: Processor<SamedayCodProcessJobData> = async (job) => {
  const { tenantId, shipmentId, orderId } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Citim shipmentul — verificăm că are COD și nu a fost deja colectat
  const [shipment] = await db
    .select({
      id: goldShipments.id,
      codType: goldShipments.codType,
      codAmount: goldShipments.codAmount,
      codCollected: goldShipments.codCollected,
    })
    .from(goldShipments)
    .where(
      and(
        eq(goldShipments.id, shipmentId),
        inArray(goldShipments.codType, ["CASH", "CARD"] as Array<"NONE" | "CASH" | "CARD">),
      ),
    )
    .limit(1);

  if (!shipment) {
    job.log(`[E25] Shipment ${shipmentId} has no COD — skip`);
    return;
  }

  if (shipment.codCollected) {
    job.log(`[E25] COD already collected for shipment ${shipmentId} — idempotent skip`);
    return;
  }

  const codAmount = Number(shipment.codAmount);
  if (codAmount <= 0) {
    job.log(`[E25] codAmount=0 for shipment ${shipmentId} — skip`);
    return;
  }

  // 2. INSERT gold_cod_collections
  await db.insert(goldCodCollections).values({
    shipmentId,
    amount: String(codAmount),
    collectedAt: new Date(),
    transferredToAccount: false,
  });

  // 3. UPDATE gold_shipments.codCollected = true + actualDelivery
  await db
    .update(goldShipments)
    .set({ codCollected: true, actualDelivery: new Date() })
    .where(eq(goldShipments.id, shipmentId));

  // 4. UPDATE gold_orders: amountPaid += codAmount
  const [order] = await db
    .select({
      id: goldOrders.id,
      totalAmount: goldOrders.totalAmount,
      amountPaid: goldOrders.amountPaid,
    })
    .from(goldOrders)
    .where(eq(goldOrders.id, orderId))
    .limit(1);

  if (order) {
    const newAmountPaid = Number(order.amountPaid ?? 0) + codAmount;
    const totalAmount = Number(order.totalAmount ?? 0);
    const isFullyPaid = newAmountPaid >= totalAmount && totalAmount > 0;

    await db
      .update(goldOrders)
      .set({
        amountPaid: sql`${goldOrders.amountPaid} + ${codAmount}`,
        ...(isFullyPaid ? { status: "PAID" } : {}),
      })
      .where(eq(goldOrders.id, orderId));

    job.log(
      `[E25] COD ${codAmount} RON collected for order ${orderId}. ` +
        `amountPaid: ${newAmountPaid}/${totalAmount} RON. ` +
        `${isFullyPaid ? "→ PAID" : "→ partial payment"}`,
    );
  }

  // 5. Metrici
  e4CodCollectionsTotal.inc({ tenant_id: tenantId });
};
