import type { Processor } from "bullmq";
import {
  bronzeContacts,
  db,
  setSessionTenantId,
  silverCompanies,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";
import { createQueue, QUEUES } from "@cerniq/worker-shared";
import { validateCuiModulo11 } from "../lib/cui-validation.js";

export type CuiModulo11JobData = {
  tenantId: string;
  companyId?: string;
  bronzeContactId?: string;
  cui: string;
  correlationId: string;
};

export const cuiModulo11ValidatorProcessor: Processor<CuiModulo11JobData> = async (job) => {
  const startedAt = Date.now();
  const result = validateCuiModulo11(job.data.cui);
  await setSessionTenantId(job.data.tenantId);

  if (job.data.companyId) {
    await db
      .update(silverCompanies)
      .set({
        metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{cuiValidation}', ${JSON.stringify(
          {
            source: "modulo11",
            ...result,
            validatedAt: new Date().toISOString(),
          },
        )}::jsonb)`,
      })
      .where(sql`${silverCompanies.id} = ${job.data.companyId}`);
  }

  if (job.data.bronzeContactId) {
    await db
      .update(bronzeContacts)
      .set({
        extractedCui: result.cleaned || null,
        metadata: sql`jsonb_set(COALESCE(${bronzeContacts.metadata}, '{}'::jsonb), '{cuiValidation}', ${JSON.stringify(
          {
            source: "modulo11",
            ...result,
            validatedAt: new Date().toISOString(),
          },
        )}::jsonb)`,
      })
      .where(sql`${bronzeContacts.id} = ${job.data.bronzeContactId}`);
  }

  if (result.isValid) {
    const queue = createQueue(QUEUES.VALIDATE_CUI_ANAF);
    await queue.add(
      "validate-cui-anaf",
      {
        tenantId: job.data.tenantId,
        companyId: job.data.companyId,
        bronzeContactId: job.data.bronzeContactId,
        cui: result.cleaned,
        correlationId: job.data.correlationId,
      },
      {
        jobId: `c2-${job.data.tenantId}-${result.cleaned}`,
        attempts: 5,
        backoff: { type: "exponential", delay: 1000 },
      },
    );
    await queue.close();
  }

  if (job.data.companyId) {
    await db.insert(silverEnrichmentLog).values({
      tenantId: job.data.tenantId,
      entityType: "company",
      entityId: job.data.companyId,
      source: "cui_modulo11",
      operation: "validate",
      requestPayload: { cui: job.data.cui },
      responsePayload: result,
      fieldsUpdated: ["metadata"],
      correlationId: job.data.correlationId,
      jobId: String(job.id ?? ""),
      durationMs: Date.now() - startedAt,
    });
  }

  return {
    ok: true,
    companyId: job.data.companyId ?? null,
    bronzeContactId: job.data.bronzeContactId ?? null,
    source: "modulo11",
    isValid: result.isValid,
    reason: result.reason,
    cleanedCui: result.cleaned,
    checkDigit: result.checkDigit,
    expectedCheckDigit: result.expectedCheckDigit,
  };
};
