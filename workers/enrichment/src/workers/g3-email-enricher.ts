import { createHash } from "node:crypto";
import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverContacts, silverEnrichmentLog, sql } from "@cerniq/db";
import { createCircuitBreaker, withExternalApiMetrics } from "@cerniq/worker-shared";

const clearbitBreaker = createCircuitBreaker(
  async (email: string, apiKey: string) => {
    return withExternalApiMetrics("clearbit", async () => {
      const response = await fetch(
        `https://person.clearbit.com/v2/people/find?email=${encodeURIComponent(email)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(Number(process.env.CLEARBIT_TIMEOUT_MS ?? "12000")),
        },
      );
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Clearbit API error: ${response.status}`);
      return (await response.json()) as Record<string, unknown>;
    });
  },
  "clearbit",
  { timeout: 12000, errorThresholdPercentage: 50, resetTimeout: 60000 },
);

const fullcontactBreaker = createCircuitBreaker(
  async (email: string, apiKey: string) => {
    return withExternalApiMetrics("fullcontact", async () => {
      const response = await fetch("https://api.fullcontact.com/v3/person.enrich", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(Number(process.env.FULLCONTACT_TIMEOUT_MS ?? "12000")),
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`FullContact API error: ${response.status}`);
      return (await response.json()) as Record<string, unknown>;
    });
  },
  "fullcontact",
  { timeout: 12000, errorThresholdPercentage: 50, resetTimeout: 60000 },
);

async function fetchClearbit(email: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.CLEARBIT_API_KEY;
  if (!apiKey) return null;
  return clearbitBreaker.fire(email, apiKey);
}

async function fetchFullContact(email: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.FULLCONTACT_API_KEY;
  if (!apiKey) return null;
  return fullcontactBreaker.fire(email, apiKey);
}

export type EmailEnricherJobData = {
  tenantId: string;
  contactId: string;
  email?: string;
  correlationId?: string;
};

export const emailEnricherProcessor: Processor<EmailEnricherJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);

  const contact = await db.query.silverContacts.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.contactId)),
  });
  if (!contact) {
    return { ok: false, status: "not_found", reason: "contact_missing" };
  }

  const email = (job.data.email ?? contact.email ?? "").trim().toLowerCase();
  if (!email) {
    return { ok: true, status: "skipped", reason: "missing_email" };
  }

  const sources: Record<string, unknown> = {};

  try {
    const clearbit = await fetchClearbit(email);
    if (clearbit) sources.clearbit = clearbit;
  } catch (error) {
    sources.clearbitError = String(error);
  }
  try {
    const fullcontact = await fetchFullContact(email);
    if (fullcontact) sources.fullcontact = fullcontact;
  } catch (error) {
    sources.fullcontactError = String(error);
  }

  const gravatarHash = createHash("md5").update(email).digest("hex");
  sources.gravatar = {
    hash: gravatarHash,
    profileUrl: `https://www.gravatar.com/${gravatarHash}.json`,
  };

  const clearbitPerson = (sources.clearbit as Record<string, unknown> | undefined)?.person as
    | Record<string, unknown>
    | undefined;
  const fullcontactDetails = (sources.fullcontact as Record<string, unknown> | undefined)
    ?.details as Record<string, unknown> | undefined;

  const prenume =
    (typeof clearbitPerson?.name === "object" &&
    clearbitPerson?.name &&
    typeof (clearbitPerson.name as Record<string, unknown>).givenName === "string"
      ? ((clearbitPerson.name as Record<string, unknown>).givenName as string)
      : undefined) ??
    contact.prenume ??
    undefined;
  const nume =
    (typeof clearbitPerson?.name === "object" &&
    clearbitPerson?.name &&
    typeof (clearbitPerson.name as Record<string, unknown>).familyName === "string"
      ? ((clearbitPerson.name as Record<string, unknown>).familyName as string)
      : undefined) ??
    contact.nume ??
    undefined;

  const functie =
    (typeof clearbitPerson?.employment === "object" &&
    clearbitPerson?.employment &&
    typeof (clearbitPerson.employment as Record<string, unknown>).title === "string"
      ? ((clearbitPerson.employment as Record<string, unknown>).title as string)
      : undefined) ??
    (typeof fullcontactDetails?.title === "string" ? fullcontactDetails.title : undefined) ??
    contact.functie ??
    undefined;

  await db
    .update(silverContacts)
    .set({
      prenume,
      nume,
      functie,
      metadata: sql`jsonb_set(COALESCE(${silverContacts.metadata}, '{}'::jsonb), '{emailEnrichment}', ${JSON.stringify(
        {
          email,
          sources,
          enrichedAt: new Date().toISOString(),
        },
      )}::jsonb)`,
      updatedAt: new Date(),
    })
    .where(sql`${silverContacts.id} = ${job.data.contactId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "contact",
    entityId: job.data.contactId,
    source: "email_enricher",
    operation: "enrich",
    requestPayload: { email },
    responsePayload: sources,
    fieldsUpdated: ["prenume", "nume", "functie", "metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return {
    ok: true,
    status: "success",
    source: "email_enricher",
    email,
    sources: Object.keys(sources),
  };
};
