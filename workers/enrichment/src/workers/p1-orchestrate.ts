import { type Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, sql } from "@cerniq/db";
import {
  validateJobData,
  silverEnrichmentDurationSeconds,
  silverEnrichmentErrorsTotal,
  withCognitiveSpan,
} from "@cerniq/worker-shared";
import { z } from "zod";
import { addQueueJob } from "./pipeline-utils.js";

export type OrchestratorJobData = {
  tenantId: string;
  companyId: string;
  stage: "post_validation" | "post_enrichment" | "post_scoring";
  correlationId?: string;
  traceId?: string;
  causationKey?: string;
  sourceEndpoint?: string;
  actorId?: string;
};

const orchestratorJobDataSchema = z.object({
  tenantId: z.uuid(),
  companyId: z.uuid(),
  stage: z.enum(["post_validation", "post_enrichment", "post_scoring"]),
  correlationId: z.string().trim().min(1).optional(),
  traceId: z.string().optional(),
  causationKey: z.string().optional(),
  sourceEndpoint: z.string().optional(),
  actorId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type CompanySnapshot = {
  cui?: string | null;
  cuiValidated?: boolean | null;
  email?: string | null;
  website?: string | null;
  adresa?: string | null;
  localitate?: string | null;
  codCaenPrincipal?: string | null;
};

function hasCuiValid(c: CompanySnapshot): boolean {
  return Boolean(c.cui && c.cuiValidated === true);
}

function hasDomain(c: CompanySnapshot): boolean {
  return Boolean(c.email?.includes("@") || c.website);
}

function hasAddress(c: CompanySnapshot): boolean {
  return Boolean(c.adresa || c.localitate);
}

function isAgricultural(c: CompanySnapshot): boolean {
  const caen = c.codCaenPrincipal ?? "";
  return caen.startsWith("01") || caen.startsWith("02") || caen.startsWith("03");
}

// ---------------------------------------------------------------------------
// Stage handlers
// ---------------------------------------------------------------------------

type StageContext = {
  tenantId: string;
  companyId: string;
  correlationId?: string;
  company: CompanySnapshot & { metadata?: unknown };
};

async function handlePostValidation(ctx: StageContext): Promise<string[]> {
  const { tenantId, companyId, correlationId, company } = ctx;
  const jobsTriggered: string[] = [];

  await db
    .update(silverCompanies)
    .set({
      metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{enrichmentStartedAt}', ${JSON.stringify(new Date().toISOString())}::jsonb)`,
    })
    .where(sql`${silverCompanies.id} = ${companyId}`);

  const basePayload = {
    tenantId,
    companyId,
    cui: company.cui,
    adresa: company.adresa,
    localitate: company.localitate,
    correlationId,
  };

  if (hasCuiValid(company)) {
    const cuiQueues = [
      "enrich:anaf:fiscal-status",
      "enrich:anaf:tva-status",
      "enrich:anaf:efactura",
      "enrich:anaf:datorii",
      "enrich:anaf:caen",
      "enrich:termene:balance",
      "enrich:termene:risk",
      "enrich:termene:dosare",
      "enrich:termene:actionari",
      "enrich:onrc:data",
      "enrich:onrc:administratori",
      "enrich:onrc:sedii",
    ];
    for (const q of cuiQueues) {
      await addQueueJob(q, basePayload);
      jobsTriggered.push(q);
    }
  }

  if (hasDomain(company)) {
    await addQueueJob("discover:email:hunter", basePayload);
    jobsTriggered.push("discover:email:hunter");
  }

  if (hasAddress(company)) {
    await addQueueJob("geo:geocode:nominatim", basePayload);
    jobsTriggered.push("geo:geocode:nominatim");
  }

  if (isAgricultural(company)) {
    await addQueueJob("agri:apia", basePayload);
    jobsTriggered.push("agri:apia");
  }

  // Always-run queues — website scraping and AI structuring
  await addQueueJob("scrape:website:finder", basePayload);
  jobsTriggered.push("scrape:website:finder");

  await addQueueJob("ai:structure:xai", basePayload);
  jobsTriggered.push("ai:structure:xai");

  return jobsTriggered;
}

async function handlePostEnrichment(ctx: StageContext): Promise<string[]> {
  const { tenantId, companyId, correlationId } = ctx;
  const jobsTriggered: string[] = [];

  const companyForDuration = await db.query.silverCompanies.findFirst({
    where: (t, { and: a, eq: e }) => a(e(t.tenantId, tenantId), e(t.id, companyId)),
    columns: { metadata: true },
  });

  const enrichmentStartedAt = (companyForDuration?.metadata as Record<string, unknown> | null)
    ?.enrichmentStartedAt as string | undefined;

  if (enrichmentStartedAt) {
    const durationSeconds = (Date.now() - new Date(enrichmentStartedAt).getTime()) / 1000;
    silverEnrichmentDurationSeconds.observe(
      { source: "pipeline", tenant_id: tenantId },
      durationSeconds,
    );
  }

  const dedupPayload = { tenantId, companyId, correlationId };

  for (const q of ["dedup:exact", "dedup:fuzzy"]) {
    await addQueueJob(q, dedupPayload);
    jobsTriggered.push(q);
  }

  await db
    .update(silverCompanies)
    .set({ enrichmentStatus: "complete" })
    .where(sql`${silverCompanies.id} = ${companyId}`);

  await addQueueJob("score:completeness", dedupPayload);
  jobsTriggered.push("score:completeness");

  return jobsTriggered;
}

async function handlePostScoring(ctx: StageContext): Promise<string[]> {
  const { tenantId, companyId, correlationId } = ctx;

  await addQueueJob("aggregate:quality-rollup", { tenantId, companyId, correlationId });

  return ["aggregate:quality-rollup"];
}

const stageHandlers: Record<
  OrchestratorJobData["stage"],
  (ctx: StageContext) => Promise<string[]>
> = {
  post_validation: handlePostValidation,
  post_enrichment: handlePostEnrichment,
  post_scoring: handlePostScoring,
};

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

export const pipelineOrchestratorProcessor: Processor<OrchestratorJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:pipeline:orchestrate",
    async (_span) => {
      validateJobData(orchestratorJobDataSchema, job.data, {
        queueName: "pipeline:orchestrate",
        jobId: job.id,
      });

      await setSessionTenantId(job.data.tenantId);

      const company = await db.query.silverCompanies.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
      });

      if (!company) {
        silverEnrichmentErrorsTotal.inc({
          source: job.data.stage,
          tenant_id: job.data.tenantId,
        });
        return { ok: false, status: "not_found" };
      }

      const ctx: StageContext = {
        tenantId: job.data.tenantId,
        companyId: job.data.companyId,
        correlationId: job.data.correlationId,
        company,
      };

      try {
        const handler = stageHandlers[job.data.stage];
        const jobsTriggered = await handler(ctx);
        return { ok: true, status: "success", stage: job.data.stage, jobsTriggered };
      } catch (error) {
        silverEnrichmentErrorsTotal.inc({
          source: job.data.stage,
          tenant_id: job.data.tenantId,
        });
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
