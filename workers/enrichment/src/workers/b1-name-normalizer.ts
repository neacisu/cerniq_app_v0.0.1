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
import { createJobLogger, type JobLogger } from "../lib/job-logger.js";

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

// ---------------------------------------------------------------------------
// Pure helper: name normalisation
// ---------------------------------------------------------------------------

interface NormalizeNameResult {
  normalized: string;
  formaJuridica: string | null;
}

/**
 * Normalizes a raw company/contact name to a canonical uppercase form:
 * 1. Converts to uppercase, collapses whitespace.
 * 2. Strips diacritics for consistent Romanian text matching (GAP-B10).
 * 3. Extracts and canonicalises the legal-form suffix (SRL / SA / PFA / …).
 * 4. Removes generic noise words ("SOCIETATEA COMERCIALA", etc.).
 * 5. Re-appends the canonical legal-form suffix.
 *
 * Complexity budget: 5 (under Sonar S3776 threshold of 15).
 */
function normalizeName(rawName: string): NormalizeNameResult {
  let normalized = rawName.toUpperCase().replaceAll(/\s+/g, " ").trim();
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

  return { normalized, formaJuridica };
}

// ---------------------------------------------------------------------------
// Helper: resolves ANAF enrichment status from bronze metadata
// ---------------------------------------------------------------------------

/**
 * Safely resolves the ANAF Bronze enrichment status from the bronze contact
 * metadata.  Handles two historical metadata shapes:
 *   • Flat:   { anafBronzeEnrichmentStatus: "pending" }
 *   • Nested: { anafBronzeEnrichment: { anafBronzeEnrichmentStatus: "done" } }
 *
 * NOTE: The original inline expression mixed `??` and `? :` with subtly wrong
 * operator precedence — `??` binds tighter than `? :` in JS, causing the
 * flat-property value to be overwritten by the nested-object lookup whenever
 * the flat property was truthy.  This function is the bug-free replacement.
 */
function resolveAnafStatus(meta: Record<string, unknown>): string {
  if (typeof meta.anafBronzeEnrichmentStatus === "string") {
    return meta.anafBronzeEnrichmentStatus;
  }
  const nested = meta["anafBronzeEnrichment"];
  if (nested !== null && typeof nested === "object") {
    const status = (nested as Record<string, unknown>).anafBronzeEnrichmentStatus;
    if (typeof status === "string") return status;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Helper: CUI / NrRegCom routing gate logging
// ---------------------------------------------------------------------------

/**
 * Logs the four-branch CUI-gate decision that follows name normalisation.
 * Extracted so that `nameNormalizerProcessor` stays below Sonar S3776's
 * cognitive-complexity threshold while keeping the business logic auditable.
 */
function logCuiGateDecision(
  log: JobLogger,
  opts: {
    cui: string | null;
    nrRegCom: string | null;
    anafStatus: string;
    bronzeContactId: string;
  },
): void {
  if (opts.anafStatus === "pending") {
    log.info(
      "cui_gate",
      `Îmbogățire ANAF (B5) încă în curs — așteptăm finalizarea înainte de validarea CUI`,
      { cui: opts.cui, nrRegCom: opts.nrRegCom, anafBronzeEnrichmentStatus: opts.anafStatus },
    );
  } else if (!opts.cui && !opts.nrRegCom) {
    log.warn(
      "cui_gate",
      `Contactul nu are CUI nici NrRegCom — identitate insuficientă, nu poate fi promovat`,
      { bronzeContactId: opts.bronzeContactId },
    );
  } else if (!opts.cui && opts.nrRegCom) {
    log.info(
      "cui_gate",
      `Contact cu NrRegCom (fără CUI) — trimis direct la promotion (ocolind C1+C2)`,
      { nrRegCom: opts.nrRegCom },
    );
  } else {
    log.info("cui_gate", `Trimis la validare CUI modulo-11 (C1)`, { cui: opts.cui });
  }
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

export const nameNormalizerProcessor: Processor<NameNormalizerJobData> = async (job) => {
  const startedAt = Date.now();
  const batchId =
    typeof (job.data as Record<string, unknown>).batchId === "string"
      ? String((job.data as Record<string, unknown>).batchId)
      : "unknown";
  const log = createJobLogger({
    batchId,
    tenantId: job.data.tenantId,
    workerName: "B1:name-normalizer",
    jobId: String(job.id ?? ""),
  }).forContact(job.data.bronzeContactId);

  try {
    const contact = await getBronzeContactForTenant(job.data.tenantId, job.data.bronzeContactId);
    const rawName = typeof contact.extractedName === "string" ? contact.extractedName : null;

    if (!rawName) {
      log.info("normalize", "Nume lipsă — normalizare sărită", {
        bronzeContactId: job.data.bronzeContactId,
      });
      return { ok: true, status: "skipped", reason: "empty_name" };
    }

    const { normalized, formaJuridica } = normalizeName(rawName);

    if (!normalized) {
      log.info("normalize", `Nume devine gol după normalizare — sărit`, { rawName });
      return { ok: true, status: "skipped", reason: "whitespace_only_name" };
    }

    log.info("normalize", `Nume normalizat cu succes`, { rawName, normalized, formaJuridica });

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

    // Route contact: validate CUI (C1 → C2) or go straight to promotion
    const bronzeMeta = (contact.metadata as Record<string, unknown> | null) ?? {};
    const anafStatus = resolveAnafStatus(bronzeMeta);

    logCuiGateDecision(log, {
      cui,
      nrRegCom: extractedNrRegCom,
      anafStatus,
      bronzeContactId: job.data.bronzeContactId,
    });

    await triggerCuiValidationIfPossible(
      job.data.tenantId,
      job.data.bronzeContactId,
      cui,
      extractedNrRegCom,
      job.data.correlationId,
    );

    return { ok: true, status: "success", normalized, formaJuridica };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    log.error("fatal", `Normalizare nume eșuată: ${errMsg}`, {
      errorMessage: errMsg,
      errorStack: errStack,
      bronzeContactId: job.data.bronzeContactId,
    });
    jobErrors.add(1, { worker: "b1-name-normalizer" });
    classifyAndRethrow(error);
  } finally {
    jobsProcessed.add(1, { worker: "b1-name-normalizer" });
    jobDuration.record(Date.now() - startedAt, { worker: "b1-name-normalizer" });
  }
};
