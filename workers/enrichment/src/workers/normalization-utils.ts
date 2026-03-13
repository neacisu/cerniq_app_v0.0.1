import { bronzeContacts, db, setSessionTenantId, sql } from "@cerniq/db";
import { createQueue } from "@cerniq/worker-shared";

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
  },
  metadataPatch: Record<string, unknown>,
) {
  await setSessionTenantId(tenantId);
  await db
    .update(bronzeContacts)
    .set({
      ...values,
      metadata: sql`COALESCE(${bronzeContacts.metadata}, '{}'::jsonb) || ${JSON.stringify(metadataPatch)}::jsonb`,
      updatedAt: new Date(),
    })
    .where(sql`${bronzeContacts.id} = ${bronzeContactId}`);
}

export async function triggerCuiValidationIfPossible(
  tenantId: string,
  bronzeContactId: string,
  cui: string | null | undefined,
  extractedNrRegCom: string | null | undefined,
  correlationId: string,
) {
  if (!cui) {
    if (!extractedNrRegCom) return;
    const promotionQueue = createQueue("pipeline:promote:bronze-silver");
    await promotionQueue.add(
      `promote-nrc-${bronzeContactId}`,
      {
        tenantId,
        bronzeContactId,
        correlationId,
      },
      {
        jobId: `promote-nrc:${bronzeContactId}:${Date.now()}`,
        attempts: 2,
        backoff: { type: "fixed", delay: 500 },
      },
    );
    await promotionQueue.close();
    return;
  }

  const queue = createQueue("validate:cui:mod11");
  await queue.add(
    "validate-cui",
    {
      tenantId,
      bronzeContactId,
      cui,
      correlationId,
    },
    {
      jobId: `c1:${bronzeContactId}:${Date.now()}`,
      attempts: 2,
      backoff: { type: "fixed", delay: 500 },
    },
  );
  await queue.close();
}
