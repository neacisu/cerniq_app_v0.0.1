import { bronzeContacts, db, setSessionTenantId, sql } from "@cerniq/db";
import { createQueue, QUEUES } from "@cerniq/worker-shared";

export type BronzeNormalizationJobData = {
  tenantId: string;
  bronzeContactId: string;
  correlationId: string;
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
) {
  // Gate: wait for b5-anaf-bronze-enricher to finish before proceeding
  const contact = await getBronzeContactForTenant(tenantId, bronzeContactId);
  const meta = (contact.metadata ?? {}) as Record<string, unknown>;
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
    const promotionQueue = createQueue(QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER);
    await promotionQueue.add(
      `promote-nrc-${bronzeContactId}`,
      {
        tenantId,
        bronzeContactId,
        correlationId,
      },
      {
        jobId: `promote-nrc-${bronzeContactId}`,
        attempts: 2,
        backoff: { type: "fixed", delay: 500 },
      },
    );
    await promotionQueue.close();
    return;
  }

  const queue = createQueue(QUEUES.VALIDATE_CUI_MOD11);
  await queue.add(
    "validate-cui",
    {
      tenantId,
      bronzeContactId,
      cui,
      correlationId,
    },
    {
      jobId: `c1-${bronzeContactId}`,
      attempts: 2,
      backoff: { type: "fixed", delay: 500 },
    },
  );
  await queue.close();
}
