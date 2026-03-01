import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui } from "../lib/cui-validation.js";
import { getTermeneBalance } from "../lib/termene-api-client.js";

export type TermeneBalanceJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const termeneBalanceProcessor: Processor<TermeneBalanceJobData> = async (job) => {
  const startedAt = Date.now();
  const cleanedCui = sanitizeCui(job.data.cui);
  await setSessionTenantId(job.data.tenantId);

  const payload = await getTermeneBalance(cleanedCui);
  if (!payload) {
    await db.insert(silverEnrichmentLog).values({
      tenantId: job.data.tenantId,
      entityType: "company",
      entityId: job.data.companyId,
      source: "termene_balance",
      operation: "fetch",
      requestPayload: { cui: cleanedCui },
      responsePayload: null,
      fieldsUpdated: [],
      correlationId: job.data.correlationId,
      jobId: String(job.id ?? ""),
      durationMs: Date.now() - startedAt,
    });
    return { ok: true, status: "not_found", source: "termene_balance", cleanedCui };
  }

  const cifraAfaceri =
    typeof payload.cifra_afaceri === "number"
      ? payload.cifra_afaceri
      : Number(payload.cifra_afaceri ?? NaN);
  const profitNet =
    typeof payload.profit_net === "number" ? payload.profit_net : Number(payload.profit_net ?? NaN);
  const numarAngajati =
    typeof payload.numar_angajati === "number"
      ? payload.numar_angajati
      : Number.parseInt(String(payload.numar_angajati ?? "NaN"), 10);

  await db
    .update(silverCompanies)
    .set({
      cifraAfaceri: Number.isFinite(cifraAfaceri) ? String(cifraAfaceri) : undefined,
      profitNet: Number.isFinite(profitNet) ? String(profitNet) : undefined,
      numarAngajati: Number.isFinite(numarAngajati) ? numarAngajati : undefined,
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({ termeneBalance: payload })}::jsonb`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "termene_balance",
    operation: "fetch",
    requestPayload: { cui: cleanedCui },
    responsePayload: payload,
    fieldsUpdated: ["cifraAfaceri", "profitNet", "numarAngajati", "metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: "success", source: "termene_balance", cleanedCui };
};
