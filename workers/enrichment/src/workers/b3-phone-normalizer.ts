import type { Processor } from "bullmq";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  getBronzeContactForTenant,
  markNormalizationResult,
  type BronzeNormalizationJobData,
} from "./normalization-utils.js";

export type PhoneNormalizerJobData = BronzeNormalizationJobData;

const MOBILE_PREFIXES = ["72", "73", "74", "75", "76", "77", "78", "79"];

export const phoneNormalizerProcessor: Processor<PhoneNormalizerJobData> = async (job) => {
  const contact = await getBronzeContactForTenant(job.data.tenantId, job.data.bronzeContactId);
  const rawPhone = typeof contact.extractedPhone === "string" ? contact.extractedPhone : null;
  if (!rawPhone) {
    return { ok: true, status: "skipped", reason: "empty_phone" };
  }

  const parsed = parsePhoneNumberFromString(rawPhone, "RO");
  const isValid = parsed?.isValid() ?? false;
  const e164 = parsed?.number ?? null;
  const national = parsed?.formatNational() ?? null;
  const cleaned = rawPhone.replace(/[^\d+]/g, "").replace(/^(?:\+40|0040|40)/, "0");
  const phoneType =
    cleaned.length >= 3 && MOBILE_PREFIXES.includes(cleaned.replace(/^0/, "").slice(0, 2))
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

  return {
    ok: true,
    status: isValid ? "success" : "invalid",
    isValid,
    e164,
    national,
    country: parsed?.country ?? "RO",
    phoneType,
  };
};
