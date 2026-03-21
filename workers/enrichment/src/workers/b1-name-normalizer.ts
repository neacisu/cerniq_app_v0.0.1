import type { Processor } from "bullmq";
import {
  getBronzeContactForTenant,
  markNormalizationResult,
  type BronzeNormalizationJobData,
  triggerCuiValidationIfPossible,
} from "./normalization-utils.js";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { classifyAndRethrow } from "../lib/error-classification.js";
import { stripDiacritics } from "../lib/diacritics.js";

export type NameNormalizerJobData = BronzeNormalizationJobData;

const FORMA_JURIDICA_MAP: Record<string, string> = {
  "S.R.L.": "SRL",
  "S.R.L": "SRL",
  SRL: "SRL",
  "S.A.": "SA",
  SA: "SA",
  "P.F.A.": "PFA",
  PFA: "PFA",
  "I.I.": "II",
  II: "II",
  "I.F.": "IF",
  IF: "IF",
  "S.N.C.": "SNC",
  "S.C.S.": "SCS",
  COOPERATIVA: "COOP",
  COOP: "COOP",
  "O.U.A.I.": "OUAI",
  OUAI: "OUAI",
};

const NOISE_WORDS = [
  "SOCIETATEA",
  "COMERCIALA",
  "FIRMA",
  "COMPANIA",
  "INTREPRINDEREA",
  "AGRICOLA",
  "ÎNTREPRINDEREA",
  "COMERCIALĂ",
  "AGRICOLĂ",
];

function titleCase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function trimEdges(str: string, shouldTrim: (ch: string) => boolean): string {
  let start = 0;
  while (start < str.length && shouldTrim(str[start])) start++;
  let end = str.length;
  while (end > start && shouldTrim(str[end - 1])) end--;
  return str.slice(start, end);
}

const isNonAlphanumeric = (ch: string) => !(ch >= "A" && ch <= "Z") && !(ch >= "0" && ch <= "9");

const isEdgePunctuation = (ch: string) =>
  ch === "-" || ch === "," || ch === "." || ch === " " || ch === "\t" || ch === "\n" || ch === "\r";

export const nameNormalizerProcessor: Processor<NameNormalizerJobData> = async (job) => {
  const startedAt = Date.now();
  try {
    const contact = await getBronzeContactForTenant(job.data.tenantId, job.data.bronzeContactId);
    const rawName = typeof contact.extractedName === "string" ? contact.extractedName : null;

    if (!rawName) {
      return { ok: true, status: "skipped", reason: "empty_name" };
    }

    let normalized = rawName.toUpperCase().replaceAll(/\s+/g, " ").trim();
    // GAP-B10: Strip diacritics for consistent matching
    normalized = stripDiacritics(normalized);
    normalized = trimEdges(normalized, isNonAlphanumeric);

    let formaJuridica: string | null = null;
    for (const [pattern, forma] of Object.entries(FORMA_JURIDICA_MAP)) {
      const escaped = pattern.replaceAll(".", String.raw`\.`);
      const regex = new RegExp(String.raw`\b${escaped}\b`, "i");
      if (regex.test(normalized)) {
        formaJuridica = forma;
        normalized = normalized.replace(regex, "").trim();
        break;
      }
    }

    for (const word of NOISE_WORDS) {
      const strippedWord = stripDiacritics(word);
      normalized = normalized.replaceAll(new RegExp(String.raw`\b${strippedWord}\b`, "g"), "");
    }

    normalized = trimEdges(normalized.replaceAll(/\s+/g, " "), isEdgePunctuation).trim();
    if (formaJuridica) {
      normalized = `${normalized} ${formaJuridica}`.trim();
    }

    if (!normalized.trim()) {
      return { ok: true, status: "skipped", reason: "whitespace_only_name" };
    }

    const cui = typeof contact.extractedCui === "string" ? contact.extractedCui : null;
    const extractedNrRegCom =
      typeof contact.extractedNrRegCom === "string" ? contact.extractedNrRegCom : null;
    await markNormalizationResult(
      job.data.tenantId,
      job.data.bronzeContactId,
      { extractedName: titleCase(normalized), extractedCui: cui },
      {
        nameNormalization: {
          original: rawName,
          normalized,
          formaJuridica,
          normalizedAt: new Date().toISOString(),
        },
      },
    );
    await triggerCuiValidationIfPossible(
      job.data.tenantId,
      job.data.bronzeContactId,
      cui,
      extractedNrRegCom,
      job.data.correlationId,
    );

    return {
      ok: true,
      status: "success",
      normalized,
      formaJuridica,
    };
  } catch (error) {
    jobErrors.add(1, { worker: "b1-name-normalizer" });
    classifyAndRethrow(error);
  } finally {
    jobsProcessed.add(1, { worker: "b1-name-normalizer" });
    jobDuration.record(Date.now() - startedAt, { worker: "b1-name-normalizer" });
  }
};
