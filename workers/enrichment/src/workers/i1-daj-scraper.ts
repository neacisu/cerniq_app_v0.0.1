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

// ---------------------------------------------------------------------------
// Regex constants — compiled once at module load, Unicode-aware (u flag),
// case-insensitive (i flag). Hoisted here so they are auditable, testable
// in isolation, and allocated only once regardless of job throughput.
// ---------------------------------------------------------------------------

/** Extracts the first decimal-like number from an arbitrary text fragment. */
const NUMERIC_RE = /(\d+(?:[.,]\d+)?)/u;

/** Strips HTML tags to produce a flat plain-text string for regex parsing. */
const HTML_TAG_RE = /<[^>]+>/gu;
const WHITESPACE_COLLAPSE_RE = /\s+/gu;

/** DAJ field label + value patterns.
 *  \p{L} (requires `u` flag) covers all Unicode letters — including the full
 *  Romanian alphabet (Ă Â Î Ș Ț and their lowercase forms) without listing
 *  them explicitly and without the [A-Za-z…] duplication that arises when the
 *  `i` flag makes [A-Z] and [a-z] functionally identical. */
const REGISTRATION_NUMBER_RE =
  /(Nr\.?\s*Înregistrare|Num[aă]r\s*înregistrare)\s*[:-]?\s*([A-Z0-9/.-]+)/iu;
const REGISTRATION_DATE_RE =
  /(Data\s*Înregistrare|Data\s*inscrierii)\s*[:-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/iu;
const SUPRAFATA_RE = /(Suprafa[țt]a[^.:;]*)(\d+(?:[.,]\d+)?)/iu;
const CULTURI_RE = /(Culturi\s*Principale|Culturi)\s*[:-]?\s*([\p{L},\s-]+)/iu;
const CATEGORIE_RE = /(Categorie\s*Exploata[țt]ie|Categorie)\s*[:-]?\s*([\p{L}\s-]+)/iu;

// ---------------------------------------------------------------------------

function extractNumeric(text: string): number | null {
  const matched = NUMERIC_RE.exec(text);
  if (!matched) return null;
  return Number(matched[1].replace(",", "."));
}

function parseDajHtml(html: string) {
  const plain = html.replaceAll(HTML_TAG_RE, " ").replaceAll(WHITESPACE_COLLAPSE_RE, " ").trim();

  const suprafataMatch = SUPRAFATA_RE.exec(plain);
  const culturiMatch = CULTURI_RE.exec(plain);

  return {
    registrationNumber: REGISTRATION_NUMBER_RE.exec(plain)?.[2] ?? null,
    registrationDate: REGISTRATION_DATE_RE.exec(plain)?.[2] ?? null,
    // suprafataMatch[2] is already the isolated numeric token captured by the regex;
    // no need to re-join the full match before parsing.
    suprafataHa: suprafataMatch ? extractNumeric(suprafataMatch[2]) : null,
    culturi:
      culturiMatch?.[2]
        ?.split(",")
        .map((x) => x.trim())
        .filter(Boolean) ?? [],
    categorie: CATEGORIE_RE.exec(plain)?.[2]?.trim() ?? null,
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
