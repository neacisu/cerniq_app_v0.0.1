import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";

export type EmailPatternJobData = {
  tenantId: string;
  companyId: string;
  domain?: string;
  correlationId?: string;
};

type ContactForPattern = {
  email: string;
  prenume: string | null;
  nume: string | null;
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z]/g, "");
}

function detectEmailPatterns(contacts: ContactForPattern[]) {
  const patterns: Record<string, number> = {
    "{first}.{last}": 0,
    "{first}_{last}": 0,
    "{first}{last}": 0,
    "{f}{last}": 0,
    "{first}.{l}": 0,
    "{first}": 0,
    "{last}": 0,
  };

  let eligible = 0;
  for (const contact of contacts) {
    if (!contact.email || !contact.prenume || !contact.nume) continue;
    const first = normalizeName(contact.prenume);
    const last = normalizeName(contact.nume);
    if (!first || !last) continue;
    eligible += 1;

    const emailPrefix = contact.email.split("@")[0]?.toLowerCase() ?? "";
    const f = first[0] ?? "";
    const l = last[0] ?? "";

    if (emailPrefix === `${first}.${last}`) patterns["{first}.{last}"] += 1;
    else if (emailPrefix === `${first}_${last}`) patterns["{first}_{last}"] += 1;
    else if (emailPrefix === `${first}${last}`) patterns["{first}{last}"] += 1;
    else if (emailPrefix === `${f}${last}`) patterns["{f}{last}"] += 1;
    else if (emailPrefix === `${first}.${l}`) patterns["{first}.{l}"] += 1;
    else if (emailPrefix === first) patterns["{first}"] += 1;
    else if (emailPrefix === last) patterns["{last}"] += 1;
  }

  const sorted = Object.entries(patterns)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0 || eligible === 0) {
    return { bestPattern: null, confidence: 0, observedContacts: eligible };
  }
  const [bestPattern, count] = sorted[0];
  return { bestPattern, confidence: count / eligible, observedContacts: eligible };
}

export const emailPatternProcessor: Processor<EmailPatternJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);

  const contacts = await db.query.silverContacts.findMany({
    where: (t, { and, eq }) =>
      and(eq(t.tenantId, job.data.tenantId), eq(t.companyId, job.data.companyId)),
  });
  if (contacts.length < 2) {
    return { ok: true, status: "skipped", reason: "insufficient_contacts" };
  }

  const dataset: ContactForPattern[] = contacts
    .filter((c) => Boolean(c.email))
    .map((c) => ({ email: c.email ?? "", prenume: c.prenume ?? null, nume: c.nume ?? null }));
  const patterns = detectEmailPatterns(dataset);
  if (!patterns.bestPattern) {
    return { ok: true, status: "no_pattern_detected" };
  }

  await db
    .update(silverCompanies)
    .set({
      metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{emailPattern}', ${JSON.stringify(
        {
          pattern: patterns.bestPattern,
          confidence: patterns.confidence,
          observedContacts: patterns.observedContacts,
          detectedAt: new Date().toISOString(),
        },
      )}::jsonb)`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "email_pattern",
    operation: "detect",
    requestPayload: { domain: job.data.domain ?? null, contacts: dataset.length },
    responsePayload: patterns,
    fieldsUpdated: ["metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return {
    ok: true,
    status: "success",
    pattern: patterns.bestPattern,
    confidence: patterns.confidence,
  };
};
