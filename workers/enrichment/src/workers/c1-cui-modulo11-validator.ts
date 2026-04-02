import type { Processor } from "bullmq";
import {
  bronzeContacts,
  db,
  setSessionTenantId,
  silverCompanies,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";
import {
  enqueueImportJob,
  QUEUES,
  type ImportExecutionContext,
  withCognitiveSpan,
} from "@cerniq/worker-shared";
import { validateCuiModulo11 } from "../lib/cui-validation.js";
import { createJobLogger } from "../lib/job-logger.js";

export type CuiModulo11JobData = {
  tenantId: string;
  companyId?: string;
  bronzeContactId?: string;
  batchId?: string;
  cui: string;
  importExecution?: ImportExecutionContext;
  correlationId: string;
};

type CuiModulo11Result = ReturnType<typeof validateCuiModulo11>;
type ImportEntityReference = {
  entityType: "company" | "bronze_contact" | null;
  entityId: string | null;
  contactId: string | null;
};

function buildCuiValidationMetadata(result: CuiModulo11Result) {
  return {
    source: "modulo11",
    ...result,
    validatedAt: new Date().toISOString(),
  };
}

function resolveImportEntityReference(jobData: CuiModulo11JobData): ImportEntityReference {
  if (jobData.companyId) {
    return {
      entityType: "company",
      entityId: jobData.companyId,
      contactId: jobData.bronzeContactId ?? null,
    };
  }

  if (jobData.bronzeContactId) {
    return {
      entityType: "bronze_contact",
      entityId: jobData.bronzeContactId,
      contactId: jobData.bronzeContactId,
    };
  }

  return {
    entityType: null,
    entityId: null,
    contactId: null,
  };
}

async function persistModulo11Validation(jobData: CuiModulo11JobData, result: CuiModulo11Result) {
  const validationMetadata = buildCuiValidationMetadata(result);

  if (jobData.companyId) {
    await db
      .update(silverCompanies)
      .set({
        metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{cuiValidation}', ${JSON.stringify(
          validationMetadata,
        )}::jsonb)`,
      })
      .where(sql`${silverCompanies.id} = ${jobData.companyId}`);
  }

  if (jobData.bronzeContactId) {
    await db
      .update(bronzeContacts)
      .set({
        extractedCui: result.cleaned || null,
        metadata: sql`jsonb_set(COALESCE(${bronzeContacts.metadata}, '{}'::jsonb), '{cuiValidation}', ${JSON.stringify(
          validationMetadata,
        )}::jsonb)`,
      })
      .where(sql`${bronzeContacts.id} = ${jobData.bronzeContactId}`);
  }
}

async function enqueueAnafValidation(
  jobData: CuiModulo11JobData,
  result: CuiModulo11Result,
  batchId: string | undefined,
) {
  if (!result.isValid) {
    return;
  }

  const entityReference = resolveImportEntityReference(jobData);

  await enqueueImportJob({
    queueName: QUEUES.VALIDATE_CUI_ANAF,
    jobName: "validate-cui-anaf",
    payload: {
      tenantId: jobData.tenantId,
      companyId: jobData.companyId,
      bronzeContactId: jobData.bronzeContactId,
      batchId,
      cui: result.cleaned,
      correlationId: jobData.correlationId,
    },
    opts: {
      jobId: `c2-${jobData.tenantId}-${result.cleaned}`,
      attempts: 5,
      backoff: { type: "exponential", delay: 1000 },
    },
    parentImportExecution: jobData.importExecution ?? null,
    workerName: "C2:cui-anaf-validator",
    stageKey: "validation",
    entityType: entityReference.entityType,
    entityId: entityReference.entityId,
    contactId: entityReference.contactId,
    idempotencyScope: result.cleaned,
  });
}

async function persistModulo11EnrichmentLog(
  jobData: CuiModulo11JobData,
  result: CuiModulo11Result,
  jobId: string,
  startedAt: number,
) {
  if (!jobData.companyId) {
    return;
  }

  await db.insert(silverEnrichmentLog).values({
    tenantId: jobData.tenantId,
    entityType: "company",
    entityId: jobData.companyId,
    source: "cui_modulo11",
    operation: "validate",
    requestPayload: { cui: jobData.cui },
    responsePayload: result,
    fieldsUpdated: ["metadata"],
    correlationId: jobData.correlationId,
    jobId,
    durationMs: Date.now() - startedAt,
  });
}

export const cuiModulo11ValidatorProcessor: Processor<CuiModulo11JobData> = async (job) => {
  return withCognitiveSpan(
    "e1:validate:cui-mod11",
    async (_span) => {
      const startedAt = Date.now();
      const batchId =
        typeof job.data.batchId === "string" && job.data.batchId.length > 0
          ? job.data.batchId
          : undefined;
      const log = createJobLogger({
        batchId,
        tenantId: job.data.tenantId,
        workerName: "C1:cui-modulo11",
        jobId: String(job.id ?? ""),
        startedAt,
        importExecution: job.data.importExecution ?? null,
      });
      const contactLog = job.data.bronzeContactId ? log.forContact(job.data.bronzeContactId) : log;

      contactLog.step("start", "Pornire validare CUI modulo-11", {
        cui: job.data.cui,
        bronzeContactId: job.data.bronzeContactId ?? null,
      });

      const result = validateCuiModulo11(job.data.cui);

      if (result.isValid) {
        contactLog.info(
          "modulo11_valid",
          `CUI ${job.data.cui} valid matematic (modulo-11) — trimis la confirmare ANAF (C2)`,
          { cui: job.data.cui, cleaned: result.cleaned },
        );
      } else {
        contactLog.error(
          "modulo11_invalid",
          `CUI ${job.data.cui} INVALID matematic (modulo-11) — contactul va fi blocat, nu va fi promovat`,
          {
            cui: job.data.cui,
            reason: result.reason,
            cleaned: result.cleaned,
            companyId: job.data.companyId,
            bronzeContactId: job.data.bronzeContactId,
          },
        );
      }

      await setSessionTenantId(job.data.tenantId);
      await persistModulo11Validation(job.data, result);
      await enqueueAnafValidation(job.data, result, batchId);

      contactLog.done(
        result.isValid ? "done" : "done_invalid",
        "Validare CUI modulo-11 finalizată",
        {
          isValid: result.isValid,
          cleanedCui: result.cleaned,
          reason: result.reason,
          nextStep: result.isValid ? "C2:cui-anaf-validator" : "blocked",
        },
      );

      await persistModulo11EnrichmentLog(job.data, result, String(job.id ?? ""), startedAt);

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
    },
    { tenantId: job.data.tenantId },
  );
};
