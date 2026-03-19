import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";

export type ContactPageScraperJobData = {
  tenantId: string;
  companyId: string;
  websiteUrl: string;
  correlationId?: string;
};

// ---------------------------------------------------------------------------
// Regex constants — compiled once at module load, Unicode-aware (u flag),
// case-insensitive where noted (i flag). Hoisted here so they are auditable,
// testable in isolation, and allocated only once regardless of job throughput.
// ---------------------------------------------------------------------------

const HTML_TAG_RE = /<[^>]+>/gu;
const WHITESPACE_COLLAPSE_RE = /\s+/gu;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/gu;
const PHONE_RO_RE = /(?:\+40|0040|0)\s?[2-9]\d(?:[\s.-]?\d){7,9}/gu;
/** \p{L} with the `u` flag covers all Unicode letters — including the full
 *  Romanian alphabet — without listing them explicitly and without the [A-Za-z]
 *  duplication that arises when the `i` flag makes [A-Z] and [a-z] identical. */
const ADDRESS_RE = /(str\.?|strada|bd\.?|bulevardul)\s+[\p{L}0-9\s,.-]{10,120}/iu;

// ---------------------------------------------------------------------------

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function extractFromHtml(html: string) {
  const text = html.replaceAll(HTML_TAG_RE, " ").replaceAll(WHITESPACE_COLLAPSE_RE, " ");
  const emails = uniq(text.match(EMAIL_RE) ?? []).filter((e) => !e.includes("example.com"));
  const phones = uniq(text.match(PHONE_RO_RE) ?? []).map((p) =>
    p.replaceAll(WHITESPACE_COLLAPSE_RE, " ").trim(),
  );
  const address = ADDRESS_RE.exec(text)?.[0] ?? null;
  return { emails, phones, address };
}

export const contactPageScraperProcessor: Processor<ContactPageScraperJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);

  const base = job.data.websiteUrl.replace(/\/+$/, "");
  const paths = ["/contact", "/contacte", "/contact-us", "/despre-noi", "/about", "/"];

  let found: {
    emails: string[];
    phones: string[];
    address: string | null;
    sourceUrl: string;
  } | null = null;
  for (const path of paths) {
    const url = `${base}${path}`;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(Number(process.env.CONTACT_SCRAPE_TIMEOUT_MS ?? "12000")),
      });
      if (!response.ok) continue;
      const extracted = extractFromHtml(await response.text());
      if (extracted.emails.length > 0 || extracted.phones.length > 0 || extracted.address) {
        found = { ...extracted, sourceUrl: url };
        break;
      }
    } catch {
      // try next path
    }
  }

  if (!found) return { ok: true, status: "no_contact_info", source: "contact_scraper" };

  const mainEmail =
    found.emails.find(
      (e) => !e.toLowerCase().startsWith("info@") && !e.toLowerCase().startsWith("contact@"),
    ) ??
    found.emails[0] ??
    null;
  const mainPhone = found.phones[0] ?? null;

  await db
    .update(silverCompanies)
    .set({
      email: mainEmail ?? undefined,
      telefon: mainPhone ?? undefined,
      adresa: found.address ?? undefined,
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        contactScraper: {
          sourceUrl: found.sourceUrl,
          emails: found.emails,
          phones: found.phones,
          address: found.address,
          scrapedAt: new Date().toISOString(),
        },
      })}::jsonb`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "contact_scraper",
    operation: "scrape",
    requestPayload: { websiteUrl: job.data.websiteUrl },
    responsePayload: found,
    fieldsUpdated: ["email", "telefon", "adresa", "metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return {
    ok: true,
    status: "success",
    source: "contact_scraper",
    emailsFound: found.emails.length,
    phonesFound: found.phones.length,
  };
};
