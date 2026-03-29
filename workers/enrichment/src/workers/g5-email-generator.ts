import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverContacts, silverEnrichmentLog, sql } from "@cerniq/db";
import { createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

export type EmailGeneratorJobData = {
  tenantId: string;
  companyId: string;
  contactId: string;
  domain?: string;
  pattern?: string;
  correlationId?: string;
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z]/g, "");
}

function extractDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const withProtocol =
      input.startsWith("http://") || input.startsWith("https://") ? input : `https://${input}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "");
  } catch {
    const cleaned = input.trim().toLowerCase();
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleaned)) return cleaned.replace(/^www\./, "");
    return null;
  }
}

function generateEmail(
  firstName: string,
  lastName: string,
  domain: string,
  pattern: string,
): string {
  const first = normalizeName(firstName);
  const last = normalizeName(lastName);
  const f = first[0] ?? "";
  const l = last[0] ?? "";

  const prefix = pattern
    .replaceAll("{first}", first)
    .replaceAll("{last}", last)
    .replaceAll("{f}", f)
    .replaceAll("{l}", l);

  return `${prefix}@${domain.toLowerCase()}`;
}

export const emailGeneratorProcessor: Processor<EmailGeneratorJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:discover:email-generate",
    async (_span) => {
      const startedAt = Date.now();
      await setSessionTenantId(job.data.tenantId);

      const contact = await db.query.silverContacts.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.contactId)),
      });
      if (!contact) return { ok: false, status: "not_found", reason: "contact_missing" };
      if (!contact.prenume || !contact.nume)
        return { ok: true, status: "skipped", reason: "missing_name" };

      const company = await db.query.silverCompanies.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
      });
      if (!company) return { ok: false, status: "not_found", reason: "company_missing" };

      const patternFromMetadata =
        company.metadata &&
        typeof company.metadata === "object" &&
        "emailPattern" in company.metadata &&
        typeof (company.metadata as Record<string, unknown>).emailPattern === "object"
          ? ((company.metadata as Record<string, unknown>).emailPattern as Record<string, unknown>)
              .pattern
          : null;

      const pattern =
        job.data.pattern ?? (typeof patternFromMetadata === "string" ? patternFromMetadata : null);
      const domain = extractDomain(job.data.domain ?? company.website);
      if (!pattern || !domain)
        return { ok: true, status: "skipped", reason: "missing_pattern_or_domain" };

      const generatedEmail = generateEmail(contact.prenume, contact.nume, domain, pattern);

      await db
        .update(silverContacts)
        .set({
          email: generatedEmail,
          emailVerified: false,
          metadata: sql`jsonb_set(COALESCE(${silverContacts.metadata}, '{}'::jsonb), '{emailGenerated}', ${JSON.stringify(
            {
              pattern,
              generatedEmail,
              generatedAt: new Date().toISOString(),
            },
          )}::jsonb)`,
          updatedAt: new Date(),
        })
        .where(sql`${silverContacts.id} = ${job.data.contactId}`);

      const queue = createQueue("discover:email:zerobounce");
      await queue.add("validate-generated-email", {
        tenantId: job.data.tenantId,
        contactId: job.data.contactId,
        email: generatedEmail,
        correlationId: job.data.correlationId,
      });
      await queue.close();

      await db.insert(silverEnrichmentLog).values({
        tenantId: job.data.tenantId,
        entityType: "contact",
        entityId: job.data.contactId,
        source: "email_generator",
        operation: "generate",
        requestPayload: { pattern, domain },
        responsePayload: { generatedEmail },
        fieldsUpdated: ["email", "metadata"],
        correlationId: job.data.correlationId,
        jobId: String(job.id ?? ""),
        durationMs: Date.now() - startedAt,
      });

      return { ok: true, status: "success", email: generatedEmail, pattern, domain };
    },
    { tenantId: job.data.tenantId },
  );
};
