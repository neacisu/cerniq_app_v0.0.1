import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import {
  getBronzeContactForTenant,
  markNormalizationResult,
  triggerCuiValidationIfPossible,
  type BronzeNormalizationJobData,
} from "./normalization-utils.js";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { classifyAndRethrow } from "../lib/error-classification.js";
import { createJobLogger, type JobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("b2-email-normalizer", { etapa: "e1" });

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

type BronzeContactRow = Awaited<ReturnType<typeof getBronzeContactForTenant>>;

function assessNormalizedEmailShape(normalizedEmail: string): {
  isValid: boolean;
  exceedsLengthLimits: boolean;
  invalidReason: "invalid_format" | "exceeds_rfc5321_length";
} {
  const isValid = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(normalizedEmail);
  const atIdx = normalizedEmail.lastIndexOf("@");
  const localPartCheck = atIdx === -1 ? normalizedEmail : normalizedEmail.slice(0, atIdx);
  const exceedsLengthLimits = normalizedEmail.length > 254 || localPartCheck.length > 64;
  const invalidReason = isValid ? "exceeds_rfc5321_length" : "invalid_format";
  return { isValid, exceedsLengthLimits, invalidReason };
}

async function persistB2InvalidEmail(
  job: EmailNormalizerJobData,
  log: JobLogger,
  rawEmail: string,
  normalizedEmail: string,
  reason: string,
): Promise<{ ok: true; status: "invalid"; normalizedEmail: string; isValid: false }> {
  await markNormalizationResult(
    job.tenantId,
    job.bronzeContactId,
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

async function persistB2ValidEmail(
  job: EmailNormalizerJobData,
  log: JobLogger,
  rawEmail: string,
  normalizedEmail: string,
  contact: BronzeContactRow,
): Promise<{
  ok: true;
  status: "success";
  normalizedEmail: string;
  isValid: true;
  emailType: "free" | "corporate";
  isRoleBased: boolean;
}> {
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
    job.tenantId,
    job.bronzeContactId,
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
  log.info("normalize_delta", "Rezumat normalizare email", {
    inputFields: { extractedEmail: rawEmail },
    normalizedFields: { extractedEmail: normalizedEmail, emailType, isRoleBased },
    changesApplied: { emailChanged: rawEmail !== normalizedEmail },
  });

  const cui = typeof contact.extractedCui === "string" ? contact.extractedCui : null;
  const nrRegCom = typeof contact.extractedNrRegCom === "string" ? contact.extractedNrRegCom : null;
  await triggerCuiValidationIfPossible(
    job.tenantId,
    job.bronzeContactId,
    cui,
    nrRegCom,
    job.correlationId,
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
    isValid: true,
    emailType,
    isRoleBased,
  };
}

export const emailNormalizerProcessor: Processor<EmailNormalizerJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:normalize:email",
    async (_span) => {
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
        importExecution: job.data.importExecution ?? null,
        etapa: "e1",
        correlationId: job.data.correlationId,
      }).forContact(job.data.bronzeContactId);
      try {
        svcLog.info(
          {
            tenantId: job.data.tenantId,
            correlationId: job.data.correlationId,
            bronzeContactId: job.data.bronzeContactId,
          },
          "B2 email-normalizer job",
        );
        log.step("start", "Pornire normalizare email", {
          bronzeContactId: job.data.bronzeContactId,
        });
        const contact = await getBronzeContactForTenant(
          job.data.tenantId,
          job.data.bronzeContactId,
        );
        const rawEmail = typeof contact.extractedEmail === "string" ? contact.extractedEmail : null;
        if (!rawEmail) {
          log.done("email_skip", "Email lipsă — normalizare sărită", {
            bronzeContactId: job.data.bronzeContactId,
          });
          return { ok: true, status: "skipped", reason: "empty_email" };
        }

        const normalizedEmail = normalizeEmail(rawEmail, true);
        const shape = assessNormalizedEmailShape(normalizedEmail);
        if (!shape.isValid || shape.exceedsLengthLimits) {
          return await persistB2InvalidEmail(
            job.data,
            log,
            rawEmail,
            normalizedEmail,
            shape.invalidReason,
          );
        }

        return await persistB2ValidEmail(job.data, log, rawEmail, normalizedEmail, contact);
      } catch (error) {
        const enriched = enrichError(error, {
          tenantId: job.data.tenantId,
          bronzeContactId: job.data.bronzeContactId,
        });
        const errMsg = error instanceof Error ? error.message : String(error);
        log.error("fatal", `Normalizare email eșuată: ${errMsg}`, {
          ...enriched,
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
    },
    { tenantId: job.data.tenantId },
  );
};
