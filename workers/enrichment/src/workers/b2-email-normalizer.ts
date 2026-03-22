import type { Processor } from "bullmq";
import {
  getBronzeContactForTenant,
  markNormalizationResult,
  triggerCuiValidationIfPossible,
  type BronzeNormalizationJobData,
} from "./normalization-utils.js";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { classifyAndRethrow } from "../lib/error-classification.js";
import { createJobLogger } from "../lib/job-logger.js";

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
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex === -1) return trimmed;
  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (!stripPlusAlias || !localPart.includes("+")) {
    return `${localPart}@${domain}`;
  }
  return `${localPart.split("+")[0]}@${domain}`;
}

export const emailNormalizerProcessor: Processor<EmailNormalizerJobData> = async (job) => {
  const startedAt = Date.now();
  const batchId =
    typeof job.data.batchId === "string" && job.data.batchId.length > 0
      ? job.data.batchId
      : undefined;
  const log = createJobLogger({
    batchId,
    tenantId: job.data.tenantId,
    workerName: "B2:email-normalizer",
    jobId: String(job.id ?? ""),
    startedAt,
  }).forContact(job.data.bronzeContactId);
  try {
    log.step("start", "Pornire normalizare email", {
      bronzeContactId: job.data.bronzeContactId,
    });
    const contact = await getBronzeContactForTenant(job.data.tenantId, job.data.bronzeContactId);
    const rawEmail = typeof contact.extractedEmail === "string" ? contact.extractedEmail : null;
    if (!rawEmail) {
      log.done("email_skip", "Email lipsă — normalizare sărită", {
        bronzeContactId: job.data.bronzeContactId,
      });
      return { ok: true, status: "skipped", reason: "empty_email" };
    }

    const normalizedEmail = normalizeEmail(rawEmail, true);
    const isValid = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(normalizedEmail);

    const atIdx = normalizedEmail.lastIndexOf("@");
    const localPartCheck = atIdx === -1 ? normalizedEmail : normalizedEmail.slice(0, atIdx);
    const exceedsLengthLimits = normalizedEmail.length > 254 || localPartCheck.length > 64;

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
            emailValid: false,
            reason,
          },
        },
      );
      log.done("email_invalid", "Email invalid — câmpul a fost golit", {
        original: rawEmail,
        normalized: normalizedEmail,
        reason,
      });
      return { ok: true, status: "invalid", normalizedEmail, isValid: false };
    }

    const domainAtIdx = normalizedEmail.lastIndexOf("@");
    const localPart = domainAtIdx === -1 ? normalizedEmail : normalizedEmail.slice(0, domainAtIdx);
    const domain = domainAtIdx === -1 ? "" : normalizedEmail.slice(domainAtIdx + 1);
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
          valid: true,
          emailValid: true,
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

    log.done("done", "Normalizare email finalizată", {
      original: rawEmail,
      normalizedEmail,
      emailType,
      isRoleBased,
    });
    return {
      ok: true,
      status: "success",
      normalizedEmail,
      isValid,
      emailType,
      isRoleBased,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error("fatal", `Normalizare email eșuată: ${errMsg}`, {
      bronzeContactId: job.data.bronzeContactId,
      errorMessage: errMsg,
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    jobErrors.add(1, { worker: "b2-email-normalizer" });
    classifyAndRethrow(error);
  } finally {
    jobsProcessed.add(1, { worker: "b2-email-normalizer" });
    jobDuration.record(Date.now() - startedAt, { worker: "b2-email-normalizer" });
  }
};
