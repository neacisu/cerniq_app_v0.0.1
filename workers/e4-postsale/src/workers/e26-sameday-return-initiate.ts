/**
 * e26-sameday-return-initiate.ts — Worker E26: sameday:return:initiate
 *
 * Trigger: enqueue din E24 la fiecare DELIVERY_FAILED (cu verificare count în DB)
 * Scop: verifică dacă numărul de DELIVERY_FAILED >= 3 → inițiază returnarea
 *   1. COUNT goldShipmentTracking WHERE statusCode IN DELIVERY_FAILED variants
 *   2. Dacă count < 3 → skip (prea devreme pentru return)
 *   3. Dacă count >= 3 → UPDATE goldShipments.status = RETURNED
 *   4. UPDATE goldOrders.status = RETURN_PROCESSING
 *   5. Log alert logistică (structurat → monitorizat de alerting)
 * Plan FAZA 8e §IX L2072-2087 — E26, threshold 3×DELIVERY_FAILED
 */
import type { Processor } from "bullmq";
import { createServiceLogger } from "@cerniq/observability";
import {
  db,
  goldOrders,
  goldShipmentTracking,
  goldShipments,
  setSessionTenantId,
  eq,
  and,
  inArray,
  sql,
} from "@cerniq/db";
import { e4ShipmentReturnsTotal } from "../e4-metrics.js";

export type SamedayReturnInitiateJobData = {
  tenantId: string;
  shipmentId: string;
  orderId: string;
};

const DELIVERY_FAILED_CODES: string[] = ["DELIVERY_FAILED", "NOT_DELIVERED", "UNDELIVERED"];
const RETURN_THRESHOLD = 3;

const e26Log = createServiceLogger("e4-e26-sameday-return-initiate", { etapa: "e4" });

export const samedayReturnInitiateProcessor: Processor<SamedayReturnInitiateJobData> = async (
  job,
) => {
  const { tenantId, shipmentId, orderId } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Numărăm evenimentele DELIVERY_FAILED din tracking history
  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(goldShipmentTracking)
    .where(
      and(
        eq(goldShipmentTracking.shipmentId, shipmentId),
        inArray(goldShipmentTracking.statusCode, DELIVERY_FAILED_CODES),
      ),
    )
    .limit(1);

  const failCount = countRow?.count ?? 0;

  if (failCount < RETURN_THRESHOLD) {
    job.log(
      `[E26] Shipment ${shipmentId}: ${failCount}/${RETURN_THRESHOLD} DELIVERY_FAILED — threshold not reached, skip`,
    );
    return;
  }

  // 2. Verificăm că shipmentul nu e deja în stare RETURNED (idempotent)
  const [shipment] = await db
    .select({ id: goldShipments.id, status: goldShipments.status })
    .from(goldShipments)
    .where(eq(goldShipments.id, shipmentId))
    .limit(1);

  if (!shipment) {
    throw new Error(`[E26] Shipment not found: ${shipmentId}`);
  }

  if (shipment.status === "RETURNED") {
    job.log(`[E26] Shipment ${shipmentId} already RETURNED — idempotent skip`);
    return;
  }

  // 3. UPDATE gold_shipments.status = RETURNED
  await db
    .update(goldShipments)
    .set({ status: "RETURNED" })
    .where(eq(goldShipments.id, shipmentId));

  // 4. UPDATE gold_orders.status = RETURN_PROCESSING
  await db
    .update(goldOrders)
    .set({ status: "RETURN_PROCESSING" })
    .where(eq(goldOrders.id, orderId));

  // 5. Alert echipă logistică (monitorizat via CloudWatch / alertmanager)
  e26Log.warn(
    { shipmentId, orderId, tenantId, failCount },
    "sameday_return_initiated_logistics_alert",
  );

  // 6. Metrici
  e4ShipmentReturnsTotal.inc({ tenant_id: tenantId });

  job.log(
    `[E26] Return initiated: shipment ${shipmentId} → RETURNED, order ${orderId} → RETURN_PROCESSING (${failCount} DELIVERY_FAILED)`,
  );
};
