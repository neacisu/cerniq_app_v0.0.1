/**
 * g41-association-member-match.ts — Worker G41: Member Match + Relationships (FAZA 9g)
 *
 * Queue: association:member:match | Timeout: 120s | Concurrency: 5 | Redis DB: 5
 *
 * Responsabilitate:
 *   - Etapa A: CUI exact match → INSERT goldAffiliations (evidenceSource=PUBLIC_REGISTER)
 *   - Etapa B: Fuzzy name+county match (Jaccard bigrames >= 0.45) → INSERT goldAffiliations (INFERRED)
 *   - Etapa C: UPSERT goldEntityRelationships SAME_ASSOCIATION pentru toate perechile de membri
 *   - Enqueue G42 (association:coverage:update)
 *
 * Anti-halucin. FAZA 9g:
 *   (A) Fuzzy matching inline — NU library externă
 *   (B) jaccardBigrams pe normalizeForMatch (NFD diacritice, fără punctuație)
 *   (C) Threshold 0.45 conservator pentru evitarea false positives
 *   (D) entityAId < entityBId — fără duplicate în relationships
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldAssociations,
  goldAffiliations,
  goldCompanies,
  goldEntityRelationships,
  sql,
  eq,
  and,
  setSessionTenantId,
} from "@cerniq/db";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Fuzzy matching helpers (inline — fără library externă)
// ---------------------------------------------------------------------------

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .replaceAll(/[^a-z0-9\s]/gu, "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function jaccardBigrams(a: string, b: string): number {
  if (!a || !b) return 0;
  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const sa = bigrams(normalizeForMatch(a));
  const sb = bigrams(normalizeForMatch(b));
  if (sa.size === 0 || sb.size === 0) return 0;
  let intersection = 0;
  for (const bg of sa) {
    if (sb.has(bg)) intersection++;
  }
  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const FUZZY_THRESHOLD = 0.45;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface AssociationMemberMatchJobData {
  tenantId: string;
  associationId: string;
  correlationId?: string;
}

export interface AssociationMemberMatchResult {
  ok: boolean;
  cuiMatches: number;
  fuzzyMatches: number;
  relationshipsCreated: number;
}

// ---------------------------------------------------------------------------
// Helpers de afiliere
// ---------------------------------------------------------------------------

async function upsertAffiliation(
  clientId: string,
  associationId: string,
  evidenceSource: "PUBLIC_REGISTER" | "INFERRED",
  job: Job<AssociationMemberMatchJobData>,
): Promise<void> {
  const [existing] = await db
    .select({ id: goldAffiliations.id, evidenceSource: goldAffiliations.evidenceSource })
    .from(goldAffiliations)
    .where(
      and(
        eq(goldAffiliations.clientId, clientId),
        eq(goldAffiliations.associationId, associationId),
      ),
    )
    .limit(1);

  if (existing) {
    if (evidenceSource === "PUBLIC_REGISTER" && existing.evidenceSource !== "PUBLIC_REGISTER") {
      await db
        .update(goldAffiliations)
        .set({ evidenceSource: "PUBLIC_REGISTER", isCurrent: true, updatedAt: new Date() })
        .where(eq(goldAffiliations.id, existing.id));
      job.log(`[G41] Upgraded affiliation evidenceSource: clientId=${clientId} → PUBLIC_REGISTER`);
    }
    return;
  }

  await db.insert(goldAffiliations).values({
    clientId,
    associationId,
    isCurrent: true,
    evidenceSource,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  job.log(
    `[G41] Inserted affiliation: clientId=${clientId} → associationId=${associationId} (${evidenceSource})`,
  );
}

// ---------------------------------------------------------------------------
// Etapa A — CUI exact match
// ---------------------------------------------------------------------------

async function etapaACuiMatch(
  tenantId: string,
  associationId: string,
  cui: string,
  job: Job<AssociationMemberMatchJobData>,
): Promise<number> {
  const cuiTrimmed = cui.trim();
  const companiesByCui = await db
    .select({ id: goldCompanies.id })
    .from(goldCompanies)
    .where(and(eq(goldCompanies.tenantId, tenantId), eq(goldCompanies.cui, cuiTrimmed)));

  for (const company of companiesByCui) {
    await upsertAffiliation(company.id, associationId, "PUBLIC_REGISTER", job);
  }

  job.log(`[G41] Etapa A CUI exact: ${companiesByCui.length} matches pentru CUI=${cuiTrimmed}`);
  return companiesByCui.length;
}

// ---------------------------------------------------------------------------
// Etapa B — Fuzzy name + county match
// ---------------------------------------------------------------------------

async function etapaBFuzzyMatch(
  tenantId: string,
  associationId: string,
  associationName: string,
  county: string | null,
  job: Job<AssociationMemberMatchJobData>,
): Promise<number> {
  const whereClause = county
    ? and(eq(goldCompanies.tenantId, tenantId), eq(goldCompanies.judet, county))
    : eq(goldCompanies.tenantId, tenantId);

  const companiesInCounty = await db
    .select({ id: goldCompanies.id, denumire: goldCompanies.denumire })
    .from(goldCompanies)
    .where(whereClause);

  let fuzzyMatches = 0;
  for (const company of companiesInCounty) {
    if (!company.denumire) continue;

    const alreadyAffiliated = await db
      .select({ id: goldAffiliations.id })
      .from(goldAffiliations)
      .where(
        and(
          eq(goldAffiliations.clientId, company.id),
          eq(goldAffiliations.associationId, associationId),
        ),
      )
      .limit(1);

    if (alreadyAffiliated.length > 0) continue;

    const similarity = jaccardBigrams(company.denumire, associationName);
    if (similarity >= FUZZY_THRESHOLD) {
      await upsertAffiliation(company.id, associationId, "INFERRED", job);
      fuzzyMatches++;
      job.log(
        `[G41] Fuzzy match: "${company.denumire}" ~ "${associationName}" (sim=${similarity.toFixed(3)})`,
      );
    }
  }

  return fuzzyMatches;
}

// ---------------------------------------------------------------------------
// Etapa C — UPSERT goldEntityRelationships
// ---------------------------------------------------------------------------

async function etapaCRelationships(
  tenantId: string,
  associationId: string,
  job: Job<AssociationMemberMatchJobData>,
): Promise<number> {
  const affiliations = await db
    .select({ clientId: goldAffiliations.clientId })
    .from(goldAffiliations)
    .where(eq(goldAffiliations.associationId, associationId));

  const memberIds = affiliations.map((a) => a.clientId);
  job.log(`[G41] Etapa C: ${memberIds.length} membri pentru asociație`);

  let relationshipsCreated = 0;
  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      const entityAId = memberIds[i];
      const entityBId = memberIds[j];
      if (!entityAId || !entityBId) continue;

      try {
        await db
          .insert(goldEntityRelationships)
          .values({
            tenantId,
            entityAId,
            entityBId,
            relationType: "SAME_ASSOCIATION",
            distanceMeters: null,
            bidirectional: true,
            confidence: "0.8",
            source: "ASSOCIATION_G41",
            metadata: { associationId },
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              goldEntityRelationships.tenantId,
              goldEntityRelationships.entityAId,
              goldEntityRelationships.entityBId,
              goldEntityRelationships.relationType,
            ],
            set: {
              confidence: "0.8",
              bidirectional: true,
              source: "ASSOCIATION_G41",
              updatedAt: sql`NOW()`,
            },
          });
        relationshipsCreated++;
      } catch (err) {
        job.log(
          `[G41] Warning: failed upsert relationship (${entityAId}, ${entityBId}): ${(err as Error).message}`,
        );
      }
    }
  }

  return relationshipsCreated;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createAssociationMemberMatchWorker(): Worker {
  const coverageUpdateQueue = createQueue(QUEUES.E5_ASSOCIATION_COVERAGE_UPDATE, { db: 5 });

  const { worker } = createWorker<AssociationMemberMatchJobData>(
    QUEUES.E5_ASSOCIATION_MEMBER_MATCH,
    async (job: Job<AssociationMemberMatchJobData>): Promise<AssociationMemberMatchResult> => {
      return withCognitiveSpan("e5:association:member:match", async () => {
        const { tenantId, associationId, correlationId } = job.data;

        job.log(
          `[G41] Starting member match: associationId=${associationId}, tenantId=${tenantId}, correlationId=${correlationId ?? "n/a"}`,
        );

        await setSessionTenantId(tenantId);

        const [association] = await db
          .select({
            id: goldAssociations.id,
            name: goldAssociations.name,
            county: goldAssociations.county,
            cui: goldAssociations.cui,
          })
          .from(goldAssociations)
          .where(
            and(eq(goldAssociations.id, associationId), eq(goldAssociations.tenantId, tenantId)),
          )
          .limit(1);

        if (!association) {
          throw new Error(`[G41] Association ${associationId} not found for tenant ${tenantId}`);
        }

        const cuiMatches = association.cui
          ? await etapaACuiMatch(tenantId, associationId, association.cui, job)
          : 0;

        const fuzzyMatches = await etapaBFuzzyMatch(
          tenantId,
          associationId,
          association.name,
          association.county ?? null,
          job,
        );

        job.log(`[G41] Etapa B: ${fuzzyMatches} fuzzy matches`);

        const relationshipsCreated = await etapaCRelationships(tenantId, associationId, job);
        job.log(`[G41] Etapa C: ${relationshipsCreated} relationships upserted`);

        await coverageUpdateQueue.add(
          "coverage-update",
          { tenantId, associationId, correlationId },
          { jobId: `coverage-${associationId}-${Date.now()}` },
        );
        job.log(`[G41] Enqueued G42 coverage:update pentru associationId=${associationId}`);

        return { ok: true, cuiMatches, fuzzyMatches, relationshipsCreated };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 5,
    },
  );

  return worker;
}
