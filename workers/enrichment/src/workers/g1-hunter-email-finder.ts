import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  silverCompanies,
  silverContacts,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";
import { hunterDomainSearch } from "../lib/hunter-api-client.js";

export type HunterEmailJobData = {
  tenantId: string;
  companyId: string;
  domain?: string;
  companyName?: string;
  correlationId?: string;
};

function isGenericEmail(email: string): boolean {
  const genericPrefixes = [
    "info",
    "contact",
    "office",
    "sales",
    "support",
    "hello",
    "admin",
    "noreply",
    "no-reply",
    "marketing",
    "press",
    "media",
  ];
  const prefix = email.split("@")[0]?.toLowerCase() ?? "";
  return genericPrefixes.some(
    (g) => prefix === g || prefix.startsWith(`${g}.`) || prefix.startsWith(`${g}_`),
  );
}

function extractDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.trim().toLowerCase();
  if (!cleaned) return null;
  try {
    const withProtocol =
      cleaned.startsWith("http://") || cleaned.startsWith("https://")
        ? cleaned
        : `https://${cleaned}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "");
  } catch {
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleaned)) return cleaned.replace(/^www\./, "");
    return null;
  }
}

export const hunterEmailFinderProcessor: Processor<HunterEmailJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);

  const company = await db.query.silverCompanies.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
  });
  if (!company) {
    return { ok: false, status: "not_found", reason: "company_missing" };
  }

  const domain = extractDomain(job.data.domain ?? company.website);
  if (!domain) {
    return { ok: true, status: "skipped", reason: "missing_domain" };
  }

  const response = await hunterDomainSearch(domain);
  if (!response || response.emails.length === 0) {
    return { ok: true, status: "not_found", source: "hunter_email", domain };
  }

  let storedCount = 0;
  let bestEmail: { value: string; confidence: number } | null = null;

  for (const emailData of response.emails) {
    const email = String(emailData.value ?? "")
      .trim()
      .toLowerCase();
    if (!email || isGenericEmail(email)) continue;

    const existing = await db.query.silverContacts.findFirst({
      where: (t, { and, eq }) =>
        and(
          eq(t.tenantId, job.data.tenantId),
          eq(t.companyId, job.data.companyId),
          eq(t.email, email),
        ),
    });

    const confidence = Number(emailData.confidence ?? 0);
    const emailVerified = String(emailData.verification?.status ?? "").toLowerCase() === "valid";
    const prenume = typeof emailData.first_name === "string" ? emailData.first_name : undefined;
    const nume = typeof emailData.last_name === "string" ? emailData.last_name : undefined;

    if (existing) {
      await db
        .update(silverContacts)
        .set({
          emailVerified,
          prenume: prenume ?? existing.prenume ?? undefined,
          nume: nume ?? existing.nume ?? undefined,
          functie:
            (typeof emailData.position === "string" && emailData.position) ||
            (typeof emailData.department === "string" && emailData.department) ||
            existing.functie ||
            undefined,
          linkedinUrl:
            (typeof emailData.linkedin === "string" && emailData.linkedin) ||
            existing.linkedinUrl ||
            undefined,
          metadata: sql`COALESCE(${silverContacts.metadata}, '{}'::jsonb) || ${JSON.stringify({
            hunter: emailData,
            emailConfidence: confidence,
          })}::jsonb`,
          updatedAt: new Date(),
        })
        .where(sql`${silverContacts.id} = ${existing.id}`);
    } else {
      await db.insert(silverContacts).values({
        tenantId: job.data.tenantId,
        companyId: job.data.companyId,
        prenume,
        nume,
        email,
        emailVerified,
        functie:
          (typeof emailData.position === "string" && emailData.position) ||
          (typeof emailData.department === "string" && emailData.department) ||
          undefined,
        linkedinUrl: typeof emailData.linkedin === "string" ? emailData.linkedin : undefined,
        metadata: {
          source: "hunter_email",
          hunter: emailData,
          emailConfidence: confidence,
        },
      });
    }

    if (!bestEmail || confidence > bestEmail.confidence) {
      bestEmail = { value: email, confidence };
    }
    storedCount += 1;
  }

  await db
    .update(silverCompanies)
    .set({
      email: bestEmail?.value ?? company.email ?? undefined,
      enrichmentStatus: "in_progress",
      lastEnrichedAt: new Date(),
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        hunterEmail: {
          domain,
          found: response.emails.length,
          stored: storedCount,
          bestEmail,
        },
      })}::jsonb`,
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "hunter_email",
    operation: "fetch",
    requestPayload: { domain },
    responsePayload: response,
    fieldsUpdated: ["email", "metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return {
    ok: true,
    status: "success",
    source: "hunter_email",
    domain,
    emailsFound: response.emails.length,
    stored: storedCount,
  };
};
