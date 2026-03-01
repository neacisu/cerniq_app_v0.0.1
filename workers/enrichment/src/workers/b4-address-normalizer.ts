import type { Processor } from "bullmq";
import {
  getBronzeContactForTenant,
  markNormalizationResult,
  type BronzeNormalizationJobData,
} from "./normalization-utils.js";

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

function pickRawAddress(payload: Record<string, unknown>): string | null {
  const aliases = ["address", "adresa", "street_address", "adresa_sediu"];
  for (const key of aliases) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export const addressNormalizerProcessor: Processor<AddressNormalizerJobData> = async (job) => {
  const contact = await getBronzeContactForTenant(job.data.tenantId, job.data.bronzeContactId);
  const rawPayload = contact.rawPayload as Record<string, unknown>;
  const rawAddress = pickRawAddress(rawPayload);
  if (!rawAddress) {
    return { ok: true, status: "skipped", reason: "empty_address" };
  }

  let normalizedAddress = rawAddress.toUpperCase().trim().replace(/\s+/g, " ");
  for (const [abbr, full] of Object.entries(ADDRESS_ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${abbr.replace(/\./g, "\\.")}\\b`, "g");
    normalizedAddress = normalizedAddress.replace(regex, full);
  }

  const nrMatch = normalizedAddress.match(/\bNR\.?\s*(\d+[A-Z]?)/i);
  const blocMatch = normalizedAddress.match(/\bBL\.?\s*([A-Z0-9]+)/i);
  const scaraMatch = normalizedAddress.match(/\bSC\.?\s*([A-Z0-9]+)/i);
  const etajMatch = normalizedAddress.match(/\bET\.?\s*(\d+|P|PARTER|M|MANSARDA)/i);
  const apMatch = normalizedAddress.match(/\bAP\.?\s*(\d+)/i);
  const cpMatch = normalizedAddress.match(/\b(\d{6})\b/);
  const lowered = normalizedAddress.toLowerCase();
  const county = Object.entries(countyMap).find(([name]) => lowered.includes(name))?.[1] ?? null;
  await markNormalizationResult(
    job.data.tenantId,
    job.data.bronzeContactId,
    {},
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

  return {
    ok: true,
    status: "success",
    normalizedAddress,
    countyCode: county,
  };
};
