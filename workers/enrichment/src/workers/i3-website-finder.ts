import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createQueue } from "@cerniq/worker-shared";

export type WebsiteFinderJobData = {
  tenantId: string;
  companyId: string;
  denumire: string;
  cui?: string;
  correlationId?: string;
};

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function verifyCompanyWebsite(url: string, denumire: string, cui?: string) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(Number(process.env.WEBSITE_VERIFY_TIMEOUT_MS ?? "10000")),
    });
    if (!response.ok) return { isCompanyWebsite: false, normalizedUrl: url };
    const text = (await response.text()).toLowerCase();
    const den = denumire.toLowerCase();
    const hasName =
      text.includes(den) || den.split(/\s+/).some((word) => word.length > 4 && text.includes(word));
    const hasCui = cui ? text.includes(cui.replace(/\D/g, "")) : false;
    const normalizedUrl = `${new URL(url).protocol}//${new URL(url).hostname}`;
    return { isCompanyWebsite: hasName || hasCui, normalizedUrl };
  } catch {
    return { isCompanyWebsite: false, normalizedUrl: url };
  }
}

export const websiteFinderProcessor: Processor<WebsiteFinderJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);

  const bingKey = process.env.BING_API_KEY;
  if (!bingKey) {
    return { ok: true, status: "skipped", reason: "missing_bing_api_key" };
  }

  const query = `${job.data.denumire} romania site oficial`;
  const url = new URL("https://api.bing.microsoft.com/v7.0/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "10");
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Ocp-Apim-Subscription-Key": bingKey, Accept: "application/json" },
    signal: AbortSignal.timeout(Number(process.env.BING_TIMEOUT_MS ?? "15000")),
  });
  if (!response.ok) throw new Error(`Bing search failed: ${response.status}`);

  const payload = (await response.json()) as Record<string, unknown>;
  const webPages =
    payload.webPages && typeof payload.webPages === "object"
      ? (((payload.webPages as Record<string, unknown>).value as
          | Array<Record<string, unknown>>
          | undefined) ?? [])
      : [];
  const excluded = [
    "facebook.com",
    "linkedin.com",
    "twitter.com",
    "youtube.com",
    "listafirme.ro",
    "risco.ro",
    "termene.ro",
  ];
  const candidates = webPages
    .map((r) => String(r.url ?? "").trim())
    .filter(Boolean)
    .filter((u) => !excluded.some((e) => u.toLowerCase().includes(e)));

  if (candidates.length === 0) return { ok: true, status: "not_found", source: "website_finder" };

  let selected: string | null = null;
  for (const candidate of candidates.slice(0, 5)) {
    const verified = await verifyCompanyWebsite(candidate, job.data.denumire, job.data.cui);
    if (verified.isCompanyWebsite) {
      selected = verified.normalizedUrl;
      break;
    }
  }
  if (!selected) return { ok: true, status: "not_verified", source: "website_finder" };

  await db
    .update(silverCompanies)
    .set({
      website: selected,
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        websiteFinder: {
          query,
          selected,
          candidates: candidates.slice(0, 5),
          searchedAt: new Date().toISOString(),
        },
      })}::jsonb`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  const queue = createQueue("scrape:website:contact-page");
  await queue.add("scrape-contact-page", {
    tenantId: job.data.tenantId,
    companyId: job.data.companyId,
    websiteUrl: selected,
    correlationId: job.data.correlationId,
  });
  await queue.close();

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "website_finder",
    operation: "search",
    requestPayload: { query },
    responsePayload: { selected, candidates: candidates.slice(0, 5) },
    fieldsUpdated: ["website", "metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: "success", website: selected, domain: extractDomain(selected) };
};
