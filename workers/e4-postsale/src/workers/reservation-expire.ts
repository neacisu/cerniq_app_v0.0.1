/**
 * reservation-expire.ts — CRON Worker: Expirare rezervări stale (each 15 min)
 *
 * Selectează rezervările ACTIVE cu expiresAt < NOW() și le marchează EXPIRED.
 * Decrementează creditUsed din profilul de credit asociat.
 *
 * Anti-halucinare (Plan F): Expiry persistent în DB — NU TTL Redis.
 * Cron pattern: "each-15-min" adică fiecare 15 minute (Plan L2126)
 */
import type { Processor } from "bullmq";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, goldCreditProfiles, goldCreditReservations, sql, eq, and, lt } from "@cerniq/db";
import { e4CreditReservationsTotal } from "../e4-metrics.js";

export const reservationExpireProcessor: Processor = async (_job) => {
  return withCognitiveSpan(
    "e4:reservation:expire",
    async (_span) => {
      const now = new Date();

      // Selectează rezervările expirate în batch de max 200
      const expired = await db
        .select({
          id: goldCreditReservations.id,
          profileId: goldCreditReservations.profileId,
          amount: goldCreditReservations.amount,
        })
        .from(goldCreditReservations)
        .where(
          and(
            eq(goldCreditReservations.status, "ACTIVE"),
            lt(goldCreditReservations.expiresAt, now),
          ),
        )
        .limit(200);

      if (expired.length === 0) {
        return { ok: true, expired: 0 };
      }

      let expiredCount = 0;
      for (const res of expired) {
        await db
          .update(goldCreditReservations)
          .set({ status: "EXPIRED", updatedAt: new Date() })
          .where(eq(goldCreditReservations.id, res.id));

        const amount = Number(res.amount);
        await db
          .update(goldCreditProfiles)
          .set({
            creditUsed: sql`GREATEST(0, ${goldCreditProfiles.creditUsed} - ${String(amount)})`,
            updatedAt: new Date(),
          })
          .where(eq(goldCreditProfiles.id, res.profileId));

        expiredCount++;
      }

      e4CreditReservationsTotal.inc({ action: "expire", tenant_id: "cron" });

      console.info(`[CRON reservation:expire] Expired ${expiredCount} stale reservations (batch)`);

      return { ok: true, expired: expiredCount };
    },
    {},
  );
};
