import { Queue, type Processor } from "bullmq";
import {
  db,
  bronzeContacts,
  setSessionTenantId,
  silverCompanies,
  silverContacts,
  sql,
} from "@cerniq/db";
import { getQueuePrefix, getRedisConnectionOptions } from "@cerniq/worker-shared";

export type PromotionBronzeSilverJobData = {
  tenantId: string;
  bronzeContactId: string;
  correlationId?: string;
};

const NEXT_ENRICHMENT_QUEUES = [
  "silver:enrich:anaf-fiscal-status",
  "silver:enrich:anaf-tva-status",
  "silver:enrich:anaf-efactura",
  "silver:enrich:anaf-datorii",
  "silver:enrich:anaf-caen",
  "silver:enrich:termene-balance",
  "silver:enrich:termene-risk",
  "silver:enrich:termene-dosare",
  "silver:enrich:termene-actionari",
  "silver:enrich:onrc-data",
  "silver:enrich:onrc-administratori",
  "silver:enrich:onrc-sedii",
  "silver:enrich:hunter-email-finder",
  "silver:enrich:email-pattern",
] as const;

export const promotionBronzeSilverProcessor: Processor<PromotionBronzeSilverJobData> = async (
  job,
) => {
  await setSessionTenantId(job.data.tenantId);

  const bronze = (
    await db
      .select()
      .from(bronzeContacts)
      .where(sql`${bronzeContacts.id} = ${job.data.bronzeContactId}`)
      .limit(1)
  )[0];

  if (!bronze) {
    return { ok: false, status: "not_found", reason: "bronze_contact_missing" };
  }

  let existingSilver: typeof silverCompanies.$inferSelect | undefined;
  if (bronze.extractedCui) {
    existingSilver = (
      await db
        .select()
        .from(silverCompanies)
        .where(
          sql`${silverCompanies.tenantId} = ${job.data.tenantId} AND ${silverCompanies.cui} = ${bronze.extractedCui}`,
        )
        .limit(1)
    )[0];
  }

  const payload = bronze.rawPayload as Record<string, unknown>;
  const companyName = (
    bronze.extractedName ?? String(payload.companyName ?? payload.name ?? "")
  ).trim();
  const email = (bronze.extractedEmail ?? String(payload.email ?? "")).trim();
  const phone = (bronze.extractedPhone ?? String(payload.phone ?? "")).trim();
  const adresa = String(payload.address ?? payload.adresa ?? "").trim();

  let silverId: string;
  if (existingSilver) {
    silverId = existingSilver.id;
    await db
      .update(silverCompanies)
      .set({
        denumire: companyName || existingSilver.denumire || undefined,
        email: email || existingSilver.email || undefined,
        telefon: phone || existingSilver.telefon || undefined,
        adresa: adresa || existingSilver.adresa || undefined,
        sourceBronzeId: bronze.id,
        metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({ promotion: "bronze_to_silver_merge" })}::jsonb`,
      })
      .where(sql`${silverCompanies.id} = ${silverId}`);
  } else {
    const inserted = await db
      .insert(silverCompanies)
      .values({
        tenantId: job.data.tenantId,
        sourceBronzeId: bronze.id,
        cui: bronze.extractedCui ?? undefined,
        denumire: companyName || undefined,
        email: email || undefined,
        telefon: phone || undefined,
        adresa: adresa || undefined,
        enrichmentStatus: "pending",
        promotionStatus: "blocked",
        metadata: { promotion: "bronze_to_silver_insert" },
      })
      .returning({ id: silverCompanies.id });
    silverId = inserted[0].id;
  }

  const contactPrenume = String(payload.prenume ?? payload.firstName ?? "").trim();
  const contactNume = String(payload.nume ?? payload.lastName ?? "").trim();
  if (email || phone || contactPrenume || contactNume) {
    await db.insert(silverContacts).values({
      tenantId: job.data.tenantId,
      companyId: silverId,
      prenume: contactPrenume || undefined,
      nume: contactNume || undefined,
      email: email || undefined,
      telefon: phone || undefined,
      isPrimary: true,
      metadata: { source: "promotion_bronze_silver" },
    });
  }

  await db
    .update(bronzeContacts)
    .set({
      processingStatus: "promoted",
      promotedToSilverId: silverId,
      isDuplicate: Boolean(existingSilver),
      duplicateOfId: existingSilver?.sourceBronzeId ?? null,
    })
    .where(sql`${bronzeContacts.id} = ${bronze.id}`);

  const connection = getRedisConnectionOptions();
  const prefix = getQueuePrefix();
  for (const queueName of NEXT_ENRICHMENT_QUEUES) {
    const queue = new Queue(queueName, { connection, prefix });
    await queue.add("enrich", {
      tenantId: job.data.tenantId,
      companyId: silverId,
      cui: bronze.extractedCui,
      domain: (payload.website as string | undefined) ?? undefined,
      companyName,
      correlationId: job.data.correlationId,
    });
    await queue.close();
  }

  return { ok: true, status: "promoted", silverId, dedupMerged: Boolean(existingSilver) };
};
