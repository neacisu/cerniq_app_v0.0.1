import type { Processor } from "bullmq";
import type { CountryCode } from "libphonenumber-js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  getBronzeContactForTenant,
  markNormalizationResult,
  triggerCuiValidationIfPossible,
  type BronzeNormalizationJobData,
} from "./normalization-utils.js";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { classifyAndRethrow } from "../lib/error-classification.js";

export type PhoneNormalizerJobData = BronzeNormalizationJobData & {
  countryCode?: string;
};

const MOBILE_PREFIXES = new Set(["72", "73", "74", "75", "76", "77", "78", "79"]);

export const phoneNormalizerProcessor: Processor<PhoneNormalizerJobData> = async (job) => {
  const startedAt = Date.now();
  try {
    const contact = await getBronzeContactForTenant(job.data.tenantId, job.data.bronzeContactId);
    const rawPhone = typeof contact.extractedPhone === "string" ? contact.extractedPhone : null;
    if (!rawPhone) {
      return { ok: true, status: "skipped", reason: "empty_phone" };
    }

    // GAP-B12: Use country code from job data, default to RO
    const defaultCountry = (job.data.countryCode?.toUpperCase() ?? "RO") as CountryCode;
    const parsed = parsePhoneNumberFromString(rawPhone, defaultCountry);
    const isValid = parsed?.isValid() ?? false;
    const e164 = parsed?.number ?? null;
    const national = parsed?.formatNational() ?? null;
    const cleaned = rawPhone.replaceAll(/[^\d+]/g, "").replace(/^(?:\+40|0040|40)/, "0");
    const phoneType =
      cleaned.length >= 3 && MOBILE_PREFIXES.has(cleaned.replace(/^0/, "").slice(0, 2))
        ? "mobile"
        : "landline";

    await markNormalizationResult(
      job.data.tenantId,
      job.data.bronzeContactId,
      { extractedPhone: isValid ? e164 : null },
      {
        phoneNormalization: {
          original: rawPhone,
          normalized: e164,
          national,
          valid: isValid,
          phoneType,
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
      status: isValid ? "success" : "invalid",
      isValid,
      e164,
      national,
      country: parsed?.country ?? defaultCountry,
      phoneType,
    };
  } catch (error) {
    jobErrors.add(1, { worker: "b3-phone-normalizer" });
    classifyAndRethrow(error);
  } finally {
    jobsProcessed.add(1, { worker: "b3-phone-normalizer" });
    jobDuration.record(Date.now() - startedAt, { worker: "b3-phone-normalizer" });
  }
};
