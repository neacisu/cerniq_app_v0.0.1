import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";

export type ApiaDataJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  judet?: string;
  correlationId?: string;
};

export const apiaDataProcessor: Processor<ApiaDataJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);

  const endpointTemplate = process.env.APIA_ENDPOINT_TEMPLATE;
  if (!endpointTemplate) {
    return { ok: true, status: "skipped", reason: "missing_apia_endpoint_template" };
  }
  const url = endpointTemplate
    .replace("{cui}", encodeURIComponent(job.data.cui))
    .replace("{judet}", encodeURIComponent(job.data.judet ?? ""));
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json,text/html" },
    signal: AbortSignal.timeout(Number(process.env.APIA_TIMEOUT_MS ?? "20000")),
  });
  if (response.status === 404) return { ok: true, status: "not_found", source: "apia_data" };
  if (!response.ok) throw new Error(`APIA data failed: ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as Record<string, unknown>)
    : { raw: await response.text() };

  await db
    .update(silverCompanies)
    .set({
      metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{apiaData}', ${JSON.stringify(
        {
          cui: job.data.cui,
          judet: job.data.judet ?? null,
          payload,
          fetchedAt: new Date().toISOString(),
        },
      )}::jsonb)`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "apia_data",
    operation: "fetch",
    requestPayload: { url, cui: job.data.cui },
    responsePayload: payload,
    fieldsUpdated: ["metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: "success", source: "apia_data" };
};
