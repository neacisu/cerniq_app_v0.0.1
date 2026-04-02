/**
 * e23-sameday-status-poll.ts — Worker E23: sameday:status:poll (CRON fiecare 30 min)
 *
 * Cron: la fiecare 30 minute (repeat pattern "star/30 star star star star")
 * Scop: poll global pentru TOATE expedierile SAMEDAY active din DB
 *   → compară statusCode cu ultimul eveniment din gold_shipment_tracking
 *   → dacă statusCode diferit: enqueue E24 (sameday:status:process)
 * Rate limit: 30 req/min (Sameday Business API)
 * Plan FAZA 8e §IX L2072-2087 — E23
 */
import type { Processor } from "bullmq";
import {
  db,
  goldShipmentTracking,
  goldShipments,
  setSessionTenantId,
  eq,
  and,
  inArray,
  isNotNull,
  desc,
} from "@cerniq/db";
import { createQueue, QUEUES } from "@cerniq/worker-shared";
import {
  getSamedayTracking,
  mapSamedayStatus,
  SAMEDAY_TERMINAL_STATUSES,
} from "../lib/sameday-client.js";
import { e4SamedayPollBatchSize } from "../e4-metrics.js";
import type { SamedayStatusProcessJobData } from "./e24-sameday-status-process.js";

const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? process.env.REDIS_DB ?? "4");

type ShipmentStatusActive =
  | "CREATED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERY_FAILED"
  | "DELIVERED"
  | "RETURNED";

const ACTIVE_STATUSES: readonly ShipmentStatusActive[] = [
  "CREATED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILED",
];

// Rate limiter: max 30 req/min → 1 request la fiecare 2.1 secunde (buffer)
const RATE_LIMIT_DELAY_MS = 2_100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const samedayStatusPollProcessor: Processor = async (job) => {
  const statusProcessQueue = createQueue(QUEUES.E4_SAMEDAY_STATUS_PROCESS, { db: REDIS_DB_E4 });

  try {
    // 1. Selectăm toate expedierile SAMEDAY active (cu AWB) din DB
    const samedayShipments = await db
      .select({
        id: goldShipments.id,
        tenantId: goldShipments.tenantId,
        orderId: goldShipments.orderId,
        awbNumber: goldShipments.awbNumber,
        status: goldShipments.status,
      })
      .from(goldShipments)
      .where(
        and(
          eq(goldShipments.carrier, "SAMEDAY"),
          isNotNull(goldShipments.awbNumber),
          inArray(goldShipments.status, ACTIVE_STATUSES),
        ),
      )
      .limit(500);

    job.log(`[E23] Poll batch: ${samedayShipments.length} active SAMEDAY shipments`);

    let enqueued = 0;
    let processed = 0;

    for (const shipment of samedayShipments) {
      const awbNumber = shipment.awbNumber;

      // Guard: isNotNull filtru la nivel DB, dar TypeScript nu știe
      if (!awbNumber) {
        processed++;
        await sleep(RATE_LIMIT_DELAY_MS);
        continue;
      }

      try {
        // 2. Obținem statusul curent de la Sameday API
        const tracking = await getSamedayTracking(awbNumber);
        const currentEvent = tracking.currentStatus;

        if (!currentEvent?.statusCode) {
          processed++;
          await sleep(RATE_LIMIT_DELAY_MS);
          continue;
        }

        const internalStatus = mapSamedayStatus(currentEvent.statusCode);

        // 3. Comparăm cu ultimul statusCode din goldShipmentTracking
        await setSessionTenantId(shipment.tenantId);

        const [lastTracking] = await db
          .select({ statusCode: goldShipmentTracking.statusCode })
          .from(goldShipmentTracking)
          .where(eq(goldShipmentTracking.shipmentId, shipment.id))
          .orderBy(desc(goldShipmentTracking.eventTimestamp))
          .limit(1);

        const lastStatusCode = lastTracking?.statusCode ?? null;

        if (lastStatusCode !== currentEvent.statusCode) {
          // 4. Status s-a schimbat → enqueue E24
          const e24Data: SamedayStatusProcessJobData = {
            tenantId: shipment.tenantId,
            shipmentId: shipment.id,
            orderId: shipment.orderId,
            awbNumber,
            newStatusCode: currentEvent.statusCode,
            internalStatus,
            statusText: currentEvent.statusDescription ?? null,
            locationCity: currentEvent.city ?? null,
            locationCounty: currentEvent.county ?? null,
            eventTimestamp: currentEvent.eventTimestamp,
          };

          await statusProcessQueue.add(`status-process-${shipment.id}`, e24Data, {
            attempts: 3,
            backoff: { type: "exponential", delay: 1_000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 100 },
          });
          enqueued++;
        }

        if (SAMEDAY_TERMINAL_STATUSES.has(internalStatus)) {
          job.log(`[E23] Terminal status ${internalStatus} for shipment ${shipment.id}`);
        }

        processed++;
      } catch (err) {
        job.log(`[E23] Error polling AWB ${awbNumber}: ${String(err)}`);
      }

      // Rate limit: pauză între requesturi
      await sleep(RATE_LIMIT_DELAY_MS);
    }

    // 5. Metrici
    e4SamedayPollBatchSize.observe({ tenant_id: "global" }, samedayShipments.length);
    job.log(`[E23] Poll complete: ${processed} processed, ${enqueued} enqueued for E24`);
  } finally {
    await statusProcessQueue.close();
  }
};
