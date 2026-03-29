import type { Processor } from "bullmq";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverContacts, silverEnrichmentLog, sql } from "@cerniq/db";
import { zerobounceValidate } from "../lib/zerobounce-api-client.js";

export type ZeroBounceJobData = {
  tenantId: string;
  contactId: string;
  email?: string;
  correlationId?: string;
};

export const zerobounceValidationProcessor: Processor<ZeroBounceJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:discover:email-zerobounce",
    async (_span) => {
      const startedAt = Date.now();
      await setSessionTenantId(job.data.tenantId);

      const contact = await db.query.silverContacts.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.contactId)),
      });
      if (!contact) {
        return { ok: false, status: "not_found", reason: "contact_missing" };
      }

      const email = (job.data.email ?? contact.email ?? "").trim().toLowerCase();
      if (!email) {
        return { ok: true, status: "skipped", reason: "missing_email" };
      }

      const result = await zerobounceValidate(email);
      if (!result) {
        return { ok: true, status: "not_found", source: "zerobounce", email };
      }

      const status = String(result.status ?? "").toLowerCase();
      const isValid = status === "valid";
      const isCatchAll = status === "catch-all";
      const isDisposable = String(result.sub_status ?? "").toLowerCase() === "disposable";

      const zerobouncePayload = JSON.stringify({
        email,
        status: result.status,
        subStatus: result.sub_status,
        isCatchAll,
        isDisposable,
        didYouMean: result.did_you_mean ?? null,
        mxFound: result.mx_found ?? null,
        smtpProvider: result.smtp_provider ?? null,
        validatedAt: new Date().toISOString(),
      });

      await db
        .update(silverContacts)
        .set({
          emailVerified: isValid,
          metadata: sql`jsonb_set(COALESCE(${silverContacts.metadata}, '{}'::jsonb), '{zerobounce}', ${zerobouncePayload}::jsonb)`,
          updatedAt: new Date(),
        })
        .where(sql`${silverContacts.id} = ${job.data.contactId}`);

      await db.insert(silverEnrichmentLog).values({
        tenantId: job.data.tenantId,
        entityType: "contact",
        entityId: job.data.contactId,
        source: "zerobounce_validation",
        operation: "validate",
        requestPayload: { email },
        responsePayload: result,
        fieldsUpdated: ["emailVerified", "metadata"],
        correlationId: job.data.correlationId,
        jobId: String(job.id ?? ""),
        durationMs: Date.now() - startedAt,
      });

      return {
        ok: true,
        status: "success",
        source: "zerobounce",
        email,
        emailStatus: result.status ?? null,
        isValid,
        isCatchAll,
        isDisposable,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
