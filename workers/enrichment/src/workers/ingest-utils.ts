import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { Transform } from "node:stream";
import { Queue } from "bullmq";
import { bronzeContacts, bronzeImportBatches, db, setSessionTenantId, sql } from "@cerniq/db";
import { getQueuePrefix, getRedisConnectionOptions } from "@cerniq/worker-shared";

const STREAMING_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB
const INSERT_BATCH_SIZE = 1000;

export type IngestBaseJobData = {
  tenantId: string;
  batchId?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  content?: string;
  encoding?: string;
  hasHeader?: boolean;
  delimiter?: string;
  columnMapping?: Record<string, string>;
  skipRows?: number;
  maxRows?: number;
  correlationId?: string;
};

export async function readInputContent(jobData: IngestBaseJobData): Promise<string> {
  if (typeof jobData.content === "string" && jobData.content.length > 0) {
    return jobData.content;
  }
  if (!jobData.filePath) {
    throw new Error("Missing input data: provide either content or filePath");
  }
  const buffer = await readFile(jobData.filePath);
  return buffer.toString(detectEncoding(buffer));
}

export async function shouldUseStreaming(jobData: IngestBaseJobData): Promise<boolean> {
  if (jobData.content) return false;
  if (!jobData.filePath) return false;
  const fileSize = jobData.fileSize ?? (await stat(jobData.filePath)).size;
  return fileSize >= STREAMING_THRESHOLD_BYTES;
}

export function createDecodingStream(encoding: string): Transform {
  const resolvedEncoding = resolveBufferEncoding(encoding);
  return new Transform({
    transform(chunk: Buffer, _enc, callback) {
      callback(null, chunk.toString(resolvedEncoding));
    },
  });
}

export function getInsertBatchSize(): number {
  return INSERT_BATCH_SIZE;
}

function resolveBufferEncoding(encoding: string): BufferEncoding {
  const lower = encoding.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (lower === "utf8" || lower === "utf-8") return "utf8";
  if (
    lower === "latin1" ||
    lower === "iso88591" ||
    lower === "iso88592" ||
    lower === "win1250" ||
    lower === "windows1250"
  ) {
    return "latin1";
  }
  if (lower === "utf16le") return "utf16le";
  if (lower === "ascii") return "ascii";
  return "utf8";
}

export function detectEncoding(buffer: Buffer): BufferEncoding {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return "utf8";
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return "utf16le";
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  let hasHighBytes = false;
  let invalidUtf8 = false;
  let i = 0;
  while (i < sample.length) {
    const byte = sample[i] ?? 0;
    if (byte > 0x7f) {
      hasHighBytes = true;
      if ((byte & 0xe0) === 0xc0) {
        if (i + 1 >= sample.length || ((sample[i + 1] ?? 0) & 0xc0) !== 0x80) invalidUtf8 = true;
        else i += 1;
      } else if ((byte & 0xf0) === 0xe0) {
        if (
          i + 2 >= sample.length ||
          ((sample[i + 1] ?? 0) & 0xc0) !== 0x80 ||
          ((sample[i + 2] ?? 0) & 0xc0) !== 0x80
        )
          invalidUtf8 = true;
        else i += 2;
      } else {
        invalidUtf8 = true;
      }
    }
    i++;
  }

  if (hasHighBytes && invalidUtf8) return "latin1";
  return "utf8";
}

export function detectEncodingFromPath(_filePath: string): string {
  return "utf8";
}

export function createFileReadStream(filePath: string, encoding: string) {
  const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 });
  const decoder = createDecodingStream(encoding);
  return stream.pipe(decoder);
}

export function normalizeRow(
  row: Record<string, unknown>,
  mapping: Record<string, string> = {},
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const targetKey = mapping[key] ?? key;
    normalized[targetKey] = value;
  }
  return normalized;
}

export function detectColumnMapping(headers: string[]): Record<string, string> {
  const patterns: Array<{ target: string; aliases: string[] }> = [
    {
      target: "companyName",
      aliases: ["company", "company_name", "firma", "denumire", "nume_firma"],
    },
    { target: "cui", aliases: ["cui", "cif", "vat", "vat_number"] },
    { target: "email", aliases: ["email", "email_address", "mail"] },
    { target: "phone", aliases: ["phone", "telefon", "telefon_mobil", "mobile"] },
    { target: "website", aliases: ["website", "site", "url"] },
    { target: "address", aliases: ["address", "adresa", "street_address"] },
  ];

  const mapping: Record<string, string> = {};
  for (const originalHeader of headers) {
    const key = originalHeader.trim().toLowerCase();
    const match = patterns.find((item) => item.aliases.includes(key));
    if (match) {
      mapping[originalHeader] = match.target;
    }
  }

  // Keep unmatched headers as-is for full raw payload fidelity.
  for (const header of headers) {
    if (!mapping[header]) {
      mapping[header] = header;
    }
  }

  return mapping;
}

export async function insertBronzeRows(
  tenantId: string,
  rows: Array<Record<string, unknown>>,
  sourceType: "csv_import" | "excel_import" | "webhook" | "manual" | "api",
  batchId?: string,
) {
  await setSessionTenantId(tenantId);
  const payload = rows.map((row, index) => ({
    tenantId,
    sourceType,
    rawPayload: row,
    contentHash: createHash("sha256").update(JSON.stringify(row)).digest("hex"),
    processingStatus: "pending" as const,
    metadata: {
      batchId: batchId ?? null,
      sourceType,
      rowNumber: index + 1,
      importedAt: new Date().toISOString(),
    },
  }));

  let insertedRows: Array<{ id: string }> = [];
  if (payload.length > 0) {
    insertedRows = await db
      .insert(bronzeContacts)
      .values(payload)
      .onConflictDoNothing()
      .returning({ id: bronzeContacts.id });
  }

  return {
    rowsRead: payload.length,
    rowsInserted: insertedRows.length,
    insertedIds: insertedRows.map((x) => x.id),
  };
}

export async function triggerNormalizationForContacts(
  tenantId: string,
  bronzeContactIds: string[],
  correlationId?: string,
): Promise<void> {
  if (bronzeContactIds.length === 0) return;
  const connection = getRedisConnectionOptions();
  const prefix = getQueuePrefix();
  const targetQueues = [
    "bronze:normalize:name",
    "bronze:normalize:email",
    "bronze:normalize:phone",
    "bronze:normalize:address",
  ] as const;

  for (const queueName of targetQueues) {
    const queue = new Queue(queueName, { connection, prefix });
    for (const bronzeContactId of bronzeContactIds) {
      await queue.add(
        "normalize",
        {
          tenantId,
          bronzeContactId,
          correlationId,
        },
        {
          jobId: `${queueName}:${bronzeContactId}`,
          attempts: 2,
          backoff: { type: "fixed", delay: 500 },
        },
      );
    }
    await queue.close();
  }
}

export async function updateImportBatchCounters(args: {
  tenantId: string;
  batchId?: string;
  processedRows: number;
  successRows: number;
  errorRows: number;
  duplicateRows: number;
  status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
}): Promise<void> {
  if (!args.batchId) return;
  await setSessionTenantId(args.tenantId);
  await db
    .update(bronzeImportBatches)
    .set({
      processedRows: args.processedRows,
      successRows: args.successRows,
      errorRows: args.errorRows,
      duplicateRows: args.duplicateRows,
      status: args.status ?? "processing",
      updatedAt: new Date(),
      metadata: sql`COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb) || ${JSON.stringify({
        lastProgressAt: new Date().toISOString(),
      })}::jsonb`,
    })
    .where(sql`${bronzeImportBatches.id} = ${args.batchId}`);
}
