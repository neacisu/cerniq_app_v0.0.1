/**
 * e22-sameday-awb-create.ts — Worker E22: sameday:awb:create
 *
 * Trigger: order:ready (enqueue din API/order service)
 * Scop: creare AWB via Sameday API + INSERT gold_shipments + UPDATE gold_orders
 * Plan FAZA 8e §IX L2072-2087 — E22
 */
import type { Processor } from "bullmq";
import { db, goldAddresses, goldOrders, goldShipments, setSessionTenantId, eq } from "@cerniq/db";
import { createSamedayAwb, SAMEDAY_PICKUP_POINT_ID } from "../lib/sameday-client.js";
import { e4ShipmentsCreatedTotal } from "../e4-metrics.js";

export type SamedayAwbCreateJobData = {
  tenantId: string;
  orderId: string;
  addressId: string;
  deliveryType: "STANDARD" | "EXPRESS" | "LOCKER";
  codAmount: number;
  packageWeight?: number;
  correlationId?: string;
};

export type SamedayAwbCreateResult = {
  ok: true;
  awbNumber: string;
  shipmentId: string;
};

export const samedayAwbCreateProcessor: Processor<
  SamedayAwbCreateJobData,
  SamedayAwbCreateResult
> = async (job) => {
  const { tenantId, orderId, addressId, deliveryType, codAmount, packageWeight } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Citim datele comenzii (orderNumber pentru referință curier)
  const [order] = await db
    .select({
      id: goldOrders.id,
      orderNumber: goldOrders.orderNumber,
      totalAmount: goldOrders.totalAmount,
    })
    .from(goldOrders)
    .where(eq(goldOrders.id, orderId))
    .limit(1);

  if (!order) {
    throw new Error(`[E22] Order not found: orderId=${orderId}`);
  }

  // 2. Citim adresa de livrare
  const [address] = await db
    .select({
      id: goldAddresses.id,
      street: goldAddresses.street,
      city: goldAddresses.city,
      county: goldAddresses.county,
      postalCode: goldAddresses.postalCode,
      country: goldAddresses.country,
      contactName: goldAddresses.contactName,
      contactPhone: goldAddresses.contactPhone,
    })
    .from(goldAddresses)
    .where(eq(goldAddresses.id, addressId))
    .limit(1);

  if (!address) {
    throw new Error(`[E22] Address not found: addressId=${addressId}`);
  }

  if (!address.contactPhone) {
    throw new Error(`[E22] Address missing contactPhone: addressId=${addressId}`);
  }

  // 3. Creare AWB via Sameday API
  const awbResponse = await createSamedayAwb({
    pickupPoint: SAMEDAY_PICKUP_POINT_ID,
    service: deliveryType,
    packageType: 0,
    packageNumber: 1,
    packageWeight: packageWeight ?? 1,
    awbPayment: codAmount > 0 ? 1 : 0,
    cashOnDelivery: Math.max(codAmount, 0),
    recipient: {
      name: address.contactName ?? "Client",
      phone: address.contactPhone,
      address: address.street ?? address.city,
      city: address.city,
      county: address.county ?? "",
      postalCode: address.postalCode ?? "",
    },
    observation: `Comanda ${order.orderNumber}`,
    clientReference: order.orderNumber,
  });

  // 4. INSERT gold_shipments
  const [shipment] = await db
    .insert(goldShipments)
    .values({
      tenantId,
      orderId,
      awbNumber: awbResponse.awbNumber,
      carrier: "SAMEDAY",
      status: "CREATED",
      deliveryType,
      codType: codAmount > 0 ? "CASH" : "NONE",
      codAmount: String(codAmount),
      samedayParcelId: String(awbResponse.parcelId),
      trackingUrl: `https://sameday.ro/tracking/${awbResponse.awbNumber}`,
      labelPdfUrl: awbResponse.labelUrl ?? null,
      weight: packageWeight ? String(packageWeight) : null,
      addressId,
    })
    .returning({ id: goldShipments.id });

  if (!shipment) {
    throw new Error("[E22] Failed to insert gold_shipments");
  }

  // 5. UPDATE gold_orders: shipmentId + status READY_TO_SHIP
  await db
    .update(goldOrders)
    .set({ shipmentId: shipment.id, status: "READY_TO_SHIP" })
    .where(eq(goldOrders.id, orderId));

  // 6. Metrici
  e4ShipmentsCreatedTotal.inc({ carrier: "SAMEDAY", tenant_id: tenantId });

  job.log(`[E22] AWB created: ${awbResponse.awbNumber}, shipmentId: ${shipment.id}`);

  return { ok: true, awbNumber: awbResponse.awbNumber, shipmentId: shipment.id };
};
