import type { Processor } from "bullmq";
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
import { createJobLogger } from "../lib/job-logger.js";

export type PhoneNormalizerJobData = BronzeNormalizationJobData & {
  countryCode?: string;
};

const MOBILE_PREFIXES = new Set(["72", "73", "74", "75", "76", "77", "78", "79"]);

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
      }).forContact(job.data.bronzeContactId);
      try {
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
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        log.error("fatal", `Normalizare telefon eșuată: ${errMsg}`, {
          bronzeContactId: job.data.bronzeContactId,
          errorMessage: errMsg,
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        jobErrors.add(1, { worker: "b3-phone-normalizer" });
        classifyAndRethrow(error);
      } finally {
        jobsProcessed.add(1, { worker: "b3-phone-normalizer" });
        jobDuration.record(Date.now() - startedAt, { worker: "b3-phone-normalizer" });
      }
    },
    { tenantId: job.data.tenantId },
  );
};
