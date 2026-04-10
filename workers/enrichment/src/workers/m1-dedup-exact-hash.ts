import type { Job, Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { createJobLogger } from "../lib/job-logger.js";

import {
  db,
  setSessionTenantId,
  silverCompanies,
  silverDedupCandidates,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";

const svcLog = createServiceLogger("m1-dedup-exact-hash", { etapa: "e1" });

export type DedupExactJobData = {
  tenantId: string;
  companyId: string;
  correlationId?: string;
};

type MatchResult = {
  matchedCompanyId: string;
  matchType: "cui" | "nrRegCom" | "email" | "phone";
  matchValue: string;
};

async function findCuiMatches(
  tenantId: string,
  companyId: string,
  cui: string,
): Promise<MatchResult[]> {
  const rows = await db.query.silverCompanies.findMany({
    where: (t) =>
      sql`${t.tenantId} = ${tenantId}
          AND ${t.id} <> ${companyId}
          AND ${t.cui} = ${cui}
          AND COALESCE(${t.isMasterRecord}, TRUE) = TRUE`,
  });
  return rows.map((r) => ({ matchedCompanyId: r.id, matchType: "cui" as const, matchValue: cui }));
}

async function findNrRegComMatches(
  tenantId: string,
  companyId: string,
  nrRegCom: string,
): Promise<MatchResult[]> {
  const rows = await db.query.silverCompanies.findMany({
    where: (t) =>
      sql`${t.tenantId} = ${tenantId}
          AND ${t.id} <> ${companyId}
          AND ${t.nrRegCom} = ${nrRegCom}
          AND COALESCE(${t.isMasterRecord}, TRUE) = TRUE`,
  });
  return rows.map((r) => ({
    matchedCompanyId: r.id,
    matchType: "nrRegCom" as const,
    matchValue: nrRegCom,
  }));
}

async function findEmailMatches(
  tenantId: string,
  companyId: string,
  email: string,
): Promise<MatchResult[]> {
  const emailNorm = email.trim().toLowerCase();
  const contacts = await db.query.silverContacts.findMany({
    where: (t) =>
      sql`${t.tenantId} = ${tenantId}
          AND ${t.companyId} <> ${companyId}
          AND LOWER(TRIM(COALESCE(${t.email}, ''))) = ${emailNorm}
          AND ${t.email} IS NOT NULL`,
  });
  const seen = new Set<string>();
  return contacts
    .filter((c) => {
      const fresh = !seen.has(c.companyId);
      seen.add(c.companyId);
      return fresh;
    })
    .map((c) => ({
      matchedCompanyId: c.companyId,
      matchType: "email" as const,
      matchValue: emailNorm,
    }));
}

async function findPhoneMatches(
  tenantId: string,
  companyId: string,
  telefon: string,
): Promise<MatchResult[]> {
  const phoneNorm = telefon.replaceAll(/\D/g, "");
  if (phoneNorm.length < 8) return [];
  const contacts = await db.query.silverContacts.findMany({
    where: (t) =>
      sql`${t.tenantId} = ${tenantId}
          AND ${t.companyId} <> ${companyId}
          AND REPLACE(REPLACE(REPLACE(COALESCE(${t.telefonE164}, ${t.telefon}, ''), ' ', ''), '-', ''), '+', '') LIKE ${"%" + phoneNorm.slice(-8)}`,
  });
  const seen = new Set<string>();
  return contacts
    .filter((c) => {
      const fresh = !seen.has(c.companyId);
      seen.add(c.companyId);
      return fresh;
    })
    .map((c) => ({
      matchedCompanyId: c.companyId,
      matchType: "phone" as const,
      matchValue: telefon,
    }));
}

async function findExactMatches(
  tenantId: string,
  companyId: string,
  cui: string | null,
  nrRegCom: string | null,
  email: string | null,
  telefon: string | null,
): Promise<MatchResult[]> {
  if (cui) {
    const m = await findCuiMatches(tenantId, companyId, cui);
    if (m.length > 0) return m;
  }
  if (nrRegCom) {
    const m = await findNrRegComMatches(tenantId, companyId, nrRegCom);
    if (m.length > 0) return m;
  }
  if (email) {
    const m = await findEmailMatches(tenantId, companyId, email);
    if (m.length > 0) return m;
  }
  if (telefon) {
    return findPhoneMatches(tenantId, companyId, telefon);
  }
  return [];
}

type DedupExactProcessorResult =
  | { ok: true; status: "skipped"; reason: string }
  | { ok: true; status: "unique" }
  | {
      ok: true;
      status: "merged" | "hitl_pending";
      masterId: string;
      matchType: MatchResult["matchType"];
    };

type SilverCompanyRow = typeof silverCompanies.$inferSelect;

async function updateSlaveSilverCompanyAfterExactMatch(
  slave: SilverCompanyRow,
  master: SilverCompanyRow,
  best: MatchResult,
  isAutoMerge: boolean,
): Promise<void> {
  if (isAutoMerge) {
    await db
      .update(silverCompanies)
      .set({
        dedupStatus: "auto_merged",
        isMasterRecord: false,
        masterRecordId: master.id,
        duplicateConfidence: "1",
        mergeHistory: sql`COALESCE(${silverCompanies.mergeHistory}, '[]'::jsonb) || ${JSON.stringify(
          [
            {
              masterCompanyId: master.id,
              matchType: best.matchType,
              matchValue: best.matchValue,
              mergedAt: new Date().toISOString(),
            },
          ],
        )}::jsonb`,
        updatedAt: new Date(),
      })
      .where(sql`${silverCompanies.id} = ${slave.id}`);
    return;
  }
  await db
    .update(silverCompanies)
    .set({
      dedupStatus: "hitl_pending",
      duplicateConfidence: best.matchType === "email" ? "0.8" : "0.7",
      updatedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${slave.id}`);
}

async function runDedupExactHashJob(
  job: Job<DedupExactJobData>,
): Promise<DedupExactProcessorResult> {
  const startedAt = Date.now();
  const log = createJobLogger({
    tenantId: job.data.tenantId,
    workerName: "M1:dedup-exact-hash",
    jobId: String(job.id ?? ""),
    startedAt,
    etapa: "e1",
    correlationId: job.data.correlationId,
    entityType: "company",
    entityId: job.data.companyId,
  });
  try {
    await setSessionTenantId(job.data.tenantId);
    svcLog.info({ tenantId: job.data.tenantId, companyId: job.data.companyId }, "M1 dedup exact");

    const company = await db.query.silverCompanies.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
    });
    if (!company) return { ok: true, status: "skipped", reason: "not_found" };

    const hasIdentifier = company.cui || company.nrRegCom || company.email || company.telefon;
    if (!hasIdentifier) return { ok: true, status: "skipped", reason: "no_identifiers" };

    const matches = await findExactMatches(
      job.data.tenantId,
      job.data.companyId,
      company.cui,
      company.nrRegCom,
      company.email,
      company.telefon,
    );

    if (matches.length === 0) return { ok: true, status: "unique" };

    const best = matches[0];
    const duplicate = await db.query.silverCompanies.findFirst({
      where: (t, { eq }) => eq(t.id, best.matchedCompanyId),
    });
    if (!duplicate) return { ok: true, status: "unique" };

    const allRecords = [company, duplicate].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const master = allRecords[0];
    const slave = allRecords[1];

    const isAutoMerge = best.matchType === "cui" || best.matchType === "nrRegCom";

    await db.insert(silverDedupCandidates).values({
      tenantId: job.data.tenantId,
      companyAId: master.id,
      companyBId: slave.id,
      cuiMatch: best.matchType === "cui",
      phoneMatch: best.matchType === "phone",
      overallConfidence: "1",
      status: isAutoMerge ? "auto_merged" : "hitl_pending",
      masterCompanyId: master.id,
      matchingFields: { method: "exact", type: best.matchType, value: best.matchValue },
      metadata: { method: `exact_${best.matchType}`, allMatches: matches },
    });

    await updateSlaveSilverCompanyAfterExactMatch(slave, master, best, isAutoMerge);

    await db.insert(silverEnrichmentLog).values({
      tenantId: job.data.tenantId,
      entityType: "company",
      entityId: job.data.companyId,
      source: "dedup_exact",
      operation: "deduplicate",
      status: "success",
      requestPayload: { cui: company.cui, email: company.email, telefon: company.telefon },
      responsePayload: {
        masterCompanyId: master.id,
        mergedCompanyId: isAutoMerge ? slave.id : null,
        matchType: best.matchType,
        decision: isAutoMerge ? "auto_merge" : "hitl_pending",
      },
      fieldsUpdated: [
        "dedupStatus",
        "isMasterRecord",
        "masterRecordId",
        "duplicateConfidence",
        "mergeHistory",
      ],
      correlationId: job.data.correlationId,
      jobId: String(job.id ?? ""),
      durationMs: Date.now() - startedAt,
    });

    log.step("done", "Dedup exact finalizat", {
      latencyMs: Date.now() - startedAt,
      status: isAutoMerge ? "merged" : "hitl_pending",
    });
    return {
      ok: true,
      status: isAutoMerge ? "merged" : "hitl_pending",
      masterId: master.id,
      matchType: best.matchType,
    };
  } catch (error) {
    log.error(
      "fatal",
      `Dedup exact eșuat: ${error instanceof Error ? error.message : String(error)}`,
      {
        ...enrichError(error, {
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          pipelineContext: {
            companyId: job.data.companyId,
            batchId: job.data.correlationId,
          },
        }),
      },
    );
    throw error;
  }
}

export const dedupExactHashProcessor: Processor<DedupExactJobData> = async (job) => {
  return withCognitiveSpan("e1:dedup:exact", async (_span) => runDedupExactHashJob(job), {
    tenantId: job.data.tenantId,
  });
};
