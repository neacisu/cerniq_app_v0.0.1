import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui } from "../lib/cui-validation.js";
import { getOnrcData } from "../lib/onrc-api-client.js";

export type OnrcDataJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

function mapFormaJuridica(
  raw: string | null,
): "SRL" | "SA" | "PFA" | "II" | "IF" | "SNC" | "SCS" | "ONG" | "COOP" | "OTHER" {
  const value = String(raw ?? "").toUpperCase();
  if (value.includes("SRL")) return "SRL";
  if (value.includes("SA")) return "SA";
  if (value.includes("PFA")) return "PFA";
  if (value.includes("II")) return "II";
  if (value.includes("IF")) return "IF";
  if (value.includes("SNC")) return "SNC";
  if (value.includes("SCS")) return "SCS";
  if (value.includes("ONG")) return "ONG";
  if (value.includes("COOP")) return "COOP";
  return "OTHER";
}

export const onrcDataProcessor: Processor<OnrcDataJobData> = async (job) => {
  const startedAt = Date.now();
  const cleanedCui = sanitizeCui(job.data.cui);
  await setSessionTenantId(job.data.tenantId);

  const payload = await getOnrcData(cleanedCui);
  const denumire = String(payload?.denumire ?? payload?.name ?? "").trim();
  const formaJuridica = mapFormaJuridica(String(payload?.forma_juridica ?? ""));
  const adresa = String(payload?.adresa ?? payload?.address ?? "").trim();

  await db
    .update(silverCompanies)
    .set({
      denumire: denumire || undefined,
      formaJuridica: formaJuridica !== "OTHER" ? formaJuridica : undefined,
      adresa: adresa || undefined,
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({ onrcData: payload })}::jsonb`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "onrc_data",
    operation: "fetch",
    requestPayload: { cui: cleanedCui },
    responsePayload: payload,
    fieldsUpdated: ["denumire", "formaJuridica", "adresa", "metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: payload ? "success" : "not_found", source: "onrc_data", cleanedCui };
};
