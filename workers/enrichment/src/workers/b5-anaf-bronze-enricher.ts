import type { Processor } from "bullmq";
import { bronzeContacts, db, sql } from "@cerniq/db";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { fetchAnafBatchByCuis, type AnafV9CompanyRecord } from "../lib/anaf-api-client.js";
import { triggerCuiValidationIfPossible } from "./normalization-utils.js";

export type AnafBronzeEnricherJobData = {
  tenantId: string;
  batchId: string;
  cuiList: string[];
  bronzeContactIds: string[];
  correlationId: string;
  batchIndex: number;
  totalBatches: number;
};

type ContactTrigger = { bronzeContactId: string; cui: string | null; nrRegCom: string | null };

async function processFoundCui(
  tenantId: string,
  batchId: string,
  cui: number,
  anafRecord: AnafV9CompanyRecord,
  contactsToTrigger: ContactTrigger[],
) {
  const cuiStr = String(cui);
  const nrRegCom = extractNrRegCom(anafRecord);
  const denumire = anafRecord.date_generale?.denumire ?? null;

  const matchingContacts = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return tx.query.bronzeContacts.findMany({
      where: (t, { and, eq }) =>
        and(
          eq(t.tenantId, tenantId),
          eq(sql`COALESCE(jsonb_extract_path_text(${t.metadata}, 'batchId'), '')`, batchId),
          eq(t.extractedCui, cuiStr),
        ),
      columns: { id: true, extractedNrRegCom: true, extractedName: true },
    });
  });

  for (const contact of matchingContacts) {
    const updates: Record<string, unknown> = {};
    const fieldSources: Record<string, string> = {};
    if (!contact.extractedNrRegCom && nrRegCom) {
      updates.extractedNrRegCom = nrRegCom;
      updates.extractedNrRegComRaw = nrRegCom;
      fieldSources.extractedNrRegCom = "anaf_v9";
    }
    if (!contact.extractedName && denumire) {
      updates.extractedName = denumire;
      fieldSources.extractedName = "anaf_v9";
    }

    await db
      .update(bronzeContacts)
      .set({
        ...updates,
        metadata: sql`COALESCE(${bronzeContacts.metadata}, '{}'::jsonb) || ${JSON.stringify({
          anafResponse: anafRecord,
          anafBronzeEnrichmentStatus: "completed",
          anafBronzeEnrichmentDate: new Date().toISOString(),
          anafBronzeFieldSources: fieldSources,
        })}::jsonb`,
        updatedAt: new Date(),
      })
      .where(sql`${bronzeContacts.id} = ${contact.id}`);

    contactsToTrigger.push({
      bronzeContactId: contact.id,
      cui: cuiStr,
      nrRegCom: contact.extractedNrRegCom ?? nrRegCom,
    });
  }

  // Cross-reference: NrRegCom-only contacts that match this company
  if (nrRegCom) {
    await crossReferenceNrRegComContacts(
      tenantId,
      batchId,
      cuiStr,
      nrRegCom,
      denumire,
      anafRecord,
      contactsToTrigger,
    );
  }
}

async function crossReferenceNrRegComContacts(
  tenantId: string,
  batchId: string,
  cuiStr: string,
  nrRegCom: string,
  denumire: string | null,
  anafRecord: AnafV9CompanyRecord,
  contactsToTrigger: ContactTrigger[],
) {
  const nrRegComContacts = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return tx.query.bronzeContacts.findMany({
      where: (t, { and, eq, isNull }) =>
        and(
          eq(t.tenantId, tenantId),
          eq(sql`COALESCE(jsonb_extract_path_text(${t.metadata}, 'batchId'), '')`, batchId),
          isNull(t.extractedCui),
          eq(t.extractedNrRegCom, nrRegCom),
        ),
      columns: { id: true, extractedName: true },
    });
  });

  for (const nrContact of nrRegComContacts) {
    const nrUpdates: Record<string, unknown> = {
      extractedCui: cuiStr,
      extractedCuiRaw: cuiStr,
    };
    const nrFieldSources: Record<string, string> = {
      extractedCui: "anaf_v9_cross_reference",
    };
    if (!nrContact.extractedName && denumire) {
      nrUpdates.extractedName = denumire;
      nrFieldSources.extractedName = "anaf_v9";
    }

    await db
      .update(bronzeContacts)
      .set({
        ...nrUpdates,
        metadata: sql`COALESCE(${bronzeContacts.metadata}, '{}'::jsonb) || ${JSON.stringify({
          anafResponse: anafRecord,
          anafBronzeEnrichmentStatus: "cross_referenced",
          anafBronzeEnrichmentDate: new Date().toISOString(),
          anafBronzeFieldSources: nrFieldSources,
          crossReferencedFromCui: cuiStr,
        })}::jsonb`,
        updatedAt: new Date(),
      })
      .where(sql`${bronzeContacts.id} = ${nrContact.id}`);

    contactsToTrigger.push({ bronzeContactId: nrContact.id, cui: cuiStr, nrRegCom });
  }
}

async function processNotFoundCui(
  tenantId: string,
  batchId: string,
  notFoundCui: number,
  contactsToTrigger: ContactTrigger[],
) {
  const cuiStr = String(notFoundCui);
  const matchingContacts = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return tx.query.bronzeContacts.findMany({
      where: (t, { and, eq }) =>
        and(
          eq(t.tenantId, tenantId),
          eq(sql`COALESCE(jsonb_extract_path_text(${t.metadata}, 'batchId'), '')`, batchId),
          eq(t.extractedCui, cuiStr),
        ),
      columns: { id: true, extractedNrRegCom: true },
    });
  });

  for (const contact of matchingContacts) {
    await db
      .update(bronzeContacts)
      .set({
        metadata: sql`COALESCE(${bronzeContacts.metadata}, '{}'::jsonb) || ${JSON.stringify({
          anafResponse: null,
          anafBronzeEnrichmentStatus: "not_found",
          anafBronzeEnrichmentDate: new Date().toISOString(),
        })}::jsonb`,
        updatedAt: new Date(),
      })
      .where(sql`${bronzeContacts.id} = ${contact.id}`);

    contactsToTrigger.push({
      bronzeContactId: contact.id,
      cui: cuiStr,
      nrRegCom: contact.extractedNrRegCom,
    });
  }
}

export const anafBronzeEnricherProcessor: Processor<AnafBronzeEnricherJobData> = async (job) => {
  const startedAt = Date.now();
  try {
    const { tenantId, batchId, cuiList, correlationId, batchIndex, totalBatches } = job.data;

    console.log(
      `[b5] Processing batch ${batchIndex + 1}/${totalBatches} with ${cuiList.length} CUIs`,
    );

    const result = await fetchAnafBatchByCuis(cuiList);

    console.log(
      `[b5] ANAF response: found=${result.found.size}, notFound=${result.notFound.length}`,
    );

    const contactsToTrigger: ContactTrigger[] = [];

    for (const [cui, anafRecord] of result.found) {
      await processFoundCui(tenantId, batchId, cui, anafRecord, contactsToTrigger);
    }

    for (const notFoundCui of result.notFound) {
      await processNotFoundCui(tenantId, batchId, notFoundCui, contactsToTrigger);
    }

    // Deduplicate by CUI: only trigger c1 once per unique CUI to avoid flooding ANAF
    const triggeredCuis = new Set<string>();
    for (const { bronzeContactId, cui, nrRegCom } of contactsToTrigger) {
      const dedupeKey = cui ?? bronzeContactId;
      if (triggeredCuis.has(dedupeKey)) continue;
      triggeredCuis.add(dedupeKey);
      await triggerCuiValidationIfPossible(tenantId, bronzeContactId, cui, nrRegCom, correlationId);
    }

    jobsProcessed.add(1, { worker: "b5-anaf-bronze-enricher", status: "success" });
    return {
      ok: true as const,
      batchIndex,
      totalBatches,
      found: result.found.size,
      notFound: result.notFound.length,
      contactsTriggered: contactsToTrigger.length,
    };
  } catch (error) {
    console.error(`[b5] Error processing batch:`, error);
    jobErrors.add(1, { worker: "b5-anaf-bronze-enricher" });
    throw error;
  } finally {
    jobDuration.record(Date.now() - startedAt, { worker: "b5-anaf-bronze-enricher" });
  }
};

function extractNrRegCom(record: AnafV9CompanyRecord): string | null {
  const raw = record.date_generale?.nrRegCom;
  if (!raw || typeof raw !== "string" || raw.trim() === "") return null;
  return raw.trim();
}
