/**
 * g35-contract-status-poll.ts — Worker G35 (CRON): Polling status DocuSign
 *
 * Schedule: `0 1 * * *` (zilnic 01:00) — Plan FAZA 8f, Cron L2129 (anti-halucinare E)
 *
 * FLUX:
 * 1. SELECT gold_contracts WHERE status='SENT_DOCUSIGN' AND expiresAt > NOW()
 * 2. GET DocuSign /envelopes/{envelopeId} → check status
 * 3. Dacă status='signed'/'completed' → enqueue G36
 * 4. Dacă status='declined'/'voided' → UPDATE status='CANCELLED'
 * 5. Dacă expiresAt < NOW() + 24h → alert ContractExpirySoon (metric + log)
 * 6. Dacă expiresAt < NOW() (deja expirat) → UPDATE status='EXPIRED'
 *
 * Rate limit DocuSign: 1000 req/h — la poll zilnic nu este o problemă pentru
 * volume normal de contracte (< 100/zi)
 */
import type { Job, Processor } from "bullmq";
import { createServiceLogger } from "@cerniq/observability";
import { createQueue, QUEUES, withCognitiveSpan } from "@cerniq/worker-shared";
import { db, goldContracts, setSessionTenantId, eq, and, sql, lt } from "@cerniq/db";
import { e4ContractExpiryAlertsTotal } from "../e4-metrics.js";
import { getDocuSignEnvelopeStatus, type DocuSignEnvelopeStatus } from "../lib/docusign-client.js";

const REDIS_DB_E4 = Number(process.env["REDIS_DB_E4"] ?? process.env["REDIS_DB"] ?? "4");

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const g35Log = createServiceLogger("e4-g35-contract-status-poll", { etapa: "e4" });

const DOCUSIGN_SIGNED_STATUSES: ReadonlySet<DocuSignEnvelopeStatus> = new Set([
  "signed",
  "completed",
]);

const DOCUSIGN_CANCELLED_STATUSES: ReadonlySet<DocuSignEnvelopeStatus> = new Set([
  "declined",
  "voided",
]);

type G35ContractRow = {
  id: string;
  tenantId: string;
  docusignEnvelopeId: string | null;
  expiresAt: Date | null;
};

type G35PollDelta = { signed: number; cancelled: number; expired: number; expirySoon: number };

async function pollOneG35Contract(
  job: Pick<Job, "log">,
  contract: G35ContractRow,
  now: Date,
): Promise<G35PollDelta> {
  const { id: contractId, tenantId, docusignEnvelopeId, expiresAt } = contract;

  if (!docusignEnvelopeId) {
    job.log(`[G35] Skip contract ${contractId}: no docusignEnvelopeId`);
    return { signed: 0, cancelled: 0, expired: 0, expirySoon: 0 };
  }

  await setSessionTenantId(tenantId);

  try {
    const envelopeStatus = await getDocuSignEnvelopeStatus(docusignEnvelopeId);
    const status = envelopeStatus.status;

    if (DOCUSIGN_SIGNED_STATUSES.has(status)) {
      const signedQueue = createQueue(QUEUES.E4_CONTRACT_SIGNED_PROCESS, { db: REDIS_DB_E4 });

      await signedQueue.add(
        "signed:process",
        { tenantId, contractId, envelopeId: docusignEnvelopeId },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 3000 },
          jobId: `contract:signed:${contractId}`,
        },
      );
      await signedQueue.close();

      job.log(
        `[G35] Contract signed — enqueued G36: contractId=${contractId}, envelopeId=${docusignEnvelopeId}`,
      );
      return { signed: 1, cancelled: 0, expired: 0, expirySoon: 0 };
    }

    if (DOCUSIGN_CANCELLED_STATUSES.has(status)) {
      await db
        .update(goldContracts)
        .set({
          status: "CANCELLED",
          docusignStatus: status,
          updatedAt: new Date(),
        })
        .where(and(eq(goldContracts.id, contractId), eq(goldContracts.tenantId, tenantId)));

      job.log(`[G35] Contract cancelled (${status}): contractId=${contractId}`);
      return { signed: 0, cancelled: 1, expired: 0, expirySoon: 0 };
    }

    if (expiresAt && expiresAt < now) {
      await db
        .update(goldContracts)
        .set({ status: "EXPIRED", docusignStatus: status, updatedAt: new Date() })
        .where(and(eq(goldContracts.id, contractId), eq(goldContracts.tenantId, tenantId)));

      job.log(`[G35] Contract EXPIRED: contractId=${contractId}`);
      return { signed: 0, cancelled: 0, expired: 1, expirySoon: 0 };
    }

    if (expiresAt && expiresAt.getTime() - now.getTime() < TWENTY_FOUR_HOURS_MS) {
      e4ContractExpiryAlertsTotal.inc({ tenant_id: tenantId });
      g35Log.warn(
        { contractId, tenantId, expiresAt: expiresAt.toISOString() },
        "contract_expiry_soon",
      );
      return { signed: 0, cancelled: 0, expired: 0, expirySoon: 1 };
    }
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    g35Log.warn({ err: e, contractId, tenantId }, "contract_status_poll_item_failed");
    job.log(`[G35] Error polling contract ${contractId}: ${String(err)}`);
  }

  return { signed: 0, cancelled: 0, expired: 0, expirySoon: 0 };
}

export type ContractStatusPollJobData = Record<string, never>;

export const contractStatusPollProcessor: Processor<ContractStatusPollJobData> = async (job) => {
  return withCognitiveSpan(
    "e4:contract:status:poll",
    async (_span) => {
      const now = new Date();

      // ── 1. SELECT toate contractele SENT_DOCUSIGN cu expiresAt > NOW() ───
      // Grupăm pe tenant pentru setSessionTenantId corect
      const contracts = await db
        .select({
          id: goldContracts.id,
          tenantId: goldContracts.tenantId,
          docusignEnvelopeId: goldContracts.docusignEnvelopeId,
          expiresAt: goldContracts.expiresAt,
        })
        .from(goldContracts)
        .where(
          and(eq(goldContracts.status, "SENT_DOCUSIGN"), sql`${goldContracts.expiresAt} > NOW()`),
        );

      job.log(`[G35] Polling ${contracts.length} SENT_DOCUSIGN contracts`);

      let processed = 0;
      let signed = 0;
      let expired = 0;
      let expirySoon = 0;
      let cancelled = 0;

      for (const contract of contracts) {
        const delta = await pollOneG35Contract(job, contract, now);
        signed += delta.signed;
        cancelled += delta.cancelled;
        expired += delta.expired;
        expirySoon += delta.expirySoon;
        processed++;
      }

      // ── 7. Mark EXPIRED contractele cu expiresAt < NOW() ─────────────────
      // (care nu au fost prinse în loop de mai sus deoarece query-ul inițial
      //  filtrează expiresAt > NOW() — nu vor apărea, deci facem un batch update)
      const expiredNow = await db
        .update(goldContracts)
        .set({ status: "EXPIRED", updatedAt: new Date() })
        .where(
          and(eq(goldContracts.status, "SENT_DOCUSIGN"), lt(goldContracts.expiresAt, new Date())),
        )
        .returning({ id: goldContracts.id });

      if (expiredNow.length > 0) {
        job.log(`[G35] Auto-expired ${expiredNow.length} contracts past expiresAt`);
      }

      return {
        ok: true,
        processed,
        signed,
        expired: expired + expiredNow.length,
        expirySoon,
        cancelled,
      };
    },
    {},
  );
};
