import { bronzeContacts, db, setSessionTenantId, sql } from "@cerniq/db";
import { createServiceLogger } from "@cerniq/observability";
import {
  enqueueImportJob,
  enqueueImportJobBulk,
  QUEUES,
  type ImportExecutionContext,
} from "@cerniq/worker-shared";

const svcLog = createServiceLogger("e1-ingest-core", { etapa: "e1" });

const NORMALIZATION_BULK_CHUNK_SIZE = 500;

/**
 * Maps each normalization queue name to the canonical worker label used for
 * BullMQ job telemetry, runtime topology, and structured logging.
 */
export const NORMALIZATION_WORKER_BY_QUEUE: ReadonlyMap<string, string> = new Map([
  [QUEUES.NORMALIZE_NAME, "B1:name-normalizer"],
  [QUEUES.NORMALIZE_EMAIL, "B2:email-normalizer"],
  [QUEUES.NORMALIZE_PHONE, "B3:phone-normalizer"],
  [QUEUES.NORMALIZE_ADDRESS, "B4:address-normalizer"],
]);

export function resolveNormalizerWorkerName(queueName: string): string {
  const workerName = NORMALIZATION_WORKER_BY_QUEUE.get(queueName);
  if (!workerName) {
    throw new Error(
      `[e1-ingest-core] Unknown normalization queue "${queueName}". Update NORMALIZATION_WORKER_BY_QUEUE.`,
    );
  }
  return workerName;
}

export async function triggerNormalizationForContacts(
  tenantId: string,
  bronzeContactIds: string[],
  correlationId?: string,
  batchId?: string,
  importExecution?: ImportExecutionContext | null,
): Promise<void> {
  if (bronzeContactIds.length === 0) return;
  const targetQueues = [
    QUEUES.NORMALIZE_NAME,
    QUEUES.NORMALIZE_EMAIL,
    QUEUES.NORMALIZE_PHONE,
    QUEUES.NORMALIZE_ADDRESS,
  ] as const;

  for (const queueName of targetQueues) {
    for (let i = 0; i < bronzeContactIds.length; i += NORMALIZATION_BULK_CHUNK_SIZE) {
      const chunk = bronzeContactIds.slice(i, i + NORMALIZATION_BULK_CHUNK_SIZE);
      await enqueueImportJobBulk({
        queueName,
        parentImportExecution: importExecution ?? null,
        workerName: resolveNormalizerWorkerName(queueName),
        stageKey: "normalization",
        sessionKind: "ingest",
        items: chunk.map((bronzeContactId) => ({
          jobName: "normalize",
          payload: { tenantId, bronzeContactId, correlationId, batchId },
          opts: {
            jobId: `${queueName}-${bronzeContactId}`,
            attempts: 2,
            backoff: { type: "fixed" as const, delay: 500 },
          },
          entityType: "bronze_contact",
          entityId: bronzeContactId,
          contactId: bronzeContactId,
          idempotencyScope: `${queueName}-${bronzeContactId}`,
        })),
      });
    }
  }
}

const ANAF_BATCH_SIZE = 100;
const ANAF_BATCH_DELAY_MS = 1100;

async function markContactsPendingAnaf(tenantId: string, contactIds: string[]): Promise<void> {
  if (contactIds.length === 0) return;
  await db
    .update(bronzeContacts)
    .set({
      metadata: sql`jsonb_set(COALESCE(${bronzeContacts.metadata}, '{}'::jsonb), '{anafBronzeEnrichmentStatus}', '"pending"'::jsonb)`,
      updatedAt: new Date(),
    })
    .where(
      sql`${bronzeContacts.tenantId} = ${tenantId} AND ${bronzeContacts.id} = ANY(${contactIds})`,
    );
}

function buildCuiToBronzeIdsMap(
  contacts: { id: string; extractedCui: string | null }[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const contact of contacts) {
    if (!contact.extractedCui) continue;
    const ids = map.get(contact.extractedCui) ?? [];
    ids.push(contact.id);
    map.set(contact.extractedCui, ids);
  }
  return map;
}

/** Exported pentru teste / reutilizare sinapse; mapare CUI → contacte bronze. */
export function collectBronzeIdsForChunk(
  cuiChunk: string[],
  cuiToBronzeIds: Map<string, string[]>,
  nrRegComOnlyIds: string[],
  isFirstBatch: boolean,
): string[] {
  const ids = new Set<string>();
  for (const cui of cuiChunk) {
    for (const id of cuiToBronzeIds.get(cui) ?? []) ids.add(id);
  }
  if (isFirstBatch) {
    for (const id of nrRegComOnlyIds) ids.add(id);
  }
  return [...ids];
}

export async function triggerAnafBronzeEnrichment(
  tenantId: string,
  batchId: string,
  bronzeContactIds: string[],
  correlationId?: string,
  importExecution?: ImportExecutionContext | null,
): Promise<void> {
  if (bronzeContactIds.length === 0) return;

  await setSessionTenantId(tenantId);

  const contactsWithCui = await db.query.bronzeContacts.findMany({
    where: (t, { and, eq, isNotNull, inArray }) =>
      and(eq(t.tenantId, tenantId), inArray(t.id, bronzeContactIds), isNotNull(t.extractedCui)),
    columns: { id: true, extractedCui: true },
  });
  if (contactsWithCui.length === 0) return;

  await markContactsPendingAnaf(
    tenantId,
    contactsWithCui.map((c) => c.id),
  );

  const contactsNrRegComOnly = await db.query.bronzeContacts.findMany({
    where: (t, { and, eq, isNull, isNotNull, inArray }) =>
      and(
        eq(t.tenantId, tenantId),
        inArray(t.id, bronzeContactIds),
        isNull(t.extractedCui),
        isNotNull(t.extractedNrRegCom),
      ),
    columns: { id: true },
  });
  await markContactsPendingAnaf(
    tenantId,
    contactsNrRegComOnly.map((c) => c.id),
  );

  const cuiToBronzeIds = buildCuiToBronzeIdsMap(contactsWithCui);
  const allCuis = [...cuiToBronzeIds.keys()];
  const duplicateCuiCount = contactsWithCui.length - allCuis.length;
  if (duplicateCuiCount > 0) {
    svcLog.info(
      {
        contactsWithCui: contactsWithCui.length,
        uniqueCuis: allCuis.length,
        duplicateCuiCount,
      },
      "Deduped duplicate CUIs before ANAF bronze enrichment batch enqueue",
    );
  }

  const nrRegComOnlyIds = contactsNrRegComOnly.map((c) => c.id);
  const totalBatches = Math.ceil(allCuis.length / ANAF_BATCH_SIZE);
  for (let i = 0; i < totalBatches; i++) {
    const cuiChunk = allCuis.slice(i * ANAF_BATCH_SIZE, (i + 1) * ANAF_BATCH_SIZE);
    const chunkBronzeIds = collectBronzeIdsForChunk(
      cuiChunk,
      cuiToBronzeIds,
      nrRegComOnlyIds,
      i === 0,
    );
    await enqueueImportJob({
      queueName: QUEUES.ENRICH_BRONZE_ANAF,
      jobName: "anaf-bronze-enrich",
      payload: {
        tenantId,
        batchId,
        cuiList: cuiChunk,
        bronzeContactIds: chunkBronzeIds,
        correlationId: correlationId ?? batchId,
        batchIndex: i,
        totalBatches,
      },
      opts: {
        jobId: `anaf-bronze-${batchId}-${i}`,
        delay: i * ANAF_BATCH_DELAY_MS,
        attempts: 5,
        backoff: { type: "exponential", delay: 1000 },
      },
      parentImportExecution: importExecution ?? null,
      workerName: "B5:anaf-bronze-enricher",
      stageKey: "anaf_bronze",
      entityType: "batch",
      entityId: `${batchId}:${i}`,
      sessionKind: "ingest",
      idempotencyScope: `anaf-bronze-${batchId}-${i}`,
    });
  }
}
