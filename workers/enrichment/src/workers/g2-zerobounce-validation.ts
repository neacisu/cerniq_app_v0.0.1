import { createHash } from "node:crypto";
import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverContacts, silverEnrichmentLog, sql } from "@cerniq/db";
import { zerobounceValidate } from "../lib/zerobounce-api-client.js";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("g2-zerobounce-validation", { etapa: "e1" });

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
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "G2:zerobounce-validation",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: "contact",
        entityId: job.data.contactId,
      });

      try {
        svcLog.info(
          { tenantId: job.data.tenantId, contactId: job.data.contactId },
          "G2 ZeroBounce validate",
        );
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
          log.info("skipped", "Lipsește email pentru ZeroBounce", {
            contactId: job.data.contactId,
          });
          return { ok: true, status: "skipped", reason: "missing_email" };
        }

        const emailHashPrefix = createHash("sha256").update(email).digest("hex").slice(0, 12);
        log.step("zerobounce_request", "ZeroBounce validate", {
          endpoint: "zerobounce/validate",
          emailHashPrefix,
          emailDomain: email.split("@")[1] ?? null,
        });
        const result = await zerobounceValidate(email);
        log.info("zerobounce_response", "ZeroBounce result", {
          emailHashPrefix,
          hasResult: Boolean(result),
          latencyMs: Date.now() - startedAt,
        });
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

        log.step("done", "ZeroBounce success", {
          emailHashPrefix,
          emailStatus: result.status ?? null,
          isValid,
          latencyMs: Date.now() - startedAt,
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
      } catch (error) {
        log.error(
          "fatal",
          `ZeroBounce eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              contactId: job.data.contactId,
            }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
