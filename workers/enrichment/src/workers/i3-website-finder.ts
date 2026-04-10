import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { createCircuitBreaker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("i3-website-finder", { etapa: "e1" });

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
    const hasCui = cui ? text.includes(cui.replaceAll(/\D/g, "")) : false;
    const normalizedUrl = `${new URL(url).protocol}//${new URL(url).hostname}`;
    return { isCompanyWebsite: hasName || hasCui, normalizedUrl };
  } catch {
    return { isCompanyWebsite: false, normalizedUrl: url };
  }
}

const bingSearchBreaker = createCircuitBreaker(
  async (query: string, bingKey: string) => {
    const url = new URL("https://api.bing.microsoft.com/v7.0/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", "10");
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Ocp-Apim-Subscription-Key": bingKey, Accept: "application/json" },
      signal: AbortSignal.timeout(Number(process.env.BING_TIMEOUT_MS ?? "15000")),
    });
    if (!response.ok) throw new Error(`Bing search failed: ${response.status}`);
    return (await response.json()) as Record<string, unknown>;
  },
  "bing-search",
  { timeout: 15000, errorThresholdPercentage: 50, resetTimeout: 60000 },
);

export const websiteFinderProcessor: Processor<WebsiteFinderJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:scrape:website-finder",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "I3:website-finder",
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
        svcLog.info(
          { tenantId: job.data.tenantId, companyId: job.data.companyId },
          "I3 website finder",
        );

        const bingKey = process.env.BING_API_KEY;
        if (!bingKey) {
          log.info("skip", "Lipsește BING_API_KEY", {
            scrapingResult: "skipped",
            latencyMs: Date.now() - startedAt,
          });
          return { ok: true, status: "skipped", reason: "missing_bing_api_key" };
        }

        const query = `${job.data.denumire} romania site oficial`;
        const bingApiUrl = new URL("https://api.bing.microsoft.com/v7.0/search");
        bingApiUrl.searchParams.set("q", query);
        bingApiUrl.searchParams.set("count", "10");
        targetUrl = bingApiUrl.toString();
        const payload = await bingSearchBreaker.fire(query, bingKey);
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

        if (candidates.length === 0) {
          log.info("scrape", "Niciun candidat Bing", {
            targetUrl,
            scrapingResult: "not_found",
            fieldsExtracted: { candidateCount: 0 },
            latencyMs: Date.now() - startedAt,
          });
          return { ok: true, status: "not_found", source: "website_finder" };
        }

        let selected: string | null = null;
        for (const candidate of candidates.slice(0, 5)) {
          const verified = await verifyCompanyWebsite(candidate, job.data.denumire, job.data.cui);
          if (verified.isCompanyWebsite) {
            selected = verified.normalizedUrl;
            break;
          }
        }
        if (!selected) {
          log.info("scrape", "Site neverificat", {
            targetUrl,
            scrapingResult: "not_verified",
            fieldsExtracted: { candidateCount: candidates.length },
            latencyMs: Date.now() - startedAt,
          });
          return { ok: true, status: "not_verified", source: "website_finder" };
        }

        await db
          .update(silverCompanies)
          .set({
            website: selected,
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{websiteFinder}', ${JSON.stringify(
              {
                query,
                selected,
                candidates: candidates.slice(0, 5),
                searchedAt: new Date().toISOString(),
              },
            )}::jsonb)`,
            lastEnrichedAt: new Date(),
          })
          .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

        const queue = createQueue("scrape:website:contact-page");
        await queue.add("scrape-contact-page", {
          tenantId: job.data.tenantId,
          companyId: job.data.companyId,
          websiteUrl: selected,
          correlationId: job.data.correlationId,
          ...(typeof job.data.correlationId === "string" && job.data.correlationId.length > 0
            ? { httpCorrelationId: job.data.correlationId }
            : {}),
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

        log.step("done", "Website găsit", {
          targetUrl,
          scrapingResult: "ok",
          fieldsExtracted: {
            selectedDomain: extractDomain(selected),
            candidateCount: candidates.length,
          },
          latencyMs: Date.now() - startedAt,
        });
        return { ok: true, status: "success", website: selected, domain: extractDomain(selected) };
      } catch (error) {
        log.error(
          "fatal",
          `Website finder eșuat: ${error instanceof Error ? error.message : String(error)}`,
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
