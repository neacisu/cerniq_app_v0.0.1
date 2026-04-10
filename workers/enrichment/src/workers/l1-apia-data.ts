import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("l1-apia-data", { etapa: "e1" });

export type ApiaDataJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  judet?: string;
  correlationId?: string;
};

export const apiaDataProcessor: Processor<ApiaDataJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:agri:apia",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "L1:apia-data",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: "company",
        entityId: job.data.companyId,
      });
      let targetUrl = "";
      try {
        await setSessionTenantId(job.data.tenantId);
        svcLog.info({ tenantId: job.data.tenantId, companyId: job.data.companyId }, "L1 APIA");

        const endpointTemplate = process.env.APIA_ENDPOINT_TEMPLATE;
        if (!endpointTemplate) {
          log.info("skip", "Lipsește APIA_ENDPOINT_TEMPLATE", {
            scrapingResult: "skipped",
            latencyMs: Date.now() - startedAt,
          });
          return { ok: true, status: "skipped", reason: "missing_apia_endpoint_template" };
        }
        const url = endpointTemplate
          .replace("{cui}", encodeURIComponent(job.data.cui))
          .replace("{judet}", encodeURIComponent(job.data.judet ?? ""));
        targetUrl = url;
        const response = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json,text/html" },
          signal: AbortSignal.timeout(Number(process.env.APIA_TIMEOUT_MS ?? "20000")),
        });
        if (response.status === 404) {
          log.info("fetch", "APIA 404", {
            targetUrl,
            scrapingResult: "not_found",
            httpStatus: response.status,
            latencyMs: Date.now() - startedAt,
          });
          return { ok: true, status: "not_found", source: "apia_data" };
        }
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

        log.step("done", "APIA fetch reușit", {
          targetUrl,
          scrapingResult: "ok",
          httpStatus: response.status,
          fieldsExtracted:
            payload && typeof payload === "object" && !Array.isArray(payload)
              ? { keys: Object.keys(payload) }
              : { raw: true },
          latencyMs: Date.now() - startedAt,
        });
        return { ok: true, status: "success", source: "apia_data" };
      } catch (error) {
        log.error(
          "fatal",
          `APIA data eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              entityType: "company",
              entityId: job.data.companyId,
              url: targetUrl || undefined,
            }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
