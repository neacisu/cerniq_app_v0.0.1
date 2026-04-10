import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
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
import { createJobLogger, type JobLogger } from "../lib/job-logger.js";
import { phoneLast4 } from "../lib/phone-last4.js";

const svcLog = createServiceLogger("b3-phone-normalizer", { etapa: "e1" });

export type PhoneNormalizerJobData = BronzeNormalizationJobData & {
  countryCode?: string;
};

const MOBILE_PREFIXES = new Set(["70", "71", "72", "73", "74", "75", "76", "77", "78", "79"]);

type BronzeContactRow = Awaited<ReturnType<typeof getBronzeContactForTenant>>;

async function runB3PhoneNormalization(
  job: PhoneNormalizerJobData,
  log: JobLogger,
  contact: BronzeContactRow,
  rawPhone: string,
): Promise<{
  ok: true;
  status: "success" | "invalid";
  isValid: boolean;
  e164: string | null;
  national: string | null;
  country: string;
  phoneType: "mobile" | "landline";
}> {
  const defaultCountry = (job.countryCode?.toUpperCase() ?? "RO") as CountryCode;
  const parsed = parsePhoneNumberFromString(rawPhone, defaultCountry);
  const isValid = parsed?.isValid() ?? false;
  const e164 = parsed?.number ?? null;
  const national = parsed?.formatNational() ?? null;
  const cleaned = rawPhone.replaceAll(/[^\d+]/g, "").replaceAll(/^(?:\+40|0040|40)/, "0");
  const phoneType =
    cleaned.length >= 3 && MOBILE_PREFIXES.has(cleaned.replace(/^0/, "").slice(0, 2))
      ? "mobile"
      : "landline";

  await markNormalizationResult(
    job.tenantId,
    job.bronzeContactId,
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
  const rawDigits = rawPhone.replaceAll(/\D/g, "");
  const e164Digits = e164 ? e164.replaceAll(/\D/g, "") : "";
  log.info("normalize_delta", "Rezumat normalizare telefon", {
    inputFields: { extractedPhoneLast4: phoneLast4(rawPhone) },
    normalizedFields: { e164: e164 ? `${e164.slice(0, -4)}****` : null, phoneType, isValid },
    changesApplied: { phoneChanged: Boolean(e164 && rawDigits !== e164Digits) },
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

  log.done(isValid ? "done" : "phone_invalid", "Normalizare telefon finalizată", {
    original: rawPhone,
    e164,
    national,
    isValid,
    phoneType,
    country: parsed?.country ?? defaultCountry,
  });
  return {
    ok: true,
    status: isValid ? "success" : "invalid",
    isValid,
    e164,
    national,
    country: parsed?.country ?? defaultCountry,
    phoneType,
  };
}

export const phoneNormalizerProcessor: Processor<PhoneNormalizerJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:normalize:phone",
    async (_span) => {
      const startedAt = Date.now();
      const batchId =
        typeof job.data.batchId === "string" && job.data.batchId.length > 0
          ? job.data.batchId
          : undefined;
      const log = createJobLogger({
        batchId,
        tenantId: job.data.tenantId,
        workerName: "B3:phone-normalizer",
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
          "B3 phone-normalizer job",
        );
        log.step("start", "Pornire normalizare telefon", {
          bronzeContactId: job.data.bronzeContactId,
          countryCode: job.data.countryCode ?? "RO",
        });
        const contact = await getBronzeContactForTenant(
          job.data.tenantId,
          job.data.bronzeContactId,
        );
        const rawPhone = typeof contact.extractedPhone === "string" ? contact.extractedPhone : null;
        if (!rawPhone) {
          log.done("phone_skip", "Telefon lipsă — normalizare sărită", {
            bronzeContactId: job.data.bronzeContactId,
          });
          return { ok: true, status: "skipped", reason: "empty_phone" };
        }

        return await runB3PhoneNormalization(job.data, log, contact, rawPhone);
      } catch (error) {
        const enriched = enrichError(error, {
          tenantId: job.data.tenantId,
          bronzeContactId: job.data.bronzeContactId,
        });
        const errMsg = error instanceof Error ? error.message : String(error);
        log.error("fatal", `Normalizare telefon eșuată: ${errMsg}`, {
          ...enriched,
          bronzeContactId: job.data.bronzeContactId,
          errorMessage: errMsg,
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        jobErrors.add(1, { worker: "b3-phone-normalizer" });
        classifyAndRethrow(error, { workerName: "b3-phone-normalizer" });
      } finally {
        jobsProcessed.add(1, { worker: "b3-phone-normalizer" });
        jobDuration.record(Date.now() - startedAt, { worker: "b3-phone-normalizer" });
      }
    },
    { tenantId: job.data.tenantId },
  );
};
