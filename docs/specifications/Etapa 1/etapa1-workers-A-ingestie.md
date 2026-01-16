# CERNIQ.APP — WORKERS CATEGORIA A: INGESTIE BRONZE
## 5 Workers pentru Import Date Brute
### Versiunea 1.0 | 15 Ianuarie 2026

---

# A.1 CSV Parser Worker

## Configurare

```typescript
// Worker: bronze:ingest:csv-parser
const A1_CONFIG: WorkerConfig = {
  queueName: 'bronze:ingest:csv-parser',
  concurrency: 5,
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  timeout: 300000, // 5 minute per file
};
```

## Job Payload

```typescript
interface CsvParserJobData {
  tenantId: string;
  batchId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  encoding?: string;        // default: 'utf-8'
  delimiter?: string;       // default: ','
  hasHeader?: boolean;      // default: true
  columnMapping?: Record<string, string>;
  skipRows?: number;
  maxRows?: number;
  correlationId: string;
}
```

## Implementare

```typescript
// /apps/workers/src/bronze/csv-parser.worker.ts

import { Worker, Job } from 'bullmq';
import Papa from 'papaparse';
import { createReadStream } from 'fs';
import { workerConnection } from '@cerniq/queue';
import { db, bronzeContacts } from '@cerniq/db';
import { bronzeComputeContentHash } from '@cerniq/db/functions';
import { logger } from '@cerniq/logger';
import { metrics } from '@cerniq/metrics';

const csvParserWorker = new Worker<CsvParserJobData>(
  'bronze:ingest:csv-parser',
  async (job: Job<CsvParserJobData>) => {
    const { tenantId, batchId, filePath, fileName, columnMapping, correlationId } = job.data;
    const log = logger.child({ jobId: job.id, correlationId, batchId });
    
    log.info({ fileName }, 'Starting CSV parsing');
    
    let processedRows = 0;
    let successRows = 0;
    let errorRows = 0;
    let duplicateRows = 0;
    
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(filePath, { encoding: job.data.encoding || 'utf-8' });
      
      Papa.parse(readStream, {
        header: job.data.hasHeader !== false,
        delimiter: job.data.delimiter || ',',
        skipEmptyLines: true,
        
        step: async (results, parser) => {
          parser.pause();
          processedRows++;
          
          try {
            const row = results.data as Record<string, string>;
            const mappedData = columnMapping 
              ? mapColumns(row, columnMapping)
              : row;
            
            // Compute content hash pentru deduplicare
            const contentHash = bronzeComputeContentHash(mappedData);
            
            // Check duplicate
            const existing = await db.query.bronzeContacts.findFirst({
              where: (bc, { eq, and }) => and(
                eq(bc.tenantId, tenantId),
                eq(bc.contentHash, contentHash),
                eq(bc.isDuplicate, false)
              )
            });
            
            if (existing) {
              duplicateRows++;
              log.debug({ row: processedRows }, 'Duplicate detected');
            } else {
              // Insert bronze contact
              await db.insert(bronzeContacts).values({
                tenantId,
                rawPayload: mappedData,
                sourceType: 'csv_import',
                sourceIdentifier: `${fileName}:row_${processedRows}`,
                sourceMetadata: {
                  batchId,
                  rowNumber: processedRows,
                  fileName,
                },
                contentHash,
                processingStatus: 'pending',
              });
              successRows++;
            }
            
            // Update progress
            if (processedRows % 100 === 0) {
              await job.updateProgress({
                processedRows,
                successRows,
                errorRows,
                duplicateRows,
              });
            }
            
          } catch (error) {
            errorRows++;
            log.error({ error, row: processedRows }, 'Error processing row');
          }
          
          parser.resume();
        },
        
        complete: async () => {
          const duration = Date.now() - startTime;
          
          // Update batch record
          await db.update(bronzeImportBatches)
            .set({
              status: 'completed',
              processedRows,
              successRows,
              errorRows,
              duplicateRows,
              completedAt: new Date(),
            })
            .where(eq(bronzeImportBatches.id, batchId));
          
          // Metrics
          metrics.counter('etapa1.csv.rows_processed').add(processedRows);
          metrics.counter('etapa1.csv.rows_success').add(successRows);
          metrics.histogram('etapa1.csv.parse_duration_ms').record(duration);
          
          log.info({
            processedRows,
            successRows,
            errorRows,
            duplicateRows,
            durationMs: duration,
          }, 'CSV parsing completed');
          
          // Trigger next workers
          await triggerNormalization(tenantId, batchId, correlationId);
          
          resolve({
            processedRows,
            successRows,
            errorRows,
            duplicateRows,
          });
        },
        
        error: (error) => {
          log.error({ error }, 'CSV parsing failed');
          reject(error);
        },
      });
    });
  },
  {
    connection: workerConnection,
    concurrency: A1_CONFIG.concurrency,
  }
);

function mapColumns(
  row: Record<string, string>,
  mapping: Record<string, string>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [sourceCol, targetCol] of Object.entries(mapping)) {
    if (row[sourceCol] !== undefined) {
      mapped[targetCol] = row[sourceCol];
    }
  }
  return mapped;
}

async function triggerNormalization(
  tenantId: string,
  batchId: string,
  correlationId: string
) {
  const normQueue = new Queue('bronze:normalize:batch', { connection: workerConnection });
  await normQueue.add(
    `norm-${batchId}`,
    { tenantId, batchId, correlationId },
    { jobId: `norm-${batchId}-${Date.now()}` }
  );
}

export { csvParserWorker };
```

## Triggers

| Event | Target Queue | Condition |
|-------|--------------|-----------|
| `completed` | `bronze:normalize:batch` | Always |
| `failed` | `pipeline:error:handler` | After max attempts |

---

# A.2 Excel Parser Worker

## Configurare

```typescript
const A2_CONFIG: WorkerConfig = {
  queueName: 'bronze:ingest:excel-parser',
  concurrency: 3,
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  timeout: 600000, // 10 minute
};
```

## Job Payload

```typescript
interface ExcelParserJobData {
  tenantId: string;
  batchId: string;
  filePath: string;
  fileName: string;
  sheetName?: string;       // default: first sheet
  sheetIndex?: number;
  headerRow?: number;       // default: 1
  dataStartRow?: number;    // default: 2
  columnMapping?: Record<string, string>;
  correlationId: string;
}
```

## Implementare

```typescript
// /apps/workers/src/bronze/excel-parser.worker.ts

import { Worker, Job } from 'bullmq';
import * as XLSX from 'xlsx';
import { workerConnection } from '@cerniq/queue';
import { db, bronzeContacts } from '@cerniq/db';
import { logger } from '@cerniq/logger';

const excelParserWorker = new Worker<ExcelParserJobData>(
  'bronze:ingest:excel-parser',
  async (job: Job<ExcelParserJobData>) => {
    const { tenantId, batchId, filePath, sheetName, sheetIndex, headerRow, columnMapping } = job.data;
    const log = logger.child({ jobId: job.id, batchId });
    
    log.info('Starting Excel parsing');
    
    // Read workbook
    const workbook = XLSX.readFile(filePath, {
      type: 'file',
      cellDates: true,
      cellNF: true,
    });
    
    // Select sheet
    const sheet = sheetName 
      ? workbook.Sheets[sheetName]
      : workbook.Sheets[workbook.SheetNames[sheetIndex || 0]];
    
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName || sheetIndex}`);
    }
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      header: headerRow || 1,
      defval: null,
      blankrows: false,
    });
    
    log.info({ rowCount: jsonData.length }, 'Excel data extracted');
    
    let successRows = 0;
    let errorRows = 0;
    let duplicateRows = 0;
    
    // Process rows
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      try {
        const mappedData = columnMapping
          ? mapExcelColumns(row, columnMapping)
          : row;
        
        const contentHash = bronzeComputeContentHash(mappedData);
        
        // Check duplicate
        const existing = await db.query.bronzeContacts.findFirst({
          where: (bc, { eq, and }) => and(
            eq(bc.tenantId, tenantId),
            eq(bc.contentHash, contentHash)
          )
        });
        
        if (existing) {
          duplicateRows++;
        } else {
          await db.insert(bronzeContacts).values({
            tenantId,
            rawPayload: mappedData,
            sourceType: 'excel_import',
            sourceIdentifier: `${job.data.fileName}:row_${i + 2}`,
            sourceMetadata: {
              batchId,
              rowNumber: i + 2,
              sheetName: sheetName || workbook.SheetNames[0],
            },
            contentHash,
            processingStatus: 'pending',
          });
          successRows++;
        }
        
        if (i % 100 === 0) {
          await job.updateProgress({ processed: i, total: jsonData.length });
        }
        
      } catch (error) {
        errorRows++;
        log.error({ error, row: i }, 'Error processing Excel row');
      }
    }
    
    // Trigger normalization
    await triggerNormalization(tenantId, batchId, job.data.correlationId);
    
    return { successRows, errorRows, duplicateRows };
  },
  { connection: workerConnection, concurrency: A2_CONFIG.concurrency }
);

export { excelParserWorker };
```

---

# A.3 Webhook Handler Worker

## Configurare

```typescript
const A3_CONFIG: WorkerConfig = {
  queueName: 'bronze:ingest:webhook',
  concurrency: 20,
  attempts: 3,
  backoff: { type: 'fixed', delay: 1000 },
  timeout: 30000, // 30 secunde
};
```

## Job Payload

```typescript
interface WebhookJobData {
  tenantId: string;
  webhookId: string;
  webhookType: string;      // 'apia', 'crm', 'form', 'custom'
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  sourceIp: string;
  correlationId: string;
}
```

## Implementare

```typescript
// /apps/workers/src/bronze/webhook-handler.worker.ts

import { Worker, Job } from 'bullmq';
import { workerConnection } from '@cerniq/queue';
import { db, bronzeContacts, bronzeWebhooks } from '@cerniq/db';
import { logger } from '@cerniq/logger';
import { verifyWebhookSignature } from '@cerniq/security';

const webhookHandlerWorker = new Worker<WebhookJobData>(
  'bronze:ingest:webhook',
  async (job: Job<WebhookJobData>) => {
    const { tenantId, webhookId, webhookType, payload, headers, sourceIp } = job.data;
    const log = logger.child({ jobId: job.id, webhookId, webhookType });
    
    log.info('Processing webhook');
    
    // Verify signature if applicable
    let signatureValid = true;
    if (headers['x-webhook-signature']) {
      signatureValid = verifyWebhookSignature(
        payload,
        headers['x-webhook-signature'],
        webhookType
      );
      
      if (!signatureValid) {
        log.warn('Invalid webhook signature');
        await db.update(bronzeWebhooks)
          .set({ signatureValid: false, processingStatus: 'rejected' })
          .where(eq(bronzeWebhooks.id, webhookId));
        return { status: 'rejected', reason: 'invalid_signature' };
      }
    }
    
    // Extract contacts from payload based on webhook type
    const contacts = extractContactsFromWebhook(webhookType, payload);
    
    log.info({ contactCount: contacts.length }, 'Contacts extracted from webhook');
    
    const insertedIds: string[] = [];
    
    for (const contact of contacts) {
      const contentHash = bronzeComputeContentHash(contact);
      
      const [inserted] = await db.insert(bronzeContacts).values({
        tenantId,
        rawPayload: contact,
        sourceType: 'webhook',
        sourceIdentifier: `webhook:${webhookType}:${webhookId}`,
        sourceMetadata: {
          webhookId,
          webhookType,
          sourceIp,
        },
        contentHash,
        processingStatus: 'pending',
      }).returning({ id: bronzeContacts.id });
      
      insertedIds.push(inserted.id);
    }
    
    // Update webhook record
    await db.update(bronzeWebhooks)
      .set({
        signatureValid,
        processingStatus: 'processed',
        processedContactIds: insertedIds,
        processedAt: new Date(),
      })
      .where(eq(bronzeWebhooks.id, webhookId));
    
    // Trigger normalization for each contact
    for (const contactId of insertedIds) {
      await triggerSingleNormalization(tenantId, contactId, job.data.correlationId);
    }
    
    return { processed: insertedIds.length, contactIds: insertedIds };
  },
  { connection: workerConnection, concurrency: A3_CONFIG.concurrency }
);

function extractContactsFromWebhook(
  type: string,
  payload: Record<string, unknown>
): Record<string, unknown>[] {
  switch (type) {
    case 'apia':
      return extractApiaContacts(payload);
    case 'crm':
      return extractCrmContacts(payload);
    case 'form':
      return [payload]; // Single contact from form
    default:
      return Array.isArray(payload.contacts) 
        ? payload.contacts 
        : [payload];
  }
}

export { webhookHandlerWorker };
```

---

# A.4 Manual Entry Worker

## Configurare

```typescript
const A4_CONFIG: WorkerConfig = {
  queueName: 'bronze:ingest:manual',
  concurrency: 10,
  attempts: 2,
  timeout: 10000,
};
```

## Job Payload

```typescript
interface ManualEntryJobData {
  tenantId: string;
  userId: string;
  formData: Record<string, unknown>;
  formId: string;
  correlationId: string;
}
```

## Implementare

```typescript
// /apps/workers/src/bronze/manual-entry.worker.ts

const manualEntryWorker = new Worker<ManualEntryJobData>(
  'bronze:ingest:manual',
  async (job: Job<ManualEntryJobData>) => {
    const { tenantId, userId, formData, formId } = job.data;
    const log = logger.child({ jobId: job.id, userId });
    
    log.info('Processing manual entry');
    
    const contentHash = bronzeComputeContentHash(formData);
    
    // Check duplicate
    const existing = await db.query.bronzeContacts.findFirst({
      where: (bc, { eq, and }) => and(
        eq(bc.tenantId, tenantId),
        eq(bc.contentHash, contentHash)
      )
    });
    
    if (existing) {
      return { 
        status: 'duplicate', 
        existingId: existing.id,
        message: 'Contact already exists' 
      };
    }
    
    const [contact] = await db.insert(bronzeContacts).values({
      tenantId,
      rawPayload: formData,
      sourceType: 'manual',
      sourceIdentifier: `user:${userId}:form:${formId}`,
      sourceMetadata: {
        userId,
        formId,
        enteredAt: new Date().toISOString(),
      },
      contentHash,
      processingStatus: 'pending',
    }).returning();
    
    // Trigger immediate normalization
    await triggerSingleNormalization(tenantId, contact.id, job.data.correlationId);
    
    return { status: 'created', contactId: contact.id };
  },
  { connection: workerConnection, concurrency: A4_CONFIG.concurrency }
);

export { manualEntryWorker };
```

---

# A.5 API Ingest Worker

## Configurare

```typescript
const A5_CONFIG: WorkerConfig = {
  queueName: 'bronze:ingest:api',
  concurrency: 5,
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  timeout: 120000, // 2 minute
  limiter: { max: 10, duration: 1000 },
};
```

## Job Payload

```typescript
interface ApiIngestJobData {
  tenantId: string;
  apiSource: string;        // 'lista_firme', 'registru_apia', etc.
  endpoint: string;
  method: 'GET' | 'POST';
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  pagination?: {
    page: number;
    pageSize: number;
    totalPages?: number;
  };
  correlationId: string;
}
```

## Implementare

```typescript
// /apps/workers/src/bronze/api-ingest.worker.ts

const apiIngestWorker = new Worker<ApiIngestJobData>(
  'bronze:ingest:api',
  async (job: Job<ApiIngestJobData>) => {
    const { tenantId, apiSource, endpoint, method, params, body, pagination } = job.data;
    const log = logger.child({ jobId: job.id, apiSource });
    
    log.info({ endpoint, page: pagination?.page }, 'Fetching from external API');
    
    // Make API request
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': getApiKey(apiSource),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const contacts = extractContactsFromApiResponse(apiSource, data);
    
    log.info({ contactCount: contacts.length }, 'Contacts received from API');
    
    let successCount = 0;
    
    for (const contact of contacts) {
      const contentHash = bronzeComputeContentHash(contact);
      
      await db.insert(bronzeContacts).values({
        tenantId,
        rawPayload: contact,
        sourceType: 'api',
        sourceIdentifier: `api:${apiSource}:${endpoint}`,
        sourceMetadata: {
          apiSource,
          page: pagination?.page,
          fetchedAt: new Date().toISOString(),
        },
        contentHash,
        processingStatus: 'pending',
      }).onConflictDoNothing();
      
      successCount++;
    }
    
    // Schedule next page if pagination
    if (pagination && data.hasMore) {
      const queue = new Queue('bronze:ingest:api', { connection: workerConnection });
      await queue.add(
        `api-${apiSource}-page-${pagination.page + 1}`,
        {
          ...job.data,
          pagination: {
            ...pagination,
            page: pagination.page + 1,
          },
        }
      );
    }
    
    // Trigger normalization batch
    await triggerNormalizationBatch(tenantId, job.data.correlationId);
    
    return { 
      inserted: successCount, 
      page: pagination?.page,
      hasMore: data.hasMore,
    };
  },
  { 
    connection: workerConnection, 
    concurrency: A5_CONFIG.concurrency,
    limiter: A5_CONFIG.limiter,
  }
);

export { apiIngestWorker };
```

---

# REZUMAT CATEGORIA A

| Worker | Queue | Concurrency | Rate Limit | Timeout |
|--------|-------|-------------|------------|---------|
| A.1 CSV Parser | `bronze:ingest:csv-parser` | 5 | - | 5m |
| A.2 Excel Parser | `bronze:ingest:excel-parser` | 3 | - | 10m |
| A.3 Webhook Handler | `bronze:ingest:webhook` | 20 | - | 30s |
| A.4 Manual Entry | `bronze:ingest:manual` | 10 | - | 10s |
| A.5 API Ingest | `bronze:ingest:api` | 5 | 10/s | 2m |

## Trigger Map

```
A.1 completed → bronze:normalize:batch
A.2 completed → bronze:normalize:batch
A.3 completed → bronze:normalize:single (per contact)
A.4 completed → bronze:normalize:single
A.5 completed → bronze:normalize:batch
```

---

**Document generat:** 15 Ianuarie 2026
**Total workers Cat. A:** 5
