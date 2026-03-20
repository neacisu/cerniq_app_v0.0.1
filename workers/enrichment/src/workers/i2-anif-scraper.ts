import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverEnrichmentLog } from "@cerniq/db";
import { createCircuitBreaker } from "@cerniq/worker-shared";
import { patchCompanyMetadata } from "./pipeline-utils.js";

export type AnifScraperJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  judet?: string;
  correlationId?: string;
};

const ANIF_VALUE_CHARS = new Set("abcdefghijklmnopqrstuvwxyz0123456789 -ăâîșțĂÂÎȘȚ".split(""));

function stripHtmlTags(html: string): string {
  const parts: string[] = [];
  let inTag = false;
  for (const ch of html) {
    if (ch === "<") {
      inTag = true;
      parts.push(" ");
    } else if (ch === ">") {
      inTag = false;
    } else if (!inTag) {
      parts.push(ch);
    }
  }
  return parts.join("");
}

function findLabelEnd(lower: string, variants: string[]): number {
  for (const v of variants) {
    const idx = lower.indexOf(v);
    if (idx >= 0) return idx + v.length;
  }
  return -1;
}

function skipSeparators(text: string, from: number): number {
  let pos = from;
  while (pos < text.length && (text[pos] === " " || text[pos] === ":" || text[pos] === "-")) pos++;
  return pos;
}

function extractTextValue(text: string, labelEnd: number): string | null {
  const start = skipSeparators(text, labelEnd);
  let end = start;
  while (end < text.length && end - start < 200 && ANIF_VALUE_CHARS.has(text[end].toLowerCase())) {
    end++;
  }
  const value = text.slice(start, end).trim();
  return value.length > 0 ? value : null;
}

function extractNumericValue(text: string, labelEnd: number): number | null {
  const start = skipSeparators(text, labelEnd);
  let end = start;
  while (end < text.length && "0123456789.,".includes(text[end])) end++;
  if (end === start) return null;
  return Number(text.slice(start, end).replace(",", ".")) || null;
}

function parseAnifHtml(html: string) {
  const plain = stripHtmlTags(html).replaceAll(/\s+/g, " ").trim();
  const lower = plain.toLowerCase();

  const suprafataEnd = findLabelEnd(lower, [
    "suprafata irigata",
    "suprafata irigată",
    "suprafața irigata",
    "suprafața irigată",
  ]);
  const tipContractEnd = findLabelEnd(lower, ["tip contract"]);
  const amenajareEnd = findLabelEnd(lower, ["amenajare irigare", "sistem irigare"]);

  return {
    suprafataIrigata: suprafataEnd >= 0 ? extractNumericValue(plain, suprafataEnd) : null,
    areContractIrigare: lower.includes("contract irigare"),
    tipContract: tipContractEnd >= 0 ? extractTextValue(plain, tipContractEnd) : null,
    amenajare: amenajareEnd >= 0 ? extractTextValue(plain, amenajareEnd) : null,
  };
}

const anifBreaker = createCircuitBreaker(
  async (url: string) => {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/html,application/json" },
      signal: AbortSignal.timeout(Number(process.env.ANIF_TIMEOUT_MS ?? "20000")),
    });
    if (response.status === 404) return { status: 404 as const, body: null };
    if (!response.ok) throw new Error(`ANIF scrape failed: ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? ((await response.json()) as Record<string, unknown>)
      : parseAnifHtml(await response.text());
    return { status: 200 as const, body };
  },
  "anif-scraper",
  { timeout: 20000, errorThresholdPercentage: 50, resetTimeout: 120000, volumeThreshold: 3 },
);

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

  const scraped = await anifBreaker.fire(url);
  if (scraped.status === 404 || !scraped.body) {
    return { ok: true, status: "not_found", source: "anif_scraper" };
  }
  const payload = scraped.body;

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
