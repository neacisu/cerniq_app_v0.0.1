/**
 * e24-sameday-status-process.ts — Worker E24: sameday:status:process
 *
 * Trigger: enqueue din E23 la status diferit detectat
 * Scop:
 *   1. INSERT gold_shipment_tracking (eveniment nou)
 *   2. UPDATE gold_shipments.status = internalStatus
 *   3. UPDATE gold_orders.status (pentru tranziții PICKED_UP, DELIVERED)
 *   4. Trigger downstream: E25 (COD) la DELIVERED, E26 (return) la 3×DELIVERY_FAILED
 * Plan FAZA 8e §IX L2072-2087 — E24, status mapping L2084-2086
 */
import type { Processor } from "bullmq";
import {
  db,
  goldOrders,
  goldShipmentTracking,
  goldShipments,
  setSessionTenantId,
  eq,
} from "@cerniq/db";
import { createQueue, QUEUES } from "@cerniq/worker-shared";
import { e4ShipmentStatusChangesTotal } from "../e4-metrics.js";

export type SamedayStatusProcessJobData = {
  tenantId: string;
  shipmentId: string;
  orderId: string;
  awbNumber: string;
  newStatusCode: string;
  internalStatus:
    | "CREATED"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "DELIVERY_FAILED"
    | "RETURNED";
  statusText: string | null;
  locationCity: string | null;
  locationCounty: string | null;
  eventTimestamp: string;
};

const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? process.env.REDIS_DB ?? "4");

type GoldOrderStatusUpdate = "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "SHIPPED";

function resolveOrderStatus(
  internalStatus: SamedayStatusProcessJobData["internalStatus"],
): GoldOrderStatusUpdate | null {
  switch (internalStatus) {
    case "PICKED_UP":
      return "IN_TRANSIT";
    case "IN_TRANSIT":
      return "IN_TRANSIT";
    case "OUT_FOR_DELIVERY":
      return "OUT_FOR_DELIVERY";
    case "DELIVERED":
      return "DELIVERED";
    default:
      return null;
  }
}

export const samedayStatusProcessProcessor: Processor<SamedayStatusProcessJobData> = async (
  job,
) => {
  const {
    tenantId,
    shipmentId,
    orderId,
    internalStatus,
    newStatusCode,
    statusText,
    locationCity,
    locationCounty,
    eventTimestamp,
  } = job.data;

  await setSessionTenantId(tenantId);

  // 1. INSERT gold_shipment_tracking — înregistrăm evenimentul
  await db.insert(goldShipmentTracking).values({
    shipmentId,
    statusCode: newStatusCode,
    statusText: statusText ?? undefined,
    locationCity: locationCity ?? undefined,
    locationCounty: locationCounty ?? undefined,
    eventTimestamp: new Date(eventTimestamp),
  });

  // 2. UPDATE gold_shipments.status
  await db
    .update(goldShipments)
    .set({ status: internalStatus })
    .where(eq(goldShipments.id, shipmentId));

  // 3. UPDATE gold_orders.status (doar pentru tranziții relevante)
  const orderStatus = resolveOrderStatus(internalStatus);
  if (orderStatus) {
    await db.update(goldOrders).set({ status: orderStatus }).where(eq(goldOrders.id, orderId));
  }

  // 4. Trigger downstream
  if (internalStatus === "DELIVERED") {
    const codQueue = createQueue(QUEUES.E4_SAMEDAY_COD_PROCESS, { db: REDIS_DB_E4 });
    try {
      await codQueue.add(
        `cod-process-${shipmentId}`,
        { tenantId, shipmentId, orderId },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 1_000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 100 },
        },
      );
    } finally {
      await codQueue.close();
    }
    job.log(`[E24] DELIVERED → enqueued E25 cod:process for shipment ${shipmentId}`);
  }

  if (internalStatus === "DELIVERY_FAILED") {
    const returnQueue = createQueue(QUEUES.E4_SAMEDAY_RETURN_INITIATE, { db: REDIS_DB_E4 });
    try {
      await returnQueue.add(
        `return-initiate-${shipmentId}`,
        { tenantId, shipmentId, orderId },
        {
          attempts: 2,
          backoff: { type: "fixed", delay: 1_000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 100 },
        },
      );
    } finally {
      await returnQueue.close();
    }
    job.log(
      `[E24] DELIVERY_FAILED → enqueued E26 return:initiate check for shipment ${shipmentId}`,
    );
  }

  // 5. Metrici
  e4ShipmentStatusChangesTotal.inc({ status: internalStatus, tenant_id: tenantId });

  job.log(`[E24] Status processed: shipment ${shipmentId} → ${internalStatus}`);
};
