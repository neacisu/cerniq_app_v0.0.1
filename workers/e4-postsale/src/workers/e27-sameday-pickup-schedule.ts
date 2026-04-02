/**
 * e27-sameday-pickup-schedule.ts — Worker E27: sameday:pickup:schedule (CRON 0 14 * * *)
 *
 * Cron: zilnic la 14:00 (pattern "0 14 * * *")
 * Scop: programează colectare curier Sameday pentru expedieri CREATED mai vechi de 2 ore
 *   1. SELECT gold_shipments WHERE status=CREATED AND carrier=SAMEDAY
 *      AND createdAt < NOW() - INTERVAL 2h AND awbNumber IS NOT NULL
 *   2. Batch POST /api/pickup via Sameday API
 *   3. Log confirmare (statusul PICKED_UP va veni prin E23/E24 când curirul confirmă)
 * Plan FAZA 8e §IX L2072-2087 — E27 (pickup schedule 0 14)
 * Anti-halucinare: statusul PICKED_UP NU este setat direct de E27 —
 *   vine organic prin E23 (poll) → E24 (process) când Sameday confirma pickup-ul.
 */
import type { Processor } from "bullmq";
import { db, goldShipments, isNotNull, and, lte, eq } from "@cerniq/db";
import { scheduleSamedayPickup, SAMEDAY_PICKUP_POINT_ID } from "../lib/sameday-client.js";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const MAX_BATCH_SIZE = 100;

export const samedayPickupScheduleProcessor: Processor = async (_job) => {
  // 1. Selectăm expedierile SAMEDAY CREATED mai vechi de 2 ore
  const twoHoursAgo = new Date(Date.now() - TWO_HOURS_MS);

  const pendingShipments = await db
    .select({
      id: goldShipments.id,
      tenantId: goldShipments.tenantId,
      awbNumber: goldShipments.awbNumber,
    })
    .from(goldShipments)
    .where(
      and(
        eq(goldShipments.carrier, "SAMEDAY"),
        eq(goldShipments.status, "CREATED"),
        isNotNull(goldShipments.awbNumber),
        lte(goldShipments.createdAt, twoHoursAgo),
      ),
    )
    .limit(MAX_BATCH_SIZE);

  if (pendingShipments.length === 0) {
    _job.log("[E27] No pending shipments for pickup — skip");
    return;
  }

  const awbNumbers = pendingShipments
    .map((s) => s.awbNumber)
    .filter((n): n is string => n !== null && n !== undefined);

  if (awbNumbers.length === 0) {
    _job.log("[E27] No AWB numbers available — skip");
    return;
  }

  // 2. Programăm pickup via Sameday API
  const today = new Date().toISOString().split("T")[0] ?? new Date().toISOString().substring(0, 10);

  const pickupResponse = await scheduleSamedayPickup({
    pickupPoint: SAMEDAY_PICKUP_POINT_ID,
    awbNumbers,
    pickupDate: today,
  });

  // 3. Logăm confirmarea (statusul PICKED_UP vine organic prin E23/E24)
  _job.log(
    `[E27] Pickup scheduled: ${awbNumbers.length} AWBs, pickupId=${String(pickupResponse.pickupId)}, ` +
      `date=${pickupResponse.scheduledDate ?? today}. ` +
      `Status PICKED_UP will be confirmed via E23 poll.`,
  );

  // 4. Obținem unique tenantIds pentru log multi-tenant
  const tenantIds = [...new Set(pendingShipments.map((s) => s.tenantId))];
  _job.log(
    `[E27] Tenants: ${tenantIds.join(", ")} — ${pendingShipments.length} shipments scheduled`,
  );
};
