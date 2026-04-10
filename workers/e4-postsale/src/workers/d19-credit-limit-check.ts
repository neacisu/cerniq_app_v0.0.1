/**
 * d19-credit-limit-check.ts — Worker D19: Verificare limită credit la order:created
 *
 * FLUX (Plan FAZA 8d §IX L2058):
 * 1. SELECT gold_credit_profiles WHERE clientId = order.leadId
 * 2. Verifică creditUsed + orderAmount <= creditLimit
 * 3. APPROVED → enqueue D20 (credit:limit:reserve)
 * 4. REJECTED → log + nu blochează comanda (WARN — decizie business)
 *
 * NOTE: D19 este pe CRITICAL path (la order:created). Concurrency=20.
 * Edge case: dacă nu există credit profile → APPROVED cu warning (client nou,
 * C13 va crea profileul async).
 *
 * Anti-halucinare: NU blocare comandă la REJECTED (business decision — nu arhitectural).
 */
import type { Processor } from "bullmq";
import { createServiceLogger } from "@cerniq/observability";
import { QUEUES, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { db, goldCreditProfiles, setSessionTenantId, eq, and } from "@cerniq/db";
import { e4CreditLimitChecksTotal } from "../e4-metrics.js";

const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? process.env.REDIS_DB ?? "4");

const d19Log = createServiceLogger("e4-d19-credit-limit-check", { etapa: "e4" });

export type CreditLimitCheckJobData = {
  tenantId: string;
  orderId: string;
  clientId: string;
  orderAmount: number;
  correlationId?: string;
};

export const creditLimitCheckProcessor: Processor<CreditLimitCheckJobData> = async (job) => {
  return withCognitiveSpan(
    "e4:credit:limit:check",
    async (_span) => {
      const { tenantId, orderId, clientId, orderAmount } = job.data;
      await setSessionTenantId(tenantId);

      // ── 1. Caută profilul de credit al clientului ─────────────────────────
      const profiles = await db
        .select({
          id: goldCreditProfiles.id,
          creditLimit: goldCreditProfiles.creditLimit,
          creditUsed: goldCreditProfiles.creditUsed,
          riskTier: goldCreditProfiles.riskTier,
        })
        .from(goldCreditProfiles)
        .where(
          and(eq(goldCreditProfiles.tenantId, tenantId), eq(goldCreditProfiles.clientId, clientId)),
        )
        .limit(1);

      // ── Edge case: client fără profil credit (creat async de C13) ─────────
      if (profiles.length === 0) {
        d19Log.warn({ clientId }, "credit_limit_check_no_profile_approve_async");
        e4CreditLimitChecksTotal.inc({ result: "approved_no_profile", tenant_id: tenantId });
        return { ok: true, result: "approved_no_profile", orderId, clientId };
      }

      const profile = profiles[0];
      if (!profile) {
        e4CreditLimitChecksTotal.inc({ result: "approved_no_profile", tenant_id: tenantId });
        return { ok: true, result: "approved_no_profile", orderId, clientId };
      }

      const creditLimit = Number(profile.creditLimit);
      const creditUsed = Number(profile.creditUsed);
      const available = creditLimit - creditUsed;

      // ── 2. Verifică dacă există credit suficient ───────────────────────────
      if (orderAmount > available) {
        d19Log.warn(
          { clientId, orderAmount, available, creditLimit, creditUsed },
          "credit_limit_check_rejected",
        );
        e4CreditLimitChecksTotal.inc({ result: "rejected", tenant_id: tenantId });

        return {
          ok: true,
          result: "rejected",
          orderId,
          clientId,
          orderAmount,
          creditLimit,
          creditUsed,
          available,
          riskTier: profile.riskTier,
        };
      }

      // ── 3. APPROVED → enqueue D20 ─────────────────────────────────────────
      const reserveQueue = createQueue(QUEUES.E4_CREDIT_LIMIT_RESERVE, { db: REDIS_DB_E4 });
      await reserveQueue.add(
        "credit:limit:reserve",
        {
          tenantId,
          orderId,
          clientId,
          profileId: profile.id,
          orderAmount,
          correlationId: job.data.correlationId,
        },
        { jobId: `d20:${orderId}` },
      );
      await reserveQueue.close();

      e4CreditLimitChecksTotal.inc({ result: "approved", tenant_id: tenantId });

      d19Log.info({ clientId, orderAmount, available }, "credit_limit_check_approved_enqueued_d20");

      return {
        ok: true,
        result: "approved",
        orderId,
        clientId,
        orderAmount,
        creditLimit,
        creditUsed,
        available,
        riskTier: profile.riskTier,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
