/**
 * d21-credit-limit-release.ts — Worker D21: Eliberare rezervare credit
 *
 * Trigger: order:paid sau order:cancelled
 *
 * FLUX (Plan FAZA 8d §IX L2060):
 *   - order:paid   → status='USED'     (creditUsed rămâne — plata e finalizată)
 *   - order:cancelled → status='RELEASED' → creditUsed -= amount (credit recuperat)
 *
 * Idempotency: dacă rezervarea nu mai e ACTIVE → return early.
 */
import type { Processor } from "bullmq";
import { createServiceLogger } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import {
  db,
  goldCreditProfiles,
  goldCreditReservations,
  setSessionTenantId,
  sql,
  eq,
  and,
} from "@cerniq/db";
import { e4CreditReservationsTotal } from "../e4-metrics.js";

const d21Log = createServiceLogger("e4-d21-credit-limit-release", { etapa: "e4" });

export type CreditLimitReleaseJobData = {
  tenantId: string;
  orderId: string;
  profileId: string;
  trigger: "order:paid" | "order:cancelled";
  correlationId?: string;
};

export const creditLimitReleaseProcessor: Processor<CreditLimitReleaseJobData> = async (job) => {
  return withCognitiveSpan(
    "e4:credit:limit:release",
    async (_span) => {
      const { tenantId, orderId, profileId, trigger } = job.data;
      await setSessionTenantId(tenantId);

      // ── Caută rezervarea ACTIVE ────────────────────────────────────────────
      const reservations = await db
        .select({
          id: goldCreditReservations.id,
          amount: goldCreditReservations.amount,
          status: goldCreditReservations.status,
        })
        .from(goldCreditReservations)
        .where(
          and(
            eq(goldCreditReservations.profileId, profileId),
            eq(goldCreditReservations.orderId, orderId),
          ),
        )
        .limit(1);

      if (reservations.length === 0) {
        d21Log.warn({ orderId, profileId }, "credit_reservation_release_no_row");
        return { ok: true, status: "no_reservation", orderId };
      }

      const reservation = reservations[0];
      if (!reservation) {
        return { ok: true, status: "no_reservation", orderId };
      }

      if (reservation.status !== "ACTIVE") {
        d21Log.info(
          { reservationId: reservation.id, status: reservation.status },
          "credit_reservation_release_already_processed",
        );
        return { ok: true, status: "already_processed", reservationId: reservation.id };
      }

      const newStatus = trigger === "order:paid" ? "USED" : "RELEASED";

      // ── UPDATE reservation ────────────────────────────────────────────────
      await db
        .update(goldCreditReservations)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(goldCreditReservations.id, reservation.id));

      // ── order:cancelled → decrement creditUsed ────────────────────────────
      if (trigger === "order:cancelled") {
        const amount = Number(reservation.amount);
        await db
          .update(goldCreditProfiles)
          .set({
            creditUsed: sql`GREATEST(0, ${goldCreditProfiles.creditUsed} - ${String(amount)})`,
            updatedAt: new Date(),
          })
          .where(eq(goldCreditProfiles.id, profileId));

        e4CreditReservationsTotal.inc({ action: "release", tenant_id: tenantId });

        d21Log.info({ reservationId: reservation.id, amount }, "credit_reservation_released");
      } else {
        e4CreditReservationsTotal.inc({ action: "used", tenant_id: tenantId });

        d21Log.info({ reservationId: reservation.id }, "credit_reservation_marked_used");
      }

      return {
        ok: true,
        status: newStatus.toLowerCase(),
        reservationId: reservation.id,
        orderId,
        trigger,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
