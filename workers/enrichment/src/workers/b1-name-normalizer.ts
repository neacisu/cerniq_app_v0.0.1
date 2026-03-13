import type { Processor } from "bullmq";
import {
  getBronzeContactForTenant,
  markNormalizationResult,
  type BronzeNormalizationJobData,
  triggerCuiValidationIfPossible,
} from "./normalization-utils.js";

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

const NOISE_WORDS = ["SOCIETATEA", "COMERCIALA", "FIRMA", "COMPANIA", "INTREPRINDEREA", "AGRICOLA"];

function titleCase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export const nameNormalizerProcessor: Processor<NameNormalizerJobData> = async (job) => {
  const contact = await getBronzeContactForTenant(job.data.tenantId, job.data.bronzeContactId);
  const rawName = typeof contact.extractedName === "string" ? contact.extractedName : null;

  if (!rawName) {
    return { ok: true, status: "skipped", reason: "empty_name" };
  }

  let normalized = rawName.toUpperCase().replace(/\s+/g, " ").trim();
  normalized = normalized.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, "");

  let formaJuridica: string | null = null;
  for (const [pattern, forma] of Object.entries(FORMA_JURIDICA_MAP)) {
    const regex = new RegExp(`\\b${pattern.replace(/\./g, "\\.")}\\b`, "i");
    if (regex.test(normalized)) {
      formaJuridica = forma;
      normalized = normalized.replace(regex, "").trim();
      break;
    }
  }

  for (const word of NOISE_WORDS) {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, "g"), "");
  }

  normalized = normalized
    .replace(/\s+/g, " ")
    .replace(/^[-,.\s]+|[-,.\s]+$/g, "")
    .trim();
  if (formaJuridica) {
    normalized = `${normalized} ${formaJuridica}`.trim();
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
};
