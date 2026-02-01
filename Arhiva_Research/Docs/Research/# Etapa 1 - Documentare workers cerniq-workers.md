# Documentație Completă Workeri Etapa 1 - Cerniq.app
## Pipeline Data Enrichment Bronze → Silver

**Versiune:** 1.0  
**Data:** Ianuarie 2026  
**Autor:** Cerniq Development Team  
**Stack:** BullMQ v5.66.0 + Redis 8.4.0 + Node.js v24.12.0 + Python 3.14.1

---

## Cuprins

1. [Arhitectură Generală](#1-arhitectură-generală)
2. [Configurare Infrastructură](#2-configurare-infrastructură)
3. [Categoria A: Workeri Ingestie Bronze](#3-categoria-a-workeri-ingestie-bronze)
4. [Categoria B: Workeri Normalizare](#4-categoria-b-workeri-normalizare)
5. [Categoria C: Workeri Validare CUI](#5-categoria-c-workeri-validare-cui)
6. [Categoria D: Workeri ANAF API](#6-categoria-d-workeri-anaf-api)
7. [Categoria E: Workeri Termene.ro API](#7-categoria-e-workeri-termenero-api)
8. [Categoria F: Workeri ONRC](#8-categoria-f-workeri-onrc)
9. [Categoria G: Workeri Email Enrichment](#9-categoria-g-workeri-email-enrichment)
10. [Categoria H: Workeri Telefon Enrichment](#10-categoria-h-workeri-telefon-enrichment)
11. [Categoria I: Workeri Web Scraping](#11-categoria-i-workeri-web-scraping)
12. [Categoria J: Workeri AI Structuring](#12-categoria-j-workeri-ai-structuring)
13. [Categoria K: Workeri Geocoding](#13-categoria-k-workeri-geocoding)
14. [Categoria L: Workeri Agricol](#14-categoria-l-workeri-agricol)
15. [Categoria M: Workeri Deduplicare](#15-categoria-m-workeri-deduplicare)
16. [Categoria N: Workeri Quality Scoring](#16-categoria-n-workeri-quality-scoring)
17. [Categoria O: Workeri Agregare](#17-categoria-o-workeri-agregare)
18. [Categoria P: Workeri Pipeline Control](#18-categoria-p-workeri-pipeline-control)
19. [Logging & Observability](#19-logging--observability)
20. [Human-in-the-Loop UI/UX](#20-human-in-the-loop-uiux)
21. [API-uri Manuale REST](#21-api-uri-manuale-rest)

---

## 1. Arhitectură Generală

### 1.1 Viziune de Ansamblu

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CERNIQ ENRICHMENT PIPELINE                             │
│                              61 Workeri Granulari                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   INGESTIE   │───▶│ NORMALIZARE  │───▶│   VALIDARE   │───▶│  ENRICHMENT  │
│   BRONZE     │    │              │    │              │    │   EXTERN     │
│   5 workeri  │    │  4 workeri   │    │  2 workeri   │    │  28 workeri  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                    │
┌──────────────────────────────────────────────────────────────────┘
│
▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  DEDUPLICARE │───▶│   QUALITY    │───▶│   AGREGARE   │───▶│   PIPELINE   │
│              │    │   SCORING    │    │              │    │   CONTROL    │
│  2 workeri   │    │  3 workeri   │    │  2 workeri   │    │  4 workeri   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### 1.2 Principii de Design

1. **Un Worker = O Responsabilitate**: Fiecare worker face exact un lucru
2. **Izolare Completă**: Fiecare worker are propria coadă BullMQ
3. **Rate Limiting Independent**: Fiecare API extern are rate limit separat
4. **Fail-Safe**: Eșecul unui worker nu afectează alți workeri
5. **Idempotent**: Re-rularea unui job produce același rezultat
6. **Traceable**: Fiecare acțiune are correlation ID și logging complet

### 1.3 Convenții de Denumire Cozi

```
{layer}:{category}:{action}

Exemple:
- bronze:ingest:csv-parser
- silver:validate:cui-anaf
- enrich:anaf:fiscal-status
- pipeline:orchestrator:start
```

---

## 2. Configurare Infrastructură

### 2.1 Redis 8.4.0 Configuration

```conf
# /etc/redis/redis.conf pentru Cerniq Workers

# Memory - 100GB pentru cozi (din 128GB total sistem)
maxmemory 100gb
maxmemory-policy noeviction  # CRITIC: BullMQ necesită noeviction

# Persistence
appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes
save 900 1
save 300 100
save 60 10000

# Performance
tcp-backlog 65536
maxclients 50000
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
activedefrag yes
active-defrag-threshold-lower 10
active-defrag-threshold-upper 25

# Security
hide-user-data-from-log yes
requirepass ${REDIS_PASSWORD}
```

### 2.2 BullMQ Base Configuration

```typescript
// /packages/queue/src/config.ts

import IORedis from 'ioredis';
import { QueueOptions, WorkerOptions } from 'bullmq';

// Conexiune pentru producători (fail fast)
export const producerConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  connectTimeout: 10000,
  lazyConnect: true,
});

// Conexiune pentru workeri (retry indefinit)
export const workerConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // CRITIC pentru BullMQ
  enableOfflineQueue: true,
  retryStrategy: (times) => Math.min(Math.exp(times), 20000),
});

// Default queue options
export const defaultQueueOptions: QueueOptions = {
  connection: producerConnection,
  defaultJobOptions: {
    removeOnComplete: {
      age: 3600 * 24, // 24 ore
      count: 1000,
    },
    removeOnFail: {
      age: 3600 * 24 * 7, // 7 zile pentru debugging
    },
  },
};

// Default worker options
export const defaultWorkerOptions: WorkerOptions = {
  connection: workerConnection,
  lockDuration: 60000, // 1 minut
  stalledInterval: 30000, // 30 secunde
  maxStalledCount: 2,
  autorun: false, // Pornire manuală pentru control
};
```

### 2.3 Worker Factory Pattern

```typescript
// /packages/queue/src/worker-factory.ts

import { Worker, Job, Queue, FlowProducer } from 'bullmq';
import { Logger } from 'pino';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { workerConnection, defaultWorkerOptions } from './config';

export interface WorkerConfig<TData, TResult> {
  queueName: string;
  processor: (job: Job<TData, TResult>, logger: Logger) => Promise<TResult>;
  concurrency: number;
  limiter?: { max: number; duration: number };
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  timeout?: number;
  triggers?: {
    onComplete?: string[];  // Cozi de trigger la succes
    onFail?: string[];      // Cozi de trigger la eșec
  };
}

export interface WorkerInstance<TData, TResult> {
  worker: Worker<TData, TResult>;
  queue: Queue<TData, TResult>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  getStats: () => Promise<WorkerStats>;
}

export interface WorkerStats {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  isPaused: boolean;
}

export function createEnrichmentWorker<TData, TResult>(
  config: WorkerConfig<TData, TResult>,
  logger: Logger,
  flowProducer: FlowProducer
): WorkerInstance<TData, TResult> {
  
  const queue = new Queue<TData, TResult>(config.queueName, {
    connection: workerConnection,
  });

  const worker = new Worker<TData, TResult>(
    config.queueName,
    async (job) => {
      const tracer = trace.getTracer('cerniq-enrichment');
      const span = tracer.startSpan(`worker:${config.queueName}`, {
        attributes: {
          'job.id': job.id,
          'job.name': job.name,
          'job.attemptsMade': job.attemptsMade,
        },
      });

      const jobLogger = logger.child({
        jobId: job.id,
        jobName: job.name,
        queue: config.queueName,
        correlationId: job.data?.correlationId || job.id,
        attemptsMade: job.attemptsMade,
      });

      try {
        jobLogger.info({ data: sanitizeForLog(job.data) }, 'Job started');
        
        const startTime = Date.now();
        const result = await config.processor(job, jobLogger);
        const duration = Date.now() - startTime;

        jobLogger.info({ duration, result: sanitizeForLog(result) }, 'Job completed');
        
        span.setStatus({ code: SpanStatusCode.OK });
        
        // Trigger workeri dependenți la succes
        if (config.triggers?.onComplete) {
          await triggerDownstreamWorkers(
            flowProducer,
            config.triggers.onComplete,
            job,
            result,
            jobLogger
          );
        }

        return result;
      } catch (error) {
        jobLogger.error({ error: error.message, stack: error.stack }, 'Job failed');
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        
        // Trigger workeri de handling la eșec
        if (config.triggers?.onFail) {
          await triggerFailureHandlers(
            flowProducer,
            config.triggers.onFail,
            job,
            error,
            jobLogger
          );
        }
        
        throw error;
      } finally {
        span.end();
      }
    },
    {
      ...defaultWorkerOptions,
      concurrency: config.concurrency,
      limiter: config.limiter,
    }
  );

  // Event handlers
  worker.on('error', (err) => {
    logger.error({ error: err.message, queue: config.queueName }, 'Worker error');
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId, queue: config.queueName }, 'Job stalled');
  });

  worker.on('progress', (job, progress) => {
    logger.debug({ jobId: job.id, progress, queue: config.queueName }, 'Job progress');
  });

  return {
    worker,
    queue,
    start: async () => {
      await worker.run();
      logger.info({ queue: config.queueName }, 'Worker started');
    },
    stop: async () => {
      await worker.close();
      logger.info({ queue: config.queueName }, 'Worker stopped');
    },
    pause: async () => {
      await worker.pause();
      logger.info({ queue: config.queueName }, 'Worker paused');
    },
    resume: async () => {
      await worker.resume();
      logger.info({ queue: config.queueName }, 'Worker resumed');
    },
    getStats: async () => {
      const counts = await queue.getJobCounts();
      const isPaused = await worker.isPaused();
      return {
        queueName: config.queueName,
        ...counts,
        isPaused,
        paused: isPaused,
      };
    },
  };
}

// Helper pentru trigger workeri downstream
async function triggerDownstreamWorkers(
  flowProducer: FlowProducer,
  queueNames: string[],
  parentJob: Job,
  result: any,
  logger: Logger
) {
  for (const queueName of queueNames) {
    await flowProducer.add({
      name: `trigger-from-${parentJob.queueName}`,
      queueName,
      data: {
        parentJobId: parentJob.id,
        parentQueue: parentJob.queueName,
        parentResult: result,
        correlationId: parentJob.data?.correlationId,
        originalData: parentJob.data,
      },
    });
    logger.debug({ triggerQueue: queueName }, 'Triggered downstream worker');
  }
}

// Sanitizare date pentru logging (eliminare PII)
function sanitizeForLog(data: any): any {
  if (!data) return data;
  const sanitized = { ...data };
  const sensitiveFields = ['cnp', 'password', 'token', 'apiKey', 'email', 'telefon'];
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
}
```

---

## 3. Categoria A: Workeri Ingestie Bronze

### 3.1 Worker #1: bronze:ingest:csv-parser

**Scop:** Parsare fișiere CSV/Excel pentru import date brute în stratul Bronze.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `bronze:ingest:csv-parser` |
| **Concurrency** | 10 |
| **Rate Limit** | Fără (operație locală) |
| **Timeout** | 300000ms (5 minute) |
| **Max Attempts** | 3 |
| **Backoff** | Exponențial, 5000ms |

#### Trigger Input

```typescript
interface CsvParserJobData {
  correlationId: string;           // UUID pentru tracing
  shopId: string;                  // Multi-tenant isolation
  fileId: string;                  // ID fișier în storage
  filePath: string;                // Path în Hetzner Storage Box
  fileName: string;                // Nume original fișier
  fileType: 'csv' | 'xlsx' | 'xls';
  encoding?: string;               // Default: 'utf-8'
  delimiter?: string;              // Default: ',' sau auto-detect
  headerRow?: number;              // Default: 1
  skipRows?: number[];             // Rânduri de ignorat
  columnMapping?: Record<string, string>; // Mapare coloane custom
  sourceType: 'import' | 'apia' | 'madr' | 'manual';
  metadata?: Record<string, any>;
}
```

#### Triggere de Intrare

| Trigger | Descriere |
|---------|-----------|
| **Manual API** | `POST /api/v1/workers/bronze/csv-parser/trigger` |
| **File Upload** | Event `file:uploaded` cu `mimeType` CSV/Excel |
| **Scheduled** | Cron job pentru import programat |
| **UI Action** | Buton "Import CSV" din dashboard |

#### Response Schema

```typescript
interface CsvParserResult {
  success: boolean;
  bronzeRecordIds: string[];       // UUID-uri înregistrări create
  totalRows: number;               // Total rânduri procesate
  validRows: number;               // Rânduri cu cel puțin un identificator
  invalidRows: number;             // Rânduri fără identificatori
  duplicateRows: number;           // Rânduri duplicate (hash match)
  errors: Array<{
    row: number;
    column?: string;
    error: string;
  }>;
  processingTimeMs: number;
  fileMetadata: {
    detectedEncoding: string;
    detectedDelimiter: string;
    columnCount: number;
    hasHeader: boolean;
  };
}
```

#### Triggere de Ieșire (onComplete)

| Queue Destinație | Condiție |
|------------------|----------|
| `bronze:dedup:hash-checker` | Pentru fiecare `bronzeRecordId` |
| `pipeline:monitor:health` | Metrici procesare |

#### Implementare

```typescript
// /workers/bronze/csv-parser.worker.ts

import { Job } from 'bullmq';
import { parse } from 'csv-parse';
import * as XLSX from 'xlsx';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Logger } from 'pino';
import { db } from '@cerniq/db';
import { bronzeContacts } from '@cerniq/db/schema';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export async function csvParserProcessor(
  job: Job<CsvParserJobData>,
  logger: Logger
): Promise<CsvParserResult> {
  const { filePath, fileType, shopId, sourceType, correlationId } = job.data;
  
  const result: CsvParserResult = {
    success: false,
    bronzeRecordIds: [],
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    duplicateRows: 0,
    errors: [],
    processingTimeMs: 0,
    fileMetadata: {
      detectedEncoding: 'utf-8',
      detectedDelimiter: ',',
      columnCount: 0,
      hasHeader: true,
    },
  };

  const startTime = Date.now();

  try {
    let records: Record<string, any>[] = [];

    if (fileType === 'csv') {
      records = await parseCsvFile(filePath, job.data, logger);
    } else {
      records = await parseExcelFile(filePath, job.data, logger);
    }

    result.fileMetadata.columnCount = Object.keys(records[0] || {}).length;
    result.totalRows = records.length;

    // Procesare în batches de 100
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      await job.updateProgress(Math.round((i / records.length) * 100));
      
      for (const record of batch) {
        const rowIndex = i + batch.indexOf(record) + 1;
        
        // Verificare prezență identificator
        const hasIdentifier = !!(
          record.cui || record.CUI ||
          record.email || record.Email ||
          record.telefon || record.phone || record.Telefon
        );

        if (!hasIdentifier) {
          result.invalidRows++;
          result.errors.push({
            row: rowIndex,
            error: 'Missing identifier (CUI, email, or phone)',
          });
          continue;
        }

        // Generare hash pentru deduplicare
        const contentHash = createHash('sha256')
          .update(JSON.stringify(record))
          .digest('hex');

        // Verificare duplicat în Bronze
        const existing = await db.query.bronzeContacts.findFirst({
          where: (bc, { eq, and }) => and(
            eq(bc.shopId, shopId),
            eq(bc.contentHash, contentHash)
          ),
        });

        if (existing) {
          result.duplicateRows++;
          continue;
        }

        // Insert în Bronze
        const bronzeId = uuidv4();
        await db.insert(bronzeContacts).values({
          id: bronzeId,
          shopId,
          rawPayload: record,
          contentHash,
          sourceType,
          sourceIdentifier: job.data.fileName,
          correlationId,
          ingestionTimestamp: new Date(),
        });

        result.bronzeRecordIds.push(bronzeId);
        result.validRows++;
      }
    }

    result.success = true;
    result.processingTimeMs = Date.now() - startTime;

    logger.info({
      totalRows: result.totalRows,
      validRows: result.validRows,
      invalidRows: result.invalidRows,
      duplicateRows: result.duplicateRows,
    }, 'CSV parsing completed');

    return result;

  } catch (error) {
    result.processingTimeMs = Date.now() - startTime;
    result.errors.push({ row: 0, error: error.message });
    throw error;
  }
}

async function parseCsvFile(
  filePath: string,
  config: CsvParserJobData,
  logger: Logger
): Promise<Record<string, any>[]> {
  const records: Record<string, any>[] = [];
  
  const parser = parse({
    columns: true,
    skip_empty_lines: true,
    trim: true,
    encoding: config.encoding || 'utf-8',
    delimiter: config.delimiter, // auto-detect dacă undefined
    from_line: config.headerRow || 1,
    relax_column_count: true,
  });

  const stream = createReadStream(filePath);
  
  for await (const record of stream.pipe(parser)) {
    // Apply column mapping dacă există
    if (config.columnMapping) {
      const mapped: Record<string, any> = {};
      for (const [source, target] of Object.entries(config.columnMapping)) {
        if (record[source] !== undefined) {
          mapped[target] = record[source];
        }
      }
      records.push({ ...record, ...mapped });
    } else {
      records.push(record);
    }
  }

  return records;
}

async function parseExcelFile(
  filePath: string,
  config: CsvParserJobData,
  logger: Logger
): Promise<Record<string, any>[]> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const records = XLSX.utils.sheet_to_json(worksheet, {
    header: config.headerRow === 1 ? undefined : 1,
    range: config.headerRow ? config.headerRow - 1 : 0,
  });

  return records as Record<string, any>[];
}
```

#### JSON Schema Validare

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CsvParserJobData",
  "type": "object",
  "required": ["correlationId", "shopId", "fileId", "filePath", "fileName", "fileType", "sourceType"],
  "properties": {
    "correlationId": { "type": "string", "format": "uuid" },
    "shopId": { "type": "string", "format": "uuid" },
    "fileId": { "type": "string" },
    "filePath": { "type": "string" },
    "fileName": { "type": "string" },
    "fileType": { "enum": ["csv", "xlsx", "xls"] },
    "encoding": { "type": "string", "default": "utf-8" },
    "delimiter": { "type": "string", "maxLength": 1 },
    "headerRow": { "type": "integer", "minimum": 1, "default": 1 },
    "skipRows": { "type": "array", "items": { "type": "integer" } },
    "columnMapping": { "type": "object", "additionalProperties": { "type": "string" } },
    "sourceType": { "enum": ["import", "apia", "madr", "manual"] },
    "metadata": { "type": "object" }
  }
}
```

#### API Manual Endpoint

```typescript
// POST /api/v1/workers/bronze/csv-parser/trigger
// Authorization: Bearer {token}

// Request Body
{
  "fileId": "file-uuid-123",
  "sourceType": "import",
  "columnMapping": {
    "Cod Fiscal": "cui",
    "Denumire Firma": "denumire",
    "E-mail": "email"
  }
}

// Response 202 Accepted
{
  "jobId": "job-uuid-456",
  "queue": "bronze:ingest:csv-parser",
  "status": "queued",
  "trackingUrl": "/api/v1/jobs/job-uuid-456/status"
}
```

---

### 3.2 Worker #2: bronze:ingest:json-parser

**Scop:** Parsare și validare JSON din webhooks și API-uri externe.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `bronze:ingest:json-parser` |
| **Concurrency** | 50 |
| **Rate Limit** | Fără |
| **Timeout** | 30000ms (30 secunde) |
| **Max Attempts** | 3 |
| **Backoff** | Exponențial, 1000ms |

#### Trigger Input

```typescript
interface JsonParserJobData {
  correlationId: string;
  shopId: string;
  sourceType: 'webhook' | 'api' | 'manual';
  sourceIdentifier: string;        // URL endpoint sau identificator
  payload: Record<string, any>;    // JSON brut
  webhookSignature?: string;       // Pentru verificare webhook
  webhookSecret?: string;          // Secret pentru verificare
  schemaId?: string;               // Schema de validare opțională
  metadata?: Record<string, any>;
}
```

#### Triggere de Intrare

| Trigger | Descriere |
|---------|-----------|
| **Webhook** | `POST /api/v1/webhooks/ingest` |
| **API Call** | `POST /api/v1/bronze/json` |
| **Manual** | `POST /api/v1/workers/bronze/json-parser/trigger` |

#### Response Schema

```typescript
interface JsonParserResult {
  success: boolean;
  bronzeRecordId: string;
  validation: {
    isValidJson: boolean;
    hasIdentifier: boolean;
    schemaValid?: boolean;
    errors?: string[];
  };
  extractedIdentifiers: {
    cui?: string;
    email?: string;
    phone?: string;
  };
  processingTimeMs: number;
}
```

#### Triggere de Ieșire (onComplete)

| Queue Destinație | Condiție |
|------------------|----------|
| `bronze:dedup:hash-checker` | Întotdeauna |

#### Implementare

```typescript
// /workers/bronze/json-parser.worker.ts

import { Job } from 'bullmq';
import { Logger } from 'pino';
import { db } from '@cerniq/db';
import { bronzeContacts } from '@cerniq/db/schema';
import { createHash, createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

export async function jsonParserProcessor(
  job: Job<JsonParserJobData>,
  logger: Logger
): Promise<JsonParserResult> {
  const { shopId, sourceType, sourceIdentifier, payload, correlationId } = job.data;
  const startTime = Date.now();

  const result: JsonParserResult = {
    success: false,
    bronzeRecordId: '',
    validation: {
      isValidJson: true,
      hasIdentifier: false,
    },
    extractedIdentifiers: {},
    processingTimeMs: 0,
  };

  try {
    // Verificare webhook signature dacă există
    if (job.data.webhookSignature && job.data.webhookSecret) {
      const expectedSignature = createHmac('sha256', job.data.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      if (expectedSignature !== job.data.webhookSignature) {
        throw new Error('Invalid webhook signature');
      }
    }

    // Validare schema dacă specificată
    if (job.data.schemaId) {
      const schema = await loadSchema(job.data.schemaId);
      const validate = ajv.compile(schema);
      const valid = validate(payload);
      
      result.validation.schemaValid = valid;
      if (!valid) {
        result.validation.errors = validate.errors?.map(e => e.message || 'Validation error');
      }
    }

    // Extragere identificatori
    result.extractedIdentifiers = extractIdentifiers(payload);
    result.validation.hasIdentifier = !!(
      result.extractedIdentifiers.cui ||
      result.extractedIdentifiers.email ||
      result.extractedIdentifiers.phone
    );

    if (!result.validation.hasIdentifier) {
      throw new Error('No valid identifier found in payload');
    }

    // Generare hash pentru deduplicare
    const contentHash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');

    // Insert în Bronze
    const bronzeId = uuidv4();
    await db.insert(bronzeContacts).values({
      id: bronzeId,
      shopId,
      rawPayload: payload,
      contentHash,
      sourceType,
      sourceIdentifier,
      correlationId,
      ingestionTimestamp: new Date(),
    });

    result.bronzeRecordId = bronzeId;
    result.success = true;
    result.processingTimeMs = Date.now() - startTime;

    logger.info({
      bronzeRecordId: bronzeId,
      identifiers: result.extractedIdentifiers,
    }, 'JSON parsed and stored');

    return result;

  } catch (error) {
    result.processingTimeMs = Date.now() - startTime;
    result.validation.errors = result.validation.errors || [];
    result.validation.errors.push(error.message);
    throw error;
  }
}

function extractIdentifiers(payload: Record<string, any>): {
  cui?: string;
  email?: string;
  phone?: string;
} {
  const result: { cui?: string; email?: string; phone?: string } = {};

  // Căutare recursivă pentru identificatori
  const cuiKeys = ['cui', 'CUI', 'cod_fiscal', 'codFiscal', 'tax_id', 'taxId'];
  const emailKeys = ['email', 'Email', 'e-mail', 'emailAddress'];
  const phoneKeys = ['telefon', 'phone', 'tel', 'mobile', 'phoneNumber'];

  function searchObject(obj: any, keys: string[]): string | undefined {
    if (typeof obj !== 'object' || obj === null) return undefined;
    
    for (const key of keys) {
      if (obj[key] && typeof obj[key] === 'string') {
        return obj[key].trim();
      }
    }
    
    for (const value of Object.values(obj)) {
      const found = searchObject(value, keys);
      if (found) return found;
    }
    
    return undefined;
  }

  result.cui = searchObject(payload, cuiKeys);
  result.email = searchObject(payload, emailKeys);
  result.phone = searchObject(payload, phoneKeys);

  return result;
}

async function loadSchema(schemaId: string): Promise<object> {
  // Load schema from database or file system
  const schema = await db.query.jsonSchemas.findFirst({
    where: (s, { eq }) => eq(s.id, schemaId),
  });
  return schema?.definition || {};
}
```

---

### 3.3 Worker #3: bronze:ingest:pdf-extractor

**Scop:** Extragere date din PDF-uri (MADR, ANIF, documente scanate).

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `bronze:ingest:pdf-extractor` |
| **Concurrency** | 5 |
| **Rate Limit** | Fără |
| **Timeout** | 600000ms (10 minute) |
| **Max Attempts** | 2 |
| **Backoff** | Fixed, 30000ms |

#### Trigger Input

```typescript
interface PdfExtractorJobData {
  correlationId: string;
  shopId: string;
  fileId: string;
  filePath: string;
  fileName: string;
  sourceType: 'madr' | 'anif' | 'apia' | 'manual';
  extractionMode: 'table' | 'text' | 'ocr' | 'auto';
  tableConfig?: {
    pages?: number[];              // Pagini specifice
    tableIndex?: number;           // Index tabel pe pagină
    hasHeader?: boolean;
    columnNames?: string[];
  };
  ocrConfig?: {
    language: 'ron' | 'eng';       // Romanian sau English
    dpi?: number;                  // Default: 300
  };
  metadata?: Record<string, any>;
}
```

#### Response Schema

```typescript
interface PdfExtractorResult {
  success: boolean;
  bronzeRecordIds: string[];
  extractionMethod: 'table' | 'text' | 'ocr';
  totalPages: number;
  processedPages: number;
  tables: Array<{
    page: number;
    rows: number;
    columns: number;
  }>;
  textLength: number;
  ocrConfidence?: number;          // 0-100 pentru OCR
  errors: string[];
  processingTimeMs: number;
}
```

#### Triggere de Ieșire

| Queue Destinație | Condiție |
|------------------|----------|
| `bronze:dedup:hash-checker` | Pentru fiecare record |
| `enrich:ai:text-structure` | Dacă extractionMode = 'text' |

#### Implementare

```typescript
// /workers/bronze/pdf-extractor.worker.ts

import { Job } from 'bullmq';
import { Logger } from 'pino';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '@cerniq/db';
import { bronzeContacts } from '@cerniq/db/schema';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export async function pdfExtractorProcessor(
  job: Job<PdfExtractorJobData>,
  logger: Logger
): Promise<PdfExtractorResult> {
  const { filePath, fileName, shopId, sourceType, extractionMode, correlationId } = job.data;
  const startTime = Date.now();

  const result: PdfExtractorResult = {
    success: false,
    bronzeRecordIds: [],
    extractionMethod: extractionMode === 'auto' ? 'table' : extractionMode,
    totalPages: 0,
    processedPages: 0,
    tables: [],
    textLength: 0,
    errors: [],
    processingTimeMs: 0,
  };

  const tempDir = `/tmp/pdf-extract-${job.id}`;
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Detectare număr pagini
    const pdfInfo = execSync(`pdfinfo "${filePath}"`).toString();
    const pagesMatch = pdfInfo.match(/Pages:\s+(\d+)/);
    result.totalPages = pagesMatch ? parseInt(pagesMatch[1]) : 0;

    let extractedData: Record<string, any>[] = [];

    if (extractionMode === 'table' || extractionMode === 'auto') {
      // Încercare extragere tabele cu tabula-py
      extractedData = await extractTablesFromPdf(filePath, job.data.tableConfig, tempDir, logger);
      
      if (extractedData.length > 0) {
        result.extractionMethod = 'table';
        result.tables = extractedData.map((_, idx) => ({
          page: job.data.tableConfig?.pages?.[0] || 1,
          rows: Array.isArray(extractedData[idx]) ? extractedData[idx].length : 1,
          columns: Object.keys(extractedData[idx] || {}).length,
        }));
      }
    }

    if (extractedData.length === 0 && (extractionMode === 'text' || extractionMode === 'auto')) {
      // Fallback la extragere text
      const text = execSync(`pdftotext -layout "${filePath}" -`).toString();
      result.textLength = text.length;
      result.extractionMethod = 'text';
      
      // Parsare text structurat
      extractedData = parseStructuredText(text, sourceType);
    }

    if (extractedData.length === 0 && (extractionMode === 'ocr' || extractionMode === 'auto')) {
      // Fallback la OCR
      extractedData = await performOcr(filePath, job.data.ocrConfig, tempDir, logger);
      result.extractionMethod = 'ocr';
      result.ocrConfidence = 85; // Placeholder - calcul real din Tesseract
    }

    // Salvare în Bronze
    for (const record of extractedData) {
      const contentHash = createHash('sha256')
        .update(JSON.stringify(record))
        .digest('hex');

      const bronzeId = uuidv4();
      await db.insert(bronzeContacts).values({
        id: bronzeId,
        shopId,
        rawPayload: record,
        contentHash,
        sourceType,
        sourceIdentifier: fileName,
        correlationId,
        ingestionTimestamp: new Date(),
      });

      result.bronzeRecordIds.push(bronzeId);
    }

    result.success = true;
    result.processedPages = result.totalPages;
    result.processingTimeMs = Date.now() - startTime;

    logger.info({
      method: result.extractionMethod,
      records: result.bronzeRecordIds.length,
      pages: result.totalPages,
    }, 'PDF extraction completed');

    return result;

  } catch (error) {
    result.processingTimeMs = Date.now() - startTime;
    result.errors.push(error.message);
    throw error;
  } finally {
    // Cleanup temp files
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function extractTablesFromPdf(
  filePath: string,
  config: PdfExtractorJobData['tableConfig'],
  tempDir: string,
  logger: Logger
): Promise<Record<string, any>[]> {
  const outputFile = path.join(tempDir, 'tables.json');
  
  // Folosire tabula-java prin subprocess
  const pagesArg = config?.pages ? `--pages ${config.pages.join(',')}` : '--pages all';
  
  try {
    execSync(
      `java -jar /opt/tabula/tabula.jar ${pagesArg} --format JSON --outfile "${outputFile}" "${filePath}"`,
      { timeout: 300000 }
    );

    const tables = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
    
    // Convertire în records
    const records: Record<string, any>[] = [];
    for (const table of tables) {
      const headers = config?.columnNames || 
        (config?.hasHeader !== false ? table[0]?.map((c: any) => c.text || `col_${c}`) : null);
      
      const startRow = headers && config?.hasHeader !== false ? 1 : 0;
      
      for (let i = startRow; i < table.length; i++) {
        const row = table[i];
        const record: Record<string, any> = {};
        
        row.forEach((cell: any, idx: number) => {
          const key = headers ? headers[idx] : `column_${idx}`;
          record[key] = cell.text || cell;
        });
        
        records.push(record);
      }
    }
    
    return records;
  } catch (error) {
    logger.warn({ error: error.message }, 'Table extraction failed, falling back');
    return [];
  }
}

async function performOcr(
  filePath: string,
  config: PdfExtractorJobData['ocrConfig'],
  tempDir: string,
  logger: Logger
): Promise<Record<string, any>[]> {
  const dpi = config?.dpi || 300;
  const lang = config?.language || 'ron';
  
  // Convert PDF to images
  execSync(
    `pdftoppm -jpeg -r ${dpi} "${filePath}" "${tempDir}/page"`,
    { timeout: 300000 }
  );

  const imageFiles = fs.readdirSync(tempDir)
    .filter(f => f.endsWith('.jpg'))
    .sort();

  let fullText = '';
  
  for (const imageFile of imageFiles) {
    const imagePath = path.join(tempDir, imageFile);
    const ocrOutput = execSync(
      `tesseract "${imagePath}" stdout -l ${lang} --psm 6`,
      { timeout: 60000, encoding: 'utf-8' }
    );
    fullText += ocrOutput + '\n';
  }

  // Parse OCR text
  return parseStructuredText(fullText, 'ocr');
}

function parseStructuredText(text: string, sourceType: string): Record<string, any>[] {
  // Implementare specifică pentru fiecare tip de document
  const records: Record<string, any>[] = [];
  
  // Regex patterns pentru extragere date
  const cuiPattern = /(?:CUI|Cod Fiscal|C\.U\.I\.)[\s:]*(\d{2,10})/gi;
  const numePattern = /(?:Denumire|Nume|Firma)[\s:]*([A-ZĂÂÎȘȚa-zăâîșț\s\-\.]+)/gi;
  const adresaPattern = /(?:Adresa|Sediu)[\s:]*([A-Za-z0-9ĂÂÎȘȚăâîșțăâîșț\s,\.\-]+)/gi;
  
  // Extragere prin linii
  const lines = text.split('\n').filter(l => l.trim());
  
  let currentRecord: Record<string, any> = {};
  
  for (const line of lines) {
    const cuiMatch = cuiPattern.exec(line);
    if (cuiMatch) {
      if (Object.keys(currentRecord).length > 0) {
        records.push(currentRecord);
        currentRecord = {};
      }
      currentRecord.cui = cuiMatch[1];
    }
    
    const numeMatch = numePattern.exec(line);
    if (numeMatch) {
      currentRecord.denumire = numeMatch[1].trim();
    }
    
    const adresaMatch = adresaPattern.exec(line);
    if (adresaMatch) {
      currentRecord.adresa = adresaMatch[1].trim();
    }
  }
  
  if (Object.keys(currentRecord).length > 0) {
    records.push(currentRecord);
  }
  
  return records;
}
```

---

### 3.4 Worker #4: bronze:ingest:html-scraper

**Scop:** Scraping HTML din site-uri web (DAJ, companii, directoare).

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `bronze:ingest:html-scraper` |
| **Concurrency** | 10 |
| **Rate Limit** | `{ max: 10, duration: 1000 }` (10 req/sec global) |
| **Timeout** | 120000ms (2 minute) |
| **Max Attempts** | 3 |
| **Backoff** | Exponențial, 10000ms |

#### Trigger Input

```typescript
interface HtmlScraperJobData {
  correlationId: string;
  shopId: string;
  targetUrl: string;
  sourceType: 'daj' | 'anif' | 'company_website' | 'directory';
  selectors?: {
    container?: string;            // CSS selector pentru container
    fields?: Record<string, string>; // Field -> CSS selector mapping
  };
  pagination?: {
    nextSelector?: string;
    maxPages?: number;
  };
  waitForSelector?: string;        // Pentru SPA
  userAgent?: string;
  proxy?: string;
  metadata?: Record<string, any>;
}
```

#### Response Schema

```typescript
interface HtmlScraperResult {
  success: boolean;
  bronzeRecordIds: string[];
  pagesScraped: number;
  recordsExtracted: number;
  errors: Array<{
    url: string;
    error: string;
  }>;
  timing: {
    totalMs: number;
    avgPerPageMs: number;
  };
}
```

#### Implementare (rezumat)

```typescript
// Folosire Playwright pentru scraping robust
import { chromium, Browser, Page } from 'playwright';

export async function htmlScraperProcessor(
  job: Job<HtmlScraperJobData>,
  logger: Logger
): Promise<HtmlScraperResult> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: job.data.userAgent || 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });

  const page = await context.newPage();
  
  try {
    // Implementare scraping cu anti-bot measures
    // Rate limiting per domain
    // Respectare robots.txt
    // etc.
  } finally {
    await browser.close();
  }
}
```

---

### 3.5 Worker #5: bronze:dedup:hash-checker

**Scop:** Verificare duplicare hash-based la nivel Bronze.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `bronze:dedup:hash-checker` |
| **Concurrency** | 100 |
| **Rate Limit** | Fără |
| **Timeout** | 10000ms |
| **Max Attempts** | 2 |

#### Trigger Input

```typescript
interface HashCheckerJobData {
  correlationId: string;
  bronzeRecordId: string;
  shopId: string;
  contentHash: string;
  forceReprocess?: boolean;        // Ignoră duplicat
}
```

#### Response Schema

```typescript
interface HashCheckerResult {
  isDuplicate: boolean;
  originalRecordId?: string;       // ID-ul recordului original dacă e duplicat
  action: 'process' | 'skip' | 'merge';
  reason?: string;
}
```

#### Triggere de Ieșire

| Queue Destinație | Condiție |
|------------------|----------|
| `silver:norm:company-name` | Dacă `action === 'process'` |
| `pipeline:monitor:health` | Metrici deduplicare |

---

## 4. Categoria B: Workeri Normalizare

### 4.1 Worker #6: silver:norm:company-name

**Scop:** Normalizare denumire companie (UPPERCASE, trim, standardizare).

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `silver:norm:company-name` |
| **Concurrency** | 100 |
| **Rate Limit** | Fără |
| **Timeout** | 5000ms |
| **Max Attempts** | 2 |

#### Trigger Input

```typescript
interface CompanyNameNormJobData {
  correlationId: string;
  bronzeRecordId: string;
  shopId: string;
  rawName: string;
  originalPayload: Record<string, any>;
}
```

#### Response Schema

```typescript
interface CompanyNameNormResult {
  normalizedName: string;
  originalName: string;
  transformations: string[];       // Ex: ['UPPERCASE', 'TRIM', 'REMOVE_DUPLICATES']
  abbreviationsExpanded: Record<string, string>; // Ex: {'SRL': 'Societate cu Răspundere Limitată'}
  confidence: number;              // 0-100
}
```

#### Implementare

```typescript
const COMPANY_SUFFIXES = {
  'SRL': 'SOCIETATE CU RĂSPUNDERE LIMITATĂ',
  'SA': 'SOCIETATE PE ACȚIUNI',
  'SNC': 'SOCIETATE ÎN NUME COLECTIV',
  'SCS': 'SOCIETATE ÎN COMANDITĂ SIMPLĂ',
  'SCA': 'SOCIETATE ÎN COMANDITĂ PE ACȚIUNI',
  'PFA': 'PERSOANĂ FIZICĂ AUTORIZATĂ',
  'II': 'ÎNTREPRINDERE INDIVIDUALĂ',
  'IF': 'ÎNTREPRINDERE FAMILIALĂ',
};

export async function companyNameNormProcessor(
  job: Job<CompanyNameNormJobData>,
  logger: Logger
): Promise<CompanyNameNormResult> {
  const { rawName } = job.data;
  const transformations: string[] = [];
  const abbreviationsExpanded: Record<string, string> = {};
  
  let normalized = rawName;

  // 1. Trim și collapse whitespace
  normalized = normalized.trim().replace(/\s+/g, ' ');
  if (normalized !== rawName) transformations.push('TRIM_WHITESPACE');

  // 2. UPPERCASE
  const uppercased = normalized.toUpperCase();
  if (uppercased !== normalized) transformations.push('UPPERCASE');
  normalized = uppercased;

  // 3. Eliminare caractere speciale
  normalized = normalized.replace(/[^\wĂÂÎȘȚăâîșț\s\-\.]/g, '');
  if (normalized !== uppercased) transformations.push('REMOVE_SPECIAL_CHARS');

  // 4. Standardizare sufixe
  for (const [abbrev, full] of Object.entries(COMPANY_SUFFIXES)) {
    if (normalized.includes(abbrev)) {
      abbreviationsExpanded[abbrev] = full;
    }
  }

  // 5. Eliminare duplicări de cuvinte consecutive
  const words = normalized.split(' ');
  const dedupedWords = words.filter((word, idx) => word !== words[idx - 1]);
  if (dedupedWords.length !== words.length) {
    transformations.push('REMOVE_DUPLICATE_WORDS');
    normalized = dedupedWords.join(' ');
  }

  return {
    normalizedName: normalized,
    originalName: rawName,
    transformations,
    abbreviationsExpanded,
    confidence: transformations.length === 0 ? 100 : 95,
  };
}
```

#### Triggere de Ieșire

| Queue Destinație | Condiție |
|------------------|----------|
| `silver:norm:address` | Întotdeauna |

---

### 4.2 Worker #7: silver:norm:address

**Scop:** Normalizare adresă și mapare la cod SIRUTA.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `silver:norm:address` |
| **Concurrency** | 50 |
| **Rate Limit** | Fără |
| **Timeout** | 10000ms |
| **Max Attempts** | 2 |

#### Response Schema

```typescript
interface AddressNormResult {
  normalizedAddress: string;
  components: {
    strada?: string;
    numar?: string;
    bloc?: string;
    scara?: string;
    apartament?: string;
    localitate: string;
    judet: string;
    codPostal?: string;
  };
  sirutaCode?: number;
  sirutaMatch: {
    found: boolean;
    confidence: number;
    alternatives?: Array<{
      code: number;
      name: string;
      similarity: number;
    }>;
  };
}
```

---

### 4.3 Worker #8: silver:norm:phone-e164

**Scop:** Normalizare număr telefon în format E.164.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `silver:norm:phone-e164` |
| **Concurrency** | 100 |
| **Rate Limit** | Fără |
| **Timeout** | 2000ms |
| **Max Attempts** | 2 |

#### Response Schema

```typescript
interface PhoneNormResult {
  originalPhone: string;
  normalizedPhone: string;         // Format E.164: +40712345678
  isValid: boolean;
  phoneType: 'mobile' | 'landline' | 'unknown';
  countryCode: string;             // 'RO'
  nationalFormat: string;          // '0712 345 678'
  areaCode?: string;               // Pentru fix: '021', '031', etc.
  errors?: string[];
}
```

#### Implementare

```typescript
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

export async function phoneNormProcessor(
  job: Job<PhoneNormJobData>,
  logger: Logger
): Promise<PhoneNormResult> {
  const { rawPhone } = job.data;
  
  const result: PhoneNormResult = {
    originalPhone: rawPhone,
    normalizedPhone: '',
    isValid: false,
    phoneType: 'unknown',
    countryCode: 'RO',
    nationalFormat: '',
  };

  try {
    // Curățare input
    let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, '');
    
    // Adăugare prefix țară dacă lipsește
    if (cleaned.startsWith('0')) {
      cleaned = '+40' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+40' + cleaned;
    }

    // Parsare cu libphonenumber
    const parsed = parsePhoneNumber(cleaned, 'RO');
    
    if (parsed && isValidPhoneNumber(cleaned, 'RO')) {
      result.normalizedPhone = parsed.format('E.164');
      result.nationalFormat = parsed.formatNational();
      result.isValid = true;
      result.countryCode = parsed.country || 'RO';
      
      // Detectare tip
      const nationalNumber = parsed.nationalNumber;
      if (nationalNumber.startsWith('7')) {
        result.phoneType = 'mobile';
      } else if (nationalNumber.startsWith('2') || nationalNumber.startsWith('3')) {
        result.phoneType = 'landline';
        result.areaCode = '0' + nationalNumber.substring(0, 2);
      }
    }
  } catch (error) {
    result.errors = [error.message];
  }

  return result;
}
```

---

### 4.4 Worker #9: silver:norm:email

**Scop:** Normalizare email (lowercase, trim, validare format).

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `silver:norm:email` |
| **Concurrency** | 100 |
| **Rate Limit** | Fără |
| **Timeout** | 2000ms |
| **Max Attempts** | 2 |

#### Response Schema

```typescript
interface EmailNormResult {
  originalEmail: string;
  normalizedEmail: string;
  isValidFormat: boolean;
  domain: string;
  localPart: string;
  isGeneric: boolean;              // office@, contact@, etc.
  isFreeProvider: boolean;         // Gmail, Yahoo, etc.
  suggestedCorrection?: string;    // Pentru typos comune
  errors?: string[];
}
```

---

## 5. Categoria C: Workeri Validare CUI

### 5.1 Worker #10: silver:validate:cui-checksum

**Scop:** Validare locală CUI prin algoritm modulo-11.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `silver:validate:cui-checksum` |
| **Concurrency** | 200 |
| **Rate Limit** | Fără (operație locală) |
| **Timeout** | 1000ms |
| **Max Attempts** | 1 |

#### Response Schema

```typescript
interface CuiChecksumResult {
  cui: string;
  isValidChecksum: boolean;
  calculatedCheckDigit: number;
  providedCheckDigit: number;
  cuiWithoutCheck: string;
}
```

#### Implementare

```typescript
export async function cuiChecksumProcessor(
  job: Job<CuiChecksumJobData>,
  logger: Logger
): Promise<CuiChecksumResult> {
  const { cui } = job.data;
  
  // Algoritm modulo-11 pentru CUI România
  const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  const digits = cui.replace(/\D/g, '').split('').map(Number);
  
  if (digits.length < 2 || digits.length > 10) {
    return {
      cui,
      isValidChecksum: false,
      calculatedCheckDigit: -1,
      providedCheckDigit: -1,
      cuiWithoutCheck: cui,
    };
  }

  const checkDigit = digits.pop()!;
  const cuiWithoutCheck = digits.join('');
  
  // Padding la stânga cu zerouri pentru aliniere cu weights
  const paddedDigits = digits.slice().reverse();
  while (paddedDigits.length < weights.length) {
    paddedDigits.push(0);
  }
  paddedDigits.reverse();

  // Calcul sumă ponderată
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += paddedDigits[i] * weights[i];
  }

  // Calcul cifră de control
  let calculated = (sum * 10) % 11;
  if (calculated === 10) calculated = 0;

  return {
    cui,
    isValidChecksum: calculated === checkDigit,
    calculatedCheckDigit: calculated,
    providedCheckDigit: checkDigit,
    cuiWithoutCheck,
  };
}
```

#### Triggere de Ieșire

| Queue Destinație | Condiție |
|------------------|----------|
| `silver:validate:cui-anaf` | Dacă `isValidChecksum === true` |
| `silver:quality:completeness` | Dacă `isValidChecksum === false` (marcare invalidă) |

---

### 5.2 Worker #11: silver:validate:cui-anaf

**Scop:** Verificare existență CUI în baza de date ANAF.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `silver:validate:cui-anaf` |
| **Concurrency** | 50 |
| **Rate Limit** | `{ max: 1, duration: 1000 }` (1 req/sec - limită ANAF) |
| **Timeout** | 30000ms |
| **Max Attempts** | 5 |
| **Backoff** | Exponențial, 5000ms |

#### Trigger Input

```typescript
interface CuiAnafJobData {
  correlationId: string;
  bronzeRecordId: string;
  shopId: string;
  cui: string;
  checkDate?: string;              // YYYY-MM-DD, default: azi
}
```

#### Response Schema

```typescript
interface CuiAnafResult {
  cui: string;
  found: boolean;
  anafData?: {
    denumire: string;
    adresa: string;
    nrRegCom: string;
    codPostal: string;
    stare: string;                 // 'ACTIV', 'INACTIV', 'RADIAT'
    dataInregistrare: string;
    codCAEN: string;
  };
  tvaStatus?: {
    platitorTVA: boolean;
    dataInceputTVA?: string;
    dataSfarsitTVA?: string;
    tvaLaIncasare: boolean;
    splitTVA: boolean;
  };
  eFacturaStatus?: {
    inregistrat: boolean;
    dataInregistrare?: string;
  };
  apiResponseTime: number;
  errors?: string[];
}
```

#### Implementare

```typescript
import axios from 'axios';

const ANAF_API_URL = 'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v9/ws/tva';

export async function cuiAnafProcessor(
  job: Job<CuiAnafJobData>,
  logger: Logger
): Promise<CuiAnafResult> {
  const { cui, checkDate } = job.data;
  const date = checkDate || new Date().toISOString().split('T')[0];
  
  const startTime = Date.now();

  try {
    const response = await axios.post(
      ANAF_API_URL,
      [{ cui: parseInt(cui), data: date }],
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000,
      }
    );

    const apiResponseTime = Date.now() - startTime;

    if (response.data.found && response.data.found.length > 0) {
      const data = response.data.found[0];
      
      return {
        cui,
        found: true,
        anafData: {
          denumire: data.denumire,
          adresa: data.adresa,
          nrRegCom: data.nrRegCom,
          codPostal: data.codPostal,
          stare: mapStare(data.statusInactivi, data.stare_inregistrare),
          dataInregistrare: data.data_inregistrare,
          codCAEN: data.cod_CAEN,
        },
        tvaStatus: {
          platitorTVA: data.scpTVA === true,
          dataInceputTVA: data.data_inceput_ScpTVA,
          dataSfarsitTVA: data.data_sfarsit_ScpTVA,
          tvaLaIncasare: data.statusTvaIncasare === true,
          splitTVA: data.statusSplitTVA === true,
        },
        eFacturaStatus: {
          inregistrat: data.statusRO_e_Factura === true,
          dataInregistrare: data.data_inregistrare_RO_e_Factura,
        },
        apiResponseTime,
      };
    }

    return {
      cui,
      found: false,
      apiResponseTime,
    };

  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      // Rate limited - throw pentru retry cu backoff
      throw new Error('ANAF_RATE_LIMITED');
    }
    throw error;
  }
}

function mapStare(statusInactivi: boolean, stareInregistrare: string): string {
  if (statusInactivi) return 'INACTIV';
  if (stareInregistrare?.toLowerCase().includes('radiat')) return 'RADIAT';
  return 'ACTIV';
}
```

#### Triggere de Ieșire

| Queue Destinație | Condiție |
|------------------|----------|
| `enrich:anaf:fiscal-status` | Dacă `found === true` |
| `enrich:termene:company-base` | Dacă `found === true` |

---

## 6. Categoria D: Workeri ANAF API

### 6.1 Worker #12: enrich:anaf:fiscal-status

**Scop:** Obținere status fiscal complet de la ANAF.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:anaf:fiscal-status` |
| **Concurrency** | 30 |
| **Rate Limit** | `{ max: 1, duration: 1000 }` |
| **Timeout** | 30000ms |
| **Max Attempts** | 3 |

#### Response Schema

```typescript
interface AnafFiscalStatusResult {
  cui: string;
  statusFiscal: {
    stare: 'ACTIV' | 'INACTIV' | 'SUSPENDAT' | 'RADIAT';
    dataStare: string;
    motivStare?: string;
  };
  obligatii: {
    declaratiiNeDepuse: number;
    restanteAnaf: boolean;
    sumaRestante?: number;
  };
  dataVerificare: string;
  sursa: 'ANAF_API';
}
```

---

### 6.2 Worker #13: enrich:anaf:tva-status

**Scop:** Verificare status TVA detaliat.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:anaf:tva-status` |
| **Concurrency** | 30 |
| **Rate Limit** | `{ max: 1, duration: 1000 }` |
| **Timeout** | 30000ms |
| **Max Attempts** | 3 |

#### Response Schema

```typescript
interface AnafTvaStatusResult {
  cui: string;
  platitorTVA: boolean;
  perioadeTVA: Array<{
    dataInceput: string;
    dataSfarsit?: string;
    motiv?: string;
  }>;
  tvaLaIncasare: boolean;
  splitTVA: boolean;
  dataVerificare: string;
}
```

---

### 6.3 Worker #14: enrich:anaf:efactura

**Scop:** Verificare înregistrare în sistemul e-Factura/RO e-Factura.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:anaf:efactura` |
| **Concurrency** | 30 |
| **Rate Limit** | `{ max: 1, duration: 1000 }` |
| **Timeout** | 30000ms |
| **Max Attempts** | 3 |

#### Response Schema

```typescript
interface AnafEfacturaResult {
  cui: string;
  eFacturaInregistrat: boolean;
  dataInregistrare?: string;
  obligatoriuDin?: string;
  detalii?: {
    tip: 'B2B' | 'B2G';
    platforma: string;
  };
}
```

---

### 6.4 Worker #15: enrich:anaf:address

**Scop:** Obținere adresă oficială sediu social din ANAF.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:anaf:address` |
| **Concurrency** | 30 |
| **Rate Limit** | `{ max: 1, duration: 1000 }` |

#### Response Schema

```typescript
interface AnafAddressResult {
  cui: string;
  adresaSediu: {
    stradaComplet: string;
    localitate: string;
    judet: string;
    codPostal: string;
    tara: string;
  };
  puncteLucru?: Array<{
    adresa: string;
    tip: string;
  }>;
}
```

---

### 6.5 Worker #16: enrich:anaf:caen

**Scop:** Obținere coduri CAEN (principal și secundare).

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:anaf:caen` |
| **Concurrency** | 30 |
| **Rate Limit** | `{ max: 1, duration: 1000 }` |

#### Response Schema

```typescript
interface AnafCaenResult {
  cui: string;
  caenPrincipal: {
    cod: string;
    denumire: string;
    sectiune: string;
  };
  caenSecundare: Array<{
    cod: string;
    denumire: string;
  }>;
  isAgricol: boolean;              // CAEN 01xx
  isIrigatii: boolean;             // CAEN specific OUAI
}
```

---

## 7. Categoria E: Workeri Termene.ro API

### 7.1 Worker #17: enrich:termene:company-base

**Scop:** Date de bază companie din Termene.ro.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:termene:company-base` |
| **Concurrency** | 15 |
| **Rate Limit** | `{ max: 20, duration: 1000 }` |
| **Timeout** | 30000ms |
| **Max Attempts** | 3 |

**Cost:** 1-5 credite per query (depinde de plan)

#### Response Schema

```typescript
interface TermeneCompanyBaseResult {
  cui: string;
  denumire: string;
  formaJuridica: string;
  dataInfiintare: string;
  capitalSocial: number;
  moneda: string;
  stare: string;
  adresaCompleta: string;
  telefonSediu?: string;
  emailSediu?: string;
  website?: string;
  creditsUsed: number;
}
```

---

### 7.2 Worker #18: enrich:termene:financials

**Scop:** Date financiare (cifră afaceri, profit, angajați).

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:termene:financials` |
| **Concurrency** | 15 |
| **Rate Limit** | `{ max: 20, duration: 1000 }` |
| **Cost** | 2-5 credite |

#### Response Schema

```typescript
interface TermeneFinancialsResult {
  cui: string;
  anBilant: number;
  cifraAfaceri: number;
  profitNet: number;
  numarAngajati: number;
  evolutie: {
    cifraAfaceriAnterior?: number;
    crestereProcentuala?: number;
  };
  creditsUsed: number;
}
```

---

### 7.3 Worker #19: enrich:termene:balance-sheet

**Scop:** Bilanț detaliat (active, pasive, capitaluri).

#### Response Schema

```typescript
interface TermeneBalanceSheetResult {
  cui: string;
  anBilant: number;
  activeTotale: number;
  activeImobilizate: number;
  activeCirculante: number;
  datoriiTotale: number;
  datoriiPeTermenScurt: number;
  datoriiPeTermenLung: number;
  capitaluriProprii: number;
  capitalSocial: number;
  rezerve: number;
  rezultatReportat: number;
}
```

---

### 7.4 Worker #20: enrich:termene:shareholders

**Scop:** Acționari și administratori.

#### Response Schema

```typescript
interface TermeneShareholdersResult {
  cui: string;
  actionari: Array<{
    nume: string;
    tip: 'PF' | 'PJ';
    cui?: string;                  // Pentru PJ
    procent: number;
    valoareAport: number;
  }>;
  administratori: Array<{
    nume: string;
    functie: string;
    dataNumire: string;
    durata?: string;
  }>;
  asociatUnic: boolean;
}
```

---

### 7.5 Worker #21: enrich:termene:risk-score

**Scop:** Scor de risc și categorie risc.

#### Response Schema

```typescript
interface TermeneRiskScoreResult {
  cui: string;
  scorRisc: number;                // 0-100
  categorieRisc: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factoriRisc: Array<{
    factor: string;
    impact: number;
    descriere: string;
  }>;
  recomandare: string;
}
```

---

### 7.6 Worker #22: enrich:termene:court-cases

**Scop:** Dosare judecătorești active.

#### Response Schema

```typescript
interface TermeneCourtCasesResult {
  cui: string;
  dosareActive: number;
  dosareCaParat: number;
  dosareCaReclamant: number;
  ultimeleDosare: Array<{
    numarDosar: string;
    instanta: string;
    obiect: string;
    stare: string;
    dataUltimaTermen?: string;
  }>;
}
```

---

### 7.7 Worker #23: enrich:termene:insolvency

**Scop:** Verificare status insolvență.

#### Response Schema

```typescript
interface TermeneInsolvencyResult {
  cui: string;
  inInsolventa: boolean;
  tipProcedura?: 'INSOLVENTA' | 'FALIMENT' | 'REORGANIZARE';
  dataDeschiDere?: string;
  practician?: string;
  stadiu?: string;
  bpiMentiuni: number;
}
```

---

### 7.8 Worker #24: enrich:termene:anaf-debts

**Scop:** Datorii către ANAF.

#### Response Schema

```typescript
interface TermeneAnafDebtsResult {
  cui: string;
  areDatorii: boolean;
  sumaTotala?: number;
  detaliiDatorii?: Array<{
    tip: string;
    suma: number;
    perioada: string;
  }>;
  dataVerificare: string;
}
```

---

## 8. Categoria F: Workeri ONRC

### 8.1 Worker #25: enrich:onrc:registration

**Scop:** Număr înregistrare și dată înființare din ONRC.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:onrc:registration` |
| **Concurrency** | 10 |
| **Rate Limit** | `{ max: 10, duration: 1000 }` |
| **Sursă** | ONRC Open Data / Recom Online |

#### Response Schema

```typescript
interface OnrcRegistrationResult {
  cui: string;
  nrRegCom: string;                // J40/1234/2020
  judetInregistrare: string;
  anInregistrare: number;
  numarInregistrare: number;
  dataInregistrare: string;
  dataActualizare: string;
}
```

---

### 8.2 Worker #26: enrich:onrc:capital

**Scop:** Capital social subscris și vărsat.

#### Response Schema

```typescript
interface OnrcCapitalResult {
  cui: string;
  capitalSubscris: number;
  capitalVarsat: number;
  moneda: string;
  numarPartiSociale?: number;
  valoareParteSociala?: number;
}
```

---

## 9. Categoria G: Workeri Email Enrichment

### 9.1 Worker #27: enrich:email:discovery

**Scop:** Descoperire email profesional bazat pe domeniu și nume.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:email:discovery` |
| **Concurrency** | 30 |
| **Rate Limit** | `{ max: 15, duration: 1000 }` (Hunter.io limit) |
| **Timeout** | 30000ms |
| **Max Attempts** | 3 |
| **Cost** | 1 credit Hunter.io |

#### Trigger Input

```typescript
interface EmailDiscoveryJobData {
  correlationId: string;
  bronzeRecordId: string;
  domain: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  fallbackProviders?: ('hunter' | 'snov' | 'apollo')[];
}
```

#### Response Schema

```typescript
interface EmailDiscoveryResult {
  discovered: boolean;
  email?: string;
  confidence: number;              // 0-100
  source: 'hunter' | 'snov' | 'apollo' | 'pattern';
  position?: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
  alternatives?: Array<{
    email: string;
    confidence: number;
  }>;
  creditsUsed: {
    hunter?: number;
    snov?: number;
    apollo?: number;
  };
}
```

#### Implementare

```typescript
import { HunterClient } from '@cerniq/integrations/hunter';
import { SnovClient } from '@cerniq/integrations/snov';

export async function emailDiscoveryProcessor(
  job: Job<EmailDiscoveryJobData>,
  logger: Logger
): Promise<EmailDiscoveryResult> {
  const { domain, firstName, lastName, fallbackProviders = ['hunter', 'snov'] } = job.data;
  
  const result: EmailDiscoveryResult = {
    discovered: false,
    confidence: 0,
    source: 'hunter',
    verificationStatus: 'pending',
    creditsUsed: {},
  };

  // 1. Încercare Hunter.io
  if (fallbackProviders.includes('hunter')) {
    try {
      const hunter = new HunterClient(process.env.HUNTER_API_KEY!);
      const hunterResult = await hunter.emailFinder({
        domain,
        first_name: firstName,
        last_name: lastName,
      });

      result.creditsUsed.hunter = 1;

      if (hunterResult.email && hunterResult.score >= 70) {
        result.discovered = true;
        result.email = hunterResult.email;
        result.confidence = hunterResult.score;
        result.source = 'hunter';
        result.position = hunterResult.position;
        
        logger.info({ email: result.email, confidence: result.confidence }, 'Email discovered via Hunter');
        return result;
      }
    } catch (error) {
      logger.warn({ error: error.message }, 'Hunter.io failed');
    }
  }

  // 2. Fallback la Snov.io
  if (fallbackProviders.includes('snov') && !result.discovered) {
    try {
      const snov = new SnovClient(process.env.SNOV_API_KEY!);
      const snovResult = await snov.getEmailsByDomain(domain);

      result.creditsUsed.snov = 1;

      if (snovResult.emails?.length > 0) {
        // Găsire cel mai bun match
        const bestMatch = snovResult.emails
          .filter((e: any) => 
            (!firstName || e.firstName?.toLowerCase() === firstName.toLowerCase()) &&
            (!lastName || e.lastName?.toLowerCase() === lastName.toLowerCase())
          )
          .sort((a: any, b: any) => b.probability - a.probability)[0];

        if (bestMatch) {
          result.discovered = true;
          result.email = bestMatch.email;
          result.confidence = Math.round(bestMatch.probability * 100);
          result.source = 'snov';
          
          logger.info({ email: result.email, confidence: result.confidence }, 'Email discovered via Snov');
          return result;
        }
      }
    } catch (error) {
      logger.warn({ error: error.message }, 'Snov.io failed');
    }
  }

  // 3. Pattern generation ca ultimă soluție
  if (!result.discovered && firstName && lastName) {
    const patterns = generateEmailPatterns(firstName, lastName, domain);
    result.alternatives = patterns.map(p => ({ email: p, confidence: 30 }));
    result.source = 'pattern';
  }

  return result;
}

function generateEmailPatterns(firstName: string, lastName: string, domain: string): string[] {
  const f = firstName.toLowerCase();
  const l = lastName.toLowerCase();
  
  return [
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f[0]}${l}@${domain}`,
    `${f}_${l}@${domain}`,
    `${f}@${domain}`,
  ];
}
```

#### Triggere de Ieșire

| Queue Destinație | Condiție |
|------------------|----------|
| `enrich:email:mx-check` | Dacă `discovered === true` |
| `enrich:email:smtp-verify` | Dacă `discovered === true` și `confidence >= 70` |

---

### 9.2 Worker #28: enrich:email:mx-check

**Scop:** Verificare existență MX record pentru domeniu.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:email:mx-check` |
| **Concurrency** | 100 |
| **Rate Limit** | Fără (DNS local) |
| **Timeout** | 10000ms |

#### Response Schema

```typescript
interface MxCheckResult {
  domain: string;
  hasMxRecords: boolean;
  mxRecords: Array<{
    priority: number;
    exchange: string;
  }>;
  provider?: string;               // 'google', 'microsoft', 'zoho', etc.
  acceptsCatchAll?: boolean;
}
```

---

### 9.3 Worker #29: enrich:email:smtp-verify

**Scop:** Verificare SMTP deliverability.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:email:smtp-verify` |
| **Concurrency** | 50 |
| **Rate Limit** | `{ max: 50000, duration: 3600000 }` (ZeroBounce hourly) |
| **Timeout** | 30000ms |
| **Cost** | ~$0.008/email (ZeroBounce) |

#### Response Schema

```typescript
interface SmtpVerifyResult {
  email: string;
  status: 'valid' | 'invalid' | 'catch-all' | 'unknown' | 'spamtrap' | 'abuse';
  isDeliverable: boolean;
  subStatus?: string;
  freeEmail: boolean;
  disposable: boolean;
  mxFound: boolean;
  smtpProvider: string;
  score?: number;                  // AI deliverability score
}
```

---

### 9.4 Worker #30: enrich:email:provider-detect

**Scop:** Detectare provider email (Gmail, corporate, etc.).

#### Response Schema

```typescript
interface EmailProviderResult {
  email: string;
  provider: string;
  providerType: 'free' | 'corporate' | 'disposable' | 'government';
  isCorporate: boolean;
  domainAge?: number;              // În zile
}
```

---

### 9.5 Worker #31: enrich:email:role-check

**Scop:** Detectare email generic (office@, contact@, etc.).

#### Response Schema

```typescript
interface EmailRoleCheckResult {
  email: string;
  isGeneric: boolean;
  roleType?: 'office' | 'contact' | 'info' | 'support' | 'sales' | 'admin' | 'personal';
  businessValue: 'high' | 'medium' | 'low';
  recommendation: string;
}
```

---

## 10. Categoria H: Workeri Telefon Enrichment

### 10.1 Worker #32: enrich:phone:type-detect

**Scop:** Detectare tip telefon (mobil/fix/VoIP).

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:phone:type-detect` |
| **Concurrency** | 100 |
| **Rate Limit** | Fără (operație locală) |
| **Timeout** | 2000ms |

#### Response Schema

```typescript
interface PhoneTypeResult {
  phone: string;
  phoneType: 'mobile' | 'landline' | 'voip' | 'unknown';
  prefix: string;
  expectedCarrier?: string;        // Bazat pe prefix
  isRomanian: boolean;
  needsHlr: boolean;               // True doar pentru mobil
}
```

---

### 10.2 Worker #33: enrich:phone:hlr-lookup

**Scop:** HLR Lookup pentru verificare număr mobil activ.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:phone:hlr-lookup` |
| **Concurrency** | 50 |
| **Rate Limit** | `{ max: 100, duration: 1000 }` |
| **Timeout** | 30000ms |
| **Cost** | ~$0.005/lookup (CheckMobi) |

#### Response Schema

```typescript
interface HlrLookupResult {
  phone: string;
  status: 'DELIVERABLE' | 'UNDELIVERABLE' | 'UNKNOWN';
  isValid: boolean;
  isActive: boolean;
  isPorted: boolean;
  isRoaming: boolean;
  originalNetwork: string;
  currentNetwork: string;
  mccMnc: string;
  imsi?: string;
  hlrTimestamp: string;
}
```

#### Implementare

```typescript
import axios from 'axios';

const CHECKMOBI_API = 'https://api.checkmobi.com/v1/validation/lookup';

export async function hlrLookupProcessor(
  job: Job<HlrLookupJobData>,
  logger: Logger
): Promise<HlrLookupResult> {
  const { phone } = job.data;

  const response = await axios.get(CHECKMOBI_API, {
    params: { number: phone },
    headers: { 'Authorization': process.env.CHECKMOBI_API_KEY },
    timeout: 25000,
  });

  const data = response.data;

  return {
    phone,
    status: data.status === 'DELIVRD' ? 'DELIVERABLE' : 
            data.status === 'UNDELIV' ? 'UNDELIVERABLE' : 'UNKNOWN',
    isValid: data.valid === true,
    isActive: data.status === 'DELIVRD',
    isPorted: data.ported === true,
    isRoaming: data.roaming === true,
    originalNetwork: data.original_network || '',
    currentNetwork: data.current_network || '',
    mccMnc: data.mcc_mnc || '',
    hlrTimestamp: new Date().toISOString(),
  };
}
```

---

### 10.3 Worker #34: enrich:phone:carrier-detect

**Scop:** Detectare operator mobil/fix.

#### Response Schema

```typescript
interface CarrierDetectResult {
  phone: string;
  carrier: string;                 // 'Orange', 'Vodafone', 'Telekom', 'Digi'
  carrierType: 'MNO' | 'MVNO';
  networkCode: string;
  isPorted: boolean;
}
```

---

### 10.4 Worker #35: enrich:phone:whatsapp-check

**Scop:** Verificare disponibilitate WhatsApp pe număr.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:phone:whatsapp-check` |
| **Concurrency** | 20 |
| **Rate Limit** | `{ max: 50, duration: 60000 }` |
| **Timeout** | 30000ms |

#### Response Schema

```typescript
interface WhatsappCheckResult {
  phone: string;
  hasWhatsapp: boolean;
  whatsappNumber?: string;
  profileName?: string;
  profilePicture?: boolean;
  lastSeen?: string;
  businessAccount?: boolean;
}
```

---

## 11. Categoria I: Workeri Web Scraping

### 11.1 Worker #36: enrich:web:fetch

**Scop:** Fetch conținut HTML de pe website companie.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:web:fetch` |
| **Concurrency** | 20 |
| **Rate Limit** | `{ max: 10, duration: 1000 }` per domain |
| **Timeout** | 60000ms |

#### Response Schema

```typescript
interface WebFetchResult {
  url: string;
  success: boolean;
  statusCode: number;
  contentType: string;
  html?: string;
  textContent?: string;
  responseTimeMs: number;
  redirects: string[];
  finalUrl: string;
  robotsTxtAllowed: boolean;
}
```

---

### 11.2 Worker #37: enrich:web:meta-extract

**Scop:** Extragere meta tags (title, description, OG tags).

#### Response Schema

```typescript
interface WebMetaExtractResult {
  url: string;
  title: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  language?: string;
}
```

---

### 11.3 Worker #38: enrich:web:contact-extract

**Scop:** Extragere date contact din website.

#### Response Schema

```typescript
interface WebContactExtractResult {
  url: string;
  emails: string[];
  phones: string[];
  addresses: string[];
  socialLinks: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
  };
  contactPageUrl?: string;
}
```

---

### 11.4 Worker #39: enrich:web:social-links

**Scop:** Extragere linkuri social media.

#### Response Schema

```typescript
interface WebSocialLinksResult {
  url: string;
  facebook?: {
    url: string;
    pageId?: string;
  };
  linkedin?: {
    url: string;
    companyId?: string;
  };
  instagram?: {
    url: string;
    username?: string;
  };
  youtube?: {
    url: string;
    channelId?: string;
  };
}
```

---

### 11.5 Worker #40: enrich:web:tech-detect

**Scop:** Detectare stack tehnologic website.

#### Response Schema

```typescript
interface WebTechDetectResult {
  url: string;
  technologies: Array<{
    name: string;
    category: string;
    version?: string;
    confidence: number;
  }>;
  cms?: string;
  ecommerce?: string;
  analytics: string[];
  hosting?: string;
}
```

---

## 12. Categoria J: Workeri AI Structuring

### 12.1 Worker #41: enrich:ai:text-structure

**Scop:** Structurare text neformatat cu LLM (Grok/GPT).

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:ai:text-structure` |
| **Concurrency** | 20 |
| **Rate Limit** | `{ max: 60, duration: 60000 }` (API limits) |
| **Timeout** | 60000ms |
| **Cost** | ~$0.01-0.05 per request |

#### Trigger Input

```typescript
interface AiTextStructureJobData {
  correlationId: string;
  bronzeRecordId: string;
  text: string;
  sourceType: string;
  extractionSchema: {
    fields: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean' | 'array';
      description: string;
      required: boolean;
    }>;
  };
  llmProvider?: 'grok' | 'openai' | 'anthropic';
}
```

#### Response Schema

```typescript
interface AiTextStructureResult {
  success: boolean;
  extractedData: Record<string, any>;
  confidence: number;
  tokensUsed: {
    input: number;
    output: number;
  };
  llmProvider: string;
  modelVersion: string;
  processingTimeMs: number;
}
```

#### Implementare

```typescript
import OpenAI from 'openai';

// Grok folosește API compatibil OpenAI
const grokClient = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

export async function aiTextStructureProcessor(
  job: Job<AiTextStructureJobData>,
  logger: Logger
): Promise<AiTextStructureResult> {
  const { text, extractionSchema, llmProvider = 'grok' } = job.data;
  const startTime = Date.now();

  const systemPrompt = `You are a data extraction assistant. Extract structured data from the provided text according to the schema. Return ONLY valid JSON matching the schema, no explanations.`;

  const userPrompt = `Extract the following fields from this text:

Schema:
${JSON.stringify(extractionSchema.fields, null, 2)}

Text:
${text}

Return valid JSON only.`;

  const completion = await grokClient.chat.completions.create({
    model: 'grok-beta',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 1000,
  });

  const content = completion.choices[0]?.message?.content || '{}';
  const extractedData = JSON.parse(content);

  return {
    success: true,
    extractedData,
    confidence: 85,
    tokensUsed: {
      input: completion.usage?.prompt_tokens || 0,
      output: completion.usage?.completion_tokens || 0,
    },
    llmProvider,
    modelVersion: 'grok-beta',
    processingTimeMs: Date.now() - startTime,
  };
}
```

---

### 12.2 Worker #42: enrich:ai:industry-classify

**Scop:** Clasificare industrie bazată pe descriere și CAEN.

#### Response Schema

```typescript
interface AiIndustryClassifyResult {
  primaryIndustry: string;
  secondaryIndustries: string[];
  isAgricultural: boolean;
  agriculturalSubtype?: 'crop' | 'livestock' | 'mixed' | 'services';
  confidence: number;
  reasoning: string;
}
```

---

### 12.3 Worker #43: enrich:ai:contact-parse

**Scop:** Extragere nume și funcție din text nestructurat.

#### Response Schema

```typescript
interface AiContactParseResult {
  contacts: Array<{
    fullName: string;
    firstName: string;
    lastName: string;
    position?: string;
    department?: string;
    seniority?: 'executive' | 'manager' | 'contributor';
    buyingRole?: 'decision_maker' | 'influencer' | 'user';
  }>;
  confidence: number;
}
```

---

## 13. Categoria K: Workeri Geocoding

### 13.1 Worker #44: enrich:geo:geocode

**Scop:** Geocodare adresă în coordonate GPS.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:geo:geocode` |
| **Concurrency** | 30 |
| **Rate Limit** | `{ max: 50, duration: 1000 }` (Nominatim) |
| **Timeout** | 30000ms |

#### Response Schema

```typescript
interface GeoGeocodeResult {
  address: string;
  success: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  accuracy: 'rooftop' | 'street' | 'locality' | 'region';
  formattedAddress: string;
  components: {
    street?: string;
    houseNumber?: string;
    locality: string;
    county: string;
    postalCode?: string;
    country: string;
  };
  boundingBox?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  provider: 'nominatim' | 'google' | 'here';
}
```

---

### 13.2 Worker #45: enrich:geo:siruta-lookup

**Scop:** Mapare adresă la cod SIRUTA.

#### Response Schema

```typescript
interface GeoSirutaResult {
  address: string;
  sirutaCode?: number;
  sirutaName: string;
  sirutaType: 'municipiu' | 'oras' | 'comuna' | 'sat';
  judetCode: string;
  judetName: string;
  regiuneStatistica: string;
  zonaMacro: 'NORD-VEST' | 'CENTRU' | 'NORD-EST' | 'SUD-EST' | 'SUD-MUNTENIA' | 'BUCURESTI-ILFOV' | 'SUD-VEST' | 'VEST';
  matchConfidence: number;
}
```

---

## 14. Categoria L: Workeri Agricol

### 14.1 Worker #46: enrich:apia:farmer-lookup

**Scop:** Căutare în registrul APIA (fermieri cu subvenții).

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `enrich:apia:farmer-lookup` |
| **Concurrency** | 10 |
| **Rate Limit** | `{ max: 5, duration: 1000 }` |
| **Sursă** | APIA PDF exports / LPIS data |

#### Response Schema

```typescript
interface ApiaFarmerLookupResult {
  cui: string;
  foundInApia: boolean;
  apiaTotalHa?: number;
  apiaAnReferinta?: number;
  tipBeneficiar?: 'PF' | 'PJ' | 'II' | 'IF';
  judetApia?: string;
  dataVerificare: string;
}
```

---

### 14.2 Worker #47: enrich:apia:subsidies

**Scop:** Date subvenții APIA primite.

#### Response Schema

```typescript
interface ApiaSubsidiesResult {
  cui: string;
  subventii: Array<{
    an: number;
    tip: string;                   // SAPS, ANT, SCZ, etc.
    suma: number;
    moneda: string;
    suprafata?: number;
    status: 'platit' | 'aprobat' | 'respins';
  }>;
  totalUltimiiAni: number;
  anulCelMaiRecent: number;
}
```

---

### 14.3 Worker #48: enrich:anif:ouai-lookup

**Scop:** Căutare în registrul OUAI (Organizații Utilizatori Apă Irigații).

#### Response Schema

```typescript
interface AnifOuaiLookupResult {
  cui: string;
  membruOuai: boolean;
  ouaiDetails?: {
    denumireOuai: string;
    cuiOuai: string;
    judet: string;
    localitate: string;
    suprafataDeservita: number;
    numarMembri: number;
  };
  amenajareHidro?: string;
  bazinHidrografic?: string;
}
```

---

### 14.4 Worker #49: enrich:madr:cooperative

**Scop:** Căutare în registrul cooperative agricole.

#### Response Schema

```typescript
interface MadrCooperativeResult {
  cui: string;
  membruCooperativa: boolean;
  cooperativaDetails?: {
    denumire: string;
    cui: string;
    tipCooperativa: string;
    numarMembri: number;
    judet: string;
  };
  functieInCooperativa?: string;
}
```

---

### 14.5 Worker #50: enrich:madr:producer-groups

**Scop:** Căutare în registrul grupuri de producători.

#### Response Schema

```typescript
interface MadrProducerGroupsResult {
  cui: string;
  membruGrup: boolean;
  grupDetails?: {
    denumire: string;
    cui: string;
    sectorul: string;
    produse: string[];
    numarMembri: number;
    recunoscut: boolean;
    dataRecunoastere?: string;
  };
}
```

---

## 15. Categoria M: Workeri Deduplicare

### 15.1 Worker #51: silver:dedup:fuzzy-match

**Scop:** Matching fuzzy pe nume + adresă + CUI.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `silver:dedup:fuzzy-match` |
| **Concurrency** | 20 |
| **Rate Limit** | Fără |
| **Timeout** | 30000ms |

#### Response Schema

```typescript
interface FuzzyMatchResult {
  recordId: string;
  potentialDuplicates: Array<{
    matchedRecordId: string;
    similarity: number;            // 0-100
    matchedFields: {
      name?: number;
      address?: number;
      cui?: number;
      phone?: number;
      email?: number;
    };
    recommendation: 'merge' | 'review' | 'keep_separate';
  }>;
  isUnique: boolean;
}
```

---

### 15.2 Worker #52: silver:dedup:entity-resolve

**Scop:** Rezoluție finală entități (merge sau link).

#### Response Schema

```typescript
interface EntityResolveResult {
  primaryRecordId: string;
  mergedRecordIds: string[];
  linkedRecordIds: string[];
  resolution: 'merged' | 'linked' | 'kept_separate';
  conflictResolutions: Array<{
    field: string;
    selectedValue: any;
    sourceRecordId: string;
    alternativeValues: Array<{
      value: any;
      recordId: string;
    }>;
  }>;
  auditTrail: {
    timestamp: string;
    method: 'automatic' | 'manual';
    confidence: number;
  };
}
```

---

## 16. Categoria N: Workeri Quality Scoring

### 16.1 Worker #53: silver:quality:completeness

**Scop:** Calcul procent completitudine date.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `silver:quality:completeness` |
| **Concurrency** | 100 |
| **Rate Limit** | Fără |
| **Timeout** | 5000ms |

#### Response Schema

```typescript
interface CompletenessResult {
  recordId: string;
  overallCompleteness: number;     // 0-100
  fieldCompleteness: Record<string, {
    hasValue: boolean;
    isValid: boolean;
    quality: 'high' | 'medium' | 'low';
  }>;
  missingRequired: string[];
  missingOptional: string[];
  dataQualityIssues: string[];
}
```

---

### 16.2 Worker #54: silver:quality:tier-assign

**Scop:** Asignare tier Bronze/Silver/Gold.

#### Response Schema

```typescript
interface TierAssignResult {
  recordId: string;
  assignedTier: 'bronze' | 'silver' | 'gold';
  previousTier?: string;
  tierCriteria: {
    cuiValidated: boolean;
    contactVerified: boolean;
    financialData: boolean;
    geocoded: boolean;
    completeness: number;
  };
  eligibleForPromotion: boolean;
  promotionBlockers?: string[];
}
```

---

### 16.3 Worker #55: silver:quality:validation-sum

**Scop:** Sumarizare validări efectuate.

#### Response Schema

```typescript
interface ValidationSumResult {
  recordId: string;
  validations: Array<{
    field: string;
    validationType: string;
    result: 'pass' | 'fail' | 'skip';
    timestamp: string;
    details?: string;
  }>;
  overallStatus: 'valid' | 'partial' | 'invalid';
  nextValidationsNeeded: string[];
}
```

---

## 17. Categoria O: Workeri Agregare

### 17.1 Worker #56: silver:merge:company

**Scop:** Merge date companie din toate sursele.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `silver:merge:company` |
| **Concurrency** | 30 |
| **Rate Limit** | Fără |
| **Timeout** | 30000ms |

#### Response Schema

```typescript
interface CompanyMergeResult {
  silverCompanyId: string;
  bronzeSourceIds: string[];
  enrichmentSources: string[];
  mergedFields: Record<string, {
    value: any;
    source: string;
    confidence: number;
    timestamp: string;
  }>;
  conflicts: Array<{
    field: string;
    values: Array<{ value: any; source: string }>;
    resolution: string;
  }>;
  completeness: number;
}
```

---

### 17.2 Worker #57: silver:merge:contact

**Scop:** Merge date contact din toate sursele.

#### Response Schema

```typescript
interface ContactMergeResult {
  silverContactId: string;
  companyId: string;
  bronzeSourceIds: string[];
  mergedFields: Record<string, any>;
  verificationStatus: {
    emailVerified: boolean;
    phoneVerified: boolean;
    whatsappAvailable: boolean;
  };
}
```

---

## 18. Categoria P: Workeri Pipeline Control

### 18.1 Worker #58: pipeline:orchestrator:start

**Scop:** Inițiere flow complet de enrichment pentru un contact.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `pipeline:orchestrator:start` |
| **Concurrency** | 50 |
| **Rate Limit** | Fără |
| **Timeout** | 60000ms |

#### Trigger Input

```typescript
interface OrchestratorStartJobData {
  correlationId: string;
  shopId: string;
  bronzeRecordId: string;
  enrichmentProfile: 'full' | 'basic' | 'minimal' | 'custom';
  customSteps?: string[];          // Queue names pentru custom
  priority?: 'high' | 'normal' | 'low';
  deadline?: string;               // ISO timestamp
}
```

#### Response Schema

```typescript
interface OrchestratorStartResult {
  flowId: string;
  bronzeRecordId: string;
  plannedSteps: Array<{
    queue: string;
    order: number;
    estimatedDuration: number;
  }>;
  totalEstimatedDuration: number;
  priority: string;
}
```

#### Implementare (FlowProducer)

```typescript
import { FlowProducer } from 'bullmq';

const flowProducer = new FlowProducer({ connection: workerConnection });

export async function orchestratorStartProcessor(
  job: Job<OrchestratorStartJobData>,
  logger: Logger
): Promise<OrchestratorStartResult> {
  const { bronzeRecordId, shopId, enrichmentProfile, correlationId } = job.data;

  // Definire flow pe baza profilului
  const flow = await flowProducer.add({
    name: `enrichment-${bronzeRecordId}`,
    queueName: 'silver:merge:company',
    data: { bronzeRecordId, shopId, correlationId },
    children: buildEnrichmentFlow(enrichmentProfile, bronzeRecordId, shopId, correlationId),
  });

  return {
    flowId: flow.job.id!,
    bronzeRecordId,
    plannedSteps: getPlannedSteps(enrichmentProfile),
    totalEstimatedDuration: calculateEstimatedDuration(enrichmentProfile),
    priority: job.data.priority || 'normal',
  };
}

function buildEnrichmentFlow(
  profile: string,
  bronzeRecordId: string,
  shopId: string,
  correlationId: string
) {
  const baseData = { bronzeRecordId, shopId, correlationId };

  if (profile === 'minimal') {
    return [
      { name: 'norm-name', queueName: 'silver:norm:company-name', data: baseData },
      { name: 'validate-cui', queueName: 'silver:validate:cui-checksum', data: baseData },
    ];
  }

  if (profile === 'basic') {
    return [
      { name: 'norm-name', queueName: 'silver:norm:company-name', data: baseData },
      { name: 'norm-address', queueName: 'silver:norm:address', data: baseData },
      { name: 'validate-cui', queueName: 'silver:validate:cui-checksum', data: baseData,
        children: [
          { name: 'anaf-check', queueName: 'silver:validate:cui-anaf', data: baseData },
        ]
      },
      { name: 'norm-phone', queueName: 'silver:norm:phone-e164', data: baseData },
      { name: 'norm-email', queueName: 'silver:norm:email', data: baseData },
    ];
  }

  // Full profile - toate sursele
  return [
    // Normalizare
    { name: 'norm-name', queueName: 'silver:norm:company-name', data: baseData },
    { name: 'norm-address', queueName: 'silver:norm:address', data: baseData },
    { name: 'norm-phone', queueName: 'silver:norm:phone-e164', data: baseData },
    { name: 'norm-email', queueName: 'silver:norm:email', data: baseData },
    
    // Validare CUI cu enrichment ANAF
    {
      name: 'validate-cui',
      queueName: 'silver:validate:cui-checksum',
      data: baseData,
      children: [
        {
          name: 'anaf-check',
          queueName: 'silver:validate:cui-anaf',
          data: baseData,
          children: [
            { name: 'anaf-fiscal', queueName: 'enrich:anaf:fiscal-status', data: baseData },
            { name: 'anaf-tva', queueName: 'enrich:anaf:tva-status', data: baseData },
            { name: 'anaf-efactura', queueName: 'enrich:anaf:efactura', data: baseData },
            { name: 'anaf-caen', queueName: 'enrich:anaf:caen', data: baseData },
          ],
        },
      ],
    },
    
    // Termene.ro (paralel cu ANAF)
    { name: 'termene-base', queueName: 'enrich:termene:company-base', data: baseData,
      children: [
        { name: 'termene-fin', queueName: 'enrich:termene:financials', data: baseData },
        { name: 'termene-risk', queueName: 'enrich:termene:risk-score', data: baseData },
        { name: 'termene-insolv', queueName: 'enrich:termene:insolvency', data: baseData },
      ],
    },
    
    // Email enrichment
    { name: 'email-discover', queueName: 'enrich:email:discovery', data: baseData,
      children: [
        { name: 'email-verify', queueName: 'enrich:email:smtp-verify', data: baseData },
      ],
    },
    
    // Phone enrichment
    { name: 'phone-type', queueName: 'enrich:phone:type-detect', data: baseData,
      children: [
        { name: 'phone-hlr', queueName: 'enrich:phone:hlr-lookup', data: baseData },
        { name: 'phone-wa', queueName: 'enrich:phone:whatsapp-check', data: baseData },
      ],
    },
    
    // Geocoding
    { name: 'geocode', queueName: 'enrich:geo:geocode', data: baseData,
      children: [
        { name: 'siruta', queueName: 'enrich:geo:siruta-lookup', data: baseData },
      ],
    },
    
    // Agricultural
    { name: 'apia-lookup', queueName: 'enrich:apia:farmer-lookup', data: baseData },
    { name: 'ouai-lookup', queueName: 'enrich:anif:ouai-lookup', data: baseData },
  ];
}
```

---

### 18.2 Worker #59: pipeline:orchestrator:advance

**Scop:** Avansare automată între stadii ale pipeline-ului.

#### Response Schema

```typescript
interface OrchestratorAdvanceResult {
  flowId: string;
  previousStage: string;
  currentStage: string;
  nextStages: string[];
  completedStages: string[];
  failedStages: string[];
  overallProgress: number;        // 0-100
}
```

---

### 18.3 Worker #60: pipeline:monitor:health

**Scop:** Health check și metrici pentru workeri.

#### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `pipeline:monitor:health` |
| **Concurrency** | 5 |
| **Rate Limit** | Fără |
| **Timeout** | 60000ms |
| **Schedule** | Cron: `*/1 * * * *` (fiecare minut) |

#### Response Schema

```typescript
interface HealthCheckResult {
  timestamp: string;
  workers: Array<{
    queueName: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      avgProcessingTime: number;
      errorRate: number;
    };
    alerts: string[];
  }>;
  redis: {
    connected: boolean;
    memoryUsage: number;
    uptime: number;
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
}
```

---

### 18.4 Worker #61: pipeline:monitor:rate-sync

**Scop:** Sincronizare și ajustare rate limits între workeri.

#### Response Schema

```typescript
interface RateSyncResult {
  timestamp: string;
  rateLimits: Array<{
    queueName: string;
    currentLimit: number;
    suggestedLimit: number;
    reason?: string;
    apiQuotaRemaining?: number;
  }>;
  adjustmentsMade: Array<{
    queueName: string;
    oldLimit: number;
    newLimit: number;
  }>;
}
```

---

## 19. Logging & Observability

### 19.1 Structured Logging cu Pino

```typescript
// /packages/logger/src/index.ts

import pino from 'pino';
import { trace } from '@opentelemetry/api';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
    log: (obj) => {
      const span = trace.getActiveSpan();
      if (span) {
        const { traceId, spanId } = span.spanContext();
        return { ...obj, traceId, spanId };
      }
      return obj;
    },
  },
  base: {
    service: 'cerniq-enrichment',
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
  redact: {
    paths: ['password', 'apiKey', 'token', '*.cnp', '*.email', '*.telefon'],
    censor: '[REDACTED]',
  },
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true },
  } : undefined,
});

// Child logger pentru fiecare worker
export function createWorkerLogger(queueName: string) {
  return logger.child({ worker: queueName });
}
```

### 19.2 OpenTelemetry Configuration

```typescript
// /packages/telemetry/src/index.ts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { 
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

export function initTelemetry() {
  const sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: 'cerniq-enrichment-workers',
      [SEMRESATTRS_SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://signoz:4318/v1/traces',
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://signoz:4318/v1/metrics',
      }),
      exportIntervalMillis: 60000,
    }),
  });

  sdk.start();
  return sdk;
}
```

### 19.3 Audit Log Schema

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    correlation_id UUID NOT NULL,
    shop_id UUID NOT NULL,
    worker_name VARCHAR(100) NOT NULL,
    job_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,      -- 'JOB_STARTED', 'JOB_COMPLETED', 'JOB_FAILED', etc.
    entity_type VARCHAR(50),           -- 'bronze_contact', 'silver_company', etc.
    entity_id UUID,
    input_summary JSONB,               -- Sanitized input data
    output_summary JSONB,              -- Sanitized output data
    duration_ms INTEGER,
    error_message TEXT,
    user_id UUID,                      -- Pentru acțiuni manuale
    ip_address INET,
    trace_id VARCHAR(32),
    span_id VARCHAR(16)
);

CREATE INDEX idx_audit_logs_correlation ON audit_logs(correlation_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_worker ON audit_logs(worker_name, timestamp DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

---

## 20. Human-in-the-Loop UI/UX

### 20.1 Dashboard Worker Status

```typescript
// GET /api/v1/workers/dashboard

interface WorkerDashboard {
  summary: {
    totalWorkers: 61;
    healthyWorkers: number;
    degradedWorkers: number;
    pausedWorkers: number;
  };
  queues: Array<{
    name: string;
    category: string;
    status: 'running' | 'paused' | 'error';
    metrics: {
      waiting: number;
      active: number;
      completed24h: number;
      failed24h: number;
      avgDuration: number;
      throughput: number;          // jobs/minute
    };
    rateLimitStatus: {
      current: number;
      max: number;
      resetIn: number;
    };
    lastError?: {
      message: string;
      timestamp: string;
    };
  }>;
  alerts: Array<{
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    worker: string;
    timestamp: string;
  }>;
}
```

### 20.2 Manual Intervention Interface

```typescript
// POST /api/v1/workers/{queueName}/pause
// POST /api/v1/workers/{queueName}/resume
// POST /api/v1/workers/{queueName}/retry-failed
// DELETE /api/v1/workers/{queueName}/jobs/{jobId}

// POST /api/v1/workers/{queueName}/trigger
interface ManualTriggerRequest {
  data: Record<string, any>;       // Job data
  priority?: 'high' | 'normal' | 'low';
  delay?: number;                  // Delay în ms
  attempts?: number;               // Override default attempts
}

// Response
interface ManualTriggerResponse {
  jobId: string;
  queue: string;
  status: 'queued' | 'delayed';
  estimatedStart: string;
  trackingUrl: string;
}
```

### 20.3 Job Approval Workflow

```typescript
// Pentru joburi care necesită aprobare manuală

interface ApprovalWorkflow {
  approvalQueue: 'pipeline:approval:pending';
  
  // Job care necesită aprobare
  pendingApproval: {
    jobId: string;
    originalQueue: string;
    originalData: Record<string, any>;
    reason: string;
    requestedAt: string;
    requestedBy: 'system' | string;  // user_id
    autoApproveAfter?: string;       // ISO timestamp
  };
  
  // Acțiuni disponibile
  actions: {
    approve: 'POST /api/v1/approvals/{jobId}/approve';
    reject: 'POST /api/v1/approvals/{jobId}/reject';
    modify: 'POST /api/v1/approvals/{jobId}/modify';
  };
}
```

### 20.4 Data Quality Review Screen

```typescript
// GET /api/v1/review/contacts?tier=silver&completeness_lt=60

interface ReviewContact {
  id: string;
  tier: 'bronze' | 'silver' | 'gold';
  completeness: number;
  fields: Array<{
    name: string;
    value: any;
    source: string;
    confidence: number;
    needsReview: boolean;
    alternatives?: any[];
  }>;
  enrichmentHistory: Array<{
    worker: string;
    timestamp: string;
    changes: string[];
  }>;
  actions: {
    editField: string;
    reEnrich: string;
    promoteToGold: string;
    markAsInvalid: string;
  };
}
```

---

## 21. API-uri Manuale REST

### 21.1 Worker Management

```yaml
# /api/v1/workers

GET /workers
  Description: List all workers with status
  Response: WorkerDashboard

GET /workers/{queueName}
  Description: Get specific worker details
  Response: WorkerDetails

POST /workers/{queueName}/pause
  Description: Pause worker processing
  Response: { success: true, status: 'paused' }

POST /workers/{queueName}/resume
  Description: Resume worker processing
  Response: { success: true, status: 'running' }

POST /workers/{queueName}/trigger
  Description: Manually trigger a job
  Body: ManualTriggerRequest
  Response: ManualTriggerResponse
```

### 21.2 Job Management

```yaml
# /api/v1/jobs

GET /jobs/{jobId}
  Description: Get job status and details
  Response: JobDetails

GET /jobs/{jobId}/logs
  Description: Get job execution logs
  Response: JobLogs[]

POST /jobs/{jobId}/retry
  Description: Retry a failed job
  Response: { success: true, newJobId: string }

DELETE /jobs/{jobId}
  Description: Cancel/remove a job
  Response: { success: true }

GET /queues/{queueName}/jobs
  Query: status, limit, offset
  Description: List jobs in queue
  Response: PaginatedJobs
```

### 21.3 Enrichment Trigger APIs

```yaml
# /api/v1/enrich

POST /enrich/company
  Description: Start full company enrichment
  Body: { cui: string, profile?: 'full' | 'basic' }
  Response: { flowId: string, trackingUrl: string }

POST /enrich/contact
  Description: Start contact enrichment
  Body: { email?: string, phone?: string, domain?: string }
  Response: { flowId: string, trackingUrl: string }

POST /enrich/batch
  Description: Batch enrichment for multiple entities
  Body: { entities: Array<{ type: 'company' | 'contact', identifier: string }> }
  Response: { batchId: string, jobCount: number, trackingUrl: string }

GET /enrich/{flowId}/status
  Description: Get enrichment flow status
  Response: EnrichmentFlowStatus
```

### 21.4 OpenAPI Specification (rezumat)

```yaml
openapi: 3.0.3
info:
  title: Cerniq Enrichment Workers API
  version: 1.0.0
  description: API pentru managementul și triggerarea workerilor de data enrichment

servers:
  - url: https://api.cerniq.app/v1
    description: Production
  - url: http://localhost:3000/v1
    description: Development

security:
  - bearerAuth: []

paths:
  /workers:
    get:
      summary: List all workers
      tags: [Workers]
      responses:
        '200':
          description: Worker dashboard
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkerDashboard'

  /workers/{queueName}/trigger:
    post:
      summary: Manually trigger a worker job
      tags: [Workers]
      parameters:
        - name: queueName
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ManualTriggerRequest'
      responses:
        '202':
          description: Job queued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ManualTriggerResponse'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    WorkerDashboard:
      type: object
      properties:
        summary:
          type: object
        queues:
          type: array
          items:
            $ref: '#/components/schemas/QueueStatus'

    ManualTriggerRequest:
      type: object
      required: [data]
      properties:
        data:
          type: object
        priority:
          type: string
          enum: [high, normal, low]
        delay:
          type: integer

    ManualTriggerResponse:
      type: object
      properties:
        jobId:
          type: string
        queue:
          type: string
        status:
          type: string
        trackingUrl:
          type: string
```

---

## Anexă: Tabel Centralizator Rate Limits

| # | Queue | Rate Limit | API Source | Cost |
|---|-------|-----------|------------|------|
| 11 | `silver:validate:cui-anaf` | 1/sec | ANAF | Gratuit |
| 12-16 | `enrich:anaf:*` | 1/sec (shared) | ANAF | Gratuit |
| 17-24 | `enrich:termene:*` | 20/sec | Termene.ro | 1-5 credite |
| 27 | `enrich:email:discovery` | 15/sec | Hunter.io | 1 credit |
| 29 | `enrich:email:smtp-verify` | 50k/hour | ZeroBounce | $0.008 |
| 33 | `enrich:phone:hlr-lookup` | 100/sec | CheckMobi | $0.005 |
| 35 | `enrich:phone:whatsapp-check` | 50/min | TimelinesAI | Included |
| 36 | `enrich:web:fetch` | 10/sec/domain | - | Gratuit |
| 41-43 | `enrich:ai:*` | 60/min | xAI Grok | $0.01-0.05 |
| 44 | `enrich:geo:geocode` | 50/sec | Nominatim | Gratuit |

---

**Document Version:** 1.0  
**Last Updated:** Ianuarie 2026  
**Total Workers:** 61  
**Total Queues:** 61  
**Estimated Processing Capacity:** ~10,000 contacts/hour (full enrichment)
