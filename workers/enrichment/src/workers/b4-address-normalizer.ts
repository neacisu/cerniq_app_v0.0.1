import type { Processor } from "bullmq";
import {
  getBronzeContactForTenant,
  markNormalizationResult,
  triggerCuiValidationIfPossible,
  type BronzeNormalizationJobData,
} from "./normalization-utils.js";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { classifyAndRethrow } from "../lib/error-classification.js";
import { stripDiacritics } from "../lib/diacritics.js";

export type AddressNormalizerJobData = BronzeNormalizationJobData;

const countyMap: Record<string, string> = {
  alba: "AB",
  arad: "AR",
  arges: "AG",
  bacau: "BC",
  bihor: "BH",
  "bistrita-nasaud": "BN",
  "bistrita nasaud": "BN",
  botosani: "BT",
  brasov: "BV",
  braila: "BR",
  buzau: "BZ",
  "caras-severin": "CS",
  "caras severin": "CS",
  calarasi: "CL",
  cluj: "CJ",
  constanta: "CT",
  covasna: "CV",
  dambovita: "DB",
  dolj: "DJ",
  galati: "GL",
  giurgiu: "GR",
  gorj: "GJ",
  harghita: "HR",
  hunedoara: "HD",
  ialomita: "IL",
  iasi: "IS",
  ilfov: "IF",
  maramures: "MM",
  mehedinti: "MH",
  mures: "MS",
  neamt: "NT",
  olt: "OT",
  prahova: "PH",
  "satu mare": "SM",
  "satu-mare": "SM",
  salaj: "SJ",
  sibiu: "SB",
  suceava: "SV",
  teleorman: "TR",
  timis: "TM",
  tulcea: "TL",
  vaslui: "VS",
  valcea: "VL",
  vrancea: "VN",
  bucuresti: "B",
  "municipiul bucuresti": "B",
};

const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  "STR.": "STRADA",
  STR: "STRADA",
  "BD.": "BULEVARDUL",
  BD: "BULEVARDUL",
  "BLD.": "BULEVARDUL",
  "B-DUL": "BULEVARDUL",
  "AL.": "ALEEA",
  "P-TA": "PIATA",
  "NR.": "NR",
  "BL.": "BL",
  "SC.": "SC",
  "ET.": "ET",
  "AP.": "AP",
  "JUD.": "JUD",
  "MUN.": "MUN",
  "OR.": "ORAS",
};

export const addressNormalizerProcessor: Processor<AddressNormalizerJobData> = async (job) => {
  const startedAt = Date.now();
  try {
    const contact = await getBronzeContactForTenant(job.data.tenantId, job.data.bronzeContactId);
    const rawAddress =
      typeof contact.extractedAddress === "string" ? contact.extractedAddress : null;
    if (!rawAddress) {
      return { ok: true, status: "skipped", reason: "empty_address" };
    }

    let normalizedAddress = rawAddress.toUpperCase().trim().replaceAll(/\s+/g, " ");
    for (const [abbr, full] of Object.entries(ADDRESS_ABBREVIATIONS)) {
      const escaped = abbr.replaceAll(".", String.raw`\.`);
      const regex = new RegExp(String.raw`\b${escaped}\b`, "g");
      normalizedAddress = normalizedAddress.replaceAll(regex, full);
    }

    const nrMatch = /\bNR\.?\s*(\d+[A-Z]?)/i.exec(normalizedAddress);
    const blocMatch = /\bBL\.?\s*([A-Z0-9]+)/i.exec(normalizedAddress);
    const scaraMatch = /\bSC\.?\s*([A-Z0-9]+)/i.exec(normalizedAddress);
    const etajMatch = /\bET\.?\s*(\d+|P|PARTER|M|MANSARDA)/i.exec(normalizedAddress);
    const apMatch = /\bAP\.?\s*(\d+)/i.exec(normalizedAddress);
    const cpMatch = /\b(\d{6})\b/.exec(normalizedAddress);
    const lowered = stripDiacritics(normalizedAddress.toLowerCase());
    const sortedCounties = Object.entries(countyMap).sort((a, b) => b[0].length - a[0].length);
    const county =
      sortedCounties.find(([name]) => {
        const escaped = name.replaceAll(/[-.*+?^${}()|[\]\\]/g, String.raw`\$&`);
        return new RegExp(String.raw`\b${escaped}\b`).test(lowered);
      })?.[1] ?? null;
    await markNormalizationResult(
      job.data.tenantId,
      job.data.bronzeContactId,
      { extractedAddress: normalizedAddress },
      {
        addressNormalization: {
          original: rawAddress,
          normalized: normalizedAddress,
          countyCode: county,
          number: nrMatch?.[1] ?? null,
          block: blocMatch?.[1] ?? null,
          staircase: scaraMatch?.[1] ?? null,
          floor: etajMatch?.[1] ?? null,
          apartment: apMatch?.[1] ?? null,
          postalCode: cpMatch?.[1] ?? null,
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
      status: "success",
      normalizedAddress,
      countyCode: county,
    };
  } catch (error) {
    jobErrors.add(1, { worker: "b4-address-normalizer" });
    classifyAndRethrow(error);
  } finally {
    jobsProcessed.add(1, { worker: "b4-address-normalizer" });
    jobDuration.record(Date.now() - startedAt, { worker: "b4-address-normalizer" });
  }
};
