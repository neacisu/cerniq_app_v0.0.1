import { Queue, type Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, sql } from "@cerniq/db";
import { getQueuePrefix, getRedisConnectionOptions } from "@cerniq/worker-shared";

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

  const connection = getRedisConnectionOptions();
  const prefix = getQueuePrefix();
  const add = async (queueName: string, payload: Record<string, unknown>) => {
    const queue = new Queue(queueName, { connection, prefix });
    await queue.add("process", payload);
    await queue.close();
  };

  const jobsTriggered: string[] = [];
  if (job.data.stage === "post_validation") {
    const enrichQueues = [
      "silver:enrich:anaf-fiscal-status",
      "silver:enrich:anaf-tva-status",
      "silver:enrich:anaf-efactura",
      "silver:enrich:anaf-datorii",
      "silver:enrich:anaf-caen",
      "silver:enrich:termene-balance",
      "silver:enrich:termene-risk",
      "silver:enrich:termene-dosare",
      "silver:enrich:termene-actionari",
      "silver:enrich:onrc-data",
      "silver:enrich:onrc-administratori",
      "silver:enrich:onrc-sedii",
      "silver:enrich:website-finder",
      "silver:enrich:nominatim-geocoding",
      "silver:enrich:apia-data",
      "silver:enrich:grok-structuring",
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
      "silver:dedup:exact-hash",
      "silver:dedup:fuzzy-match",
      "silver:score:completeness",
      "silver:score:accuracy",
      "silver:score:freshness",
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
    await add("silver:aggregate:quality-rollup", {
      tenantId: job.data.tenantId,
      companyId: job.data.companyId,
      correlationId: job.data.correlationId,
    });
    jobsTriggered.push("silver:aggregate:quality-rollup");
  }

  return { ok: true, status: "success", stage: job.data.stage, jobsTriggered };
};
