import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import {
  db,
  setSessionTenantId,
  silverCompanies,
  silverContacts,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";
import { hunterDomainSearch, type HunterEmailRecord } from "../lib/hunter-api-client.js";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("g1-hunter-email-finder", { etapa: "e1" });

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

function resolveContactFunctie(
  emailData: HunterEmailRecord,
  fallback?: string | null,
): string | undefined {
  if (emailData.position) return emailData.position;
  if (emailData.department) return emailData.department;
  return fallback || undefined;
}

async function upsertHunterContact(
  tenantId: string,
  companyId: string,
  emailData: HunterEmailRecord,
): Promise<{ value: string; confidence: number } | null> {
  const email = (emailData.value ?? "").trim().toLowerCase();
  if (!email || isGenericEmail(email)) return null;

  const existing = await db.query.silverContacts.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.tenantId, tenantId), eq(t.companyId, companyId), eq(t.email, email)),
  });

  const confidence = Number(emailData.confidence ?? 0);
  const emailVerified = (emailData.verification?.status ?? "").toLowerCase() === "valid";
  const prenume = emailData.first_name;
  const nume = emailData.last_name;
  const linkedinUrl = emailData.linkedin;

  if (existing) {
    await db
      .update(silverContacts)
      .set({
        emailVerified,
        prenume: prenume ?? existing.prenume ?? undefined,
        nume: nume ?? existing.nume ?? undefined,
        functie: resolveContactFunctie(emailData, existing.functie),
        linkedinUrl: linkedinUrl || existing.linkedinUrl || undefined,
        metadata: sql`jsonb_set(jsonb_set(COALESCE(${silverContacts.metadata}, '{}'::jsonb), '{hunter}', ${JSON.stringify(emailData)}::jsonb), '{emailConfidence}', ${JSON.stringify(confidence)}::jsonb)`,
        updatedAt: new Date(),
      })
      .where(sql`${silverContacts.id} = ${existing.id}`);
  } else {
    await db.insert(silverContacts).values({
      tenantId,
      companyId,
      prenume,
      nume,
      email,
      emailVerified,
      functie: resolveContactFunctie(emailData),
      linkedinUrl,
      metadata: { source: "hunter_email", hunter: emailData, emailConfidence: confidence },
    });
  }

  return { value: email, confidence };
}

export const hunterEmailFinderProcessor: Processor<HunterEmailJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:discover:email-hunter",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "G1:hunter-email-finder",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: "company",
        entityId: job.data.companyId,
      });

      try {
        svcLog.info(
          { tenantId: job.data.tenantId, companyId: job.data.companyId },
          "G1 Hunter domain search start",
        );
        await setSessionTenantId(job.data.tenantId);

        const company = await db.query.silverCompanies.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
        });
        if (!company) {
          log.warn("company_missing", "Silver company not found", {
            companyId: job.data.companyId,
          });
          return { ok: false, status: "not_found", reason: "company_missing" };
        }

        const domain = extractDomain(job.data.domain ?? company.website);
        if (!domain) {
          log.info("skipped", "Missing domain for Hunter", { companyId: job.data.companyId });
          return { ok: true, status: "skipped", reason: "missing_domain" };
        }

        log.step("hunter_request", "Hunter domain search", {
          domain,
          endpoint: "hunter/domain-search",
        });
        const response = await hunterDomainSearch(domain);
        log.info("hunter_response", "Hunter domain search result", {
          domain,
          emailsCount: response?.emails.length ?? 0,
          latencyMs: Date.now() - startedAt,
        });
        if (!response || response.emails.length === 0) {
          return { ok: true, status: "not_found", source: "hunter_email", domain };
        }

        let storedCount = 0;
        let bestEmail: { value: string; confidence: number } | null = null;

        for (const emailData of response.emails) {
          const stored = await upsertHunterContact(
            job.data.tenantId,
            job.data.companyId,
            emailData,
          );
          if (!stored) continue;
          if (!bestEmail || stored.confidence > bestEmail.confidence) bestEmail = stored;
          storedCount += 1;
        }

        await db
          .update(silverCompanies)
          .set({
            email: bestEmail?.value ?? company.email ?? undefined,
            enrichmentStatus: "in_progress",
            lastEnrichedAt: new Date(),
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{hunterEmail}', ${JSON.stringify(
              {
                domain,
                found: response.emails.length,
                stored: storedCount,
                bestEmail,
              },
            )}::jsonb)`,
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

        log.step("done", "Hunter email finder success", {
          domain,
          emailsFound: response.emails.length,
          stored: storedCount,
          latencyMs: Date.now() - startedAt,
        });

        return {
          ok: true,
          status: "success",
          source: "hunter_email",
          domain,
          emailsFound: response.emails.length,
          stored: storedCount,
        };
      } catch (error) {
        log.error(
          "fatal",
          `Hunter email finder eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, { tenantId: job.data.tenantId, companyId: job.data.companyId }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
