/**
 * g40-association-cui-lookup.ts — Worker G40: CUI Lookup via Termene.ro (FAZA 9g)
 *
 * Queue: association:cui:lookup | Timeout: 60s | Concurrency: 3 | Redis DB: 5
 *
 * Responsabilitate:
 *   - Verifică CUI-ul unei asociații via Termene.ro API
 *   - CUI 404 (inexistent) → isActive=false
 *   - CUI valid → INSERT goldAffiliations pentru goldCompanies cu același CUI
 *   - Enqueue G41 (association:member:match)
 *
 * Anti-halucin. FAZA 9g:
 *   (A) callTermeneFirma definit LOCAL — NU importat din workers/enrichment
 *   (B) Circuit breaker cu createCircuitBreaker
 *   (C) TERMENE_API_KEY lipsă → skip grațios
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldAssociations,
  goldAffiliations,
  goldCompanies,
  eq,
  and,
  setSessionTenantId,
} from "@cerniq/db";
import {
  QUEUES,
  createWorker,
  createQueue,
  withCognitiveSpan,
  createCircuitBreaker,
  withExternalApiMetrics,
} from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Termene.ro — client local (NU importat din workers/enrichment)
// ---------------------------------------------------------------------------

const TERMENE_API_URL = process.env.TERMENE_API_URL ?? "https://api.termene.ro/v2";
const TERMENE_API_KEY = process.env.TERMENE_API_KEY ?? "";
const TERMENE_TIMEOUT_MS = Number(process.env.TERMENE_API_TIMEOUT_MS ?? "20000");

async function callTermeneFirma(cui: string): Promise<Record<string, unknown> | null> {
  if (!TERMENE_API_KEY) return null;
  const response = await fetch(`${TERMENE_API_URL}/firme/${encodeURIComponent(cui)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${TERMENE_API_KEY}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(TERMENE_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Termene API error: ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface AssociationCuiLookupJobData {
  tenantId: string;
  associationId: string;
  correlationId?: string;
}

export interface AssociationCuiLookupResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  cuiVerified?: boolean;
  matched?: boolean;
  termeneDataReceived?: boolean;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createAssociationCuiLookupWorker(): Worker {
  const memberMatchQueue = createQueue(QUEUES.E5_ASSOCIATION_MEMBER_MATCH, { db: 5 });

  const { worker } = createWorker<AssociationCuiLookupJobData>(
    QUEUES.E5_ASSOCIATION_CUI_LOOKUP,
    async (job: Job<AssociationCuiLookupJobData>): Promise<AssociationCuiLookupResult> => {
      return withCognitiveSpan("e5:association:cui:lookup", async () => {
        const { tenantId, associationId, correlationId } = job.data;

        job.log(
          `[G40] Starting CUI lookup: associationId=${associationId}, tenantId=${tenantId}, correlationId=${correlationId ?? "n/a"}`,
        );

        await setSessionTenantId(tenantId);

        // ── 1. SELECT asociație ───────────────────────────────────────────────
        const [association] = await db
          .select({
            id: goldAssociations.id,
            name: goldAssociations.name,
            cui: goldAssociations.cui,
            isActive: goldAssociations.isActive,
          })
          .from(goldAssociations)
          .where(
            and(eq(goldAssociations.id, associationId), eq(goldAssociations.tenantId, tenantId)),
          )
          .limit(1);

        // ── 2. GUARD: lipsă sau CUI null ─────────────────────────────────────
        if (!association) {
          job.log(`[G40] Association ${associationId} not found for tenant ${tenantId}`);
          return { ok: true, skipped: true, reason: "association_not_found" };
        }

        if (!association.cui) {
          job.log(`[G40] Association ${associationId} has no CUI — skip`);
          return { ok: true, skipped: true, reason: "no_cui" };
        }

        // ── 3. Validare format CUI ────────────────────────────────────────────
        const cuiTrimmed = association.cui.trim();
        if (!/^\d{2,10}$/.test(cuiTrimmed)) {
          job.log(`[G40] CUI invalid format: "${cuiTrimmed}" — reset to null`);
          await db
            .update(goldAssociations)
            .set({ cui: null, updatedAt: new Date() })
            .where(
              and(eq(goldAssociations.id, associationId), eq(goldAssociations.tenantId, tenantId)),
            );
          return { ok: true, skipped: true, reason: "invalid_cui_format" };
        }

        // ── 4. Guard: fără cheie API Termene ─────────────────────────────────
        if (!TERMENE_API_KEY) {
          job.log(`[G40] TERMENE_API_KEY not configured — skip Termene lookup`);
          // Continuăm oricum cu match intern
          await enqueueG41(memberMatchQueue, tenantId, associationId, correlationId, job);
          return { ok: true, skipped: true, reason: "no_termene_key" };
        }

        // ── 5. Circuit breaker Termene ────────────────────────────────────────
        const termeneBreaker = createCircuitBreaker(callTermeneFirma, "termene-association-g40", {
          timeout: TERMENE_TIMEOUT_MS,
          errorThresholdPercentage: 50,
          resetTimeout: 60_000,
          volumeThreshold: 3,
        });

        const termeneData = await withExternalApiMetrics("termene", () =>
          termeneBreaker.fire(cuiTrimmed),
        ).catch((err: unknown) => {
          throw new Error(
            `[G40] Termene circuit breaker failure for CUI=${cuiTrimmed}: ${(err as Error).message}`,
            { cause: err },
          );
        });

        // ── 6. CUI inexistent în registru (404) → deactivate ─────────────────
        if (termeneData === null) {
          job.log(`[G40] CUI ${cuiTrimmed} not found in Termene (404) — deactivating association`);
          await db
            .update(goldAssociations)
            .set({ isActive: false, updatedAt: new Date() })
            .where(
              and(eq(goldAssociations.id, associationId), eq(goldAssociations.tenantId, tenantId)),
            );
          return { ok: true, cuiVerified: false, matched: false, termeneDataReceived: false };
        }

        // ── 7. CUI valid — UPDATE updatedAt ───────────────────────────────────
        job.log(`[G40] CUI ${cuiTrimmed} verified via Termene`);
        await db
          .update(goldAssociations)
          .set({ updatedAt: new Date() })
          .where(
            and(eq(goldAssociations.id, associationId), eq(goldAssociations.tenantId, tenantId)),
          );

        // ── 8. Match goldCompanies by CUI → INSERT goldAffiliations ───────────
        const matchedCompanies = await db
          .select({ id: goldCompanies.id })
          .from(goldCompanies)
          .where(and(eq(goldCompanies.tenantId, tenantId), eq(goldCompanies.cui, cuiTrimmed)));

        let matched = false;
        for (const company of matchedCompanies) {
          // Check dacă afilierea există deja
          const [existing] = await db
            .select({ id: goldAffiliations.id })
            .from(goldAffiliations)
            .where(
              and(
                eq(goldAffiliations.clientId, company.id),
                eq(goldAffiliations.associationId, associationId),
              ),
            )
            .limit(1);

          if (!existing) {
            await db.insert(goldAffiliations).values({
              clientId: company.id,
              associationId,
              isCurrent: true,
              evidenceSource: "PUBLIC_REGISTER",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            matched = true;
            job.log(
              `[G40] Inserted affiliation: clientId=${company.id} → associationId=${associationId}`,
            );
          }
        }

        // ── 9. Enqueue G41 ────────────────────────────────────────────────────
        await enqueueG41(memberMatchQueue, tenantId, associationId, correlationId, job);

        return {
          ok: true,
          cuiVerified: true,
          matched,
          termeneDataReceived: true,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 3,
    },
  );

  return worker;
}

async function enqueueG41(
  queue: ReturnType<typeof createQueue>,
  tenantId: string,
  associationId: string,
  correlationId: string | undefined,
  job: Job<AssociationCuiLookupJobData>,
): Promise<void> {
  await queue.add(
    "member-match",
    { tenantId, associationId, correlationId },
    { jobId: `member-match-${associationId}-${Date.now()}` },
  );
  job.log(`[G40] Enqueued G41 member:match for associationId=${associationId}`);
}
