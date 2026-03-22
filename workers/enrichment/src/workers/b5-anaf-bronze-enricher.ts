import type { Processor } from "bullmq";
import { bronzeContacts, bronzeImportBatches, db, sql } from "@cerniq/db";
import {
  sanitizeNrRegCom,
  type ImportExecutionContext,
  updateImportRuntimeProgress,
} from "@cerniq/worker-shared";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { fetchAnafBatchByCuis, type AnafV9CompanyRecord } from "../lib/anaf-api-client.js";
import { triggerCuiValidationIfPossible } from "./normalization-utils.js";
import { createJobLogger } from "../lib/job-logger.js";

export type AnafBronzeEnricherJobData = {
  tenantId: string;
  batchId: string;
  cuiList: string[];
  bronzeContactIds: string[];
  correlationId: string;
  batchIndex: number;
  totalBatches: number;
  importExecution?: ImportExecutionContext;
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
  const nrRegComResult = extractNrRegCom(anafRecord);
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
    if (!contact.extractedNrRegCom && nrRegComResult.sanitized) {
      updates.extractedNrRegCom = nrRegComResult.sanitized;
      updates.extractedNrRegComRaw = nrRegComResult.raw;
      fieldSources.extractedNrRegCom = "anaf_v9";
    }
    if (nrRegComResult.isCanonicalNew) {
      updates.extractedNrRegComCanonical = nrRegComResult.sanitized;
      fieldSources.extractedNrRegComCanonical = "anaf_v9";
    }
    if (!contact.extractedName && denumire) {
      updates.extractedName = denumire;
      fieldSources.extractedName = "anaf_v9";
    }

    const anafSummary = {
      cui: cuiStr,
      enrichedAt: new Date().toISOString(),
      found: true,
    };

    await db
      .update(bronzeContacts)
      .set({
        ...updates,
        metadata: sql`jsonb_set(COALESCE(${bronzeContacts.metadata}, '{}'::jsonb), '{anafBronzeEnrichment}', ${JSON.stringify(
          {
            ...anafSummary,
            anafBronzeEnrichmentStatus: "completed",
            anafBronzeFieldSources: fieldSources,
          },
        )}::jsonb)`,
        updatedAt: new Date(),
      })
      .where(sql`${bronzeContacts.id} = ${contact.id}`);

    contactsToTrigger.push({
      bronzeContactId: contact.id,
      cui: cuiStr,
      nrRegCom: contact.extractedNrRegCom ?? nrRegComResult.sanitized,
    });
  }

  if (nrRegComResult.sanitized) {
    await crossReferenceNrRegComContacts(
      tenantId,
      batchId,
      cuiStr,
      nrRegComResult.sanitized,
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
          // Case-insensitive comparison: ANAF and Excel both store old format (J09/98/2003)
          // but may differ in case/whitespace. Use UPPER(TRIM(...)) for robust matching.
          eq(sql`UPPER(TRIM(${t.extractedNrRegCom}))`, nrRegCom.toUpperCase().trim()),
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
        metadata: sql`jsonb_set(COALESCE(${bronzeContacts.metadata}, '{}'::jsonb), '{anafBronzeEnrichment}', ${JSON.stringify(
          {
            cui: cuiStr,
            enrichedAt: new Date().toISOString(),
            found: true,
            anafBronzeEnrichmentStatus: "cross_referenced",
            anafBronzeFieldSources: nrFieldSources,
            crossReferencedFromCui: cuiStr,
          },
        )}::jsonb)`,
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
        metadata: sql`jsonb_set(COALESCE(${bronzeContacts.metadata}, '{}'::jsonb), '{anafBronzeEnrichment}', ${JSON.stringify(
          {
            cui: cuiStr,
            enrichedAt: new Date().toISOString(),
            found: false,
            anafBronzeEnrichmentStatus: "not_found",
          },
        )}::jsonb)`,
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
  const log = createJobLogger({
    batchId: job.data.batchId,
    tenantId: job.data.tenantId,
    workerName: "B5:anaf-bronze-enricher",
    jobId: String(job.id ?? ""),
  });

  try {
    const { tenantId, batchId, cuiList, correlationId, batchIndex, totalBatches } = job.data;

    log.step(
      "anaf_request_start",
      `Trimitere batch ANAF ${batchIndex + 1}/${totalBatches} cu ${cuiList.length} CUI-uri la webservicesp.anaf.ro`,
      {
        batchIndex,
        totalBatches,
        cuiCount: cuiList.length,
        cuiList: cuiList.slice(0, 20), // max 20 in log
      },
    );

    const result = await fetchAnafBatchByCuis(cuiList);

    log.step(
      "anaf_response",
      `Răspuns ANAF primit: ${result.found.size} găsite, ${result.notFound.length} negăsite din ${cuiList.length} CUI-uri`,
      {
        foundCount: result.found.size,
        notFoundCount: result.notFound.length,
        foundCuis: Array.from(result.found.keys()).map(String).slice(0, 20),
        notFoundCuis: result.notFound.map(String).slice(0, 20),
      },
    );

    if (result.notFound.length > 0) {
      log.warn(
        "anaf_not_found",
        `${result.notFound.length} CUI-uri nu au fost găsite în ANAF — firmele vor fi marcate ca 'not_found' dar vor continua în pipeline`,
        { notFoundCuis: result.notFound.map(String), batchIndex },
      );
    }

    const contactsToTrigger: ContactTrigger[] = [];

    for (const [cui, anafRecord] of result.found) {
      await processFoundCui(tenantId, batchId, cui, anafRecord, contactsToTrigger);
    }

    for (const notFoundCui of result.notFound) {
      await processNotFoundCui(tenantId, batchId, notFoundCui, contactsToTrigger);
    }

    // Deduplicate by CUI: only trigger c1 once per unique CUI to avoid flooding ANAF
    const triggeredCuis = new Set<string>();
    let triggeredCount = 0;
    for (const { bronzeContactId, cui, nrRegCom } of contactsToTrigger) {
      const dedupeKey = cui ?? bronzeContactId;
      if (triggeredCuis.has(dedupeKey)) continue;
      triggeredCuis.add(dedupeKey);
      triggeredCount++;
      await triggerCuiValidationIfPossible(
        tenantId,
        bronzeContactId,
        cui,
        nrRegCom,
        correlationId,
        job.data.importExecution ?? null,
      );
    }

    log.step(
      "trigger_validation",
      `${triggeredCount} contacte trimise la validare CUI (C1/C2) sau direct la promotion`,
      { triggeredCount, totalContacts: contactsToTrigger.length },
    );

    // Write progress back to batch metadata so UI can poll it — non-critical, never fail the job
    try {
      const isLastBatch = batchIndex + 1 >= totalBatches;
      // Deterministic: batchIndex * 100 is the count before this batch; add current batch size.
      // This is retry-safe (no read-then-write, no cumulative state from DB).
      const processedCuisTotal = batchIndex * 100 + cuiList.length;
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
        await tx
          .update(bronzeImportBatches)
          .set({
            metadata: (() => {
              let expr = sql`COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb)`;
              expr = sql`jsonb_set(${expr}, '{anafEnrichmentProcessedBatches}', ${JSON.stringify(batchIndex + 1)}::jsonb)`;
              expr = sql`jsonb_set(${expr}, '{anafEnrichmentProcessedCuis}', ${JSON.stringify(processedCuisTotal)}::jsonb)`;
              expr = sql`jsonb_set(${expr}, '{anafEnrichmentLastProgressAt}', ${JSON.stringify(new Date().toISOString())}::jsonb)`;
              if (isLastBatch) {
                expr = sql`jsonb_set(${expr}, '{anafEnrichmentStatus}', '"completed"'::jsonb)`;
                expr = sql`jsonb_set(${expr}, '{anafEnrichmentCompletedAt}', ${JSON.stringify(new Date().toISOString())}::jsonb)`;
              }
              return expr;
            })(),
            updatedAt: new Date(),
          })
          .where(
            sql`${bronzeImportBatches.id} = ${batchId} AND ${bronzeImportBatches.tenantId} = ${tenantId}`,
          );
      });
    } catch (progressError) {
      log.warn(
        "progress_write_failed",
        `Actualizare progres metadata pentru batch ${batchIndex + 1}/${totalBatches} a eșuat — ignorat, procesarea continuă`,
        { error: progressError instanceof Error ? progressError.message : String(progressError) },
      );
    }

    await updateImportRuntimeProgress(job as never, {
      checkpointPayload: {
        batchIndex,
        totalBatches,
        processedBatches: batchIndex + 1,
        processedCuis: batchIndex * 100 + cuiList.length,
      },
      resumePayload: job.data,
      workerMetrics: {
        totalBatches,
        processedBatches: batchIndex + 1,
        totalCuis: job.data.totalBatches * 100,
        processedCuis: batchIndex * 100 + cuiList.length,
      },
      counterDelta: {
        totalUnits: cuiList.length,
        processedUnits: cuiList.length,
        successUnits: result.found.size,
        failedUnits: result.notFound.length,
      },
    });

    log.step("done", `Batch ANAF ${batchIndex + 1}/${totalBatches} procesat cu succes`, {
      batchIndex,
      found: result.found.size,
      notFound: result.notFound.length,
      durationMs: Date.now() - startedAt,
    });

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
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    log.error(
      "fatal",
      `Batch ANAF ${job.data.batchIndex + 1}/${job.data.totalBatches} eșuat: ${errMsg}`,
      {
        errorMessage: errMsg,
        errorStack: errStack,
        batchIndex: job.data.batchIndex,
        totalBatches: job.data.totalBatches,
        cuiList: job.data.cuiList.slice(0, 20),
      },
    );
    jobErrors.add(1, { worker: "b5-anaf-bronze-enricher" });
    throw error;
  } finally {
    jobDuration.record(Date.now() - startedAt, { worker: "b5-anaf-bronze-enricher" });
  }
};

const NEW_NR_REG_COM_RE = /^[JFC]\d{4}\d{6}\d{2}\d$/i;

function extractNrRegCom(record: AnafV9CompanyRecord): {
  raw: string | null;
  sanitized: string | null;
  isCanonicalNew: boolean;
} {
  const raw = record.date_generale?.nrRegCom;
  if (!raw || typeof raw !== "string" || raw.trim() === "") {
    return { raw: null, sanitized: null, isCanonicalNew: false };
  }
  const trimmed = raw.trim();
  const sanitized = sanitizeNrRegCom(trimmed);
  const isCanonicalNew = sanitized !== null && NEW_NR_REG_COM_RE.test(sanitized);
  return { raw: trimmed, sanitized, isCanonicalNew };
}
