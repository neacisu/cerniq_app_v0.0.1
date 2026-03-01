import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverEnrichmentLog } from "@cerniq/db";
import { patchCompanyMetadata } from "./pipeline-utils.js";

export type AnifScraperJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  judet?: string;
  correlationId?: string;
};

function parseAnifHtml(html: string) {
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const suprafata =
    Number(
      (
        plain.match(/(Suprafa[țt]a\s*Irigat[ăa])\s*[:-]?\s*(\d+(?:[.,]\d+)?)/i)?.[2] ?? "NaN"
      ).replace(",", "."),
    ) || null;
  return {
    suprafataIrigata: suprafata,
    areContractIrigare: /contract\s+irigare/i.test(plain),
    tipContract:
      plain.match(/(Tip\s*Contract)\s*[:-]?\s*([A-Za-zĂÂÎȘȚăâîșț0-9\s-]+)/i)?.[2]?.trim() ?? null,
    amenajare:
      plain
        .match(/(Amenajare\s*Irigare|Sistem\s*Irigare)\s*[:-]?\s*([A-Za-zĂÂÎȘȚăâîșț0-9\s-]+)/i)?.[2]
        ?.trim() ?? null,
  };
}

export const anifScraperProcessor: Processor<AnifScraperJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);

  const endpointTemplate = process.env.ANIF_ENDPOINT_TEMPLATE;
  if (!endpointTemplate) {
    return { ok: true, status: "skipped", reason: "missing_anif_endpoint_template" };
  }

  const url = endpointTemplate
    .replace("{cui}", encodeURIComponent(job.data.cui))
    .replace("{judet}", encodeURIComponent(job.data.judet ?? ""));
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "text/html,application/json" },
    signal: AbortSignal.timeout(Number(process.env.ANIF_TIMEOUT_MS ?? "20000")),
  });
  if (response.status === 404) return { ok: true, status: "not_found", source: "anif_scraper" };
  if (!response.ok) throw new Error(`ANIF scrape failed: ${response.status}`);

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as Record<string, unknown>)
    : parseAnifHtml(await response.text());

  await patchCompanyMetadata(job.data.tenantId, job.data.companyId, {
    anifScraper: {
      cui: job.data.cui,
      judet: job.data.judet ?? null,
      payload,
      scrapedAt: new Date().toISOString(),
    },
  });

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "anif_scraper",
    operation: "scrape",
    requestPayload: { url, cui: job.data.cui, judet: job.data.judet ?? null },
    responsePayload: payload,
    fieldsUpdated: ["metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: "success", source: "anif_scraper" };
};
