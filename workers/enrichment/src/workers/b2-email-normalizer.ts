import type { Processor } from "bullmq";
import {
  getBronzeContactForTenant,
  markNormalizationResult,
  type BronzeNormalizationJobData,
} from "./normalization-utils.js";

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

const FREE_EMAIL_PROVIDERS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.ro",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "protonmail.com",
];

function normalizeEmail(email: string, stripPlusAlias = true): string {
  const [localPart, domain = ""] = email.trim().toLowerCase().split("@");
  if (!stripPlusAlias || !localPart.includes("+")) {
    return `${localPart}@${domain}`;
  }
  return `${localPart.split("+")[0]}@${domain}`;
}

export const emailNormalizerProcessor: Processor<EmailNormalizerJobData> = async (job) => {
  const contact = await getBronzeContactForTenant(job.data.tenantId, job.data.bronzeContactId);
  const rawEmail = typeof contact.extractedEmail === "string" ? contact.extractedEmail : null;
  if (!rawEmail) {
    return { ok: true, status: "skipped", reason: "empty_email" };
  }

  const normalizedEmail = normalizeEmail(rawEmail, true);
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  if (!isValid) {
    await markNormalizationResult(
      job.data.tenantId,
      job.data.bronzeContactId,
      { extractedEmail: null },
      {
        emailNormalization: {
          original: rawEmail,
          normalized: normalizedEmail,
          valid: false,
          reason: "invalid_format",
        },
      },
    );
    return { ok: true, status: "invalid", normalizedEmail, isValid: false };
  }

  const [localPart, domain] = normalizedEmail.split("@");
  const emailType = FREE_EMAIL_PROVIDERS.includes(domain) ? "free" : "corporate";
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

  return {
    ok: true,
    status: "success",
    normalizedEmail,
    isValid,
    emailType,
    isRoleBased,
  };
};
