import type { Processor } from "bullmq";
import {
  createCircuitBreaker,
  enqueueImportJob,
  type ImportExecutionContext,
  sanitizeNrRegCom,
  withExternalApiMetrics,
  QUEUES,
} from "@cerniq/worker-shared";
import {
  and,
  bronzeContacts,
  db,
  eq,
  silverCompanies,
  silverEnrichmentLog,
  sql,
  upsertCompanyIdentityKey,
} from "@cerniq/db";
import { sanitizeCui } from "../lib/cui-validation.js";
import { createJobLogger } from "../lib/job-logger.js";

export type CuiAnafJobData = {
  tenantId: string;
  companyId?: string;
  bronzeContactId?: string;
  batchId?: string;
  cui: string;
  importExecution?: ImportExecutionContext;
  correlationId: string;
};

function extractNrRegCom(value: unknown): { raw: string | null; sanitized: string | null } {
  if (!value || typeof value !== "object") {
    return { raw: null, sanitized: null };
  }
  const record = value as Record<string, unknown>;
  const rawCandidate =
    (typeof record.nrRegCom === "string" && record.nrRegCom) ||
    (typeof record.nr_reg_com === "string" && record.nr_reg_com) ||
    (typeof record.nrRegComert === "string" && record.nrRegComert) ||
    (typeof record.nr_reg_comert === "string" && record.nr_reg_comert) ||
    (typeof record.numar_reg_comert === "string" && record.numar_reg_comert) ||
    null;
  return {
    raw: rawCandidate,
    // Validate and sanitize without converting old format → new.
    // ANAF provides old format (J09/98/2003) — we have no authority to auto-convert.
    sanitized: rawCandidate ? sanitizeNrRegCom(rawCandidate) : null,
  };
}

type AnafCompanyResult = {
  denumire?: string;
  adresa?: string;
  scpTVA?: boolean;
  [key: string]: unknown;
};

const ANAF_API_URL =
  process.env.ANAF_API_URL || "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";
const ANAF_TIMEOUT_MS = Number(process.env.ANAF_API_TIMEOUT_MS ?? "25000");
const ANAF_MIN_DELAY_MS = Number(process.env.ANAF_MIN_DELAY_MS ?? "1000");
const ANAF_MAX_DELAY_MS = Number(process.env.ANAF_MAX_DELAY_MS ?? "4000");

/** Random jitter delay between ANAF calls — reduces risk of rate-limiting / IP ban. */
function randomDelay(): Promise<void> {
  const ms = ANAF_MIN_DELAY_MS + Math.random() * (ANAF_MAX_DELAY_MS - ANAF_MIN_DELAY_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAnafApi(cleanCui: string): Promise<AnafCompanyResult | null> {
  return withExternalApiMetrics("anaf", async () => {
    await randomDelay();
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
  });
}

const anafBreaker = createCircuitBreaker(
  async (cui: string) => callAnafApi(cui),
  "anaf-cui-validation",
  {
    timeout: ANAF_TIMEOUT_MS,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
  },
);
anafBreaker.on("failure", (err: unknown) => {
  console.error("[ANAF] call failed:", err instanceof Error ? err.message : String(err));
});
anafBreaker.on("timeout", () => {
  console.error(`[ANAF] call timed out (limit: ${ANAF_TIMEOUT_MS}ms)`);
});

function buildAnafPatch(cleanedCui: string, companyData: AnafCompanyResult) {
  return {
    anafValidation: {
      status: "valid",
      cui: cleanedCui,
      validatedAt: new Date().toISOString(),
      response: companyData,
    },
  };
}

async function persistAnafNotFound(jobData: CuiAnafJobData, cleanedCui: string) {
  const notFoundPatch = {
    anafValidation: {
      status: "not_found",
      cui: cleanedCui,
      validatedAt: new Date().toISOString(),
    },
  };

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${jobData.tenantId}, true)`);
    if (jobData.bronzeContactId) {
      await tx
        .update(bronzeContacts)
        .set({
          metadata: sql`jsonb_set(COALESCE(${bronzeContacts.metadata}, '{}'::jsonb), '{anafValidation}', ${JSON.stringify(notFoundPatch.anafValidation)}::jsonb)`,
        })
        .where(sql`${bronzeContacts.id} = ${jobData.bronzeContactId}`);
    }
    // GAP-B4: Also update silverCompanies.metadata on not_found
    if (jobData.companyId) {
      await tx
        .update(silverCompanies)
        .set({
          metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{anafValidation}', ${JSON.stringify(notFoundPatch.anafValidation)}::jsonb)`,
        })
        .where(sql`${silverCompanies.id} = ${jobData.companyId}`);
    }
  });
}

async function updateAnafCompany(
  jobData: CuiAnafJobData,
  cleanedCui: string,
  companyData: AnafCompanyResult,
  nrRegCom: { raw: string | null; sanitized: string | null },
  patch: Record<string, unknown>,
) {
  if (!jobData.companyId) {
    return;
  }

  const denumireAnaf = typeof companyData.denumire === "string" ? companyData.denumire : null;
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${jobData.tenantId}, true)`);
    await tx
      .update(silverCompanies)
      .set({
        denumire: denumireAnaf ?? sql`${silverCompanies.denumire}`,
        cui: cleanedCui,
        nrRegCom: nrRegCom.sanitized ?? sql`${silverCompanies.nrRegCom}`,
        nrRegComOriginal: nrRegCom.raw ?? sql`${silverCompanies.nrRegComOriginal}`,
        metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{anafValidation}', ${JSON.stringify(patch.anafValidation)}::jsonb)`,
      })
      .where(sql`${silverCompanies.id} = ${jobData.companyId}`);
  });
  await upsertCompanyIdentityKey({
    tenantId: jobData.tenantId,
    companyId: jobData.companyId,
    keyType: "cui",
    keyValueCanonical: cleanedCui,
    keyValueOriginal: cleanedCui,
    sourceAuthority: "anaf",
    isAuthoritative: true,
    sourceBronzeId: jobData.bronzeContactId,
  });
  if (nrRegCom.sanitized) {
    await upsertCompanyIdentityKey({
      tenantId: jobData.tenantId,
      companyId: jobData.companyId,
      keyType: "nr_reg_com",
      // raw/sanitized value used as canonical key — no auto-conversion old→new
      keyValueCanonical: nrRegCom.sanitized,
      keyValueOriginal: nrRegCom.raw,
      sourceAuthority: "anaf",
      sourceBronzeId: jobData.bronzeContactId,
    });
  }
}

async function updateAnafBronzeContact(
  jobData: CuiAnafJobData,
  cleanedCui: string,
  companyData: AnafCompanyResult,
  nrRegCom: { raw: string | null; sanitized: string | null },
  patch: Record<string, unknown>,
) {
  if (!jobData.bronzeContactId) {
    return;
  }

  const denumireAnaf = typeof companyData.denumire === "string" ? companyData.denumire : null;
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${jobData.tenantId}, true)`);
    await tx
      .update(bronzeContacts)
      .set({
        extractedName: sql`CASE WHEN ${bronzeContacts.extractedName} IS NULL OR ${bronzeContacts.extractedName} = '' THEN ${denumireAnaf} ELSE ${bronzeContacts.extractedName} END`,
        extractedCuiRaw: cleanedCui,
        extractedCui: cleanedCui,
        extractedNrRegComRaw: nrRegCom.raw ?? sql`${bronzeContacts.extractedNrRegComRaw}`,
        extractedNrRegCom: nrRegCom.sanitized ?? sql`${bronzeContacts.extractedNrRegCom}`,
        metadata: sql`jsonb_set(COALESCE(${bronzeContacts.metadata}, '{}'::jsonb), '{anafValidation}', ${JSON.stringify(patch.anafValidation)}::jsonb)`,
      })
      .where(sql`${bronzeContacts.id} = ${jobData.bronzeContactId}`);
  });
}

type AnafSiblingFanOutArgs = {
  tenantId: string;
  cleanedCui: string;
  originContactId: string | undefined;
  batchId: string | undefined;
  companyData: AnafCompanyResult;
  nrRegCom: { raw: string | null; sanitized: string | null };
  patch: Record<string, unknown>;
  importExecution?: ImportExecutionContext | null;
};

async function fanOutAnafResultToSiblings(args: AnafSiblingFanOutArgs) {
  if (!args.originContactId) return;

  const siblings = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${args.tenantId}, true)`);
    return tx
      .select({ id: bronzeContacts.id })
      .from(bronzeContacts)
      .where(
        and(
          eq(bronzeContacts.tenantId, args.tenantId),
          eq(bronzeContacts.extractedCui, args.cleanedCui),
          sql`${bronzeContacts.id} != ${args.originContactId}`,
          sql`(${bronzeContacts.metadata}->'anafValidation'->>'status') IS DISTINCT FROM 'valid'`,
        ),
      );
  });

  if (siblings.length === 0) return;

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${args.tenantId}, true)`);
    await tx
      .update(bronzeContacts)
      .set({
        extractedCuiRaw: args.cleanedCui,
        extractedCui: args.cleanedCui,
        extractedNrRegComRaw: args.nrRegCom.raw ?? sql`${bronzeContacts.extractedNrRegComRaw}`,
        extractedNrRegCom: args.nrRegCom.sanitized ?? sql`${bronzeContacts.extractedNrRegCom}`,
        metadata: sql`jsonb_set(COALESCE(${bronzeContacts.metadata}, '{}'::jsonb), '{anafValidation}', ${JSON.stringify(args.patch.anafValidation)}::jsonb)`,
      })
      .where(
        and(
          eq(bronzeContacts.tenantId, args.tenantId),
          eq(bronzeContacts.extractedCui, args.cleanedCui),
          sql`${bronzeContacts.id} != ${args.originContactId}`,
          sql`(${bronzeContacts.metadata}->'anafValidation'->>'status') IS DISTINCT FROM 'valid'`,
        ),
      );
  });

  for (const sibling of siblings) {
    await enqueueImportJob({
      queueName: QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER,
      jobName: `promote-${sibling.id}`,
      payload: {
        tenantId: args.tenantId,
        bronzeContactId: sibling.id,
        batchId: args.batchId,
        cui: args.cleanedCui,
        correlationId: `fanout-${args.originContactId}`,
        anafData: args.companyData,
      },
      opts: {
        jobId: `promote-${sibling.id}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      },
      parentImportExecution: args.importExecution ?? null,
      workerName: "promotion:bronze-silver",
      stageKey: "promotion",
      entityType: "bronze_contact",
      entityId: sibling.id,
      contactId: sibling.id,
      idempotencyScope: sibling.id,
    });
  }
}

async function enqueueAnafPromotion(
  jobData: CuiAnafJobData,
  cleanedCui: string,
  companyData: AnafCompanyResult,
) {
  if (!jobData.bronzeContactId) {
    return;
  }

  try {
    await enqueueImportJob({
      queueName: QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER,
      jobName: `promote-${jobData.bronzeContactId}`,
      payload: {
        tenantId: jobData.tenantId,
        bronzeContactId: jobData.bronzeContactId,
        batchId: jobData.batchId,
        cui: cleanedCui,
        correlationId: jobData.correlationId,
        anafData: companyData,
      },
      opts: { jobId: `promote-${jobData.bronzeContactId}` },
      parentImportExecution: jobData.importExecution ?? null,
      workerName: "promotion:bronze-silver",
      stageKey: "promotion",
      entityType: "bronze_contact",
      entityId: jobData.bronzeContactId,
      contactId: jobData.bronzeContactId,
      idempotencyScope: jobData.bronzeContactId,
    });
  } catch {
    // Non-critical: promotion can be triggered manually if auto-enqueue fails
  }
}

async function logAnafValidation(
  job: {
    data: CuiAnafJobData;
    id?: string | number;
  },
  cleanedCui: string,
  companyData: AnafCompanyResult,
  startedAt: number,
) {
  const entityId = job.data.companyId ?? job.data.bronzeContactId;
  if (!entityId) {
    return;
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${job.data.tenantId}, true)`);
    await tx.insert(silverEnrichmentLog).values({
      tenantId: job.data.tenantId,
      entityType: job.data.companyId ? "company" : "contact",
      entityId,
      source: "anaf_cui_validation",
      operation: "validate",
      requestPayload: { cui: cleanedCui },
      responsePayload: { status: "valid", denumire: companyData.denumire },
      fieldsUpdated: ["metadata", "denumire", "cui", "nrRegCom"],
      correlationId: job.data.correlationId,
      jobId: String(job.id ?? ""),
      durationMs: Date.now() - startedAt,
    });
  });
}

export const cuiAnafValidatorProcessor: Processor<CuiAnafJobData> = async (job) => {
  const startedAt = Date.now();

  const batchId =
    typeof job.data.batchId === "string" && job.data.batchId.length > 0
      ? job.data.batchId
      : undefined;
  const log = createJobLogger({
    batchId,
    tenantId: job.data.tenantId,
    workerName: "C2:cui-anaf-validator",
    jobId: String(job.id ?? ""),
    startedAt,
  });
  const contactLog = job.data.bronzeContactId ? log.forContact(job.data.bronzeContactId) : log;

  const cleanedCui = sanitizeCui(job.data.cui);
  if (!cleanedCui) {
    contactLog.error(
      "invalid_cui",
      `CUI lipsă sau complet invalid — contactul nu poate fi validat ANAF`,
      { rawCui: job.data.cui },
    );
    return { ok: false, status: "invalid", reason: "missing_cui", source: "anaf" };
  }

  contactLog.step("start", `Validare ANAF CUI ${cleanedCui} — apel API ANAF`, {
    cui: cleanedCui,
    companyId: job.data.companyId,
  });

  // CUI dedup: check if another contact with same CUI was already validated via ANAF
  const alreadyValidated = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${job.data.tenantId}, true)`);
    return tx.query.bronzeContacts.findFirst({
      where: (t, { and, eq }) =>
        and(
          eq(t.tenantId, job.data.tenantId),
          eq(t.extractedCui, cleanedCui),
          sql`(${t.metadata}->'anafValidation'->>'status') = 'valid'`,
        ),
      columns: { id: true, metadata: true },
    });
  });

  if (alreadyValidated && alreadyValidated.id !== job.data.bronzeContactId) {
    const existingMeta = (alreadyValidated.metadata ?? {}) as Record<string, unknown>;
    const existingAnaf = existingMeta.anafValidation as Record<string, unknown> | undefined;
    if (existingAnaf) {
      contactLog.info(
        "dedup_reuse",
        `CUI ${cleanedCui} deja validat ANAF de un alt contact — reutilizez datele existente fără apel API`,
        { reusedFromContactId: alreadyValidated.id },
      );
      const patch = { anafValidation: existingAnaf };
      const reusedCompanyData = (existingAnaf.response ?? null) as AnafCompanyResult | null;
      const nrRegCom = reusedCompanyData
        ? extractNrRegCom(reusedCompanyData)
        : { raw: null, sanitized: null };
      await updateAnafBronzeContact(
        job.data,
        cleanedCui,
        reusedCompanyData ?? ({} as AnafCompanyResult),
        nrRegCom,
        patch,
      );
      await enqueueAnafPromotion(
        job.data,
        cleanedCui,
        reusedCompanyData ?? ({} as AnafCompanyResult),
      );
      contactLog.step(
        "done_dedup",
        `Contact actualizat cu date ANAF existente — promovat în silver`,
        { cui: cleanedCui },
      );
      return {
        ok: true,
        status: "valid",
        source: "anaf_dedup_reuse",
        cleanedCui,
        reusedFrom: alreadyValidated.id,
      };
    }
  }

  const companyData = await anafBreaker.fire(cleanedCui);
  if (!companyData) {
    contactLog.warn(
      "not_found",
      `CUI ${cleanedCui} nu a fost găsit în baza de date ANAF — salvat ca not_found, contactul rămâne în bronze`,
      { cui: cleanedCui },
    );
    await persistAnafNotFound(job.data, cleanedCui);
    return {
      ok: true,
      status: "not_found",
      source: "anaf",
      cleanedCui,
    };
  }

  contactLog.info(
    "anaf_found",
    `CUI ${cleanedCui} confirmat ANAF: ${typeof companyData.denumire === "string" ? companyData.denumire : "—"}`,
    {
      cui: cleanedCui,
      denumire: companyData.denumire,
      nrRegCom: (companyData as Record<string, unknown>).nrRegCom,
    },
  );

  const patch = buildAnafPatch(cleanedCui, companyData);
  const nrRegCom = extractNrRegCom(companyData);
  await updateAnafCompany(job.data, cleanedCui, companyData, nrRegCom, patch);
  await updateAnafBronzeContact(job.data, cleanedCui, companyData, nrRegCom, patch);
  // Fan-out: update all sibling bronze contacts with same CUI that haven't been validated yet
  await fanOutAnafResultToSiblings({
    tenantId: job.data.tenantId,
    cleanedCui,
    originContactId: job.data.bronzeContactId,
    batchId: job.data.batchId,
    companyData,
    nrRegCom,
    patch,
    importExecution: job.data.importExecution ?? null,
  });
  await enqueueAnafPromotion(job.data, cleanedCui, companyData);
  await logAnafValidation(job, cleanedCui, companyData, startedAt);

  contactLog.step(
    "done",
    `Validare ANAF completă — companie salvată în silver, promovare enqueued`,
    { cui: cleanedCui, durationMs: Date.now() - startedAt },
  );

  return {
    ok: true,
    status: "valid",
    source: "anaf",
    cleanedCui,
    companyData,
  };
};
