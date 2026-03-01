import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { xaiStructuredJson } from "../lib/xai-client.js";

export type AiFallbackJobData = {
  tenantId: string;
  companyId: string;
  missingFields: string[];
  correlationId?: string;
};

export const aiFallbackProcessor: Processor<AiFallbackJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);
  const company = await db.query.silverCompanies.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
  });
  if (!company) return { ok: false, status: "not_found" };

  const systemPrompt = "Esti asistent de research business. Returnezi doar JSON.";
  const userPrompt = `Completeaza campurile lipsa pentru compania:
denumire=${company.denumire ?? ""}
cui=${company.cui ?? ""}
judet=${company.judet ?? ""}
campuri_lipsa=${job.data.missingFields.join(",")}

Returneaza {"found_data":{"camp":{"value":"...","source":"...","confidence":0.0}},"not_found":[]}`;

  const result = await xaiStructuredJson(systemPrompt, userPrompt);
  const foundData =
    result.found_data && typeof result.found_data === "object"
      ? (result.found_data as Record<string, Record<string, unknown>>)
      : {};
  const updates: Record<string, unknown> = {};
  const applied: string[] = [];

  for (const [field, payload] of Object.entries(foundData)) {
    const confidence = Number(payload.confidence ?? 0);
    if (confidence < 0.6) continue;
    if (
      typeof payload.value !== "string" &&
      typeof payload.value !== "number" &&
      typeof payload.value !== "boolean"
    ) {
      continue;
    }
    switch (field) {
      case "email":
      case "telefon":
      case "website":
      case "adresa":
      case "localitate":
      case "judet":
      case "denumire":
      case "cod_caen_principal":
        updates[field === "cod_caen_principal" ? "codCaenPrincipal" : field] = String(
          payload.value,
        );
        applied.push(field);
        break;
      default:
        break;
    }
  }

  if (Object.keys(updates).length > 0) {
    await db
      .update(silverCompanies)
      .set({
        ...updates,
        metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
          aiFallback: {
            result,
            applied,
            fallbackAt: new Date().toISOString(),
          },
        })}::jsonb`,
        lastEnrichedAt: new Date(),
      })
      .where(sql`${silverCompanies.id} = ${job.data.companyId}`);
  }

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "ai_fallback",
    operation: "enrich",
    requestPayload: { missingFields: job.data.missingFields },
    responsePayload: result,
    fieldsUpdated: applied,
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return {
    ok: true,
    status: "success",
    applied: applied.length,
    notFound: (result.not_found as unknown[] | undefined)?.length ?? 0,
  };
};
