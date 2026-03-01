import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverEnrichmentLog } from "@cerniq/db";
import { patchCompanyMetadata } from "./pipeline-utils.js";

export type DajScraperJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  judet?: string;
  correlationId?: string;
};

function extractNumeric(text: string): number | null {
  const matched = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!matched) return null;
  return Number(matched[1].replace(",", "."));
}

function parseDajHtml(html: string) {
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    registrationNumber:
      plain.match(
        /(Nr\.?\s*Înregistrare|Num[aă]r\s*înregistrare)\s*[:-]?\s*([A-Z0-9/.-]+)/i,
      )?.[2] ?? null,
    registrationDate:
      plain.match(
        /(Data\s*Înregistrare|Data\s*inscrierii)\s*[:-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
      )?.[2] ?? null,
    suprafataHa: extractNumeric(
      plain
        .match(/(Suprafa[țt]a[^.:;]*)(\d+(?:[.,]\d+)?)/i)
        ?.slice(1)
        .join(" ") ?? "",
    ),
    culturi:
      plain
        .match(/(Culturi\s*Principale|Culturi)\s*[:-]?\s*([A-Za-zĂÂÎȘȚăâîșț,\s-]+)/i)?.[2]
        ?.split(",")
        .map((x) => x.trim())
        .filter(Boolean) ?? [],
    categorie:
      plain.match(
        /(Categorie\s*Exploata[țt]ie|Categorie)\s*[:-]?\s*([A-Za-zĂÂÎȘȚăâîșț\s-]+)/i,
      )?.[2] ?? null,
  };
}

export const dajScraperProcessor: Processor<DajScraperJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);

  const endpointTemplate = process.env.DAJ_ENDPOINT_TEMPLATE;
  if (!endpointTemplate) {
    return { ok: true, status: "skipped", reason: "missing_daj_endpoint_template" };
  }

  const url = endpointTemplate
    .replace("{cui}", encodeURIComponent(job.data.cui))
    .replace("{judet}", encodeURIComponent(job.data.judet ?? ""));
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "text/html,application/json" },
    signal: AbortSignal.timeout(Number(process.env.DAJ_TIMEOUT_MS ?? "20000")),
  });

  if (response.status === 404) return { ok: true, status: "not_found", source: "daj_scraper" };
  if (!response.ok) throw new Error(`DAJ scrape failed: ${response.status}`);

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as Record<string, unknown>)
    : parseDajHtml(await response.text());

  await patchCompanyMetadata(job.data.tenantId, job.data.companyId, {
    dajScraper: {
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
    source: "daj_scraper",
    operation: "scrape",
    requestPayload: { url, cui: job.data.cui, judet: job.data.judet ?? null },
    responsePayload: payload,
    fieldsUpdated: ["metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: "success", source: "daj_scraper" };
};
