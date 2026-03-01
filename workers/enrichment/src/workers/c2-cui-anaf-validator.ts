import type { Processor } from "bullmq";
import { Queue } from "bullmq";
import { createCircuitBreaker, getRedisConnectionOptions } from "@cerniq/worker-shared";
import {
  bronzeContacts,
  db,
  setSessionTenantId,
  silverCompanies,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";
import { sanitizeCui } from "../lib/cui-validation.js";

export type CuiAnafJobData = {
  tenantId: string;
  companyId?: string;
  bronzeContactId?: string;
  cui: string;
  correlationId: string;
};

type AnafCompanyResult = {
  denumire?: string;
  adresa?: string;
  scpTVA?: boolean;
  [key: string]: unknown;
};

const ANAF_API_URL =
  process.env.ANAF_API_URL ?? "https://webservicesp.anaf.ro/AsynchProdFurniz/api/v10/ws/tva";
const ANAF_TIMEOUT_MS = Number(process.env.ANAF_API_TIMEOUT_MS ?? "25000");

async function callAnafApi(cleanCui: string): Promise<AnafCompanyResult | null> {
  const payload = [
    { cui: Number.parseInt(cleanCui, 10), data: new Date().toISOString().split("T")[0] },
  ];
  const response = await fetch(ANAF_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(ANAF_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`ANAF API error: ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    return data[0] as AnafCompanyResult;
  }
  if (
    data &&
    typeof data === "object" &&
    "found" in data &&
    Array.isArray((data as { found: unknown[] }).found) &&
    (data as { found: unknown[] }).found.length > 0
  ) {
    return (data as { found: AnafCompanyResult[] }).found[0];
  }

  return null;
}

const anafBreaker = createCircuitBreaker(
  async (...args: unknown[]) => callAnafApi(String(args[0] ?? "")),
  "anaf-cui-validation",
  {
    timeout: ANAF_TIMEOUT_MS,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
  },
);

export const cuiAnafValidatorProcessor: Processor<CuiAnafJobData> = async (job) => {
  const startedAt = Date.now();
  const cleanedCui = sanitizeCui(job.data.cui);
  if (!cleanedCui) {
    return { ok: false, status: "invalid", reason: "missing_cui", source: "anaf" };
  }

  await setSessionTenantId(job.data.tenantId);
  const companyData = await anafBreaker.fire(cleanedCui);
  if (!companyData) {
    if (job.data.bronzeContactId) {
      await db
        .update(bronzeContacts)
        .set({
          metadata: sql`COALESCE(${bronzeContacts.metadata}, '{}'::jsonb) || ${JSON.stringify({
            anafValidation: {
              status: "not_found",
              cui: cleanedCui,
              validatedAt: new Date().toISOString(),
            },
          })}::jsonb`,
        })
        .where(sql`${bronzeContacts.id} = ${job.data.bronzeContactId}`);
    }
    return {
      ok: true,
      status: "not_found",
      source: "anaf",
      cleanedCui,
    };
  }

  const patch = {
    anafValidation: {
      status: "valid",
      cui: cleanedCui,
      validatedAt: new Date().toISOString(),
      response: companyData,
    },
  };
  if (job.data.companyId) {
    const denumireAnaf = typeof companyData.denumire === "string" ? companyData.denumire : null;
    await db
      .update(silverCompanies)
      .set({
        denumire: denumireAnaf ?? sql`${silverCompanies.denumire}`,
        metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
      })
      .where(sql`${silverCompanies.id} = ${job.data.companyId}`);
  }
  if (job.data.bronzeContactId) {
    const denumireAnaf = typeof companyData.denumire === "string" ? companyData.denumire : null;
    await db
      .update(bronzeContacts)
      .set({
        extractedName: denumireAnaf,
        metadata: sql`COALESCE(${bronzeContacts.metadata}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
      })
      .where(sql`${bronzeContacts.id} = ${job.data.bronzeContactId}`);
  }

  if (job.data.bronzeContactId) {
    try {
      const promotionQueue = new Queue("pipeline:promote-bronze-silver", {
        connection: getRedisConnectionOptions(),
      });
      await promotionQueue.add(
        `promote-${job.data.bronzeContactId}`,
        {
          tenantId: job.data.tenantId,
          bronzeContactId: job.data.bronzeContactId,
          cui: cleanedCui,
          correlationId: job.data.correlationId,
          anafData: companyData,
        },
        { jobId: `promote-${job.data.bronzeContactId}` },
      );
      await promotionQueue.close();
    } catch {
      // Non-critical: promotion can be triggered manually if auto-enqueue fails
    }
  }

  const entityId = job.data.companyId ?? job.data.bronzeContactId;
  if (entityId) {
    await db.insert(silverEnrichmentLog).values({
      tenantId: job.data.tenantId,
      entityType: job.data.companyId ? "company" : "contact",
      entityId,
      source: "anaf_cui_validation",
      operation: "validate",
      requestPayload: { cui: cleanedCui },
      responsePayload: { status: "valid", denumire: companyData.denumire },
      fieldsUpdated: ["metadata", "denumire"],
      correlationId: job.data.correlationId,
      jobId: String(job.id ?? ""),
      durationMs: Date.now() - startedAt,
    });
  }

  return {
    ok: true,
    status: "valid",
    source: "anaf",
    cleanedCui,
    companyData,
  };
};
