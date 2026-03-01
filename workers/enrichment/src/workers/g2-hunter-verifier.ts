import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverContacts, silverEnrichmentLog, sql } from "@cerniq/db";
import { hunterEmailVerify } from "../lib/hunter-api-client.js";

export type HunterVerifyJobData = {
  tenantId: string;
  contactId: string;
  email: string;
  correlationId?: string;
};

export const hunterVerifierProcessor: Processor<HunterVerifyJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);

  const email = job.data.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, status: "invalid_email" };
  }

  const result = await hunterEmailVerify(email);
  if (!result) {
    return { ok: true, status: "api_no_result", email };
  }

  const isVerified = result.result === "deliverable" || result.status === "valid";
  const deliverability =
    result.result === "deliverable"
      ? "deliverable"
      : result.result === "risky"
        ? "risky"
        : "undeliverable";

  await db
    .update(silverContacts)
    .set({
      emailVerified: isVerified,
      emailValidationDate: new Date(),
      emailValidationSource: "hunter",
      emailDeliverability: deliverability,
      emailCatchAll: result.accept_all,
      emailRoleBased: Boolean(result.role ?? false),
      metadata: sql`COALESCE(${silverContacts.metadata}, '{}'::jsonb) || ${JSON.stringify({
        hunterVerify: {
          status: result.status,
          result: result.result,
          score: result.score,
          disposable: result.disposable,
          webmail: result.webmail,
          mx_records: result.mx_records,
          smtp_check: result.smtp_check,
          gibberish: result.gibberish,
          verifiedAt: new Date().toISOString(),
        },
      })}::jsonb`,
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

  return {
    ok: true,
    status: "success",
    email,
    verified: isVerified,
    deliverability,
    score: result.score,
  };
};
