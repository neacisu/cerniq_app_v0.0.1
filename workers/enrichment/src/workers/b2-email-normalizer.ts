import type { Processor } from "bullmq";
import {
  getBronzeContactForTenant,
  markNormalizationResult,
  triggerCuiValidationIfPossible,
  type BronzeNormalizationJobData,
} from "./normalization-utils.js";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { classifyAndRethrow } from "../lib/error-classification.js";

export type EmailNormalizerJobData = BronzeNormalizationJobData;

const ROLE_BASED_PREFIXES = [
  "info",
  "contact",
  "office",
  "secretariat",
  "admin",
  "support",
  "sales",
  "marketing",
  "hr",
  "facturi",
];

const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.ro",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "protonmail.com",
]);

function normalizeEmail(email: string, stripPlusAlias = true): string {
  const [localPart, domain = ""] = email.trim().toLowerCase().split("@");
  if (!stripPlusAlias || !localPart.includes("+")) {
    return `${localPart}@${domain}`;
  }
  return `${localPart.split("+")[0]}@${domain}`;
}

export const emailNormalizerProcessor: Processor<EmailNormalizerJobData> = async (job) => {
  const startedAt = Date.now();
  try {
    const contact = await getBronzeContactForTenant(job.data.tenantId, job.data.bronzeContactId);
    const rawEmail = typeof contact.extractedEmail === "string" ? contact.extractedEmail : null;
    if (!rawEmail) {
      return { ok: true, status: "skipped", reason: "empty_email" };
    }

    const normalizedEmail = normalizeEmail(rawEmail, true);
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    // GAP-B11: RFC 5321 length limits (254 total, 64 local part)
    const [localPartCheck] = normalizedEmail.split("@");
    const exceedsLengthLimits = normalizedEmail.length > 254 || (localPartCheck?.length ?? 0) > 64;

    if (!isValid || exceedsLengthLimits) {
      const reason = isValid ? "exceeds_rfc5321_length" : "invalid_format";
      await markNormalizationResult(
        job.data.tenantId,
        job.data.bronzeContactId,
        { extractedEmail: null },
        {
          emailNormalization: {
            original: rawEmail,
            normalized: normalizedEmail,
            valid: false,
            reason,
          },
        },
      );
      return { ok: true, status: "invalid", normalizedEmail, isValid: false };
    }

    const [localPart, domain] = normalizedEmail.split("@");
    const emailType = FREE_EMAIL_PROVIDERS.has(domain) ? "free" : "corporate";
    const isRoleBased = ROLE_BASED_PREFIXES.some(
      (prefix) =>
        localPart === prefix ||
        localPart.startsWith(`${prefix}.`) ||
        localPart.startsWith(`${prefix}_`),
    );
    await markNormalizationResult(
      job.data.tenantId,
      job.data.bronzeContactId,
      { extractedEmail: normalizedEmail },
      {
        emailNormalization: {
          original: rawEmail,
          normalized: normalizedEmail,
          localPart,
          domain,
          emailType,
          isRoleBased,
        },
      },
    );

    // GAP-B14: Safety net — trigger CUI validation if not yet triggered by B1
    const cui = typeof contact.extractedCui === "string" ? contact.extractedCui : null;
    const nrRegCom =
      typeof contact.extractedNrRegCom === "string" ? contact.extractedNrRegCom : null;
    await triggerCuiValidationIfPossible(
      job.data.tenantId,
      job.data.bronzeContactId,
      cui,
      nrRegCom,
      job.data.correlationId,
    );

    return {
      ok: true,
      status: "success",
      normalizedEmail,
      isValid,
      emailType,
      isRoleBased,
    };
  } catch (error) {
    jobErrors.add(1, { worker: "b2-email-normalizer" });
    classifyAndRethrow(error);
  } finally {
    jobsProcessed.add(1, { worker: "b2-email-normalizer" });
    jobDuration.record(Date.now() - startedAt, { worker: "b2-email-normalizer" });
  }
};
