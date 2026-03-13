import { type Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, sql } from "@cerniq/db";
import { createQueue } from "@cerniq/worker-shared";

export type OrchestratorJobData = {
  tenantId: string;
  companyId: string;
  stage: "post_validation" | "post_enrichment" | "post_scoring";
  correlationId?: string;
};

export const pipelineOrchestratorProcessor: Processor<OrchestratorJobData> = async (job) => {
  await setSessionTenantId(job.data.tenantId);
  const company = await db.query.silverCompanies.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
  });
  if (!company) return { ok: false, status: "not_found" };

  const add = async (queueName: string, payload: Record<string, unknown>) => {
    const queue = createQueue(queueName);
    await queue.add("process", payload);
    await queue.close();
  };

  const jobsTriggered: string[] = [];
  if (job.data.stage === "post_validation") {
    const enrichQueues = [
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
      "scrape:website:finder",
      "geo:geocode:nominatim",
      "agri:apia",
      "ai:structure:xai",
    ];
    for (const queueName of enrichQueues) {
      await add(queueName, {
        tenantId: job.data.tenantId,
        companyId: job.data.companyId,
        cui: company.cui,
        denumire: company.denumire,
        adresa: company.adresa,
        localitate: company.localitate,
        judet: company.judet,
        rawData: company.metadata,
        correlationId: job.data.correlationId,
      });
      jobsTriggered.push(queueName);
    }
  }

  if (job.data.stage === "post_enrichment") {
    for (const queueName of [
      "dedup:exact",
      "dedup:fuzzy",
      "score:completeness",
      "score:accuracy",
      "score:freshness",
    ]) {
      await add(queueName, {
        tenantId: job.data.tenantId,
        companyId: job.data.companyId,
        correlationId: job.data.correlationId,
      });
      jobsTriggered.push(queueName);
    }
    await db
      .update(silverCompanies)
      .set({ enrichmentStatus: "complete" })
      .where(sql`${silverCompanies.id} = ${job.data.companyId}`);
  }

  if (job.data.stage === "post_scoring") {
    await add("aggregate:quality-rollup", {
      tenantId: job.data.tenantId,
      companyId: job.data.companyId,
      correlationId: job.data.correlationId,
    });
    jobsTriggered.push("aggregate:quality-rollup");
  }

  return { ok: true, status: "success", stage: job.data.stage, jobsTriggered };
};
