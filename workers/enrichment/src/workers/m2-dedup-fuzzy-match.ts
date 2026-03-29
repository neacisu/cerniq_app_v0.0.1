import type { Processor } from "bullmq";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import * as fuzz from "fuzzball";
import {
  db,
  setSessionTenantId,
  silverCompanies,
  silverDedupCandidates,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";
import { createHitlApprovalTask } from "./pipeline-utils.js";

export type DedupFuzzyJobData = {
  tenantId: string;
  companyId: string;
  correlationId?: string;
};

const AUTO_MERGE_THRESHOLD = 0.85;
const HITL_THRESHOLD = 0.7;

function computeNameSimilarity(a: string, b: string): number {
  const ratio = fuzz.ratio(a.toLowerCase(), b.toLowerCase()) / 100;
  const tokenSort = fuzz.token_sort_ratio(a.toLowerCase(), b.toLowerCase()) / 100;
  const tokenSet = fuzz.token_set_ratio(a.toLowerCase(), b.toLowerCase()) / 100;
  const partialRatio = fuzz.partial_ratio(a.toLowerCase(), b.toLowerCase()) / 100;
  return Math.max(ratio, tokenSort, tokenSet, partialRatio);
}

export const dedupFuzzyMatchProcessor: Processor<DedupFuzzyJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:dedup:fuzzy",
    async (_span) => {
      const startedAt = Date.now();
      await setSessionTenantId(job.data.tenantId);

      const company = await db.query.silverCompanies.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
      });
      if (!company?.denumire) return { ok: true, status: "skipped", reason: "no_name" };

      const candidates = await db.query.silverCompanies.findMany({
        where: (t) =>
          sql`${t.tenantId} = ${job.data.tenantId}
          AND ${t.id} <> ${job.data.companyId}
          AND COALESCE(${t.judet}, '') = ${company.judet ?? ""}`,
      });
      if (candidates.length === 0) return { ok: true, status: "unique" };

      const scored = candidates
        .filter((candidate) => {
          if (company.cui && candidate.cui && company.cui !== candidate.cui) return false;
          if (company.nrRegCom && candidate.nrRegCom && company.nrRegCom !== candidate.nrRegCom) {
            return false;
          }
          return true;
        })
        .map((candidate) => {
          const name = computeNameSimilarity(company.denumire ?? "", candidate.denumire ?? "");
          const addr = computeNameSimilarity(company.adresa ?? "", candidate.adresa ?? "");
          let phone = 0;
          if (company.telefon && candidate.telefon) {
            phone = company.telefon === candidate.telefon ? 1 : 0.4;
          }
          const confidence = name * 0.5 + addr * 0.3 + phone * 0.2;
          return { candidate, name, addr, phone, confidence };
        })
        .filter((x) => x.confidence >= HITL_THRESHOLD)
        .sort((a, b) => b.confidence - a.confidence);

      if (scored.length === 0) return { ok: true, status: "unique" };
      const best = scored[0];

      await db.insert(silverDedupCandidates).values({
        tenantId: job.data.tenantId,
        companyAId: job.data.companyId,
        companyBId: best.candidate.id,
        nameSimilarity: String(best.name),
        addressSimilarity: String(best.addr),
        phoneMatch: best.phone >= 0.9,
        overallConfidence: String(best.confidence),
        status: best.confidence >= AUTO_MERGE_THRESHOLD ? "auto_merged" : "hitl_pending",
        metadata: {
          method: "fuzzy",
          scores: { name: best.name, address: best.addr, phone: best.phone },
        },
      });

      if (best.confidence >= AUTO_MERGE_THRESHOLD) {
        await db
          .update(silverCompanies)
          .set({
            dedupStatus: "auto_merged",
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{dedupFuzzy}', ${JSON.stringify(
              {
                masterCandidateId: best.candidate.id,
                confidence: best.confidence,
                autoMergedAt: new Date().toISOString(),
              },
            )}::jsonb)`,
          })
          .where(sql`${silverCompanies.id} = ${job.data.companyId}`);
      } else {
        await db
          .update(silverCompanies)
          .set({ dedupStatus: "hitl_pending" })
          .where(sql`${silverCompanies.id} = ${job.data.companyId}`);
        await createHitlApprovalTask({
          tenantId: job.data.tenantId,
          entityType: "dedup_candidate",
          entityId: job.data.companyId,
          type: "dedup_review",
          title: "Revizie deduplicare fuzzy",
          description: "Necesita confirmare umana pentru potential duplicat",
          aiConfidence: best.confidence,
          aiRecommendation: "review",
          urgency: "medium",
          metadata: {
            companyA: job.data.companyId,
            companyB: best.candidate.id,
            scores: { name: best.name, address: best.addr, phone: best.phone },
          },
          expiresInHours: 24,
        });
      }

      await db.insert(silverEnrichmentLog).values({
        tenantId: job.data.tenantId,
        entityType: "company",
        entityId: job.data.companyId,
        source: "dedup_fuzzy",
        operation: "deduplicate",
        requestPayload: null,
        responsePayload: {
          candidateId: best.candidate.id,
          confidence: best.confidence,
          scores: { name: best.name, address: best.addr, phone: best.phone },
        },
        fieldsUpdated: ["dedupStatus", "metadata"],
        correlationId: job.data.correlationId,
        jobId: String(job.id ?? ""),
        durationMs: Date.now() - startedAt,
      });

      return {
        ok: true,
        status: best.confidence >= AUTO_MERGE_THRESHOLD ? "auto_merged" : "hitl_required",
        confidence: best.confidence,
        candidateId: best.candidate.id,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
