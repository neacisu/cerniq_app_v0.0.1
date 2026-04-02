import { bronzeContacts, db, setSessionTenantId, sql } from "@cerniq/db";
import { enqueueImportJob, type ImportExecutionContext, QUEUES } from "@cerniq/worker-shared";

export type BronzeNormalizationJobData = {
  tenantId: string;
  bronzeContactId: string;
  correlationId: string;
  batchId?: string;
  importExecution?: ImportExecutionContext;
};

export async function getBronzeContactForTenant(tenantId: string, bronzeContactId: string) {
  await setSessionTenantId(tenantId);
  const contact = await db.query.bronzeContacts.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, bronzeContactId)),
  });
  if (!contact) {
    throw new Error(`Bronze contact not found: ${bronzeContactId}`);
  }
  return contact;
}

export async function markNormalizationResult(
  tenantId: string,
  bronzeContactId: string,
  values: {
    extractedName?: string | null;
    extractedEmail?: string | null;
    extractedPhone?: string | null;
    extractedCui?: string | null;
    extractedAddress?: string | null;
  },
  metadataPatch: Record<string, unknown>,
) {
  await setSessionTenantId(tenantId);
  await db
    .update(bronzeContacts)
    .set({
      ...values,
      metadata: (() => {
        const keys = Object.keys(metadataPatch);
        let expr = sql`COALESCE(${bronzeContacts.metadata}, '{}'::jsonb)`;
        for (const key of keys) {
          const pathLiteral = sql.raw(`'{${key}}'`);
          expr = sql`jsonb_set(${expr}, ${pathLiteral}, ${JSON.stringify(metadataPatch[key])}::jsonb)`;
        }
        return expr;
      })(),
      updatedAt: new Date(),
    })
    .where(
      sql`${bronzeContacts.tenantId} = ${tenantId} AND ${bronzeContacts.id} = ${bronzeContactId}`,
    );
}

export async function triggerCuiValidationIfPossible(
  tenantId: string,
  bronzeContactId: string,
  cui: string | null | undefined,
  extractedNrRegCom: string | null | undefined,
  correlationId: string,
  importExecution?: ImportExecutionContext | null,
) {
  // Gate: wait for b5-anaf-bronze-enricher to finish before proceeding
  const contact = await getBronzeContactForTenant(tenantId, bronzeContactId);
  const meta = (contact.metadata ?? {}) as Record<string, unknown>;
  const batchId = typeof meta.batchId === "string" ? meta.batchId : undefined;
  if (meta.anafBronzeEnrichmentStatus === "pending") {
    return; // b5 will call triggerCuiValidationIfPossible when done
  }

  if (!cui) {
    if (!extractedNrRegCom) return;
    // GAP-B3: Flag cuiValidated = false for NrRegCom-only promotions
    await setSessionTenantId(tenantId);
    await db
      .update(bronzeContacts)
      .set({
        metadata: sql`jsonb_set(COALESCE(${bronzeContacts.metadata}, '{}'::jsonb), '{cuiValidation}', ${JSON.stringify(
          {
            status: "skipped",
            reason: "nrregcom_only",
            validatedAt: new Date().toISOString(),
          },
        )}::jsonb)`,
      })
      .where(
        sql`${bronzeContacts.tenantId} = ${tenantId} AND ${bronzeContacts.id} = ${bronzeContactId}`,
      );
    await enqueueImportJob({
      queueName: QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER,
      jobName: `promote-nrc-${bronzeContactId}`,
      payload: {
        tenantId,
        bronzeContactId,
        batchId,
        correlationId,
      },
      opts: {
        jobId: `promote-nrc-${bronzeContactId}`,
        attempts: 2,
        backoff: { type: "fixed", delay: 500 },
      },
      parentImportExecution: importExecution ?? null,
      workerName: "promotion:bronze-silver",
      stageKey: "promotion",
      entityType: "bronze_contact",
      entityId: bronzeContactId,
      contactId: bronzeContactId,
      sessionKind: "ingest",
    });
    return;
  }

  await enqueueImportJob({
    queueName: QUEUES.VALIDATE_CUI_MOD11,
    jobName: "validate-cui",
    payload: {
      tenantId,
      bronzeContactId,
      batchId,
      cui,
      correlationId,
    },
    opts: {
      jobId: `c1-${bronzeContactId}`,
      attempts: 2,
      backoff: { type: "fixed", delay: 500 },
    },
    parentImportExecution: importExecution ?? null,
    workerName: "C1:cui-modulo11",
    stageKey: "validation",
    entityType: "bronze_contact",
    entityId: bronzeContactId,
    contactId: bronzeContactId,
    sessionKind: "ingest",
  });
}
