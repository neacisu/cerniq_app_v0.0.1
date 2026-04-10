import { createHash } from "node:crypto";
import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverContacts, silverEnrichmentLog, sql } from "@cerniq/db";
import { hunterEmailVerify } from "../lib/hunter-api-client.js";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("g2-hunter-verifier", { etapa: "e1" });

export type HunterVerifyJobData = {
  tenantId: string;
  contactId: string;
  email: string;
  correlationId?: string;
};

export const hunterVerifierProcessor: Processor<HunterVerifyJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:discover:email-hunter-verify",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "G2:hunter-verifier",
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
          "G2 Hunter verify",
        );
        await setSessionTenantId(job.data.tenantId);

        const email = job.data.email.trim().toLowerCase();
        if (!email?.includes("@")) {
          log.warn("invalid_email", "Email invalid pentru verificare Hunter", {});
          return { ok: false, status: "invalid_email" };
        }

        const emailHashPrefix = createHash("sha256").update(email).digest("hex").slice(0, 12);
        log.step("hunter_request", "Hunter email verify", {
          endpoint: "hunter/verify",
          emailHashPrefix,
          emailDomain: email.split("@")[1] ?? null,
        });
        const result = await hunterEmailVerify(email);
        log.info("hunter_response", "Hunter verify result", {
          emailHashPrefix,
          hasResult: Boolean(result),
          latencyMs: Date.now() - startedAt,
        });
        if (!result) {
          return { ok: true, status: "api_no_result", email };
        }

        const isVerified = result.result === "deliverable" || result.status === "valid";
        let deliverability: "deliverable" | "risky" | "undeliverable";
        if (result.result === "deliverable") deliverability = "deliverable";
        else if (result.result === "risky") deliverability = "risky";
        else deliverability = "undeliverable";

        const hunterPayload = JSON.stringify({
          status: result.status,
          result: result.result,
          score: result.score,
          disposable: result.disposable,
          webmail: result.webmail,
          mx_records: result.mx_records,
          smtp_check: result.smtp_check,
          gibberish: result.gibberish,
          verifiedAt: new Date().toISOString(),
        });

        await db
          .update(silverContacts)
          .set({
            emailVerified: isVerified,
            emailValidationDate: new Date(),
            emailValidationSource: "hunter",
            emailDeliverability: deliverability,
            emailCatchAll: result.accept_all,
            emailRoleBased: Boolean(result.role ?? false),
            metadata: sql`jsonb_set(COALESCE(${silverContacts.metadata}, '{}'::jsonb), '{hunterVerify}', ${hunterPayload}::jsonb)`,
            updatedAt: new Date(),
          })
          .where(sql`${silverContacts.id} = ${job.data.contactId}`);

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "contact",
          entityId: job.data.contactId,
          source: "hunter_verify",
          operation: "validate",
          status: isVerified ? "success" : "partial",
          requestPayload: { email },
          responsePayload: result,
          fieldsUpdated: [
            "emailVerified",
            "emailValidationDate",
            "emailValidationSource",
            "emailDeliverability",
            "emailCatchAll",
          ],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });

        log.step("done", "Hunter verify success", {
          emailHashPrefix,
          verified: isVerified,
          deliverability,
          latencyMs: Date.now() - startedAt,
        });

        return {
          ok: true,
          status: "success",
          email,
          verified: isVerified,
          deliverability,
          score: result.score,
        };
      } catch (error) {
        log.error(
          "fatal",
          `Hunter verify eșuat: ${error instanceof Error ? error.message : String(error)}`,
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
