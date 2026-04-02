/**
 * d20-credit-limit-reserve.ts — Worker D20: Rezervare limită credit
 *
 * FLUX (Plan FAZA 8d §IX L2059):
 * 1. INSERT gold_credit_reservations (ACTIVE, expiresAt=+72h default)
 * 2. UPDATE gold_credit_profiles.creditUsed += orderAmount
 *
 * Idempotency: jobId = "d20:{orderId}" → execuție unică per comandă.
 * Edge case: dacă rezervarea există deja → return early (idempotent).
 *
 * Expiry: CRON (each 15 min) expiră rezervările stale (Plan L2125-2126).
 * NU TTL Redis — persistent în DB (anti-halucinare Plan F).
 */
import type { Processor } from "bullmq";
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

const RESERVATION_TTL_HOURS = Number(process.env.CREDIT_RESERVATION_TTL_HOURS ?? "72");

export type CreditLimitReserveJobData = {
  tenantId: string;
  orderId: string;
  clientId: string;
  profileId: string;
  orderAmount: number;
  correlationId?: string;
};

export const creditLimitReserveProcessor: Processor<CreditLimitReserveJobData> = async (job) => {
  return withCognitiveSpan(
    "e4:credit:limit:reserve",
    async (_span) => {
      const { tenantId, orderId, profileId, orderAmount } = job.data;
      await setSessionTenantId(tenantId);

      // ── Idempotency: verifică dacă rezervarea există deja ─────────────────
      const existing = await db
        .select({ id: goldCreditReservations.id })
        .from(goldCreditReservations)
        .where(
          and(
            eq(goldCreditReservations.profileId, profileId),
            eq(goldCreditReservations.orderId, orderId),
          ),
        )
        .limit(1);

      if (existing.length > 0 && existing[0]) {
        console.info(
          `[D20] Reservation already exists: reservationId=${existing[0].id}, orderId=${orderId}`,
        );
        return { ok: true, status: "already_reserved", reservationId: existing[0].id };
      }

      const expiresAt = new Date(Date.now() + RESERVATION_TTL_HOURS * 60 * 60 * 1000);

      // ── 1. INSERT gold_credit_reservations ────────────────────────────────
      const inserted = await db
        .insert(goldCreditReservations)
        .values({
          profileId,
          orderId,
          amount: String(orderAmount),
          status: "ACTIVE",
          expiresAt,
        })
        .returning({ id: goldCreditReservations.id });

      const reservation = inserted[0];
      if (!reservation) {
        throw new Error(`[D20] Failed to insert credit reservation for orderId=${orderId}`);
      }

      // ── 2. UPDATE creditUsed += orderAmount ───────────────────────────────
      await db
        .update(goldCreditProfiles)
        .set({
          creditUsed: sql`${goldCreditProfiles.creditUsed} + ${String(orderAmount)}`,
          updatedAt: new Date(),
        })
        .where(eq(goldCreditProfiles.id, profileId));

      e4CreditReservationsTotal.inc({ action: "reserve", tenant_id: tenantId });

      console.info(
        `[D20] Reservation created: reservationId=${reservation.id}, orderId=${orderId}, amount=${orderAmount}, expiresAt=${expiresAt.toISOString()}`,
      );

      return {
        ok: true,
        status: "reserved",
        reservationId: reservation.id,
        orderId,
        orderAmount,
        expiresAt,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
