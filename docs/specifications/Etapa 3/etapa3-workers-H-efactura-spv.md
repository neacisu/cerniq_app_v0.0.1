# Etapa 3 - Workers Category H: e-Factura SPV Integration

> **Document Version**: 1.0.0
> **Last Updated**: 2026-01-18
> **Author**: Cerniq Development Team
> **Status**: Complete Specification
> **Category**: H - ANAF e-Factura Integration
> **Workers Count**: 3

---

## Table of Contents

1. [Category Overview](#1-category-overview)
2. [Worker #23: efactura:send](#2-worker-23-efacturasend)
3. [Worker #24: efactura:status:check](#3-worker-24-efacturastatuscheck)
4. [Worker #25: efactura:deadline:monitor](#4-worker-25-efacturadeadlinemonitor)
5. [ANAF SPV Integration](#5-anaf-spv-integration)
6. [UBL XML Generation](#6-ubl-xml-generation)
7. [Retry & Error Handling](#7-retry--error-handling)
8. [Monitoring & Alerts](#8-monitoring--alerts)
9. [Queue Configuration](#9-queue-configuration)

---

## 1. Category Overview

### 1.1 Purpose

Category H workers manage Romania's mandatory e-Factura system integration with ANAF SPV (Spațiul Privat Virtual). Since January 2024, all B2B invoices in Romania must be transmitted electronically to ANAF within 5 calendar days of issuance.

These workers handle:
- **e-Factura Submission**: Convert invoices to UBL 2.1 XML and send to ANAF
- **Status Monitoring**: Track invoice processing status (accepted/rejected)
- **Deadline Compliance**: Ensure 5-day submission deadline is met

### 1.2 Romanian e-Factura System

**Official Documentation:**
- **ANAF SPV**: https://www.anaf.ro/anaf/internet/ANAF/servicii_online/Servicii_dedicate_platitorilor_de_TVA/e-Factura
- **Technical Specs**: https://mfinante.gov.ro/web/efactura/legislatie
- **UBL 2.1 Standard**: OASIS Universal Business Language 2.1

**Key Requirements:**
- All B2B invoices must be submitted to ANAF within 5 calendar days
- Format: UBL 2.1 XML (EN 16931 compliant)
- Transmission: Via SPV API or authorized platforms (Oblio, etc.)
- Validation: ANAF validates XML and may reject with error codes
- Penalties: Non-compliance results in fines (up to 5,000 RON per invoice)

### 1.3 Architecture Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        e-FACTURA SUBMISSION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐                                                       │
│  │ oblio:invoice:   │                                                       │
│  │ create (#21)     │                                                       │
│  └────────┬─────────┘                                                       │
│           │                                                                 │
│           ▼ INVOICED state                                                  │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐  │
│  │ efactura:send    │─────▶│ efactura:status: │─────▶│ efactura:        │  │
│  │ (#23)            │      │ check (#24)      │      │ deadline:monitor │  │
│  └──────────────────┘      └──────────────────┘      │ (#25)            │  │
│           │                        │                 └──────────────────┘   │
│           ▼                        ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         ANAF SPV API                                │   │
│  │  • POST /upload - Submit UBL XML                                    │   │
│  │  • GET /stare/{index} - Check submission status                     │   │
│  │  • GET /descarcare/{id} - Download ANAF response/PDF                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Status Flow:                                                               │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐                      │
│  │ in_prelucrare│───▶│    ok      │     │    nok     │                      │
│  │ (processing) │    │ (accepted) │     │ (rejected) │                      │
│  └────────────┘     └────────────┘     └────────────┘                      │
│                            │                  │                             │
│                            ▼                  ▼                             │
│                    EINVOICE_SENT        HITL: Fix                           │
│                                         & Resubmit                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Workers Summary

| # | Worker | Queue | Concurrency | Timeout | Retries | Priority |
|---|--------|-------|-------------|---------|---------|----------|
| 23 | efactura:send | `efactura:send` | 20 | 60s | 5 | CRITICAL |
| 24 | efactura:status:check | `efactura:status:check` | 50 | 30s | 3 | HIGH |
| 25 | efactura:deadline:monitor | `efactura:deadline:monitor` | 10 | 120s | 3 | CRITICAL |

### 1.5 Integration Options

**Option A: Direct ANAF SPV API** (Complex)
- Requires OAuth2 certificate-based authentication
- Direct XML submission to ANAF
- Full control but complex implementation

**Option B: Via Oblio (Recommended)**
- Oblio handles ANAF communication
- Simplified API calls
- Built-in XML generation
- Used in this implementation

### 1.6 State Machine Integration

```
                    NEGOTIATION STATE TRANSITIONS
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  INVOICED ──trigger──▶ efactura:send                            │
│      │                       │                                  │
│      ▼                       ▼                                  │
│  EINVOICE_PENDING ◀──────────┘                                  │
│      │                                                          │
│      │ (waiting for ANAF response)                              │
│      │                                                          │
│      ├──▶ efactura:status:check (polls every 5 min)             │
│      │           │                                              │
│      │           ├── status: ok ──────▶ EINVOICE_SENT           │
│      │           │                                              │
│      │           └── status: nok ─────▶ HITL Intervention       │
│      │                                    │                     │
│      │                                    ▼                     │
│      │                              Fix & Resubmit              │
│      │                                    │                     │
│      │                                    ▼                     │
│      ▼                              efactura:send               │
│  efactura:deadline:monitor                                      │
│      │                                                          │
│      └── Day 4 warning ──▶ Alert sales team                     │
│      └── Day 5 critical ─▶ Escalate + Auto-attempt              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Worker #23: etapa3:efactura:send

### 2.1 Worker Specification

| Property | Value |
|----------|-------|
| **Queue Name** | `etapa3:efactura:send` |
| **Concurrency** | 20 |
| **Timeout** | 60 seconds |
| **Retries** | 5 |
| **Backoff** | Exponential (5s base, max 5min) |
| **Priority** | CRITICAL |
| **Rate Limit** | 30/minute (ANAF limit) |

### 2.2 Purpose

Sends invoices to ANAF via the e-Factura system. This worker:
- Generates UBL 2.1 XML (or retrieves from Oblio)
- Submits to ANAF SPV
- Stores submission index for status tracking
- Updates negotiation state to EINVOICE_PENDING

### 2.3 Job Data Interface

```typescript
// ============================================================================
// WORKER #23: efactura:send - Job Interfaces
// ============================================================================

import { z } from 'zod';

/**
 * Job data for e-Factura submission
 */
export const EfacturaSendJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  negotiationId: z.string().uuid(),
  invoiceId: z.string().uuid(), // Local invoice ID
  oblioInvoiceId: z.string(), // Oblio reference (e.g., "FACT-0001")
  
  // Options
  options: z.object({
    // Force resubmission even if already sent
    forceResubmit: z.boolean().default(false),
    
    // Use stored XML or generate new
    useStoredXml: z.boolean().default(true),
    
    // Priority submission (bypass queue order)
    priority: z.boolean().default(false),
    
    // Manual override - requires HITL approval
    manualOverride: z.boolean().default(false),
    hitlApprovalId: z.string().uuid().optional(),
  }).optional(),
  
  // Submission context
  context: z.object({
    // Is this a resubmission after rejection?
    isResubmission: z.boolean().default(false),
    previousIndexIncarcare: z.string().optional(),
    previousRejectionReason: z.string().optional(),
    
    // Is this near deadline?
    daysUntilDeadline: z.number().optional(),
  }).optional(),
  
  // Correlation
  correlationId: z.string().uuid().optional(),
});

export type EfacturaSendJobData = z.infer<typeof EfacturaSendJobDataSchema>;

/**
 * e-Factura submission result
 */
export interface EfacturaSendResult {
  success: boolean;
  
  // ANAF submission reference
  indexIncarcare: string; // ANAF upload index (unique ID)
  dataIncarcare: string; // Upload timestamp
  
  // Invoice reference
  invoiceId: string;
  oblioInvoiceId: string;
  
  // UBL XML info
  xmlStoragePath?: string;
  xmlSize: number;
  
  // Status
  status: 'SUBMITTED' | 'ALREADY_SUBMITTED' | 'VALIDATION_FAILED';
  
  // If validation failed locally
  validationErrors?: string[];
  
  // Timestamps
  submittedAt: Date;
  
  // Status check scheduled
  statusCheckJobId?: string;
}
```

### 2.4 Worker Implementation

```typescript
// ============================================================================
// WORKER #23: efactura:send - Implementation
// ============================================================================

import { Worker, Job, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { db } from '@/db';
import { 
  negotiations, 
  invoices,
  efacturaSubmissions,
  negotiationStateHistory,
  tenants,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { OblioClient } from '@/integrations/oblio';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';
import { validateUblXml } from '@/lib/ubl-validator';
import {
  EfacturaSendJobData,
  EfacturaSendJobDataSchema,
  EfacturaSendResult,
} from './types';

const redis = new Redis(process.env.REDIS_URL!);

// Status check queue
const statusCheckQueue = new Queue('efactura:status:check', { connection: redis });

/**
 * Worker #23: e-Factura Send
 * 
 * Submits invoices to ANAF via e-Factura system
 */
export const efacturaSendWorker = new Worker<EfacturaSendJobData, EfacturaSendResult>(
  'efactura:send',
  async (job: Job<EfacturaSendJobData, EfacturaSendResult>) => {
    const startTime = Date.now();
    const { tenantId, negotiationId, invoiceId, oblioInvoiceId, options, context } = job.data;
    
    const log = logger.child({
      worker: 'efactura:send',
      jobId: job.id,
      tenantId,
      negotiationId,
      invoiceId,
    });
    
    log.info('Starting e-Factura submission', {
      oblioInvoiceId,
      isResubmission: context?.isResubmission,
    });
    
    try {
      // 1. Validate input
      EfacturaSendJobDataSchema.parse(job.data);
      
      // 2. Get invoice details
      const invoice = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, invoiceId),
          eq(invoices.tenantId, tenantId)
        ),
      });
      
      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }
      
      // 3. Check if already submitted (unless force resubmit)
      if (invoice.efacturaStatus === 'SENT' && !options?.forceResubmit) {
        log.info('Invoice already submitted to e-Factura', {
          indexIncarcare: invoice.efacturaIndexIncarcare,
        });
        
        return {
          success: true,
          indexIncarcare: invoice.efacturaIndexIncarcare!,
          dataIncarcare: invoice.efacturaDataIncarcare!,
          invoiceId,
          oblioInvoiceId,
          xmlSize: 0,
          status: 'ALREADY_SUBMITTED',
          submittedAt: new Date(invoice.efacturaDataIncarcare!),
        };
      }
      
      // 4. Get Oblio client
      const oblioClient = await getOblioClient(tenantId);
      
      // 5. Get or generate UBL XML
      const seriesName = invoice.seriesName;
      const number = invoice.number;
      
      const ublXml = await oblioClient.getEfacturaXml(seriesName, number);
      
      log.info('Retrieved UBL XML from Oblio', { xmlLength: ublXml.length });
      
      // 6. Validate UBL XML locally (optional but recommended)
      const validationResult = await validateUblXml(ublXml);
      
      if (!validationResult.valid) {
        log.error('UBL XML validation failed locally', {
          errors: validationResult.errors,
        });
        
        // Store validation failure
        await recordSubmissionAttempt(tenantId, invoiceId, {
          success: false,
          errorType: 'LOCAL_VALIDATION',
          errors: validationResult.errors,
        });
        
        return {
          success: false,
          indexIncarcare: '',
          dataIncarcare: '',
          invoiceId,
          oblioInvoiceId,
          xmlSize: ublXml.length,
          status: 'VALIDATION_FAILED',
          validationErrors: validationResult.errors,
          submittedAt: new Date(),
        };
      }
      
      // 7. Store XML for audit
      const xmlStoragePath = `tenants/${tenantId}/efactura/${negotiationId}/${oblioInvoiceId}.xml`;
      await uploadToStorage(Buffer.from(ublXml, 'utf-8'), xmlStoragePath, 'application/xml');
      
      // 8. Submit to ANAF via Oblio
      const submissionResult = await oblioClient.sendEfactura(seriesName, number);
      
      log.info('e-Factura submitted to ANAF', {
        indexIncarcare: submissionResult.indexIncarcare,
        dataIncarcare: submissionResult.dataIncarcare,
      });
      
      // 9. Store submission record
      const [submissionRecord] = await db.insert(efacturaSubmissions).values({
        tenantId,
        negotiationId,
        invoiceId,
        indexIncarcare: submissionResult.indexIncarcare,
        dataIncarcare: new Date(submissionResult.dataIncarcare),
        xmlStoragePath,
        xmlSize: ublXml.length,
        status: 'PENDING',
        isResubmission: context?.isResubmission || false,
        previousIndexIncarcare: context?.previousIndexIncarcare,
        submittedAt: new Date(),
        createdAt: new Date(),
      }).returning();
      
      // 10. Update invoice status
      await db.update(invoices)
        .set({
          efacturaStatus: 'PENDING',
          efacturaIndexIncarcare: submissionResult.indexIncarcare,
          efacturaDataIncarcare: submissionResult.dataIncarcare,
          efacturaSubmissionId: submissionRecord.id,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
      
      // 11. Update negotiation state to EINVOICE_PENDING
      const negotiation = await db.query.negotiations.findFirst({
        where: eq(negotiations.id, negotiationId),
      });
      
      if (negotiation && negotiation.state !== 'EINVOICE_PENDING') {
        await db.update(negotiations)
          .set({
            state: 'EINVOICE_PENDING',
            updatedAt: new Date(),
          })
          .where(eq(negotiations.id, negotiationId));
        
        await db.insert(negotiationStateHistory).values({
          tenantId,
          negotiationId,
          fromState: negotiation.state,
          toState: 'EINVOICE_PENDING',
          triggeredBy: 'SYSTEM',
          triggeredByWorker: 'efactura:send',
          metadata: {
            indexIncarcare: submissionResult.indexIncarcare,
          },
          transitionedAt: new Date(),
        });
      }
      
      // 12. Schedule status check (first check after 2 minutes)
      const statusCheckJob = await statusCheckQueue.add(
        'check',
        {
          tenantId,
          negotiationId,
          invoiceId,
          indexIncarcare: submissionResult.indexIncarcare,
          attempt: 1,
          correlationId: job.data.correlationId,
        },
        {
          delay: 120000, // 2 minutes
          jobId: `status-check-${submissionResult.indexIncarcare}-1`,
        }
      );
      
      // 13. Emit metrics
      const duration = Date.now() - startTime;
      metrics.efacturaSubmissionsTotal.inc({ 
        tenant_id: tenantId,
        resubmission: String(context?.isResubmission || false),
      });
      metrics.efacturaSubmissionDuration.observe({ tenant_id: tenantId }, duration);
      
      log.info('e-Factura submission completed', {
        indexIncarcare: submissionResult.indexIncarcare,
        statusCheckJobId: statusCheckJob.id,
        duration,
      });
      
      return {
        success: true,
        indexIncarcare: submissionResult.indexIncarcare,
        dataIncarcare: submissionResult.dataIncarcare,
        invoiceId,
        oblioInvoiceId,
        xmlStoragePath,
        xmlSize: ublXml.length,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        statusCheckJobId: statusCheckJob.id,
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('e-Factura submission failed', { error, duration });
      
      // Record failed attempt
      await recordSubmissionAttempt(tenantId, invoiceId, {
        success: false,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      
      metrics.efacturaSubmissionsFailed.inc({
        tenant_id: tenantId,
        error_type: error instanceof Error ? error.constructor.name : 'Unknown',
      });
      
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 20,
    limiter: {
      max: 30,
      duration: 60000, // 30 per minute (ANAF limit consideration)
    },
  }
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get Oblio client for tenant
 */
async function getOblioClient(tenantId: string): Promise<OblioClient> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: {
      oblioApiKey: true,
      oblioApiSecret: true,
      oblioCompanyCif: true,
    },
  });
  
  if (!tenant?.oblioApiKey || !tenant?.oblioApiSecret) {
    throw new Error('Oblio credentials not configured for tenant');
  }
  
  return new OblioClient({
    apiKey: tenant.oblioApiKey,
    apiSecret: tenant.oblioApiSecret,
    companyCif: tenant.oblioCompanyCif,
  });
}

/**
 * Upload file to S3-compatible storage
 */
async function uploadToStorage(data: Buffer, path: string, contentType: string): Promise<string> {
  const s3 = new S3Client({
    region: process.env.S3_REGION || 'eu-central-1',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: path,
    Body: data,
    ContentType: contentType,
  }));
  
  return `${process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${path}`;
}

/**
 * Record submission attempt for audit
 */
async function recordSubmissionAttempt(
  tenantId: string,
  invoiceId: string,
  result: {
    success: boolean;
    errorType?: string;
    errorMessage?: string;
    errors?: string[];
  }
): Promise<void> {
  await db.insert(efacturaSubmissionAttempts).values({
    tenantId,
    invoiceId,
    success: result.success,
    errorType: result.errorType,
    errorMessage: result.errorMessage,
    validationErrors: result.errors,
    attemptedAt: new Date(),
  });
}

// ============================================================================
// Event Handlers
// ============================================================================

efacturaSendWorker.on('completed', (job, result) => {
  logger.info('e-Factura submission completed', {
    jobId: job.id,
    invoiceId: job.data.invoiceId,
    indexIncarcare: result.indexIncarcare,
    status: result.status,
  });
});

efacturaSendWorker.on('failed', (job, error) => {
  logger.error('e-Factura submission failed', {
    jobId: job?.id,
    invoiceId: job?.data.invoiceId,
    error: error.message,
    attempt: job?.attemptsMade,
  });
});
```

---

## 2. Worker #24: efactura:status:check - Status Polling

### 2.1 Overview

Acest worker implementează polling-ul pentru verificarea stării e-Facturilor trimise la ANAF SPV. După ce o factură este încărcată, ANAF o procesează asincron, iar statusul final (acceptată/respinsă) trebuie verificat periodic.

### 2.2 Job Interface

```typescript
// ============================================================================
// E-Factura Status Check - Job Data & Result
// ============================================================================

import { z } from 'zod';

/**
 * Possible e-Factura status values from ANAF
 */
export enum EfacturaStatus {
  IN_PRELUCRARE = 'in_prelucrare',   // Still processing
  OK = 'ok',                          // Accepted by ANAF
  NOK = 'nok',                        // Rejected by ANAF
  EROARE_VALIDARE = 'eroare_validare', // Validation error
  EROARE_DESCARCARE = 'eroare_descarcare', // Download error
}

/**
 * Job data schema for e-Factura status check
 */
export const efacturaStatusCheckJobSchema = z.object({
  tenantId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  efacturaSubmissionId: z.string().uuid(),
  indexIncarcare: z.string(),
  checkCount: z.number().int().min(0).default(0),
  maxChecks: z.number().int().min(1).default(288), // 24h with 5min intervals
  scheduledCheckAt: z.string().datetime().optional(),
});

export type EfacturaStatusCheckJobData = z.infer<typeof efacturaStatusCheckJobSchema>;

/**
 * Result of status check
 */
export interface EfacturaStatusCheckResult {
  submissionId: string;
  invoiceId: string;
  indexIncarcare: string;
  
  // Status
  status: EfacturaStatus;
  isFinal: boolean;
  
  // ANAF Response
  anafResponse?: {
    id_solicitare: string;
    detalii?: string;
    data_creare?: string;
    tip?: string;
    id?: string;
  };
  
  // If rejected
  rejectionReasons?: string[];
  validationErrors?: Array<{
    code: string;
    message: string;
    location?: string;
  }>;
  
  // PDF if accepted
  pdfDownloaded?: boolean;
  pdfStoragePath?: string;
  
  // Next check
  nextCheckScheduled?: boolean;
  nextCheckAt?: string;
  
  // Metrics
  checkCount: number;
  totalProcessingTimeMs?: number;
}
```

### 2.3 Worker Implementation

```typescript
// ============================================================================
// E-Factura Status Check Worker Implementation
// ============================================================================

import { Worker, Queue, Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import {
  efacturaSubmissions,
  invoices,
  negotiations,
  hitlApprovalRequests,
} from '@/db/schema';
import { OblioClient } from '@/integrations/oblio';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';
import { redis } from '@/lib/redis';
import {
  EfacturaStatusCheckJobData,
  EfacturaStatusCheckResult,
  EfacturaStatus,
  efacturaStatusCheckJobSchema,
} from './types';

// Queue reference for scheduling next checks
const efacturaStatusCheckQueue = new Queue('efactura:status:check', {
  connection: redis,
});

// HITL queue for rejected invoices
const hitlQueue = new Queue('hitl:approval:request', {
  connection: redis,
});

// Constants
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const INITIAL_CHECK_DELAY_MS = 2 * 60 * 1000; // 2 minutes for first check
const MAX_PROCESSING_TIME_MS = 24 * 60 * 60 * 1000; // 24 hours max

/**
 * E-Factura Status Check Worker
 * Polls ANAF for e-Factura processing status
 */
export const efacturaStatusCheckWorker = new Worker<
  EfacturaStatusCheckJobData,
  EfacturaStatusCheckResult
>(
  'efactura:status:check',
  async (job: Job<EfacturaStatusCheckJobData>): Promise<EfacturaStatusCheckResult> => {
    const startTime = Date.now();
    const data = efacturaStatusCheckJobSchema.parse(job.data);
    
    logger.info('Checking e-Factura status', {
      jobId: job.id,
      invoiceId: data.invoiceId,
      indexIncarcare: data.indexIncarcare,
      checkCount: data.checkCount,
    });
    
    // Get submission record
    const submission = await db.query.efacturaSubmissions.findFirst({
      where: and(
        eq(efacturaSubmissions.id, data.efacturaSubmissionId),
        eq(efacturaSubmissions.tenantId, data.tenantId)
      ),
    });
    
    if (!submission) {
      throw new Error(`E-Factura submission not found: ${data.efacturaSubmissionId}`);
    }
    
    // Check if already has final status
    if (submission.status === 'ok' || submission.status === 'nok') {
      logger.info('Submission already has final status', {
        submissionId: submission.id,
        status: submission.status,
      });
      
      return {
        submissionId: submission.id,
        invoiceId: data.invoiceId,
        indexIncarcare: data.indexIncarcare,
        status: submission.status as EfacturaStatus,
        isFinal: true,
        checkCount: data.checkCount,
      };
    }
    
    // Get Oblio client
    const oblioClient = await getOblioClient(data.tenantId);
    
    // Check status via Oblio API
    const statusResponse = await checkEfacturaStatusViaOblio(
      oblioClient,
      data.indexIncarcare
    );
    
    // Update metrics
    metrics.increment('efacturaStatusChecks', {
      tenantId: data.tenantId,
      status: statusResponse.status,
    });
    
    // Process based on status
    let result: EfacturaStatusCheckResult;
    
    switch (statusResponse.status) {
      case EfacturaStatus.OK:
        result = await handleAcceptedStatus(
          data,
          submission,
          statusResponse,
          oblioClient
        );
        break;
        
      case EfacturaStatus.NOK:
      case EfacturaStatus.EROARE_VALIDARE:
        result = await handleRejectedStatus(
          data,
          submission,
          statusResponse
        );
        break;
        
      case EfacturaStatus.IN_PRELUCRARE:
      default:
        result = await handleProcessingStatus(
          data,
          submission,
          statusResponse
        );
        break;
    }
    
    // Record check
    await recordStatusCheck(data, statusResponse, result);
    
    // Metrics
    const duration = Date.now() - startTime;
    metrics.histogram('efacturaStatusCheckDuration', duration, {
      tenantId: data.tenantId,
      status: statusResponse.status,
    });
    
    return result;
  },
  {
    connection: redis,
    concurrency: 30,
    limiter: {
      max: 60,
      duration: 60000, // 60 per minute
    },
  }
);

// ============================================================================
// Status Check via Oblio
// ============================================================================

interface OblioStatusResponse {
  status: EfacturaStatus;
  id_solicitare?: string;
  detalii?: string;
  data_creare?: string;
  tip?: string;
  id?: string;
  mesaj_eroare?: string;
  erori_validare?: Array<{
    cod: string;
    mesaj: string;
    locatie?: string;
  }>;
}

async function checkEfacturaStatusViaOblio(
  client: OblioClient,
  indexIncarcare: string
): Promise<OblioStatusResponse> {
  try {
    const response = await client.getEfacturaStatus(indexIncarcare);
    
    // Map Oblio response to our status
    let status: EfacturaStatus;
    
    if (response.stare === 'ok' || response.status === 'ok') {
      status = EfacturaStatus.OK;
    } else if (response.stare === 'nok' || response.status === 'nok') {
      status = EfacturaStatus.NOK;
    } else if (response.stare === 'eroare_validare' || response.erori) {
      status = EfacturaStatus.EROARE_VALIDARE;
    } else {
      status = EfacturaStatus.IN_PRELUCRARE;
    }
    
    return {
      status,
      id_solicitare: response.id_solicitare || response.index_incarcare,
      detalii: response.detalii || response.mesaj,
      data_creare: response.data_creare,
      tip: response.tip,
      id: response.id,
      mesaj_eroare: response.mesaj_eroare || response.eroare,
      erori_validare: response.erori_validare || response.erori,
    };
  } catch (error) {
    logger.error('Failed to check e-Factura status via Oblio', {
      indexIncarcare,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Return processing status to retry later
    return {
      status: EfacturaStatus.IN_PRELUCRARE,
      mesaj_eroare: error instanceof Error ? error.message : 'Status check failed',
    };
  }
}

// ============================================================================
// Status Handlers
// ============================================================================

/**
 * Handle accepted e-Factura
 */
async function handleAcceptedStatus(
  data: EfacturaStatusCheckJobData,
  submission: typeof efacturaSubmissions.$inferSelect,
  statusResponse: OblioStatusResponse,
  oblioClient: OblioClient
): Promise<EfacturaStatusCheckResult> {
  logger.info('E-Factura accepted by ANAF', {
    invoiceId: data.invoiceId,
    indexIncarcare: data.indexIncarcare,
  });
  
  // Download ANAF PDF (official stamped version)
  let pdfStoragePath: string | undefined;
  let pdfDownloaded = false;
  
  try {
    const pdfBuffer = await oblioClient.getEfacturaPdf(data.indexIncarcare);
    
    if (pdfBuffer && pdfBuffer.length > 0) {
      const storagePath = `tenants/${data.tenantId}/efactura/pdf/${data.invoiceId}-anaf.pdf`;
      pdfStoragePath = await uploadToStorage(pdfBuffer, storagePath, 'application/pdf');
      pdfDownloaded = true;
      
      logger.info('ANAF PDF downloaded and stored', {
        invoiceId: data.invoiceId,
        storagePath: pdfStoragePath,
      });
    }
  } catch (error) {
    logger.warn('Failed to download ANAF PDF', {
      invoiceId: data.invoiceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't fail the job, PDF download is secondary
  }
  
  // Calculate total processing time
  const submissionTime = new Date(submission.submittedAt).getTime();
  const totalProcessingTimeMs = Date.now() - submissionTime;
  
  // Update submission record
  await db.update(efacturaSubmissions)
    .set({
      status: 'ok',
      anafStatus: EfacturaStatus.OK,
      anafResponse: statusResponse,
      anafPdfPath: pdfStoragePath,
      processedAt: new Date(),
      processingTimeMs: totalProcessingTimeMs,
      updatedAt: new Date(),
    })
    .where(eq(efacturaSubmissions.id, submission.id));
  
  // Update invoice
  await db.update(invoices)
    .set({
      efacturaStatus: 'ok',
      efacturaAcceptedAt: new Date(),
      anafPdfPath: pdfStoragePath,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, data.invoiceId));
  
  // Update negotiation state to EINVOICE_SENT
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, data.invoiceId),
    columns: { negotiationId: true },
  });
  
  if (invoice?.negotiationId) {
    await db.update(negotiations)
      .set({
        currentState: 'EINVOICE_SENT',
        stateUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(negotiations.id, invoice.negotiationId));
  }
  
  // Metrics
  metrics.increment('efacturaAccepted', { tenantId: data.tenantId });
  metrics.histogram('efacturaProcessingTime', totalProcessingTimeMs, {
    tenantId: data.tenantId,
  });
  
  return {
    submissionId: submission.id,
    invoiceId: data.invoiceId,
    indexIncarcare: data.indexIncarcare,
    status: EfacturaStatus.OK,
    isFinal: true,
    anafResponse: {
      id_solicitare: statusResponse.id_solicitare,
      detalii: statusResponse.detalii,
      data_creare: statusResponse.data_creare,
      tip: statusResponse.tip,
      id: statusResponse.id,
    },
    pdfDownloaded,
    pdfStoragePath,
    checkCount: data.checkCount + 1,
    totalProcessingTimeMs,
  };
}

/**
 * Handle rejected e-Factura
 */
async function handleRejectedStatus(
  data: EfacturaStatusCheckJobData,
  submission: typeof efacturaSubmissions.$inferSelect,
  statusResponse: OblioStatusResponse
): Promise<EfacturaStatusCheckResult> {
  logger.warn('E-Factura rejected by ANAF', {
    invoiceId: data.invoiceId,
    indexIncarcare: data.indexIncarcare,
    errors: statusResponse.erori_validare,
    message: statusResponse.mesaj_eroare,
  });
  
  // Parse validation errors
  const validationErrors = statusResponse.erori_validare?.map(e => ({
    code: e.cod,
    message: e.mesaj,
    location: e.locatie,
  })) || [];
  
  const rejectionReasons = [
    statusResponse.mesaj_eroare,
    ...validationErrors.map(e => `${e.code}: ${e.message}`),
  ].filter(Boolean) as string[];
  
  // Update submission record
  await db.update(efacturaSubmissions)
    .set({
      status: 'nok',
      anafStatus: statusResponse.status,
      anafResponse: statusResponse,
      rejectionReasons,
      validationErrors,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(efacturaSubmissions.id, submission.id));
  
  // Update invoice
  await db.update(invoices)
    .set({
      efacturaStatus: 'nok',
      efacturaRejectedAt: new Date(),
      efacturaErrors: validationErrors,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, data.invoiceId));
  
  // Create HITL request for human intervention
  await createHitlRequestForRejection(data, rejectionReasons, validationErrors);
  
  // Metrics
  metrics.increment('efacturaRejected', { tenantId: data.tenantId });
  
  return {
    submissionId: submission.id,
    invoiceId: data.invoiceId,
    indexIncarcare: data.indexIncarcare,
    status: statusResponse.status,
    isFinal: true,
    anafResponse: {
      id_solicitare: statusResponse.id_solicitare,
      detalii: statusResponse.detalii,
    },
    rejectionReasons,
    validationErrors,
    checkCount: data.checkCount + 1,
  };
}

/**
 * Handle still processing status
 */
async function handleProcessingStatus(
  data: EfacturaStatusCheckJobData,
  submission: typeof efacturaSubmissions.$inferSelect,
  statusResponse: OblioStatusResponse
): Promise<EfacturaStatusCheckResult> {
  const newCheckCount = data.checkCount + 1;
  
  // Check if max checks exceeded
  if (newCheckCount >= data.maxChecks) {
    logger.error('E-Factura max checks exceeded', {
      invoiceId: data.invoiceId,
      indexIncarcare: data.indexIncarcare,
      checkCount: newCheckCount,
    });
    
    // Mark as stuck and create HITL
    await db.update(efacturaSubmissions)
      .set({
        status: 'stuck',
        anafStatus: 'timeout',
        notes: `Processing timeout after ${newCheckCount} checks`,
        updatedAt: new Date(),
      })
      .where(eq(efacturaSubmissions.id, submission.id));
    
    await createHitlRequestForTimeout(data, newCheckCount);
    
    metrics.increment('efacturaTimeout', { tenantId: data.tenantId });
    
    return {
      submissionId: submission.id,
      invoiceId: data.invoiceId,
      indexIncarcare: data.indexIncarcare,
      status: EfacturaStatus.IN_PRELUCRARE,
      isFinal: true, // Treating as final due to timeout
      checkCount: newCheckCount,
    };
  }
  
  // Schedule next check
  const nextCheckAt = new Date(Date.now() + CHECK_INTERVAL_MS);
  
  await efacturaStatusCheckQueue.add(
    `status-check-${data.invoiceId}-${newCheckCount}`,
    {
      ...data,
      checkCount: newCheckCount,
      scheduledCheckAt: nextCheckAt.toISOString(),
    },
    {
      delay: CHECK_INTERVAL_MS,
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
  
  logger.info('Scheduled next e-Factura status check', {
    invoiceId: data.invoiceId,
    nextCheckAt: nextCheckAt.toISOString(),
    checkCount: newCheckCount,
  });
  
  // Update submission with last check time
  await db.update(efacturaSubmissions)
    .set({
      lastCheckAt: new Date(),
      checkCount: newCheckCount,
      nextCheckAt,
      updatedAt: new Date(),
    })
    .where(eq(efacturaSubmissions.id, submission.id));
  
  return {
    submissionId: submission.id,
    invoiceId: data.invoiceId,
    indexIncarcare: data.indexIncarcare,
    status: EfacturaStatus.IN_PRELUCRARE,
    isFinal: false,
    nextCheckScheduled: true,
    nextCheckAt: nextCheckAt.toISOString(),
    checkCount: newCheckCount,
  };
}

// ============================================================================
// HITL Request Creation
// ============================================================================

async function createHitlRequestForRejection(
  data: EfacturaStatusCheckJobData,
  rejectionReasons: string[],
  validationErrors: Array<{ code: string; message: string; location?: string }>
): Promise<void> {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, data.invoiceId),
    with: {
      negotiation: {
        columns: { contactId: true },
      },
    },
  });
  
  await hitlQueue.add(
    `efactura-rejected-${data.invoiceId}`,
    {
      tenantId: data.tenantId,
      type: 'efactura_rejected',
      priority: 'high',
      entityType: 'invoice',
      entityId: data.invoiceId,
      title: `E-Factura Respinsă: ${data.indexIncarcare}`,
      description: `Factura a fost respinsă de ANAF. Motive: ${rejectionReasons.join('; ')}`,
      context: {
        invoiceId: data.invoiceId,
        indexIncarcare: data.indexIncarcare,
        contactId: invoice?.negotiation?.contactId,
        rejectionReasons,
        validationErrors,
      },
      actions: [
        {
          id: 'fix_and_resubmit',
          label: 'Corectează și Retrimite',
          type: 'action',
          requiresInput: true,
        },
        {
          id: 'cancel_invoice',
          label: 'Anulează Factura',
          type: 'destructive',
          requiresConfirmation: true,
        },
        {
          id: 'contact_support',
          label: 'Contactează Support ANAF',
          type: 'info',
        },
      ],
      slaHours: 4, // Must be resolved quickly due to 5-day deadline
    },
    {
      priority: 2,
      removeOnComplete: true,
    }
  );
  
  logger.info('Created HITL request for rejected e-Factura', {
    invoiceId: data.invoiceId,
    indexIncarcare: data.indexIncarcare,
  });
}

async function createHitlRequestForTimeout(
  data: EfacturaStatusCheckJobData,
  checkCount: number
): Promise<void> {
  await hitlQueue.add(
    `efactura-timeout-${data.invoiceId}`,
    {
      tenantId: data.tenantId,
      type: 'efactura_timeout',
      priority: 'high',
      entityType: 'invoice',
      entityId: data.invoiceId,
      title: `E-Factura Timeout: ${data.indexIncarcare}`,
      description: `Procesarea e-Factura a depășit timpul maxim (${checkCount} verificări). Verificați manual pe ANAF SPV.`,
      context: {
        invoiceId: data.invoiceId,
        indexIncarcare: data.indexIncarcare,
        checkCount,
        maxChecks: data.maxChecks,
      },
      actions: [
        {
          id: 'check_anaf_manual',
          label: 'Verifică Manual pe ANAF',
          type: 'info',
          url: `https://www.anaf.ro/CompanieiOnline/rest/efactura/vizualizare/${data.indexIncarcare}`,
        },
        {
          id: 'retry_submission',
          label: 'Retrimite Factura',
          type: 'action',
        },
        {
          id: 'mark_resolved',
          label: 'Marchează Rezolvat',
          type: 'success',
          requiresInput: true,
        },
      ],
      slaHours: 2,
    },
    {
      priority: 1,
      removeOnComplete: true,
    }
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getOblioClient(tenantId: string): Promise<OblioClient> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: {
      oblioApiKey: true,
      oblioApiSecret: true,
      oblioCompanyCif: true,
    },
  });
  
  if (!tenant?.oblioApiKey || !tenant?.oblioApiSecret) {
    throw new Error('Oblio credentials not configured for tenant');
  }
  
  return new OblioClient({
    apiKey: tenant.oblioApiKey,
    apiSecret: tenant.oblioApiSecret,
    companyCif: tenant.oblioCompanyCif,
  });
}

async function uploadToStorage(data: Buffer, path: string, contentType: string): Promise<string> {
  const s3 = new S3Client({
    region: process.env.S3_REGION || 'eu-central-1',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: path,
    Body: data,
    ContentType: contentType,
  }));
  
  return `${process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${path}`;
}

async function recordStatusCheck(
  data: EfacturaStatusCheckJobData,
  statusResponse: OblioStatusResponse,
  result: EfacturaStatusCheckResult
): Promise<void> {
  await db.insert(efacturaStatusChecks).values({
    tenantId: data.tenantId,
    submissionId: data.efacturaSubmissionId,
    invoiceId: data.invoiceId,
    indexIncarcare: data.indexIncarcare,
    checkNumber: data.checkCount + 1,
    status: statusResponse.status,
    isFinal: result.isFinal,
    rawResponse: statusResponse,
    checkedAt: new Date(),
  });
}

// ============================================================================
// Event Handlers
// ============================================================================

efacturaStatusCheckWorker.on('completed', (job, result) => {
  logger.info('E-Factura status check completed', {
    jobId: job.id,
    invoiceId: job.data.invoiceId,
    status: result.status,
    isFinal: result.isFinal,
    checkCount: result.checkCount,
  });
});

efacturaStatusCheckWorker.on('failed', (job, error) => {
  logger.error('E-Factura status check failed', {
    jobId: job?.id,
    invoiceId: job?.data.invoiceId,
    error: error.message,
  });
  
  metrics.increment('efacturaStatusCheckError', {
    tenantId: job?.data.tenantId,
  });
});
```

---

## 3. Worker #25: efactura:deadline:monitor - Deadline Monitoring

### 3.1 Overview

Acest worker monitorizează termenul legal de 5 zile calendaristice pentru trimiterea e-Facturilor la ANAF. Generează alerte la ziua 4 și escalări critice la ziua 5 pentru facturile care nu au fost încă trimise sau acceptate.

### 3.2 Job Interface

```typescript
// ============================================================================
// E-Factura Deadline Monitor - Job Data & Result
// ============================================================================

import { z } from 'zod';

/**
 * Deadline status types
 */
export enum DeadlineStatus {
  ON_TIME = 'on_time',           // More than 2 days remaining
  WARNING = 'warning',           // 1-2 days remaining (Day 4)
  CRITICAL = 'critical',         // Less than 1 day (Day 5)
  OVERDUE = 'overdue',           // Past deadline
  COMPLETED = 'completed',       // Successfully sent before deadline
}

/**
 * Job data for deadline monitor
 * This runs as a scheduled job (cron) checking all pending invoices
 */
export const efacturaDeadlineMonitorJobSchema = z.object({
  tenantId: z.string().uuid().optional(), // If set, only check this tenant
  batchSize: z.number().int().min(1).max(1000).default(100),
  dryRun: z.boolean().default(false),
});

export type EfacturaDeadlineMonitorJobData = z.infer<typeof efacturaDeadlineMonitorJobSchema>;

/**
 * Individual invoice deadline check result
 */
export interface InvoiceDeadlineCheck {
  invoiceId: string;
  tenantId: string;
  invoiceNumber: string;
  invoiceDate: string;
  deadlineDate: string;
  daysRemaining: number;
  hoursRemaining: number;
  status: DeadlineStatus;
  efacturaStatus: string | null;
  actionTaken?: string;
}

/**
 * Overall monitor result
 */
export interface EfacturaDeadlineMonitorResult {
  runAt: string;
  tenantId?: string;
  
  // Counts
  totalChecked: number;
  onTime: number;
  warnings: number;
  criticals: number;
  overdues: number;
  completed: number;
  
  // Details
  warningInvoices: InvoiceDeadlineCheck[];
  criticalInvoices: InvoiceDeadlineCheck[];
  overdueInvoices: InvoiceDeadlineCheck[];
  
  // Actions taken
  alertsSent: number;
  autoSubmissions: number;
  hitlCreated: number;
  
  // Performance
  durationMs: number;
}
```

### 3.3 Worker Implementation

```typescript
// ============================================================================
// E-Factura Deadline Monitor Worker Implementation
// ============================================================================

import { Worker, Queue, Job } from 'bullmq';
import { eq, and, lt, isNull, or, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  invoices,
  efacturaSubmissions,
  tenants,
  negotiations,
  hitlApprovalRequests,
  notifications,
} from '@/db/schema';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';
import { redis } from '@/lib/redis';
import {
  EfacturaDeadlineMonitorJobData,
  EfacturaDeadlineMonitorResult,
  InvoiceDeadlineCheck,
  DeadlineStatus,
  efacturaDeadlineMonitorJobSchema,
} from './types';

// Queue references
const efacturaSendQueue = new Queue('efactura:send', { connection: redis });
const hitlQueue = new Queue('hitl:approval:request', { connection: redis });
const notificationQueue = new Queue('notification:send', { connection: redis });

// Constants
const DEADLINE_DAYS = 5;
const WARNING_THRESHOLD_DAYS = 2;
const CRITICAL_THRESHOLD_DAYS = 1;

/**
 * E-Factura Deadline Monitor Worker
 * Scheduled job that checks for approaching deadlines
 */
export const efacturaDeadlineMonitorWorker = new Worker<
  EfacturaDeadlineMonitorJobData,
  EfacturaDeadlineMonitorResult
>(
  'efactura:deadline:monitor',
  async (job: Job<EfacturaDeadlineMonitorJobData>): Promise<EfacturaDeadlineMonitorResult> => {
    const startTime = Date.now();
    const data = efacturaDeadlineMonitorJobSchema.parse(job.data);
    
    logger.info('Starting e-Factura deadline monitor', {
      jobId: job.id,
      tenantId: data.tenantId,
      batchSize: data.batchSize,
      dryRun: data.dryRun,
    });
    
    const result: EfacturaDeadlineMonitorResult = {
      runAt: new Date().toISOString(),
      tenantId: data.tenantId,
      totalChecked: 0,
      onTime: 0,
      warnings: 0,
      criticals: 0,
      overdues: 0,
      completed: 0,
      warningInvoices: [],
      criticalInvoices: [],
      overdueInvoices: [],
      alertsSent: 0,
      autoSubmissions: 0,
      hitlCreated: 0,
      durationMs: 0,
    };
    
    // Get pending invoices (not yet sent to e-Factura or still processing)
    const pendingInvoices = await getPendingInvoices(data);
    
    result.totalChecked = pendingInvoices.length;
    
    // Process each invoice
    for (const invoice of pendingInvoices) {
      const check = calculateDeadlineStatus(invoice);
      
      switch (check.status) {
        case DeadlineStatus.COMPLETED:
          result.completed++;
          break;
          
        case DeadlineStatus.ON_TIME:
          result.onTime++;
          break;
          
        case DeadlineStatus.WARNING:
          result.warnings++;
          result.warningInvoices.push(check);
          if (!data.dryRun) {
            await handleWarningDeadline(check);
            result.alertsSent++;
          }
          break;
          
        case DeadlineStatus.CRITICAL:
          result.criticals++;
          result.criticalInvoices.push(check);
          if (!data.dryRun) {
            const autoSubmitted = await handleCriticalDeadline(check);
            if (autoSubmitted) {
              result.autoSubmissions++;
            } else {
              result.hitlCreated++;
            }
            result.alertsSent++;
          }
          break;
          
        case DeadlineStatus.OVERDUE:
          result.overdues++;
          result.overdueInvoices.push(check);
          if (!data.dryRun) {
            await handleOverdueDeadline(check);
            result.hitlCreated++;
            result.alertsSent++;
          }
          break;
      }
    }
    
    result.durationMs = Date.now() - startTime;
    
    // Log summary
    logger.info('E-Factura deadline monitor completed', {
      jobId: job.id,
      totalChecked: result.totalChecked,
      warnings: result.warnings,
      criticals: result.criticals,
      overdues: result.overdues,
      durationMs: result.durationMs,
    });
    
    // Record metrics
    recordMetrics(result);
    
    return result;
  },
  {
    connection: redis,
    concurrency: 1, // Single instance
  }
);

// ============================================================================
// Data Retrieval
// ============================================================================

interface PendingInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  efacturaStatus: string | null;
  negotiationId: string | null;
  contactId: string | null;
  contactName: string | null;
  totalAmount: number;
}

async function getPendingInvoices(
  data: EfacturaDeadlineMonitorJobData
): Promise<PendingInvoice[]> {
  // Calculate date range - only check invoices from last 10 days
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  
  const conditions = [
    // Invoice date within monitoring window
    sql`${invoices.invoiceDate} >= ${tenDaysAgo}`,
    // Not yet accepted by ANAF
    or(
      isNull(invoices.efacturaStatus),
      inArray(invoices.efacturaStatus, ['pending', 'nok', 'in_prelucrare'])
    ),
    // Not cancelled
    eq(invoices.isCancelled, false),
  ];
  
  // Filter by tenant if specified
  if (data.tenantId) {
    conditions.push(eq(invoices.tenantId, data.tenantId));
  }
  
  const results = await db.query.invoices.findMany({
    where: and(...conditions),
    limit: data.batchSize,
    columns: {
      id: true,
      tenantId: true,
      invoiceNumber: true,
      invoiceDate: true,
      efacturaStatus: true,
      negotiationId: true,
      totalGross: true,
    },
    with: {
      negotiation: {
        columns: { contactId: true },
        with: {
          contact: {
            columns: { companyName: true },
          },
        },
      },
    },
    orderBy: (invoices, { asc }) => [asc(invoices.invoiceDate)],
  });
  
  return results.map(inv => ({
    id: inv.id,
    tenantId: inv.tenantId,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    efacturaStatus: inv.efacturaStatus,
    negotiationId: inv.negotiationId,
    contactId: inv.negotiation?.contactId || null,
    contactName: inv.negotiation?.contact?.companyName || null,
    totalAmount: Number(inv.totalGross),
  }));
}

// ============================================================================
// Deadline Calculation
// ============================================================================

function calculateDeadlineStatus(invoice: PendingInvoice): InvoiceDeadlineCheck {
  const now = new Date();
  const invoiceDate = new Date(invoice.invoiceDate);
  
  // Deadline is 5 calendar days after invoice date
  const deadlineDate = new Date(invoiceDate);
  deadlineDate.setDate(deadlineDate.getDate() + DEADLINE_DAYS);
  deadlineDate.setHours(23, 59, 59, 999);
  
  // Calculate time remaining
  const msRemaining = deadlineDate.getTime() - now.getTime();
  const hoursRemaining = msRemaining / (1000 * 60 * 60);
  const daysRemaining = hoursRemaining / 24;
  
  // Determine status
  let status: DeadlineStatus;
  
  if (invoice.efacturaStatus === 'ok') {
    status = DeadlineStatus.COMPLETED;
  } else if (daysRemaining < 0) {
    status = DeadlineStatus.OVERDUE;
  } else if (daysRemaining < CRITICAL_THRESHOLD_DAYS) {
    status = DeadlineStatus.CRITICAL;
  } else if (daysRemaining < WARNING_THRESHOLD_DAYS) {
    status = DeadlineStatus.WARNING;
  } else {
    status = DeadlineStatus.ON_TIME;
  }
  
  return {
    invoiceId: invoice.id,
    tenantId: invoice.tenantId,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoiceDate.toISOString(),
    deadlineDate: deadlineDate.toISOString(),
    daysRemaining: Math.floor(daysRemaining),
    hoursRemaining: Math.floor(hoursRemaining),
    status,
    efacturaStatus: invoice.efacturaStatus,
  };
}

// ============================================================================
// Deadline Handlers
// ============================================================================

/**
 * Handle warning deadline (Day 4 - 1-2 days remaining)
 */
async function handleWarningDeadline(check: InvoiceDeadlineCheck): Promise<void> {
  logger.warn('E-Factura deadline warning', {
    invoiceId: check.invoiceId,
    invoiceNumber: check.invoiceNumber,
    hoursRemaining: check.hoursRemaining,
  });
  
  // Send notification to tenant admins
  await notificationQueue.add(
    `deadline-warning-${check.invoiceId}`,
    {
      tenantId: check.tenantId,
      type: 'efactura_deadline_warning',
      severity: 'warning',
      title: `⚠️ Termen e-Factura: ${check.invoiceNumber}`,
      message: `Factura ${check.invoiceNumber} trebuie trimisă la ANAF în ${check.hoursRemaining} ore.`,
      context: {
        invoiceId: check.invoiceId,
        invoiceNumber: check.invoiceNumber,
        deadlineDate: check.deadlineDate,
        hoursRemaining: check.hoursRemaining,
      },
      channels: ['email', 'in_app'],
      recipients: { role: 'admin' },
    },
    {
      removeOnComplete: true,
    }
  );
  
  // If not yet submitted, attempt auto-submission
  if (!check.efacturaStatus || check.efacturaStatus === 'nok') {
    await attemptAutoSubmission(check, 'warning');
  }
  
  // Record alert
  await recordDeadlineAlert(check, 'warning');
}

/**
 * Handle critical deadline (Day 5 - less than 1 day remaining)
 * Attempts automatic submission if possible
 */
async function handleCriticalDeadline(check: InvoiceDeadlineCheck): Promise<boolean> {
  logger.error('E-Factura deadline CRITICAL', {
    invoiceId: check.invoiceId,
    invoiceNumber: check.invoiceNumber,
    hoursRemaining: check.hoursRemaining,
  });
  
  // Send urgent notification
  await notificationQueue.add(
    `deadline-critical-${check.invoiceId}`,
    {
      tenantId: check.tenantId,
      type: 'efactura_deadline_critical',
      severity: 'critical',
      title: `🚨 URGENT: Termen e-Factura ${check.invoiceNumber}`,
      message: `ATENȚIE! Factura ${check.invoiceNumber} trebuie trimisă ASTĂZI la ANAF! Mai aveți ${check.hoursRemaining} ore.`,
      context: {
        invoiceId: check.invoiceId,
        invoiceNumber: check.invoiceNumber,
        deadlineDate: check.deadlineDate,
        hoursRemaining: check.hoursRemaining,
      },
      channels: ['email', 'sms', 'in_app', 'push'],
      recipients: { role: 'admin' },
      urgent: true,
    },
    {
      priority: 1,
      removeOnComplete: true,
    }
  );
  
  // Attempt automatic submission
  if (!check.efacturaStatus || check.efacturaStatus === 'nok') {
    const submitted = await attemptAutoSubmission(check, 'critical');
    
    if (submitted) {
      await recordDeadlineAlert(check, 'critical_auto_submit');
      return true;
    }
  }
  
  // If auto-submit failed or not applicable, create HITL
  await createDeadlineHitl(check, 'critical');
  await recordDeadlineAlert(check, 'critical_hitl');
  
  return false;
}

/**
 * Handle overdue deadline (past 5 days)
 */
async function handleOverdueDeadline(check: InvoiceDeadlineCheck): Promise<void> {
  logger.error('E-Factura deadline OVERDUE', {
    invoiceId: check.invoiceId,
    invoiceNumber: check.invoiceNumber,
    daysOverdue: Math.abs(check.daysRemaining),
  });
  
  // Send overdue notification
  await notificationQueue.add(
    `deadline-overdue-${check.invoiceId}`,
    {
      tenantId: check.tenantId,
      type: 'efactura_deadline_overdue',
      severity: 'critical',
      title: `❌ DEPĂȘIT: Termen e-Factura ${check.invoiceNumber}`,
      message: `Termenul pentru factura ${check.invoiceNumber} a fost depășit cu ${Math.abs(check.daysRemaining)} zile! Riscați amendă până la 5.000 RON.`,
      context: {
        invoiceId: check.invoiceId,
        invoiceNumber: check.invoiceNumber,
        deadlineDate: check.deadlineDate,
        daysOverdue: Math.abs(check.daysRemaining),
        potentialPenalty: '5.000 RON',
      },
      channels: ['email', 'sms', 'in_app', 'push'],
      recipients: { role: 'admin' },
      urgent: true,
    },
    {
      priority: 1,
      removeOnComplete: true,
    }
  );
  
  // Create urgent HITL
  await createDeadlineHitl(check, 'overdue');
  
  // Still attempt submission (better late than never)
  if (!check.efacturaStatus || check.efacturaStatus === 'nok') {
    await attemptAutoSubmission(check, 'overdue');
  }
  
  await recordDeadlineAlert(check, 'overdue');
  
  // Update invoice with overdue flag
  await db.update(invoices)
    .set({
      efacturaOverdue: true,
      efacturaOverdueDays: Math.abs(check.daysRemaining),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, check.invoiceId));
}

// ============================================================================
// Auto Submission
// ============================================================================

async function attemptAutoSubmission(
  check: InvoiceDeadlineCheck,
  trigger: string
): Promise<boolean> {
  try {
    // Check if there's no pending submission
    const existingSubmission = await db.query.efacturaSubmissions.findFirst({
      where: and(
        eq(efacturaSubmissions.invoiceId, check.invoiceId),
        inArray(efacturaSubmissions.status, ['pending', 'in_prelucrare'])
      ),
    });
    
    if (existingSubmission) {
      logger.info('Auto-submission skipped - existing submission in progress', {
        invoiceId: check.invoiceId,
        existingSubmissionId: existingSubmission.id,
      });
      return false;
    }
    
    // Queue e-Factura submission with high priority
    await efacturaSendQueue.add(
      `auto-submit-${check.invoiceId}`,
      {
        tenantId: check.tenantId,
        invoiceId: check.invoiceId,
        source: 'deadline_monitor',
        trigger,
        priority: 'urgent',
      },
      {
        priority: 1,
        removeOnComplete: true,
      }
    );
    
    logger.info('Auto-submission triggered by deadline monitor', {
      invoiceId: check.invoiceId,
      invoiceNumber: check.invoiceNumber,
      trigger,
    });
    
    return true;
  } catch (error) {
    logger.error('Auto-submission failed', {
      invoiceId: check.invoiceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

// ============================================================================
// HITL Creation
// ============================================================================

async function createDeadlineHitl(
  check: InvoiceDeadlineCheck,
  severity: 'critical' | 'overdue'
): Promise<void> {
  const isOverdue = severity === 'overdue';
  
  await hitlQueue.add(
    `efactura-deadline-${check.invoiceId}`,
    {
      tenantId: check.tenantId,
      type: isOverdue ? 'efactura_overdue' : 'efactura_deadline_critical',
      priority: 'urgent',
      entityType: 'invoice',
      entityId: check.invoiceId,
      title: isOverdue 
        ? `❌ E-Factura DEPĂȘITĂ: ${check.invoiceNumber}`
        : `🚨 E-Factura URGENT: ${check.invoiceNumber}`,
      description: isOverdue
        ? `Termenul legal a fost depășit cu ${Math.abs(check.daysRemaining)} zile. Riscați amendă!`
        : `Mai aveți doar ${check.hoursRemaining} ore pentru trimitere!`,
      context: {
        invoiceId: check.invoiceId,
        invoiceNumber: check.invoiceNumber,
        invoiceDate: check.invoiceDate,
        deadlineDate: check.deadlineDate,
        hoursRemaining: check.hoursRemaining,
        daysOverdue: isOverdue ? Math.abs(check.daysRemaining) : undefined,
        efacturaStatus: check.efacturaStatus,
        potentialPenalty: isOverdue ? '5.000 RON' : undefined,
      },
      actions: [
        {
          id: 'submit_now',
          label: 'Trimite Acum',
          type: 'action',
          primary: true,
        },
        {
          id: 'view_invoice',
          label: 'Vizualizează Factura',
          type: 'info',
        },
        {
          id: 'contact_accountant',
          label: 'Contactează Contabil',
          type: 'info',
        },
        {
          id: 'mark_exception',
          label: 'Marchează Excepție',
          type: 'warning',
          requiresInput: true,
        },
      ],
      slaHours: isOverdue ? 1 : 4,
    },
    {
      priority: 1,
      removeOnComplete: true,
    }
  );
}

// ============================================================================
// Alert Recording
// ============================================================================

async function recordDeadlineAlert(
  check: InvoiceDeadlineCheck,
  alertType: string
): Promise<void> {
  await db.insert(efacturaDeadlineAlerts).values({
    tenantId: check.tenantId,
    invoiceId: check.invoiceId,
    alertType,
    deadlineStatus: check.status,
    hoursRemaining: check.hoursRemaining,
    daysRemaining: check.daysRemaining,
    alertedAt: new Date(),
  });
}

// ============================================================================
// Metrics
// ============================================================================

function recordMetrics(result: EfacturaDeadlineMonitorResult): void {
  metrics.gauge('efacturaDeadlineOnTime', result.onTime, {
    tenantId: result.tenantId || 'all',
  });
  
  metrics.gauge('efacturaDeadlineWarnings', result.warnings, {
    tenantId: result.tenantId || 'all',
  });
  
  metrics.gauge('efacturaDeadlineCriticals', result.criticals, {
    tenantId: result.tenantId || 'all',
  });
  
  metrics.gauge('efacturaDeadlineOverdues', result.overdues, {
    tenantId: result.tenantId || 'all',
  });
  
  metrics.histogram('efacturaDeadlineMonitorDuration', result.durationMs);
  
  if (result.overdues > 0) {
    metrics.increment('efacturaDeadlineViolations', {
      tenantId: result.tenantId || 'all',
      count: result.overdues,
    });
  }
}

// ============================================================================
// Cron Scheduler
// ============================================================================

/**
 * Schedule deadline monitor to run every hour during business hours
 * and every 2 hours outside business hours
 */
export async function scheduleDeadlineMonitor(): Promise<void> {
  const schedulerQueue = new Queue('scheduler', { connection: redis });
  
  // Every hour from 6 AM to 10 PM (Romanian business hours)
  await schedulerQueue.add(
    'efactura-deadline-monitor-business',
    {},
    {
      repeat: {
        pattern: '0 6-22 * * *', // Every hour 6AM-10PM
        tz: 'Europe/Bucharest',
      },
      jobId: 'efactura-deadline-monitor-business',
    }
  );
  
  // Every 2 hours outside business hours
  await schedulerQueue.add(
    'efactura-deadline-monitor-offhours',
    {},
    {
      repeat: {
        pattern: '0 0,2,4 * * *', // Midnight, 2AM, 4AM
        tz: 'Europe/Bucharest',
      },
      jobId: 'efactura-deadline-monitor-offhours',
    }
  );
  
  logger.info('E-Factura deadline monitor scheduled');
}

// ============================================================================
// Event Handlers
// ============================================================================

efacturaDeadlineMonitorWorker.on('completed', (job, result) => {
  logger.info('Deadline monitor run completed', {
    jobId: job.id,
    totalChecked: result.totalChecked,
    warnings: result.warnings,
    criticals: result.criticals,
    overdues: result.overdues,
    durationMs: result.durationMs,
  });
});

efacturaDeadlineMonitorWorker.on('failed', (job, error) => {
  logger.error('Deadline monitor failed', {
    jobId: job?.id,
    error: error.message,
  });
  
  metrics.increment('efacturaDeadlineMonitorError');
});
```

---

## 4. ANAF SPV Integration Details

### 4.1 Overview

ANAF SPV (Spațiul Privat Virtual) este platforma oficială a statului român pentru schimbul electronic de documente fiscale. Sistemul e-Factura este obligatoriu pentru toate tranzacțiile B2B din România începând cu Ianuarie 2024.

### 4.2 Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         E-FACTURA INTEGRATION FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Cerniq    │    │   Oblio.eu  │    │  ANAF SPV   │    │   Client    │  │
│  │   App       │    │   Platform  │    │   Portal    │    │   Company   │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                  │                  │                  │         │
│         │  1. Create       │                  │                  │         │
│         │     Invoice      │                  │                  │         │
│         ├────────────────►│                  │                  │         │
│         │                  │                  │                  │         │
│         │  2. Get UBL XML  │                  │                  │         │
│         ├────────────────►│                  │                  │         │
│         │◄────────────────┤                  │                  │         │
│         │                  │                  │                  │         │
│         │  3. Submit       │  4. Forward      │                  │         │
│         │     e-Factura    │     to ANAF      │                  │         │
│         ├────────────────►│────────────────►│                  │         │
│         │                  │                  │                  │         │
│         │                  │  5. Return       │                  │         │
│         │  6. indexIncarcare│     index       │                  │         │
│         │◄────────────────┤◄────────────────┤                  │         │
│         │                  │                  │                  │         │
│         │  7. Poll Status  │  8. Check Status │                  │         │
│         ├────────────────►│────────────────►│                  │         │
│         │                  │                  │                  │         │
│         │                  │  9. Processing/  │                  │         │
│         │  10. Status      │     OK/NOK       │                  │         │
│         │◄────────────────┤◄────────────────┤                  │         │
│         │                  │                  │                  │         │
│         │                  │                  │  11. Access      │         │
│         │                  │                  │      Invoice     │         │
│         │                  │                  │◄────────────────┤         │
│         │                  │                  ├────────────────►│         │
│         │                  │                  │  12. Download    │         │
│         │                  │                  │                  │         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Why Oblio as Intermediary

Integrarea directă cu ANAF SPV necesită:
1. **Certificat digital calificat** - obținut de la un furnizor acreditat
2. **OAuth2 cu certificat** - autentificare complexă cu certificat SSL client
3. **Semnătură electronică** - fiecare document trebuie semnat electronic
4. **Gestionare complexă** - refresh tokens, certificate expiration, etc.

**Avantaje Oblio:**
- Gestionează automat certificatele și autentificarea
- Generează UBL XML conform EN 16931
- Simplifică API-ul la REST simplu cu API key
- Oferă suport și documentație în limba română
- Cost redus (inclus în abonamentul Oblio)

### 4.4 ANAF e-Factura Requirements

```typescript
// ============================================================================
// ANAF E-Factura Requirements
// ============================================================================

/**
 * Legal requirements for e-Factura in Romania
 */
export const EFACTURA_REQUIREMENTS = {
  // Mandatory since January 1, 2024
  mandatory: true,
  mandatoryDate: '2024-01-01',
  
  // Applies to
  applicableTo: {
    B2B: true,      // Business to Business - MANDATORY
    B2C: false,     // Business to Consumer - optional
    B2G: true,      // Business to Government - MANDATORY
  },
  
  // Deadline
  submissionDeadline: {
    days: 5,        // Calendar days from invoice date
    basis: 'invoice_date', // Not delivery date
  },
  
  // Penalties
  penalties: {
    perInvoice: {
      min: 1000,    // RON
      max: 5000,    // RON
    },
    perCompany: {
      min: 5000,    // RON for repeated violations
      max: 10000,   // RON
    },
  },
  
  // Format
  format: {
    standard: 'UBL 2.1',
    compliance: 'EN 16931',
    encoding: 'UTF-8',
    maxSize: '10MB',
  },
  
  // Required fields
  requiredFields: [
    'invoiceNumber',      // Număr factură
    'invoiceDate',        // Data facturii
    'supplierCIF',        // CIF furnizor
    'supplierName',       // Denumire furnizor
    'supplierAddress',    // Adresă furnizor
    'customerCIF',        // CIF client (pentru B2B)
    'customerName',       // Denumire client
    'customerAddress',    // Adresă client
    'lineItems',          // Articole
    'itemDescription',    // Descriere articol
    'itemQuantity',       // Cantitate
    'itemUnitPrice',      // Preț unitar
    'itemVatRate',        // Cotă TVA
    'totalNet',           // Total fără TVA
    'totalVat',           // Total TVA
    'totalGross',         // Total cu TVA
    'currency',           // Moneda (RON obligatoriu pentru facturi interne)
    'paymentTerms',       // Condiții de plată
  ],
  
  // VAT rates in Romania
  vatRates: {
    standard: 0.19,       // 19% - standard
    reduced1: 0.09,       // 9% - alimente, medicamente, cazare
    reduced2: 0.05,       // 5% - cărți, ziare, spectacole
    zero: 0.00,           // 0% - exporturi, livrări intracomunitare
  },
} as const;

/**
 * ANAF SPV Status codes
 */
export enum AnafStatusCode {
  // Processing states
  IN_PRELUCRARE = 'in_prelucrare',     // Still being processed
  
  // Success states
  OK = 'ok',                            // Accepted
  TRIMIS = 'trimis',                    // Sent to recipient
  
  // Error states
  NOK = 'nok',                          // Rejected
  EROARE_VALIDARE = 'eroare_validare',  // Validation error
  EROARE_SCHEMA = 'eroare_schema',      // Schema validation failed
  EROARE_SEMNATURA = 'eroare_semnatura', // Signature error
  EROARE_DUPLICAT = 'eroare_duplicat',  // Duplicate invoice
  
  // Other
  ANULAT = 'anulat',                    // Cancelled
  EXPIRAT = 'expirat',                  // Expired
}

/**
 * Common validation errors from ANAF
 */
export const COMMON_ANAF_ERRORS = {
  'BR-RO-010': 'CIF furnizor invalid',
  'BR-RO-020': 'CIF client invalid',
  'BR-RO-030': 'Număr factură invalid sau duplicat',
  'BR-RO-040': 'Data facturii în viitor',
  'BR-RO-050': 'Cotă TVA invalidă',
  'BR-RO-060': 'Total TVA incorect calculat',
  'BR-RO-070': 'Total factură incorect',
  'BR-RO-080': 'Moneda trebuie să fie RON pentru facturi interne',
  'BR-RO-090': 'Adresă incompletă',
  'BR-RO-100': 'Descriere articol lipsă',
  'BR-CO-10': 'Cantitate trebuie să fie pozitivă',
  'BR-CO-20': 'Preț unitar trebuie să fie pozitiv',
  'BR-S-08': 'Schema XML invalidă',
  'UBL-CR-001': 'Element necunoscut în XML',
  'UBL-CR-002': 'Namespace incorect',
};
```

### 4.5 ANAF SPV API Reference

```typescript
// ============================================================================
// ANAF SPV API Reference (via Oblio)
// ============================================================================

/**
 * Oblio e-Factura API endpoints
 */
export const OBLIO_EFACTURA_ENDPOINTS = {
  // Get UBL XML for invoice
  getXml: {
    method: 'GET',
    path: '/api/v1/efactura/xml/{seriesName}/{number}',
    description: 'Obține XML UBL pentru factură',
    rateLimit: 60, // per minute
  },
  
  // Submit to ANAF
  send: {
    method: 'POST',
    path: '/api/v1/efactura/send',
    description: 'Trimite factura la ANAF SPV',
    rateLimit: 30, // per minute
    body: {
      seriesName: 'string',  // Serie factură
      number: 'number',      // Număr factură
      cif: 'string',         // CIF emitent
      test: 'boolean',       // true pentru mediu test
    },
    response: {
      index_incarcare: 'string', // Upload index from ANAF
      data_incarcare: 'string',  // Upload timestamp
    },
  },
  
  // Check status
  status: {
    method: 'GET',
    path: '/api/v1/efactura/status/{indexIncarcare}',
    description: 'Verifică statusul e-Factura la ANAF',
    rateLimit: 60, // per minute
    response: {
      stare: 'string',           // ok, nok, in_prelucrare
      id_solicitare: 'string',   // Request ID
      detalii: 'string',         // Details/errors
      data_creare: 'string',     // Creation date
    },
  },
  
  // Download ANAF PDF
  pdf: {
    method: 'GET',
    path: '/api/v1/efactura/pdf/{indexIncarcare}',
    description: 'Descarcă PDF cu ștampila ANAF',
    rateLimit: 30, // per minute
    response: 'binary/pdf',
  },
  
  // Send storno
  storno: {
    method: 'POST',
    path: '/api/v1/efactura/storno',
    description: 'Trimite storno la ANAF',
    rateLimit: 30, // per minute
    body: {
      seriesName: 'string',
      number: 'number',
      cif: 'string',
    },
  },
};

/**
 * Direct ANAF SPV API (for reference - not used directly)
 */
export const ANAF_SPV_API = {
  baseUrl: 'https://api.anaf.ro/prod/FCTEL/rest',
  testUrl: 'https://api.anaf.ro/test/FCTEL/rest',
  
  endpoints: {
    upload: '/upload',           // POST - Upload XML
    status: '/stareMesaj',       // GET - Check status
    download: '/descarcare',     // GET - Download response
    list: '/listaMesaje',        // GET - List messages
  },
  
  authentication: {
    type: 'OAuth2 with client certificate',
    tokenEndpoint: 'https://logincert.anaf.ro/anaf-oauth2/v1/authorize',
    scope: 'openid profile',
  },
  
  headers: {
    'Content-Type': 'application/xml',
    'Accept': 'application/json',
  },
};
```

---

## 5. UBL XML Generation & Validation

### 5.1 UBL 2.1 Standard Overview

```typescript
// ============================================================================
// UBL 2.1 XML Generation for e-Factura Romania
// ============================================================================

/**
 * UBL 2.1 Invoice Structure (EN 16931 compliant for Romania)
 * 
 * The Universal Business Language (UBL) is the OASIS standard used by
 * the European e-Invoicing norm EN 16931 and adopted by Romania for e-Factura.
 */

/**
 * UBL Invoice namespaces
 */
export const UBL_NAMESPACES = {
  invoice: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  cec: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
} as const;

/**
 * EN 16931 Business Rules for Romania (BR-RO-*)
 */
export const EN16931_ROMANIA_RULES = {
  // Seller rules
  'BR-RO-010': {
    description: 'CIF-ul furnizorului trebuie să fie valid',
    xpath: '//cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID',
    validation: 'Romanian CIF format (RO + 2-10 digits)',
  },
  'BR-RO-015': {
    description: 'Furnizorul trebuie să fie înregistrat în SPV',
    xpath: '//cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID',
    validation: 'Must be registered in ANAF SPV',
  },
  
  // Buyer rules
  'BR-RO-020': {
    description: 'CIF-ul clientului trebuie să fie valid pentru B2B',
    xpath: '//cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID',
    validation: 'Romanian CIF format for B2B transactions',
  },
  'BR-RO-025': {
    description: 'CNP-ul clientului pentru B2C',
    xpath: '//cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID',
    validation: 'Romanian CNP format (13 digits) for B2C',
  },
  
  // Invoice rules
  'BR-RO-030': {
    description: 'Numărul facturii trebuie să fie unic în serie',
    xpath: '//cbc:ID',
    validation: 'Unique within series, max 50 characters',
  },
  'BR-RO-040': {
    description: 'Data facturii nu poate fi în viitor',
    xpath: '//cbc:IssueDate',
    validation: 'Must be <= current date',
  },
  'BR-RO-045': {
    description: 'Data scadenței trebuie să fie după data emiterii',
    xpath: '//cbc:DueDate',
    validation: 'Must be >= IssueDate',
  },
  
  // Currency rules
  'BR-RO-080': {
    description: 'Moneda trebuie să fie RON pentru facturi naționale',
    xpath: '//cbc:DocumentCurrencyCode',
    validation: 'RON for domestic invoices',
  },
  'BR-RO-085': {
    description: 'Cursul de schimb pentru alte monede',
    xpath: '//cbc:TaxCurrencyCode',
    validation: 'If foreign currency, TAX currency must be RON',
  },
  
  // VAT rules
  'BR-RO-050': {
    description: 'Cota TVA trebuie să fie validă',
    xpath: '//cac:TaxCategory/cbc:Percent',
    validation: 'One of: 19, 9, 5, 0',
  },
  'BR-RO-060': {
    description: 'Total TVA trebuie calculat corect',
    xpath: '//cac:TaxTotal/cbc:TaxAmount',
    validation: 'Sum of line VAT amounts (±0.01 tolerance)',
  },
  'BR-RO-070': {
    description: 'Total factură trebuie calculat corect',
    xpath: '//cac:LegalMonetaryTotal/cbc:PayableAmount',
    validation: 'TaxExclusiveAmount + TaxTotal (±0.01)',
  },
  
  // Line item rules
  'BR-RO-100': {
    description: 'Descrierea articolului este obligatorie',
    xpath: '//cac:InvoiceLine/cac:Item/cbc:Name',
    validation: 'Min 1 character, max 200',
  },
  'BR-CO-10': {
    description: 'Cantitatea trebuie să fie pozitivă',
    xpath: '//cac:InvoiceLine/cbc:InvoicedQuantity',
    validation: '> 0',
  },
  'BR-CO-20': {
    description: 'Prețul unitar trebuie să fie pozitiv',
    xpath: '//cac:InvoiceLine/cac:Price/cbc:PriceAmount',
    validation: '>= 0',
  },
} as const;

/**
 * UBL Invoice Document structure
 */
export interface UblInvoiceDocument {
  // Header
  customizationId: string;        // urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1
  profileId: string;              // urn:fdc:peppol.eu:2017:poacc:billing:01:1.0
  invoiceId: string;              // Invoice number
  issueDate: string;              // YYYY-MM-DD
  dueDate?: string;               // YYYY-MM-DD
  invoiceTypeCode: string;        // 380 = Commercial Invoice, 381 = Credit Note, 389 = Self-billed
  currencyCode: string;           // RON
  
  // Period (optional)
  invoicePeriod?: {
    startDate: string;
    endDate: string;
  };
  
  // References
  orderReference?: string;        // Order number
  contractReference?: string;     // Contract number
  
  // Supplier (Seller)
  supplier: UblParty;
  
  // Customer (Buyer)
  customer: UblParty;
  
  // Payment
  paymentMeans?: UblPaymentMeans;
  paymentTerms?: string;
  
  // Tax totals
  taxTotals: UblTaxTotal[];
  
  // Monetary totals
  legalMonetaryTotal: UblMonetaryTotal;
  
  // Line items
  invoiceLines: UblInvoiceLine[];
}

/**
 * UBL Party (Supplier/Customer)
 */
export interface UblParty {
  // Identification
  partyIdentification?: string;   // GLN or other ID
  
  // Legal entity
  registrationName: string;       // Company name
  companyId: string;              // CUI/CIF
  companyIdScheme?: string;       // RO for Romania
  
  // Tax scheme
  taxSchemeId: string;            // VAT
  companyTaxId: string;           // RO + CUI (e.g., RO12345678)
  
  // Address
  address: {
    streetName: string;
    additionalStreetName?: string;
    cityName: string;
    postalZone?: string;
    countrySubentity?: string;    // County
    country: string;              // RO
  };
  
  // Contact
  contact?: {
    name?: string;
    telephone?: string;
    email?: string;
  };
}

/**
 * UBL Payment Means
 */
export interface UblPaymentMeans {
  paymentMeansCode: string;       // 30 = Credit transfer, 31 = Debit transfer, 42 = Bank account
  payeeFinancialAccount?: {
    id: string;                   // IBAN
    bankName?: string;
    bic?: string;                 // BIC/SWIFT
  };
}

/**
 * UBL Tax Total
 */
export interface UblTaxTotal {
  taxAmount: number;              // Total VAT for this category
  taxCurrency: string;            // RON
  taxSubtotals: {
    taxableAmount: number;        // Base amount
    taxAmount: number;            // VAT amount
    taxCategory: {
      id: string;                 // S = Standard, Z = Zero, E = Exempt
      percent: number;            // 19, 9, 5, or 0
      taxScheme: string;          // VAT
      exemptionReason?: string;   // If exempt
    };
  }[];
}

/**
 * UBL Monetary Total
 */
export interface UblMonetaryTotal {
  lineExtensionAmount: number;    // Sum of line net amounts
  taxExclusiveAmount: number;     // Total before VAT
  taxInclusiveAmount: number;     // Total including VAT
  allowanceTotalAmount?: number;  // Total discounts
  chargeTotalAmount?: number;     // Total charges
  prepaidAmount?: number;         // Amount already paid
  payableAmount: number;          // Amount to pay
}

/**
 * UBL Invoice Line
 */
export interface UblInvoiceLine {
  id: string;                     // Line number
  invoicedQuantity: number;
  quantityUnitCode: string;       // UN/ECE code: C62 (unit), KGM (kg), LTR (liter), MTR (meter)
  lineExtensionAmount: number;    // Quantity * Price - Allowances
  
  // Item
  item: {
    description?: string;
    name: string;                 // Product name (required)
    sellersItemId?: string;       // SKU
    standardItemId?: string;      // GTIN/EAN
    commodityClassification?: {
      classCode: string;          // NC code or CPV
      classScheme: string;        // STI (NC), CPV
    };
    classifiedTaxCategory: {
      id: string;                 // S, Z, E
      percent: number;
      taxScheme: string;          // VAT
    };
  };
  
  // Price
  price: {
    priceAmount: number;          // Unit price (without VAT)
    baseQuantity?: number;        // Usually 1
    baseQuantityUnitCode?: string;
  };
  
  // Allowances/Charges on line
  allowanceCharges?: {
    chargeIndicator: boolean;     // false = allowance (discount), true = charge
    reason?: string;
    amount: number;
  }[];
}
```

### 5.2 UBL XML Generator

```typescript
// ============================================================================
// UBL XML Generator Implementation
// ============================================================================

import { create } from 'xmlbuilder2';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

/**
 * UBL Invoice XML Generator
 * Generates EN 16931 compliant XML for Romanian e-Factura
 */
export class UblInvoiceGenerator {
  private readonly xmlBuilder: XMLBuilder;
  
  constructor() {
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true,
    });
  }
  
  /**
   * Generate complete UBL Invoice XML
   */
  generateInvoiceXml(invoice: UblInvoiceDocument): string {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('Invoice', {
        'xmlns': UBL_NAMESPACES.invoice,
        'xmlns:cac': UBL_NAMESPACES.cac,
        'xmlns:cbc': UBL_NAMESPACES.cbc,
        'xmlns:cec': UBL_NAMESPACES.cec,
        'xmlns:xsi': UBL_NAMESPACES.xsi,
      });
    
    // Header elements
    this.addHeaderElements(doc, invoice);
    
    // Supplier party
    this.addSupplierParty(doc, invoice.supplier);
    
    // Customer party
    this.addCustomerParty(doc, invoice.customer);
    
    // Payment means
    if (invoice.paymentMeans) {
      this.addPaymentMeans(doc, invoice.paymentMeans);
    }
    
    // Payment terms
    if (invoice.paymentTerms) {
      doc.ele('cac:PaymentTerms')
        .ele('cbc:Note').txt(invoice.paymentTerms).up()
        .up();
    }
    
    // Tax totals
    for (const taxTotal of invoice.taxTotals) {
      this.addTaxTotal(doc, taxTotal);
    }
    
    // Legal monetary total
    this.addMonetaryTotal(doc, invoice.legalMonetaryTotal);
    
    // Invoice lines
    for (const line of invoice.invoiceLines) {
      this.addInvoiceLine(doc, line);
    }
    
    return doc.end({ prettyPrint: true });
  }
  
  /**
   * Add header elements
   */
  private addHeaderElements(doc: any, invoice: UblInvoiceDocument): void {
    // Customization ID - mandatory for Romania
    doc.ele('cbc:CustomizationID')
      .txt('urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1')
      .up();
    
    // Profile ID
    doc.ele('cbc:ProfileID')
      .txt(invoice.profileId || 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0')
      .up();
    
    // Invoice ID (number)
    doc.ele('cbc:ID').txt(invoice.invoiceId).up();
    
    // Issue date
    doc.ele('cbc:IssueDate').txt(invoice.issueDate).up();
    
    // Due date
    if (invoice.dueDate) {
      doc.ele('cbc:DueDate').txt(invoice.dueDate).up();
    }
    
    // Invoice type code
    doc.ele('cbc:InvoiceTypeCode').txt(invoice.invoiceTypeCode).up();
    
    // Currency
    doc.ele('cbc:DocumentCurrencyCode').txt(invoice.currencyCode).up();
    
    // Invoice period
    if (invoice.invoicePeriod) {
      doc.ele('cac:InvoicePeriod')
        .ele('cbc:StartDate').txt(invoice.invoicePeriod.startDate).up()
        .ele('cbc:EndDate').txt(invoice.invoicePeriod.endDate).up()
        .up();
    }
    
    // Order reference
    if (invoice.orderReference) {
      doc.ele('cac:OrderReference')
        .ele('cbc:ID').txt(invoice.orderReference).up()
        .up();
    }
    
    // Contract reference
    if (invoice.contractReference) {
      doc.ele('cac:ContractDocumentReference')
        .ele('cbc:ID').txt(invoice.contractReference).up()
        .up();
    }
  }
  
  /**
   * Add supplier (seller) party
   */
  private addSupplierParty(doc: any, supplier: UblParty): void {
    const party = doc.ele('cac:AccountingSupplierParty').ele('cac:Party');
    
    // Party identification
    if (supplier.partyIdentification) {
      party.ele('cac:PartyIdentification')
        .ele('cbc:ID').txt(supplier.partyIdentification).up()
        .up();
    }
    
    // Party name
    party.ele('cac:PartyName')
      .ele('cbc:Name').txt(supplier.registrationName).up()
      .up();
    
    // Postal address
    const address = party.ele('cac:PostalAddress');
    address.ele('cbc:StreetName').txt(supplier.address.streetName).up();
    if (supplier.address.additionalStreetName) {
      address.ele('cbc:AdditionalStreetName').txt(supplier.address.additionalStreetName).up();
    }
    address.ele('cbc:CityName').txt(supplier.address.cityName).up();
    if (supplier.address.postalZone) {
      address.ele('cbc:PostalZone').txt(supplier.address.postalZone).up();
    }
    if (supplier.address.countrySubentity) {
      address.ele('cbc:CountrySubentity').txt(supplier.address.countrySubentity).up();
    }
    address.ele('cac:Country')
      .ele('cbc:IdentificationCode').txt(supplier.address.country).up()
      .up();
    address.up();
    
    // Party tax scheme (VAT)
    party.ele('cac:PartyTaxScheme')
      .ele('cbc:CompanyID').txt(supplier.companyTaxId).up()
      .ele('cac:TaxScheme')
        .ele('cbc:ID').txt('VAT').up()
        .up()
      .up();
    
    // Party legal entity
    const legal = party.ele('cac:PartyLegalEntity');
    legal.ele('cbc:RegistrationName').txt(supplier.registrationName).up();
    legal.ele('cbc:CompanyID', { schemeID: supplier.companyIdScheme || 'RO' })
      .txt(supplier.companyId)
      .up();
    legal.up();
    
    // Contact
    if (supplier.contact) {
      const contact = party.ele('cac:Contact');
      if (supplier.contact.name) {
        contact.ele('cbc:Name').txt(supplier.contact.name).up();
      }
      if (supplier.contact.telephone) {
        contact.ele('cbc:Telephone').txt(supplier.contact.telephone).up();
      }
      if (supplier.contact.email) {
        contact.ele('cbc:ElectronicMail').txt(supplier.contact.email).up();
      }
      contact.up();
    }
    
    party.up().up();
  }
  
  /**
   * Add customer (buyer) party
   */
  private addCustomerParty(doc: any, customer: UblParty): void {
    const party = doc.ele('cac:AccountingCustomerParty').ele('cac:Party');
    
    // Party identification
    if (customer.partyIdentification) {
      party.ele('cac:PartyIdentification')
        .ele('cbc:ID').txt(customer.partyIdentification).up()
        .up();
    }
    
    // Party name
    party.ele('cac:PartyName')
      .ele('cbc:Name').txt(customer.registrationName).up()
      .up();
    
    // Postal address
    const address = party.ele('cac:PostalAddress');
    address.ele('cbc:StreetName').txt(customer.address.streetName).up();
    if (customer.address.additionalStreetName) {
      address.ele('cbc:AdditionalStreetName').txt(customer.address.additionalStreetName).up();
    }
    address.ele('cbc:CityName').txt(customer.address.cityName).up();
    if (customer.address.postalZone) {
      address.ele('cbc:PostalZone').txt(customer.address.postalZone).up();
    }
    if (customer.address.countrySubentity) {
      address.ele('cbc:CountrySubentity').txt(customer.address.countrySubentity).up();
    }
    address.ele('cac:Country')
      .ele('cbc:IdentificationCode').txt(customer.address.country).up()
      .up();
    address.up();
    
    // Party tax scheme (VAT) - only if B2B
    if (customer.companyTaxId) {
      party.ele('cac:PartyTaxScheme')
        .ele('cbc:CompanyID').txt(customer.companyTaxId).up()
        .ele('cac:TaxScheme')
          .ele('cbc:ID').txt('VAT').up()
          .up()
        .up();
    }
    
    // Party legal entity
    const legal = party.ele('cac:PartyLegalEntity');
    legal.ele('cbc:RegistrationName').txt(customer.registrationName).up();
    legal.ele('cbc:CompanyID', { schemeID: customer.companyIdScheme || 'RO' })
      .txt(customer.companyId)
      .up();
    legal.up();
    
    // Contact
    if (customer.contact) {
      const contact = party.ele('cac:Contact');
      if (customer.contact.name) {
        contact.ele('cbc:Name').txt(customer.contact.name).up();
      }
      if (customer.contact.telephone) {
        contact.ele('cbc:Telephone').txt(customer.contact.telephone).up();
      }
      if (customer.contact.email) {
        contact.ele('cbc:ElectronicMail').txt(customer.contact.email).up();
      }
      contact.up();
    }
    
    party.up().up();
  }
  
  /**
   * Add payment means
   */
  private addPaymentMeans(doc: any, paymentMeans: UblPaymentMeans): void {
    const pm = doc.ele('cac:PaymentMeans');
    pm.ele('cbc:PaymentMeansCode').txt(paymentMeans.paymentMeansCode).up();
    
    if (paymentMeans.payeeFinancialAccount) {
      const account = pm.ele('cac:PayeeFinancialAccount');
      account.ele('cbc:ID').txt(paymentMeans.payeeFinancialAccount.id).up();
      
      if (paymentMeans.payeeFinancialAccount.bankName || paymentMeans.payeeFinancialAccount.bic) {
        const branch = account.ele('cac:FinancialInstitutionBranch');
        if (paymentMeans.payeeFinancialAccount.bic) {
          branch.ele('cbc:ID').txt(paymentMeans.payeeFinancialAccount.bic).up();
        }
        if (paymentMeans.payeeFinancialAccount.bankName) {
          branch.ele('cbc:Name').txt(paymentMeans.payeeFinancialAccount.bankName).up();
        }
        branch.up();
      }
      account.up();
    }
    pm.up();
  }
  
  /**
   * Add tax total
   */
  private addTaxTotal(doc: any, taxTotal: UblTaxTotal): void {
    const tt = doc.ele('cac:TaxTotal');
    tt.ele('cbc:TaxAmount', { currencyID: taxTotal.taxCurrency })
      .txt(this.formatAmount(taxTotal.taxAmount))
      .up();
    
    for (const subtotal of taxTotal.taxSubtotals) {
      const ts = tt.ele('cac:TaxSubtotal');
      ts.ele('cbc:TaxableAmount', { currencyID: taxTotal.taxCurrency })
        .txt(this.formatAmount(subtotal.taxableAmount))
        .up();
      ts.ele('cbc:TaxAmount', { currencyID: taxTotal.taxCurrency })
        .txt(this.formatAmount(subtotal.taxAmount))
        .up();
      
      const cat = ts.ele('cac:TaxCategory');
      cat.ele('cbc:ID').txt(subtotal.taxCategory.id).up();
      cat.ele('cbc:Percent').txt(subtotal.taxCategory.percent.toString()).up();
      
      if (subtotal.taxCategory.exemptionReason) {
        cat.ele('cbc:TaxExemptionReason').txt(subtotal.taxCategory.exemptionReason).up();
      }
      
      cat.ele('cac:TaxScheme')
        .ele('cbc:ID').txt(subtotal.taxCategory.taxScheme).up()
        .up();
      cat.up();
      ts.up();
    }
    tt.up();
  }
  
  /**
   * Add legal monetary total
   */
  private addMonetaryTotal(doc: any, total: UblMonetaryTotal): void {
    const lmt = doc.ele('cac:LegalMonetaryTotal');
    
    lmt.ele('cbc:LineExtensionAmount', { currencyID: 'RON' })
      .txt(this.formatAmount(total.lineExtensionAmount))
      .up();
    
    lmt.ele('cbc:TaxExclusiveAmount', { currencyID: 'RON' })
      .txt(this.formatAmount(total.taxExclusiveAmount))
      .up();
    
    lmt.ele('cbc:TaxInclusiveAmount', { currencyID: 'RON' })
      .txt(this.formatAmount(total.taxInclusiveAmount))
      .up();
    
    if (total.allowanceTotalAmount !== undefined && total.allowanceTotalAmount > 0) {
      lmt.ele('cbc:AllowanceTotalAmount', { currencyID: 'RON' })
        .txt(this.formatAmount(total.allowanceTotalAmount))
        .up();
    }
    
    if (total.chargeTotalAmount !== undefined && total.chargeTotalAmount > 0) {
      lmt.ele('cbc:ChargeTotalAmount', { currencyID: 'RON' })
        .txt(this.formatAmount(total.chargeTotalAmount))
        .up();
    }
    
    if (total.prepaidAmount !== undefined && total.prepaidAmount > 0) {
      lmt.ele('cbc:PrepaidAmount', { currencyID: 'RON' })
        .txt(this.formatAmount(total.prepaidAmount))
        .up();
    }
    
    lmt.ele('cbc:PayableAmount', { currencyID: 'RON' })
      .txt(this.formatAmount(total.payableAmount))
      .up();
    
    lmt.up();
  }
  
  /**
   * Add invoice line
   */
  private addInvoiceLine(doc: any, line: UblInvoiceLine): void {
    const il = doc.ele('cac:InvoiceLine');
    
    // Line ID
    il.ele('cbc:ID').txt(line.id).up();
    
    // Quantity
    il.ele('cbc:InvoicedQuantity', { unitCode: line.quantityUnitCode })
      .txt(line.invoicedQuantity.toString())
      .up();
    
    // Line extension amount
    il.ele('cbc:LineExtensionAmount', { currencyID: 'RON' })
      .txt(this.formatAmount(line.lineExtensionAmount))
      .up();
    
    // Allowance/Charge
    if (line.allowanceCharges && line.allowanceCharges.length > 0) {
      for (const ac of line.allowanceCharges) {
        const allowance = il.ele('cac:AllowanceCharge');
        allowance.ele('cbc:ChargeIndicator').txt(ac.chargeIndicator.toString()).up();
        if (ac.reason) {
          allowance.ele('cbc:AllowanceChargeReason').txt(ac.reason).up();
        }
        allowance.ele('cbc:Amount', { currencyID: 'RON' })
          .txt(this.formatAmount(ac.amount))
          .up();
        allowance.up();
      }
    }
    
    // Item
    const item = il.ele('cac:Item');
    
    if (line.item.description) {
      item.ele('cbc:Description').txt(line.item.description).up();
    }
    item.ele('cbc:Name').txt(line.item.name).up();
    
    if (line.item.sellersItemId) {
      item.ele('cac:SellersItemIdentification')
        .ele('cbc:ID').txt(line.item.sellersItemId).up()
        .up();
    }
    
    if (line.item.standardItemId) {
      item.ele('cac:StandardItemIdentification')
        .ele('cbc:ID', { schemeID: '0160' }).txt(line.item.standardItemId).up()
        .up();
    }
    
    if (line.item.commodityClassification) {
      item.ele('cac:CommodityClassification')
        .ele('cbc:ItemClassificationCode', { 
          listID: line.item.commodityClassification.classScheme 
        })
        .txt(line.item.commodityClassification.classCode)
        .up()
        .up();
    }
    
    // Classified tax category
    const taxCat = item.ele('cac:ClassifiedTaxCategory');
    taxCat.ele('cbc:ID').txt(line.item.classifiedTaxCategory.id).up();
    taxCat.ele('cbc:Percent').txt(line.item.classifiedTaxCategory.percent.toString()).up();
    taxCat.ele('cac:TaxScheme')
      .ele('cbc:ID').txt(line.item.classifiedTaxCategory.taxScheme).up()
      .up();
    taxCat.up();
    
    item.up();
    
    // Price
    const price = il.ele('cac:Price');
    price.ele('cbc:PriceAmount', { currencyID: 'RON' })
      .txt(this.formatAmount(line.price.priceAmount))
      .up();
    
    if (line.price.baseQuantity) {
      price.ele('cbc:BaseQuantity', { 
        unitCode: line.price.baseQuantityUnitCode || line.quantityUnitCode 
      })
        .txt(line.price.baseQuantity.toString())
        .up();
    }
    price.up();
    
    il.up();
  }
  
  /**
   * Format amount with 2 decimal places
   */
  private formatAmount(amount: number): string {
    return amount.toFixed(2);
  }
}
```

### 5.3 UBL XML Validator

```typescript
// ============================================================================
// UBL XML Validator Implementation
// ============================================================================

import { XMLParser, XMLValidator } from 'fast-xml-parser';
import * as libxmljs from 'libxmljs2';

/**
 * Validation error
 */
export interface UblValidationError {
  code: string;           // BR-RO-010, UBL-CR-001, etc.
  severity: 'error' | 'warning';
  message: string;
  xpath?: string;
  value?: string;
}

/**
 * Validation result
 */
export interface UblValidationResult {
  valid: boolean;
  errors: UblValidationError[];
  warnings: UblValidationError[];
}

/**
 * UBL XML Validator
 * Validates invoices against EN 16931 and Romanian CIUS-RO rules
 */
export class UblXmlValidator {
  private readonly parser: XMLParser;
  private readonly schemaCache: Map<string, libxmljs.Document> = new Map();
  
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      trimValues: true,
    });
  }
  
  /**
   * Validate UBL Invoice XML
   */
  async validate(xml: string): Promise<UblValidationResult> {
    const errors: UblValidationError[] = [];
    const warnings: UblValidationError[] = [];
    
    // Step 1: Well-formed XML check
    const wellFormedResult = XMLValidator.validate(xml);
    if (wellFormedResult !== true) {
      errors.push({
        code: 'XML-001',
        severity: 'error',
        message: `Malformed XML: ${wellFormedResult.err.msg}`,
      });
      return { valid: false, errors, warnings };
    }
    
    // Step 2: Parse XML
    let invoice: any;
    try {
      invoice = this.parser.parse(xml);
    } catch (e) {
      errors.push({
        code: 'XML-002',
        severity: 'error',
        message: `XML parsing failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
      });
      return { valid: false, errors, warnings };
    }
    
    // Step 3: Namespace validation
    const nsErrors = this.validateNamespaces(invoice);
    errors.push(...nsErrors);
    
    // Step 4: Business rules validation (EN 16931)
    const brErrors = this.validateBusinessRules(invoice);
    errors.push(...brErrors.filter(e => e.severity === 'error'));
    warnings.push(...brErrors.filter(e => e.severity === 'warning'));
    
    // Step 5: Romanian CIUS-RO rules
    const roErrors = this.validateRomanianRules(invoice);
    errors.push(...roErrors.filter(e => e.severity === 'error'));
    warnings.push(...roErrors.filter(e => e.severity === 'warning'));
    
    // Step 6: Calculation validation
    const calcErrors = this.validateCalculations(invoice);
    errors.push(...calcErrors);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  /**
   * Validate XML namespaces
   */
  private validateNamespaces(invoice: any): UblValidationError[] {
    const errors: UblValidationError[] = [];
    const root = invoice.Invoice;
    
    if (!root) {
      errors.push({
        code: 'UBL-NS-001',
        severity: 'error',
        message: 'Missing Invoice root element',
      });
      return errors;
    }
    
    const xmlns = root['@_xmlns'];
    if (xmlns !== UBL_NAMESPACES.invoice) {
      errors.push({
        code: 'UBL-NS-002',
        severity: 'error',
        message: `Invalid Invoice namespace. Expected: ${UBL_NAMESPACES.invoice}`,
        value: xmlns,
      });
    }
    
    return errors;
  }
  
  /**
   * Validate EN 16931 business rules
   */
  private validateBusinessRules(invoice: any): UblValidationError[] {
    const errors: UblValidationError[] = [];
    const inv = invoice.Invoice;
    
    // BR-01: Invoice must have ID
    if (!inv['cbc:ID']) {
      errors.push({
        code: 'BR-01',
        severity: 'error',
        message: 'Invoice must have an ID (cbc:ID)',
        xpath: '//cbc:ID',
      });
    }
    
    // BR-02: Invoice must have issue date
    if (!inv['cbc:IssueDate']) {
      errors.push({
        code: 'BR-02',
        severity: 'error',
        message: 'Invoice must have an issue date (cbc:IssueDate)',
        xpath: '//cbc:IssueDate',
      });
    }
    
    // BR-03: Invoice must have type code
    if (!inv['cbc:InvoiceTypeCode']) {
      errors.push({
        code: 'BR-03',
        severity: 'error',
        message: 'Invoice must have a type code (cbc:InvoiceTypeCode)',
        xpath: '//cbc:InvoiceTypeCode',
      });
    }
    
    // BR-04: Invoice must have currency code
    if (!inv['cbc:DocumentCurrencyCode']) {
      errors.push({
        code: 'BR-04',
        severity: 'error',
        message: 'Invoice must have a currency code (cbc:DocumentCurrencyCode)',
        xpath: '//cbc:DocumentCurrencyCode',
      });
    }
    
    // BR-05: Invoice must have supplier
    if (!inv['cac:AccountingSupplierParty']) {
      errors.push({
        code: 'BR-05',
        severity: 'error',
        message: 'Invoice must have a supplier (cac:AccountingSupplierParty)',
        xpath: '//cac:AccountingSupplierParty',
      });
    }
    
    // BR-06: Invoice must have customer
    if (!inv['cac:AccountingCustomerParty']) {
      errors.push({
        code: 'BR-06',
        severity: 'error',
        message: 'Invoice must have a customer (cac:AccountingCustomerParty)',
        xpath: '//cac:AccountingCustomerParty',
      });
    }
    
    // BR-13: Invoice must have at least one line
    const lines = inv['cac:InvoiceLine'];
    if (!lines || (Array.isArray(lines) && lines.length === 0)) {
      errors.push({
        code: 'BR-13',
        severity: 'error',
        message: 'Invoice must have at least one line (cac:InvoiceLine)',
        xpath: '//cac:InvoiceLine',
      });
    }
    
    // BR-15: Invoice must have monetary total
    if (!inv['cac:LegalMonetaryTotal']) {
      errors.push({
        code: 'BR-15',
        severity: 'error',
        message: 'Invoice must have monetary total (cac:LegalMonetaryTotal)',
        xpath: '//cac:LegalMonetaryTotal',
      });
    }
    
    // BR-16: Invoice must have payable amount
    const monetaryTotal = inv['cac:LegalMonetaryTotal'];
    if (monetaryTotal && !monetaryTotal['cbc:PayableAmount']) {
      errors.push({
        code: 'BR-16',
        severity: 'error',
        message: 'Invoice must have payable amount (cbc:PayableAmount)',
        xpath: '//cac:LegalMonetaryTotal/cbc:PayableAmount',
      });
    }
    
    return errors;
  }
  
  /**
   * Validate Romanian CIUS-RO specific rules
   */
  private validateRomanianRules(invoice: any): UblValidationError[] {
    const errors: UblValidationError[] = [];
    const inv = invoice.Invoice;
    
    // BR-RO-010: Supplier CIF validation
    const supplierParty = inv['cac:AccountingSupplierParty']?.['cac:Party'];
    if (supplierParty) {
      const taxId = supplierParty['cac:PartyTaxScheme']?.['cbc:CompanyID'];
      if (taxId) {
        if (!this.isValidRomanianCIF(taxId)) {
          errors.push({
            code: 'BR-RO-010',
            severity: 'error',
            message: 'Supplier CIF is invalid',
            xpath: '//cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID',
            value: taxId,
          });
        }
      } else {
        errors.push({
          code: 'BR-RO-010',
          severity: 'error',
          message: 'Supplier CIF is required',
          xpath: '//cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID',
        });
      }
    }
    
    // BR-RO-020: Customer CIF validation for B2B
    const customerParty = inv['cac:AccountingCustomerParty']?.['cac:Party'];
    if (customerParty) {
      const taxId = customerParty['cac:PartyTaxScheme']?.['cbc:CompanyID'];
      if (taxId && !this.isValidRomanianCIF(taxId)) {
        errors.push({
          code: 'BR-RO-020',
          severity: 'error',
          message: 'Customer CIF is invalid',
          xpath: '//cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID',
          value: taxId,
        });
      }
    }
    
    // BR-RO-040: Issue date not in future
    const issueDate = inv['cbc:IssueDate'];
    if (issueDate) {
      const issueDateObj = new Date(issueDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (issueDateObj > today) {
        errors.push({
          code: 'BR-RO-040',
          severity: 'error',
          message: 'Invoice issue date cannot be in the future',
          xpath: '//cbc:IssueDate',
          value: issueDate,
        });
      }
    }
    
    // BR-RO-080: Currency must be RON for domestic
    const currencyCode = inv['cbc:DocumentCurrencyCode'];
    if (currencyCode && currencyCode !== 'RON') {
      // Check if there's a tax currency specified
      const taxCurrencyCode = inv['cbc:TaxCurrencyCode'];
      if (!taxCurrencyCode || taxCurrencyCode !== 'RON') {
        errors.push({
          code: 'BR-RO-080',
          severity: 'warning',
          message: 'For foreign currency invoices, TaxCurrencyCode should be RON',
          xpath: '//cbc:TaxCurrencyCode',
          value: taxCurrencyCode || 'missing',
        });
      }
    }
    
    // BR-RO-050: VAT rate validation
    const taxTotals = inv['cac:TaxTotal'];
    const validVatRates = [0, 5, 9, 19];
    
    if (taxTotals) {
      const totals = Array.isArray(taxTotals) ? taxTotals : [taxTotals];
      for (const total of totals) {
        const subtotals = total['cac:TaxSubtotal'];
        if (subtotals) {
          const subs = Array.isArray(subtotals) ? subtotals : [subtotals];
          for (const sub of subs) {
            const percent = sub['cac:TaxCategory']?.['cbc:Percent'];
            if (percent !== undefined && !validVatRates.includes(Number(percent))) {
              errors.push({
                code: 'BR-RO-050',
                severity: 'error',
                message: `Invalid VAT rate. Must be one of: ${validVatRates.join(', ')}`,
                xpath: '//cac:TaxSubtotal/cac:TaxCategory/cbc:Percent',
                value: String(percent),
              });
            }
          }
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Validate calculations
   */
  private validateCalculations(invoice: any): UblValidationError[] {
    const errors: UblValidationError[] = [];
    const inv = invoice.Invoice;
    const tolerance = 0.01; // 1 bani tolerance
    
    // Calculate line totals
    const lines = inv['cac:InvoiceLine'];
    if (!lines) return errors;
    
    const lineArray = Array.isArray(lines) ? lines : [lines];
    let calculatedLineTotal = 0;
    
    for (const line of lineArray) {
      const lineAmount = this.parseAmount(line['cbc:LineExtensionAmount']);
      calculatedLineTotal += lineAmount;
    }
    
    // Check LineExtensionAmount
    const monetaryTotal = inv['cac:LegalMonetaryTotal'];
    if (monetaryTotal) {
      const declaredLineTotal = this.parseAmount(monetaryTotal['cbc:LineExtensionAmount']);
      
      if (Math.abs(calculatedLineTotal - declaredLineTotal) > tolerance) {
        errors.push({
          code: 'BR-CO-10',
          severity: 'error',
          message: `LineExtensionAmount mismatch. Calculated: ${calculatedLineTotal.toFixed(2)}, Declared: ${declaredLineTotal.toFixed(2)}`,
          xpath: '//cac:LegalMonetaryTotal/cbc:LineExtensionAmount',
        });
      }
      
      // Check PayableAmount = TaxExclusiveAmount + TaxAmount
      const taxExclusive = this.parseAmount(monetaryTotal['cbc:TaxExclusiveAmount']);
      const taxInclusive = this.parseAmount(monetaryTotal['cbc:TaxInclusiveAmount']);
      const payable = this.parseAmount(monetaryTotal['cbc:PayableAmount']);
      
      const taxTotals = inv['cac:TaxTotal'];
      let totalTax = 0;
      if (taxTotals) {
        const totals = Array.isArray(taxTotals) ? taxTotals : [taxTotals];
        for (const total of totals) {
          totalTax += this.parseAmount(total['cbc:TaxAmount']);
        }
      }
      
      const calculatedInclusive = taxExclusive + totalTax;
      if (Math.abs(calculatedInclusive - taxInclusive) > tolerance) {
        errors.push({
          code: 'BR-RO-060',
          severity: 'error',
          message: `TaxInclusiveAmount mismatch. Calculated: ${calculatedInclusive.toFixed(2)}, Declared: ${taxInclusive.toFixed(2)}`,
          xpath: '//cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount',
        });
      }
      
      // Payable should match TaxInclusive minus prepaid
      const prepaid = this.parseAmount(monetaryTotal['cbc:PrepaidAmount']);
      const expectedPayable = taxInclusive - prepaid;
      
      if (Math.abs(expectedPayable - payable) > tolerance) {
        errors.push({
          code: 'BR-RO-070',
          severity: 'error',
          message: `PayableAmount mismatch. Calculated: ${expectedPayable.toFixed(2)}, Declared: ${payable.toFixed(2)}`,
          xpath: '//cac:LegalMonetaryTotal/cbc:PayableAmount',
        });
      }
    }
    
    return errors;
  }
  
  /**
   * Parse amount from XML element
   */
  private parseAmount(element: any): number {
    if (!element) return 0;
    if (typeof element === 'number') return element;
    if (typeof element === 'string') return parseFloat(element) || 0;
    if (element['#text']) return parseFloat(element['#text']) || 0;
    return 0;
  }
  
  /**
   * Validate Romanian CIF format
   */
  private isValidRomanianCIF(cif: string): boolean {
    // Remove RO prefix if present
    let cleanCif = cif.toUpperCase().replace(/^RO/, '');
    
    // Must be 2-10 digits
    if (!/^\d{2,10}$/.test(cleanCif)) {
      return false;
    }
    
    // Validate checksum using Romanian algorithm
    const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
    const digits = cleanCif.padStart(10, '0').split('').map(Number);
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * weights[i];
    }
    
    const remainder = (sum * 10) % 11;
    const checkDigit = remainder === 10 ? 0 : remainder;
    
    return checkDigit === digits[9];
  }
}
```


## 6. Retry & Error Handling

### 6.1 Error Classification

```typescript
// ============================================================================
// e-Factura Error Classification & Handling
// ============================================================================

/**
 * e-Factura error types
 */
export enum EfacturaErrorType {
  // Retryable errors
  NETWORK_ERROR = 'NETWORK_ERROR',           // Temporary network issues
  TIMEOUT = 'TIMEOUT',                       // Request timeout
  RATE_LIMIT = 'RATE_LIMIT',                 // API rate limit exceeded
  SERVER_ERROR = 'SERVER_ERROR',             // 5xx from ANAF/Oblio
  ANAF_BUSY = 'ANAF_BUSY',                   // ANAF system under load
  
  // Non-retryable errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',     // XML/business rule validation
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR', // Auth failure
  DUPLICATE_ERROR = 'DUPLICATE_ERROR',       // Invoice already submitted
  SCHEMA_ERROR = 'SCHEMA_ERROR',             // XSD schema violation
  SIGNATURE_ERROR = 'SIGNATURE_ERROR',       // Digital signature issue
  
  // HITL required
  FISCAL_VIOLATION = 'FISCAL_VIOLATION',     // Fiscal compliance issue
  DATA_MISMATCH = 'DATA_MISMATCH',           // Data inconsistency
  MANUAL_INTERVENTION = 'MANUAL_INTERVENTION', // Requires human decision
}

/**
 * Error classification config
 */
export const EFACTURA_ERROR_CLASSIFICATION: Record<EfacturaErrorType, {
  retryable: boolean;
  maxRetries: number;
  backoffMultiplier: number;
  requiresHitl: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}> = {
  [EfacturaErrorType.NETWORK_ERROR]: {
    retryable: true,
    maxRetries: 5,
    backoffMultiplier: 2,
    requiresHitl: false,
    severity: 'low',
  },
  [EfacturaErrorType.TIMEOUT]: {
    retryable: true,
    maxRetries: 3,
    backoffMultiplier: 2,
    requiresHitl: false,
    severity: 'medium',
  },
  [EfacturaErrorType.RATE_LIMIT]: {
    retryable: true,
    maxRetries: 5,
    backoffMultiplier: 3,
    requiresHitl: false,
    severity: 'low',
  },
  [EfacturaErrorType.SERVER_ERROR]: {
    retryable: true,
    maxRetries: 3,
    backoffMultiplier: 2,
    requiresHitl: false,
    severity: 'medium',
  },
  [EfacturaErrorType.ANAF_BUSY]: {
    retryable: true,
    maxRetries: 5,
    backoffMultiplier: 3,
    requiresHitl: false,
    severity: 'low',
  },
  [EfacturaErrorType.VALIDATION_ERROR]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'high',
  },
  [EfacturaErrorType.AUTHENTICATION_ERROR]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'critical',
  },
  [EfacturaErrorType.DUPLICATE_ERROR]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: false,
    severity: 'medium',
  },
  [EfacturaErrorType.SCHEMA_ERROR]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'high',
  },
  [EfacturaErrorType.SIGNATURE_ERROR]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'critical',
  },
  [EfacturaErrorType.FISCAL_VIOLATION]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'critical',
  },
  [EfacturaErrorType.DATA_MISMATCH]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'high',
  },
  [EfacturaErrorType.MANUAL_INTERVENTION]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'high',
  },
};

/**
 * Classify error from ANAF/Oblio response
 */
export function classifyEfacturaError(
  error: Error | AxiosError | any
): EfacturaErrorType {
  // Network errors
  if (error.code === 'ECONNREFUSED' || 
      error.code === 'ENOTFOUND' ||
      error.code === 'ENETUNREACH') {
    return EfacturaErrorType.NETWORK_ERROR;
  }
  
  // Timeout
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return EfacturaErrorType.TIMEOUT;
  }
  
  // HTTP status based classification
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    // Rate limit
    if (status === 429) {
      return EfacturaErrorType.RATE_LIMIT;
    }
    
    // Authentication
    if (status === 401 || status === 403) {
      return EfacturaErrorType.AUTHENTICATION_ERROR;
    }
    
    // Server errors
    if (status >= 500) {
      // Check for ANAF busy message
      if (data?.message?.includes('sistem indisponibil') ||
          data?.message?.includes('încercare ulterioară')) {
        return EfacturaErrorType.ANAF_BUSY;
      }
      return EfacturaErrorType.SERVER_ERROR;
    }
    
    // Client errors - usually not retryable
    if (status === 400) {
      // Parse error details
      const errorCode = data?.errorCode || data?.code || '';
      const errorMessage = data?.message || data?.error || '';
      
      // Duplicate check
      if (errorCode.includes('DUPLICAT') || 
          errorMessage.includes('deja trimisă') ||
          errorMessage.includes('already submitted')) {
        return EfacturaErrorType.DUPLICATE_ERROR;
      }
      
      // Schema validation
      if (errorCode.includes('SCHEMA') || 
          errorCode.startsWith('UBL-') ||
          errorMessage.includes('schema')) {
        return EfacturaErrorType.SCHEMA_ERROR;
      }
      
      // Business rule validation
      if (errorCode.startsWith('BR-')) {
        return EfacturaErrorType.VALIDATION_ERROR;
      }
      
      // Signature error
      if (errorMessage.includes('semnătură') ||
          errorMessage.includes('signature')) {
        return EfacturaErrorType.SIGNATURE_ERROR;
      }
      
      // Default validation error
      return EfacturaErrorType.VALIDATION_ERROR;
    }
    
    if (status === 409) {
      return EfacturaErrorType.DUPLICATE_ERROR;
    }
  }
  
  // ANAF status based classification
  if (error.anafStatus) {
    switch (error.anafStatus) {
      case 'nok':
      case 'eroare_validare':
        return EfacturaErrorType.VALIDATION_ERROR;
      case 'eroare_schema':
        return EfacturaErrorType.SCHEMA_ERROR;
      case 'eroare_semnatura':
        return EfacturaErrorType.SIGNATURE_ERROR;
      case 'eroare_duplicat':
        return EfacturaErrorType.DUPLICATE_ERROR;
    }
  }
  
  // Default to network error (retryable)
  return EfacturaErrorType.NETWORK_ERROR;
}

/**
 * e-Factura specific error class
 */
export class EfacturaError extends Error {
  constructor(
    message: string,
    public readonly type: EfacturaErrorType,
    public readonly code?: string,
    public readonly details?: any,
    public readonly anafResponse?: any
  ) {
    super(message);
    this.name = 'EfacturaError';
  }
  
  get isRetryable(): boolean {
    return EFACTURA_ERROR_CLASSIFICATION[this.type].retryable;
  }
  
  get requiresHitl(): boolean {
    return EFACTURA_ERROR_CLASSIFICATION[this.type].requiresHitl;
  }
  
  get maxRetries(): number {
    return EFACTURA_ERROR_CLASSIFICATION[this.type].maxRetries;
  }
  
  get severity(): string {
    return EFACTURA_ERROR_CLASSIFICATION[this.type].severity;
  }
}
```

### 6.2 Retry Strategy Implementation

```typescript
// ============================================================================
// e-Factura Retry Strategy
// ============================================================================

import { UnrecoverableError, DelayedError } from 'bullmq';

/**
 * Retry configuration for e-Factura operations
 */
export const EFACTURA_RETRY_CONFIG = {
  // Send operation
  send: {
    attempts: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,      // 5 seconds initial
    },
    maxDelay: 300000,   // 5 minutes max
  },
  
  // Status check operation
  statusCheck: {
    attempts: 50,       // Check many times over days
    backoff: {
      type: 'custom' as const,
      delay: 120000,    // 2 minutes initial
    },
    maxDelay: 3600000,  // 1 hour max between checks
  },
  
  // Deadline monitor
  deadlineMonitor: {
    attempts: 100,      // Run continuously
    backoff: {
      type: 'fixed' as const,
      delay: 3600000,   // 1 hour intervals
    },
  },
};

/**
 * Custom backoff calculator for status checks
 * Increases interval over time as most invoices process quickly
 */
export function calculateStatusCheckBackoff(attemptsMade: number): number {
  // First 5 checks: 2 minutes
  if (attemptsMade < 5) return 2 * 60 * 1000;
  
  // Next 10 checks: 5 minutes
  if (attemptsMade < 15) return 5 * 60 * 1000;
  
  // Next 10 checks: 15 minutes
  if (attemptsMade < 25) return 15 * 60 * 1000;
  
  // After that: 1 hour
  return 60 * 60 * 1000;
}

/**
 * Retry handler for e-Factura workers
 */
export async function handleEfacturaRetry(
  error: Error | EfacturaError,
  attemptsMade: number,
  maxAttempts: number,
  jobId: string,
  logger: Logger
): Promise<void> {
  const errorType = error instanceof EfacturaError 
    ? error.type 
    : classifyEfacturaError(error);
  
  const config = EFACTURA_ERROR_CLASSIFICATION[errorType];
  
  // Log error
  logger.error('e-Factura error occurred', {
    jobId,
    errorType,
    message: error.message,
    attemptsMade,
    maxAttempts,
    isRetryable: config.retryable,
    requiresHitl: config.requiresHitl,
  });
  
  // Non-retryable errors
  if (!config.retryable) {
    // Create HITL task if needed
    if (config.requiresHitl) {
      await createEfacturaHitlTask(jobId, error, errorType);
    }
    
    throw new UnrecoverableError(
      `Non-retryable e-Factura error: ${errorType} - ${error.message}`
    );
  }
  
  // Check if max retries exceeded
  if (attemptsMade >= config.maxRetries) {
    logger.warn('Max retries exceeded for e-Factura job', {
      jobId,
      errorType,
      attemptsMade,
      maxRetries: config.maxRetries,
    });
    
    // Escalate to HITL
    await createEfacturaHitlTask(jobId, error, errorType);
    
    throw new UnrecoverableError(
      `Max retries exceeded: ${errorType} after ${attemptsMade} attempts`
    );
  }
  
  // Calculate backoff delay
  const baseDelay = 5000; // 5 seconds
  const delay = Math.min(
    baseDelay * Math.pow(config.backoffMultiplier, attemptsMade),
    300000 // Max 5 minutes
  );
  
  logger.info('Scheduling e-Factura retry', {
    jobId,
    errorType,
    attemptsMade,
    nextAttemptIn: delay,
  });
  
  // Use delayed error for retry
  throw new DelayedError(`Retry in ${delay}ms: ${error.message}`);
}

/**
 * Create HITL task for e-Factura issues
 */
async function createEfacturaHitlTask(
  jobId: string,
  error: Error | EfacturaError,
  errorType: EfacturaErrorType
): Promise<void> {
  const config = EFACTURA_ERROR_CLASSIFICATION[errorType];
  
  // Determine priority based on severity
  const priorityMap: Record<string, number> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };
  
  await hitlQueue.add('efactura-intervention', {
    type: 'efactura_error',
    jobId,
    errorType,
    errorMessage: error.message,
    errorDetails: error instanceof EfacturaError ? error.details : undefined,
    anafResponse: error instanceof EfacturaError ? error.anafResponse : undefined,
    priority: priorityMap[config.severity],
    requiredAction: getRequiredAction(errorType),
    deadline: config.severity === 'critical' 
      ? new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours for critical
      : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours otherwise
  }, {
    priority: priorityMap[config.severity],
    attempts: 1,
  });
}

/**
 * Get required action based on error type
 */
function getRequiredAction(errorType: EfacturaErrorType): string {
  switch (errorType) {
    case EfacturaErrorType.VALIDATION_ERROR:
      return 'Review validation errors and fix invoice data';
    case EfacturaErrorType.SCHEMA_ERROR:
      return 'Review XML schema errors - may require developer intervention';
    case EfacturaErrorType.SIGNATURE_ERROR:
      return 'Check digital certificate and SPV registration';
    case EfacturaErrorType.AUTHENTICATION_ERROR:
      return 'Verify Oblio API credentials and SPV access';
    case EfacturaErrorType.FISCAL_VIOLATION:
      return 'Review fiscal compliance issue - may need accountant review';
    case EfacturaErrorType.DATA_MISMATCH:
      return 'Compare invoice data with source and resolve discrepancies';
    default:
      return 'Review error and determine appropriate action';
  }
}
```

### 6.3 Idempotency Implementation

```typescript
// ============================================================================
// e-Factura Idempotency Manager
// ============================================================================

import { createHash } from 'crypto';
import { Redis } from 'ioredis';

/**
 * Idempotency manager for e-Factura operations
 * Prevents duplicate submissions to ANAF
 */
export class EfacturaIdempotencyManager {
  private readonly redis: Redis;
  private readonly prefix = 'efactura:idempotency:';
  private readonly ttl = 7 * 24 * 60 * 60; // 7 days
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  /**
   * Generate idempotency key for invoice submission
   */
  generateSubmissionKey(
    tenantId: string,
    invoiceSeries: string,
    invoiceNumber: number
  ): string {
    const data = `${tenantId}:${invoiceSeries}:${invoiceNumber}`;
    return createHash('sha256').update(data).digest('hex').substring(0, 32);
  }
  
  /**
   * Check if operation already in progress or completed
   */
  async checkSubmission(key: string): Promise<{
    exists: boolean;
    status?: 'pending' | 'completed' | 'failed';
    indexIncarcare?: string;
    submittedAt?: string;
  }> {
    const fullKey = this.prefix + 'submit:' + key;
    const data = await this.redis.hgetall(fullKey);
    
    if (!data || Object.keys(data).length === 0) {
      return { exists: false };
    }
    
    return {
      exists: true,
      status: data.status as any,
      indexIncarcare: data.indexIncarcare,
      submittedAt: data.submittedAt,
    };
  }
  
  /**
   * Mark submission as started (pending)
   */
  async markSubmissionPending(key: string, jobId: string): Promise<boolean> {
    const fullKey = this.prefix + 'submit:' + key;
    
    // Use SETNX pattern for atomic check-and-set
    const result = await this.redis.hsetnx(fullKey, 'status', 'pending');
    
    if (result === 1) {
      // Successfully set - this is the first submission
      await this.redis.hset(fullKey, {
        jobId,
        startedAt: new Date().toISOString(),
      });
      await this.redis.expire(fullKey, this.ttl);
      return true;
    }
    
    // Already exists - check if it's stale (older than 30 minutes)
    const startedAt = await this.redis.hget(fullKey, 'startedAt');
    if (startedAt) {
      const age = Date.now() - new Date(startedAt).getTime();
      if (age > 30 * 60 * 1000) {
        // Stale pending - allow retry
        await this.redis.hset(fullKey, {
          status: 'pending',
          jobId,
          startedAt: new Date().toISOString(),
        });
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Mark submission as completed
   */
  async markSubmissionCompleted(
    key: string,
    indexIncarcare: string
  ): Promise<void> {
    const fullKey = this.prefix + 'submit:' + key;
    
    await this.redis.hset(fullKey, {
      status: 'completed',
      indexIncarcare,
      completedAt: new Date().toISOString(),
    });
    await this.redis.expire(fullKey, this.ttl);
  }
  
  /**
   * Mark submission as failed
   */
  async markSubmissionFailed(key: string, error: string): Promise<void> {
    const fullKey = this.prefix + 'submit:' + key;
    
    await this.redis.hset(fullKey, {
      status: 'failed',
      error,
      failedAt: new Date().toISOString(),
    });
    await this.redis.expire(fullKey, 24 * 60 * 60); // 24 hours for failed
  }
  
  /**
   * Clear failed submission for retry
   */
  async clearSubmission(key: string): Promise<void> {
    const fullKey = this.prefix + 'submit:' + key;
    await this.redis.del(fullKey);
  }
  
  /**
   * Check for duplicate status check
   */
  async checkStatusCheckDedup(indexIncarcare: string): Promise<{
    isRecent: boolean;
    lastCheckedAt?: string;
    status?: string;
  }> {
    const fullKey = this.prefix + 'status:' + indexIncarcare;
    const data = await this.redis.hgetall(fullKey);
    
    if (!data || Object.keys(data).length === 0) {
      return { isRecent: false };
    }
    
    const lastCheckedAt = data.lastCheckedAt;
    if (lastCheckedAt) {
      const age = Date.now() - new Date(lastCheckedAt).getTime();
      // Consider recent if checked within last minute
      if (age < 60 * 1000) {
        return {
          isRecent: true,
          lastCheckedAt,
          status: data.status,
        };
      }
    }
    
    return { isRecent: false };
  }
  
  /**
   * Record status check
   */
  async recordStatusCheck(
    indexIncarcare: string,
    status: string
  ): Promise<void> {
    const fullKey = this.prefix + 'status:' + indexIncarcare;
    
    await this.redis.hset(fullKey, {
      status,
      lastCheckedAt: new Date().toISOString(),
    });
    await this.redis.expire(fullKey, 24 * 60 * 60); // 24 hours
  }
}
```

### 6.4 Circuit Breaker for ANAF

```typescript
// ============================================================================
// Circuit Breaker for ANAF/Oblio e-Factura API
// ============================================================================

import Opossum from 'opossum';

/**
 * Circuit breaker configuration for e-Factura APIs
 */
export const EFACTURA_CIRCUIT_BREAKER_CONFIG = {
  // ANAF via Oblio
  oblioEfactura: {
    timeout: 60000,           // 60 seconds timeout
    errorThresholdPercentage: 50,
    resetTimeout: 60000,      // 60 seconds in half-open
    volumeThreshold: 5,       // Min 5 requests before opening
    rollingCountTimeout: 60000, // 60 second window
  },
  
  // Oblio general API
  oblioGeneral: {
    timeout: 30000,           // 30 seconds timeout
    errorThresholdPercentage: 50,
    resetTimeout: 30000,      // 30 seconds in half-open
    volumeThreshold: 10,
    rollingCountTimeout: 60000,
  },
};

/**
 * Create circuit breaker for Oblio e-Factura operations
 */
export function createEfacturaCircuitBreaker(
  operation: (...args: any[]) => Promise<any>,
  name: string,
  logger: Logger
): Opossum {
  const config = EFACTURA_CIRCUIT_BREAKER_CONFIG.oblioEfactura;
  
  const breaker = new Opossum(operation, {
    timeout: config.timeout,
    errorThresholdPercentage: config.errorThresholdPercentage,
    resetTimeout: config.resetTimeout,
    volumeThreshold: config.volumeThreshold,
    rollingCountTimeout: config.rollingCountTimeout,
    name,
  });
  
  // Event handlers
  breaker.on('open', () => {
    logger.warn('e-Factura circuit breaker OPENED', { name });
    efacturaCircuitBreakerState.labels({ operation: name, state: 'open' }).set(1);
    efacturaCircuitBreakerState.labels({ operation: name, state: 'closed' }).set(0);
    efacturaCircuitBreakerState.labels({ operation: name, state: 'half_open' }).set(0);
  });
  
  breaker.on('close', () => {
    logger.info('e-Factura circuit breaker CLOSED', { name });
    efacturaCircuitBreakerState.labels({ operation: name, state: 'open' }).set(0);
    efacturaCircuitBreakerState.labels({ operation: name, state: 'closed' }).set(1);
    efacturaCircuitBreakerState.labels({ operation: name, state: 'half_open' }).set(0);
  });
  
  breaker.on('halfOpen', () => {
    logger.info('e-Factura circuit breaker HALF-OPEN', { name });
    efacturaCircuitBreakerState.labels({ operation: name, state: 'open' }).set(0);
    efacturaCircuitBreakerState.labels({ operation: name, state: 'closed' }).set(0);
    efacturaCircuitBreakerState.labels({ operation: name, state: 'half_open' }).set(1);
  });
  
  breaker.on('reject', () => {
    logger.warn('e-Factura request rejected (circuit open)', { name });
    efacturaCircuitBreakerRejections.labels({ operation: name }).inc();
  });
  
  breaker.on('timeout', () => {
    logger.warn('e-Factura request timed out', { name });
    efacturaCircuitBreakerTimeouts.labels({ operation: name }).inc();
  });
  
  breaker.on('success', () => {
    efacturaCircuitBreakerSuccess.labels({ operation: name }).inc();
  });
  
  breaker.on('failure', (error) => {
    logger.error('e-Factura request failed', { name, error: error.message });
    efacturaCircuitBreakerFailures.labels({ operation: name }).inc();
  });
  
  return breaker;
}

// ============================================================================
// Circuit Breaker Prometheus Metrics
// ============================================================================

const efacturaCircuitBreakerState = new Gauge({
  name: 'efactura_circuit_breaker_state',
  help: 'e-Factura circuit breaker state (1 = active)',
  labelNames: ['operation', 'state'],
});

const efacturaCircuitBreakerRejections = new Counter({
  name: 'efactura_circuit_breaker_rejections_total',
  help: 'Total e-Factura requests rejected due to open circuit',
  labelNames: ['operation'],
});

const efacturaCircuitBreakerTimeouts = new Counter({
  name: 'efactura_circuit_breaker_timeouts_total',
  help: 'Total e-Factura request timeouts',
  labelNames: ['operation'],
});

const efacturaCircuitBreakerSuccess = new Counter({
  name: 'efactura_circuit_breaker_success_total',
  help: 'Total successful e-Factura requests',
  labelNames: ['operation'],
});

const efacturaCircuitBreakerFailures = new Counter({
  name: 'efactura_circuit_breaker_failures_total',
  help: 'Total failed e-Factura requests',
  labelNames: ['operation'],
});
```


## 7. Monitoring & Alerts

### 7.1 e-Factura Prometheus Metrics

```typescript
// ============================================================================
// e-Factura Monitoring Metrics
// ============================================================================

import { Counter, Gauge, Histogram, Registry } from 'prom-client';

// ============================================================================
// Submission Metrics
// ============================================================================

/**
 * e-Factura submissions counter
 */
export const efacturaSubmissionsTotal = new Counter({
  name: 'efactura_submissions_total',
  help: 'Total e-Factura submissions to ANAF',
  labelNames: ['tenant_id', 'status', 'is_resubmission'],
});

/**
 * e-Factura submission duration
 */
export const efacturaSubmissionDuration = new Histogram({
  name: 'efactura_submission_duration_seconds',
  help: 'e-Factura submission duration in seconds',
  labelNames: ['tenant_id', 'status'],
  buckets: [1, 2, 5, 10, 20, 30, 45, 60, 90, 120],
});

/**
 * e-Factura invoice amounts
 */
export const efacturaInvoiceAmount = new Histogram({
  name: 'efactura_invoice_amount_ron',
  help: 'e-Factura invoice amounts in RON',
  labelNames: ['tenant_id'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
});

/**
 * Pending submissions gauge
 */
export const efacturaPendingSubmissions = new Gauge({
  name: 'efactura_pending_submissions',
  help: 'Number of e-Factura submissions awaiting ANAF response',
  labelNames: ['tenant_id'],
});

// ============================================================================
// Status Check Metrics
// ============================================================================

/**
 * Status check counter
 */
export const efacturaStatusChecksTotal = new Counter({
  name: 'efactura_status_checks_total',
  help: 'Total e-Factura status checks',
  labelNames: ['tenant_id', 'result'],
});

/**
 * Status check duration
 */
export const efacturaStatusCheckDuration = new Histogram({
  name: 'efactura_status_check_duration_seconds',
  help: 'e-Factura status check duration in seconds',
  labelNames: ['tenant_id'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30],
});

/**
 * ANAF processing time
 * Time from submission to final status
 */
export const efacturaAnafProcessingTime = new Histogram({
  name: 'efactura_anaf_processing_time_seconds',
  help: 'ANAF processing time from submission to final status',
  labelNames: ['tenant_id', 'final_status'],
  buckets: [60, 300, 600, 1800, 3600, 7200, 14400, 28800, 86400],
});

// ============================================================================
// Deadline Metrics
// ============================================================================

/**
 * Days until deadline gauge
 */
export const efacturaDaysUntilDeadline = new Gauge({
  name: 'efactura_days_until_deadline',
  help: 'Days remaining until 5-day ANAF deadline',
  labelNames: ['tenant_id', 'invoice_id'],
});

/**
 * Deadline warnings counter
 */
export const efacturaDeadlineWarnings = new Counter({
  name: 'efactura_deadline_warnings_total',
  help: 'Total deadline warning alerts triggered',
  labelNames: ['tenant_id', 'warning_type'],
});

/**
 * Overdue invoices gauge
 */
export const efacturaOverdueInvoices = new Gauge({
  name: 'efactura_overdue_invoices',
  help: 'Number of invoices past the 5-day deadline',
  labelNames: ['tenant_id'],
});

// ============================================================================
// Error Metrics
// ============================================================================

/**
 * e-Factura errors by type
 */
export const efacturaErrorsTotal = new Counter({
  name: 'efactura_errors_total',
  help: 'Total e-Factura errors by type',
  labelNames: ['tenant_id', 'error_type', 'error_code'],
});

/**
 * Validation errors counter
 */
export const efacturaValidationErrors = new Counter({
  name: 'efactura_validation_errors_total',
  help: 'Total XML validation errors',
  labelNames: ['tenant_id', 'rule_code'],
});

/**
 * ANAF rejections counter
 */
export const efacturaAnafRejections = new Counter({
  name: 'efactura_anaf_rejections_total',
  help: 'Total ANAF rejections',
  labelNames: ['tenant_id', 'rejection_reason'],
});

// ============================================================================
// HITL Metrics
// ============================================================================

/**
 * HITL interventions for e-Factura
 */
export const efacturaHitlInterventions = new Counter({
  name: 'efactura_hitl_interventions_total',
  help: 'Total HITL interventions for e-Factura issues',
  labelNames: ['tenant_id', 'intervention_type'],
});

/**
 * HITL resolution time
 */
export const efacturaHitlResolutionTime = new Histogram({
  name: 'efactura_hitl_resolution_time_seconds',
  help: 'Time to resolve e-Factura HITL tasks',
  labelNames: ['tenant_id', 'intervention_type'],
  buckets: [300, 900, 1800, 3600, 7200, 14400, 28800, 86400],
});

// ============================================================================
// API Metrics
// ============================================================================

/**
 * Oblio e-Factura API calls
 */
export const oblioEfacturaApiCalls = new Counter({
  name: 'oblio_efactura_api_calls_total',
  help: 'Total Oblio e-Factura API calls',
  labelNames: ['endpoint', 'status'],
});

/**
 * Oblio e-Factura API latency
 */
export const oblioEfacturaApiLatency = new Histogram({
  name: 'oblio_efactura_api_latency_seconds',
  help: 'Oblio e-Factura API latency in seconds',
  labelNames: ['endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30, 60],
});

/**
 * Rate limit status
 */
export const oblioEfacturaRateLimitRemaining = new Gauge({
  name: 'oblio_efactura_rate_limit_remaining',
  help: 'Remaining rate limit for Oblio e-Factura API',
  labelNames: ['endpoint'],
});

// ============================================================================
// UBL Validation Metrics
// ============================================================================

/**
 * UBL validation results
 */
export const ublValidationResults = new Counter({
  name: 'ubl_validation_results_total',
  help: 'Total UBL XML validation results',
  labelNames: ['tenant_id', 'result'],
});

/**
 * UBL validation duration
 */
export const ublValidationDuration = new Histogram({
  name: 'ubl_validation_duration_seconds',
  help: 'UBL XML validation duration in seconds',
  labelNames: ['tenant_id'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
});
```

### 7.2 Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "e-Factura SPV Monitor",
    "uid": "efactura-spv-monitor",
    "tags": ["etapa3", "efactura", "anaf", "fiscal"],
    "timezone": "Europe/Bucharest",
    "refresh": "30s",
    "time": {
      "from": "now-24h",
      "to": "now"
    },
    "panels": [
      {
        "title": "Submission Overview",
        "type": "row",
        "gridPos": { "x": 0, "y": 0, "w": 24, "h": 1 }
      },
      {
        "title": "Submissions Today",
        "type": "stat",
        "gridPos": { "x": 0, "y": 1, "w": 4, "h": 4 },
        "targets": [
          {
            "expr": "sum(increase(efactura_submissions_total{status='success'}[24h]))",
            "legendFormat": "Successful"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "yellow", "value": 0 },
                { "color": "green", "value": 1 }
              ]
            },
            "unit": "short"
          }
        }
      },
      {
        "title": "Success Rate",
        "type": "gauge",
        "gridPos": { "x": 4, "y": 1, "w": 4, "h": 4 },
        "targets": [
          {
            "expr": "sum(rate(efactura_submissions_total{status='success'}[1h])) / sum(rate(efactura_submissions_total[1h])) * 100",
            "legendFormat": "Success %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "min": 0,
            "max": 100,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "red", "value": 0 },
                { "color": "yellow", "value": 80 },
                { "color": "green", "value": 95 }
              ]
            },
            "unit": "percent"
          }
        }
      },
      {
        "title": "Pending Submissions",
        "type": "stat",
        "gridPos": { "x": 8, "y": 1, "w": 4, "h": 4 },
        "targets": [
          {
            "expr": "sum(efactura_pending_submissions)",
            "legendFormat": "Pending"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": 0 },
                { "color": "yellow", "value": 10 },
                { "color": "red", "value": 50 }
              ]
            }
          }
        }
      },
      {
        "title": "Overdue Invoices",
        "type": "stat",
        "gridPos": { "x": 12, "y": 1, "w": 4, "h": 4 },
        "targets": [
          {
            "expr": "sum(efactura_overdue_invoices)",
            "legendFormat": "Overdue"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": 0 },
                { "color": "red", "value": 1 }
              ]
            }
          }
        }
      },
      {
        "title": "ANAF Processing Time (P95)",
        "type": "stat",
        "gridPos": { "x": 16, "y": 1, "w": 4, "h": 4 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(efactura_anaf_processing_time_seconds_bucket[1h])) by (le)) / 60",
            "legendFormat": "P95 Minutes"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "m",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": 0 },
                { "color": "yellow", "value": 30 },
                { "color": "red", "value": 60 }
              ]
            }
          }
        }
      },
      {
        "title": "Submission Rate",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 5, "w": 12, "h": 6 },
        "targets": [
          {
            "expr": "sum(rate(efactura_submissions_total{status='success'}[5m])) * 60",
            "legendFormat": "Successful/min"
          },
          {
            "expr": "sum(rate(efactura_submissions_total{status='failed'}[5m])) * 60",
            "legendFormat": "Failed/min"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "custom": {
              "fillOpacity": 20,
              "lineWidth": 2
            }
          }
        }
      },
      {
        "title": "Invoice Amounts Distribution",
        "type": "histogram",
        "gridPos": { "x": 12, "y": 5, "w": 12, "h": 6 },
        "targets": [
          {
            "expr": "sum(increase(efactura_invoice_amount_ron_bucket[24h])) by (le)",
            "format": "heatmap"
          }
        ]
      },
      {
        "title": "ANAF Status Overview",
        "type": "row",
        "gridPos": { "x": 0, "y": 11, "w": 24, "h": 1 }
      },
      {
        "title": "Status Distribution",
        "type": "piechart",
        "gridPos": { "x": 0, "y": 12, "w": 8, "h": 6 },
        "targets": [
          {
            "expr": "sum by (result) (increase(efactura_status_checks_total[24h]))",
            "legendFormat": "{{result}}"
          }
        ]
      },
      {
        "title": "Rejection Reasons",
        "type": "bargauge",
        "gridPos": { "x": 8, "y": 12, "w": 8, "h": 6 },
        "targets": [
          {
            "expr": "topk(10, sum by (rejection_reason) (increase(efactura_anaf_rejections_total[24h])))",
            "legendFormat": "{{rejection_reason}}"
          }
        ],
        "options": {
          "orientation": "horizontal",
          "displayMode": "gradient"
        }
      },
      {
        "title": "Processing Time Distribution",
        "type": "heatmap",
        "gridPos": { "x": 16, "y": 12, "w": 8, "h": 6 },
        "targets": [
          {
            "expr": "sum(increase(efactura_anaf_processing_time_seconds_bucket[1h])) by (le)",
            "format": "heatmap"
          }
        ]
      },
      {
        "title": "Deadline Monitoring",
        "type": "row",
        "gridPos": { "x": 0, "y": 18, "w": 24, "h": 1 }
      },
      {
        "title": "Invoices by Days Until Deadline",
        "type": "bargauge",
        "gridPos": { "x": 0, "y": 19, "w": 12, "h": 6 },
        "targets": [
          {
            "expr": "count by (days_remaining) (efactura_days_until_deadline)",
            "legendFormat": "{{days_remaining}} days"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "red", "value": 0 },
                { "color": "orange", "value": 2 },
                { "color": "yellow", "value": 3 },
                { "color": "green", "value": 4 }
              ]
            }
          }
        }
      },
      {
        "title": "Deadline Warnings",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 19, "w": 12, "h": 6 },
        "targets": [
          {
            "expr": "sum(rate(efactura_deadline_warnings_total{warning_type='day4'}[1h])) * 60",
            "legendFormat": "Day 4 Warnings"
          },
          {
            "expr": "sum(rate(efactura_deadline_warnings_total{warning_type='day5'}[1h])) * 60",
            "legendFormat": "Day 5 Critical"
          }
        ]
      },
      {
        "title": "API & System Health",
        "type": "row",
        "gridPos": { "x": 0, "y": 25, "w": 24, "h": 1 }
      },
      {
        "title": "API Latency P95",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 26, "w": 8, "h": 6 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(oblio_efactura_api_latency_seconds_bucket[5m])) by (le, endpoint))",
            "legendFormat": "{{endpoint}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        }
      },
      {
        "title": "Rate Limit Remaining",
        "type": "timeseries",
        "gridPos": { "x": 8, "y": 26, "w": 8, "h": 6 },
        "targets": [
          {
            "expr": "oblio_efactura_rate_limit_remaining",
            "legendFormat": "{{endpoint}}"
          }
        ]
      },
      {
        "title": "Circuit Breaker Status",
        "type": "stat",
        "gridPos": { "x": 16, "y": 26, "w": 8, "h": 6 },
        "targets": [
          {
            "expr": "efactura_circuit_breaker_state{state='open'}",
            "legendFormat": "Open"
          },
          {
            "expr": "efactura_circuit_breaker_state{state='half_open'}",
            "legendFormat": "Half-Open"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "mappings": [
              { "type": "value", "options": { "0": { "text": "Closed", "color": "green" } } },
              { "type": "value", "options": { "1": { "text": "Open/HalfOpen", "color": "red" } } }
            ]
          }
        }
      }
    ]
  }
}
```

### 7.3 Alert Rules

```yaml
# ============================================================================
# e-Factura SPV Alert Rules (Prometheus/AlertManager)
# ============================================================================

groups:
  - name: efactura_critical
    interval: 30s
    rules:
      # CRITICAL: Overdue invoices (past 5-day deadline)
      - alert: EfacturaOverdueInvoices
        expr: sum(efactura_overdue_invoices) > 0
        for: 5m
        labels:
          severity: critical
          team: fiscal
        annotations:
          summary: "e-Factura invoices are past the ANAF deadline"
          description: >
            {{ $value }} invoices are past the 5-day e-Factura submission deadline.
            This may result in ANAF penalties of up to 5,000 RON per invoice.
            Immediate action required!
          runbook_url: "https://wiki.cerniq.app/runbooks/efactura-overdue"

      # CRITICAL: High rejection rate
      - alert: EfacturaHighRejectionRate
        expr: >
          sum(rate(efactura_anaf_rejections_total[1h])) 
          / sum(rate(efactura_submissions_total[1h])) 
          > 0.1
        for: 15m
        labels:
          severity: critical
          team: fiscal
        annotations:
          summary: "e-Factura rejection rate above 10%"
          description: >
            ANAF is rejecting {{ $value | humanizePercentage }} of e-Factura submissions.
            This indicates systematic issues with invoice data or XML generation.
          runbook_url: "https://wiki.cerniq.app/runbooks/efactura-rejections"

      # CRITICAL: No submissions during business hours
      - alert: EfacturaNoSubmissions
        expr: >
          sum(increase(efactura_submissions_total[2h])) == 0
          and hour() >= 8 and hour() <= 18
          and day_of_week() >= 1 and day_of_week() <= 5
        for: 2h
        labels:
          severity: critical
          team: fiscal
        annotations:
          summary: "No e-Factura submissions in 2 hours during business hours"
          description: >
            No invoices have been submitted to ANAF in the last 2 hours during 
            business hours. Check if the e-Factura system is functioning correctly.
          runbook_url: "https://wiki.cerniq.app/runbooks/efactura-no-submissions"

  - name: efactura_warnings
    interval: 1m
    rules:
      # WARNING: Day 4 deadline approaching
      - alert: EfacturaDeadlineApproaching
        expr: >
          count(efactura_days_until_deadline <= 1 and efactura_days_until_deadline > 0) > 0
        for: 5m
        labels:
          severity: warning
          team: fiscal
        annotations:
          summary: "e-Factura deadline approaching (less than 1 day)"
          description: >
            {{ $value }} invoices have less than 1 day until the ANAF deadline.
            These should be submitted immediately to avoid penalties.
          runbook_url: "https://wiki.cerniq.app/runbooks/efactura-deadline"

      # WARNING: High pending count
      - alert: EfacturaHighPendingCount
        expr: sum(efactura_pending_submissions) > 50
        for: 30m
        labels:
          severity: warning
          team: fiscal
        annotations:
          summary: "High number of pending e-Factura submissions"
          description: >
            {{ $value }} e-Factura submissions are pending ANAF response.
            This may indicate ANAF system delays or processing issues.
          runbook_url: "https://wiki.cerniq.app/runbooks/efactura-pending"

      # WARNING: ANAF processing slow
      - alert: EfacturaSlowProcessing
        expr: >
          histogram_quantile(0.95, sum(rate(efactura_anaf_processing_time_seconds_bucket[1h])) by (le)) 
          > 3600
        for: 30m
        labels:
          severity: warning
          team: fiscal
        annotations:
          summary: "ANAF processing time is slow (P95 > 1 hour)"
          description: >
            ANAF is taking longer than usual to process e-Factura submissions.
            P95 processing time: {{ $value | humanizeDuration }}
          runbook_url: "https://wiki.cerniq.app/runbooks/efactura-slow"

      # WARNING: API rate limit approaching
      - alert: EfacturaRateLimitApproaching
        expr: oblio_efactura_rate_limit_remaining < 5
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "e-Factura API rate limit approaching"
          description: >
            Only {{ $value }} API calls remaining for Oblio e-Factura endpoint.
            Submission rate should be reduced.
          runbook_url: "https://wiki.cerniq.app/runbooks/efactura-ratelimit"

      # WARNING: Circuit breaker open
      - alert: EfacturaCircuitBreakerOpen
        expr: efactura_circuit_breaker_state{state="open"} == 1
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "e-Factura circuit breaker is open"
          description: >
            The e-Factura API circuit breaker has opened due to failures.
            Submissions are being rejected until the circuit closes.
          runbook_url: "https://wiki.cerniq.app/runbooks/efactura-circuit-breaker"

  - name: efactura_info
    interval: 5m
    rules:
      # INFO: Daily summary
      - alert: EfacturaDailySummary
        expr: vector(1)
        for: 1m
        labels:
          severity: info
          team: fiscal
          notify: slack-reports
        annotations:
          summary: "e-Factura daily summary"
          description: >
            Daily e-Factura stats:
            - Submissions: {{ with query "sum(increase(efactura_submissions_total[24h]))" }}{{ . | first | value }}{{ end }}
            - Success rate: {{ with query "sum(rate(efactura_submissions_total{status='success'}[24h])) / sum(rate(efactura_submissions_total[24h])) * 100" }}{{ . | first | value | printf "%.1f" }}{{ end }}%
            - Rejections: {{ with query "sum(increase(efactura_anaf_rejections_total[24h]))" }}{{ . | first | value }}{{ end }}
            - Pending: {{ with query "sum(efactura_pending_submissions)" }}{{ . | first | value }}{{ end }}

      # INFO: Validation errors trend
      - alert: EfacturaValidationErrorsTrend
        expr: >
          sum(increase(efactura_validation_errors_total[1h])) 
          > sum(increase(efactura_validation_errors_total[1h] offset 1d)) * 2
        for: 30m
        labels:
          severity: info
          team: fiscal
        annotations:
          summary: "e-Factura validation errors increasing"
          description: >
            Validation errors are 2x higher than yesterday at this time.
            Review recent invoice data quality.
```

### 7.4 Logging Configuration

```typescript
// ============================================================================
// e-Factura Structured Logging
// ============================================================================

/**
 * Log context for e-Factura operations
 */
export interface EfacturaLogContext {
  // Identifiers
  tenantId: string;
  invoiceId?: string;
  invoiceSeries?: string;
  invoiceNumber?: number;
  indexIncarcare?: string;
  
  // Operation
  operation: 'submit' | 'status_check' | 'deadline_check' | 'retry';
  
  // Timing
  duration?: number;
  attemptNumber?: number;
  
  // Status
  status?: 'success' | 'pending' | 'failed' | 'rejected';
  anafStatus?: string;
  
  // Error details
  errorType?: string;
  errorCode?: string;
  errorMessage?: string;
  
  // Amounts
  invoiceAmount?: number;
  vatAmount?: number;
}

/**
 * Create logger with e-Factura context
 */
export function createEfacturaLogger(baseLogger: Logger) {
  return {
    submissionStarted: (ctx: EfacturaLogContext) => {
      baseLogger.info('e-Factura submission started', {
        ...ctx,
        event: 'efactura.submission.started',
      });
    },
    
    submissionSuccess: (ctx: EfacturaLogContext) => {
      baseLogger.info('e-Factura submission successful', {
        ...ctx,
        event: 'efactura.submission.success',
      });
    },
    
    submissionFailed: (ctx: EfacturaLogContext) => {
      baseLogger.error('e-Factura submission failed', {
        ...ctx,
        event: 'efactura.submission.failed',
      });
    },
    
    statusCheckCompleted: (ctx: EfacturaLogContext) => {
      baseLogger.info('e-Factura status check completed', {
        ...ctx,
        event: 'efactura.status.checked',
      });
    },
    
    anafAccepted: (ctx: EfacturaLogContext) => {
      baseLogger.info('e-Factura accepted by ANAF', {
        ...ctx,
        event: 'efactura.anaf.accepted',
      });
    },
    
    anafRejected: (ctx: EfacturaLogContext) => {
      baseLogger.warn('e-Factura rejected by ANAF', {
        ...ctx,
        event: 'efactura.anaf.rejected',
      });
    },
    
    deadlineWarning: (ctx: EfacturaLogContext & { daysRemaining: number }) => {
      baseLogger.warn('e-Factura deadline approaching', {
        ...ctx,
        event: 'efactura.deadline.warning',
      });
    },
    
    deadlineCritical: (ctx: EfacturaLogContext) => {
      baseLogger.error('e-Factura deadline critical', {
        ...ctx,
        event: 'efactura.deadline.critical',
      });
    },
    
    retryScheduled: (ctx: EfacturaLogContext & { nextAttemptAt: Date }) => {
      baseLogger.info('e-Factura retry scheduled', {
        ...ctx,
        event: 'efactura.retry.scheduled',
      });
    },
    
    hitlCreated: (ctx: EfacturaLogContext & { hitlTaskId: string }) => {
      baseLogger.warn('e-Factura HITL task created', {
        ...ctx,
        event: 'efactura.hitl.created',
      });
    },
  };
}
```


## 8. Queue Configuration

### 8.1 BullMQ Queue Definitions

```typescript
// ============================================================================
// e-Factura Queue Configuration
// ============================================================================

import { Queue, Worker, QueueScheduler, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

/**
 * Redis connection for e-Factura queues
 */
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '64039'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  db: 2, // Separate DB for e-Factura queues
});

// ============================================================================
// Queue: efactura:send
// ============================================================================

export const efacturaSendQueue = new Queue('efactura:send', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600,    // 7 days
      count: 10000,
    },
    removeOnFail: {
      age: 30 * 24 * 3600,   // 30 days (fiscal audit)
    },
  },
});

export const efacturaSendWorker = new Worker(
  'efactura:send',
  efacturaSendProcessor,
  {
    connection: redisConnection,
    concurrency: 20,
    limiter: {
      max: 30,
      duration: 60000, // 30 per minute (ANAF consideration)
    },
    lockDuration: 120000, // 2 minutes lock
    lockRenewTime: 60000, // Renew every minute
  }
);

// ============================================================================
// Queue: efactura:status:check
// ============================================================================

export const efacturaStatusCheckQueue = new Queue('efactura:status:check', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 50, // Many retries for polling
    backoff: {
      type: 'custom',
    },
    removeOnComplete: {
      age: 3 * 24 * 3600,    // 3 days
      count: 5000,
    },
    removeOnFail: {
      age: 30 * 24 * 3600,   // 30 days
    },
  },
});

export const efacturaStatusCheckWorker = new Worker(
  'efactura:status:check',
  efacturaStatusCheckProcessor,
  {
    connection: redisConnection,
    concurrency: 50,
    limiter: {
      max: 60,
      duration: 60000, // 60 per minute
    },
    lockDuration: 60000,
  }
);

// ============================================================================
// Queue: efactura:deadline:monitor
// ============================================================================

export const efacturaDeadlineMonitorQueue = new Queue('efactura:deadline:monitor', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 60000, // 1 minute
    },
    removeOnComplete: {
      age: 24 * 3600, // 1 day
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 days
    },
  },
});

export const efacturaDeadlineMonitorWorker = new Worker(
  'efactura:deadline:monitor',
  efacturaDeadlineMonitorProcessor,
  {
    connection: redisConnection,
    concurrency: 1, // Single instance
    lockDuration: 3600000, // 1 hour lock
  }
);

// ============================================================================
// Queue Schedulers
// ============================================================================

// Scheduler for delayed jobs
const efacturaSendScheduler = new QueueScheduler('efactura:send', {
  connection: redisConnection,
  stalledInterval: 30000,
  maxStalledCount: 3,
});

const efacturaStatusCheckScheduler = new QueueScheduler('efactura:status:check', {
  connection: redisConnection,
  stalledInterval: 60000,
  maxStalledCount: 2,
});

const efacturaDeadlineMonitorScheduler = new QueueScheduler('efactura:deadline:monitor', {
  connection: redisConnection,
  stalledInterval: 300000, // 5 minutes
  maxStalledCount: 2,
});

// ============================================================================
// Queue Events
// ============================================================================

const efacturaSendEvents = new QueueEvents('efactura:send', {
  connection: redisConnection,
});

efacturaSendEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info('e-Factura send job completed', { jobId, returnvalue });
});

efacturaSendEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('e-Factura send job failed', { jobId, failedReason });
});

efacturaSendEvents.on('stalled', ({ jobId }) => {
  logger.warn('e-Factura send job stalled', { jobId });
  efacturaJobsStalled.labels({ queue: 'efactura:send' }).inc();
});

// ============================================================================
// Repeatable Jobs
// ============================================================================

/**
 * Setup repeatable deadline monitor job
 * Runs every hour during business hours, every 4 hours otherwise
 */
export async function setupDeadlineMonitor(): Promise<void> {
  // Remove existing repeatable jobs
  const existingJobs = await efacturaDeadlineMonitorQueue.getRepeatableJobs();
  for (const job of existingJobs) {
    await efacturaDeadlineMonitorQueue.removeRepeatableByKey(job.key);
  }
  
  // Add new repeatable job - every hour
  await efacturaDeadlineMonitorQueue.add(
    'deadline-monitor',
    { type: 'scheduled' },
    {
      repeat: {
        pattern: '0 * * * *', // Every hour at minute 0
      },
      jobId: 'deadline-monitor-hourly',
    }
  );
  
  logger.info('e-Factura deadline monitor scheduled');
}

// ============================================================================
// Queue Priority Configuration
// ============================================================================

/**
 * Priority levels for e-Factura jobs
 */
export const EFACTURA_JOB_PRIORITIES = {
  // Highest priority - deadline approaching
  DEADLINE_CRITICAL: 1,
  
  // High priority - day 4 warning
  DEADLINE_WARNING: 2,
  
  // Normal priority - regular submissions
  NORMAL: 3,
  
  // Lower priority - resubmissions
  RESUBMISSION: 4,
  
  // Lowest priority - status checks
  STATUS_CHECK: 5,
} as const;

/**
 * Add job with priority based on deadline
 */
export async function addEfacturaJob(
  invoiceId: string,
  tenantId: string,
  invoiceDate: Date,
  isResubmission: boolean = false
): Promise<string> {
  // Calculate days until deadline
  const now = new Date();
  const daysSinceInvoice = Math.floor(
    (now.getTime() - invoiceDate.getTime()) / (24 * 60 * 60 * 1000)
  );
  const daysUntilDeadline = 5 - daysSinceInvoice;
  
  // Determine priority
  let priority: number;
  if (daysUntilDeadline <= 0) {
    priority = EFACTURA_JOB_PRIORITIES.DEADLINE_CRITICAL;
  } else if (daysUntilDeadline <= 1) {
    priority = EFACTURA_JOB_PRIORITIES.DEADLINE_WARNING;
  } else if (isResubmission) {
    priority = EFACTURA_JOB_PRIORITIES.RESUBMISSION;
  } else {
    priority = EFACTURA_JOB_PRIORITIES.NORMAL;
  }
  
  const job = await efacturaSendQueue.add(
    'submit',
    {
      invoiceId,
      tenantId,
      isResubmission,
      daysUntilDeadline,
    },
    {
      priority,
      jobId: `efactura-${tenantId}-${invoiceId}-${Date.now()}`,
    }
  );
  
  return job.id!;
}
```

### 8.2 Queue Metrics

```typescript
// ============================================================================
// Queue Monitoring Metrics
// ============================================================================

/**
 * Queue depth gauges
 */
const efacturaQueueDepth = new Gauge({
  name: 'efactura_queue_depth',
  help: 'Number of jobs in e-Factura queues',
  labelNames: ['queue', 'status'],
});

/**
 * Job processing rate
 */
const efacturaJobsProcessed = new Counter({
  name: 'efactura_jobs_processed_total',
  help: 'Total e-Factura jobs processed',
  labelNames: ['queue', 'result'],
});

/**
 * Job wait time
 */
const efacturaJobWaitTime = new Histogram({
  name: 'efactura_job_wait_time_seconds',
  help: 'Time jobs wait in queue before processing',
  labelNames: ['queue'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800],
});

/**
 * Stalled jobs counter
 */
const efacturaJobsStalled = new Counter({
  name: 'efactura_jobs_stalled_total',
  help: 'Total e-Factura jobs that stalled',
  labelNames: ['queue'],
});

/**
 * Collect queue metrics
 */
export async function collectQueueMetrics(): Promise<void> {
  const queues = [
    { name: 'efactura:send', queue: efacturaSendQueue },
    { name: 'efactura:status:check', queue: efacturaStatusCheckQueue },
    { name: 'efactura:deadline:monitor', queue: efacturaDeadlineMonitorQueue },
  ];
  
  for (const { name, queue } of queues) {
    const waiting = await queue.getWaitingCount();
    const active = await queue.getActiveCount();
    const delayed = await queue.getDelayedCount();
    const failed = await queue.getFailedCount();
    
    efacturaQueueDepth.labels({ queue: name, status: 'waiting' }).set(waiting);
    efacturaQueueDepth.labels({ queue: name, status: 'active' }).set(active);
    efacturaQueueDepth.labels({ queue: name, status: 'delayed' }).set(delayed);
    efacturaQueueDepth.labels({ queue: name, status: 'failed' }).set(failed);
  }
}

// Collect metrics every 15 seconds
setInterval(collectQueueMetrics, 15000);
```

### 8.3 Queue Health Checks

```typescript
// ============================================================================
// e-Factura Queue Health Checks
// ============================================================================

import { HealthCheckResult } from '../health';

/**
 * Check e-Factura queue health
 */
export async function checkEfacturaQueueHealth(): Promise<HealthCheckResult> {
  const checks: { name: string; healthy: boolean; details: any }[] = [];
  
  try {
    // Check send queue
    const sendQueueHealth = await checkQueueHealth(efacturaSendQueue, 'efactura:send', {
      maxWaiting: 100,
      maxFailed: 10,
    });
    checks.push(sendQueueHealth);
    
    // Check status check queue
    const statusCheckHealth = await checkQueueHealth(efacturaStatusCheckQueue, 'efactura:status:check', {
      maxWaiting: 500,
      maxFailed: 50,
    });
    checks.push(statusCheckHealth);
    
    // Check deadline monitor queue
    const deadlineHealth = await checkQueueHealth(efacturaDeadlineMonitorQueue, 'efactura:deadline:monitor', {
      maxWaiting: 10,
      maxFailed: 5,
    });
    checks.push(deadlineHealth);
    
    // Check worker connections
    const workersHealthy = 
      efacturaSendWorker.isRunning() &&
      efacturaStatusCheckWorker.isRunning() &&
      efacturaDeadlineMonitorWorker.isRunning();
    
    checks.push({
      name: 'workers',
      healthy: workersHealthy,
      details: {
        sendWorker: efacturaSendWorker.isRunning(),
        statusCheckWorker: efacturaStatusCheckWorker.isRunning(),
        deadlineMonitorWorker: efacturaDeadlineMonitorWorker.isRunning(),
      },
    });
    
    const allHealthy = checks.every(c => c.healthy);
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check individual queue health
 */
async function checkQueueHealth(
  queue: Queue,
  name: string,
  thresholds: { maxWaiting: number; maxFailed: number }
): Promise<{ name: string; healthy: boolean; details: any }> {
  const waiting = await queue.getWaitingCount();
  const active = await queue.getActiveCount();
  const delayed = await queue.getDelayedCount();
  const failed = await queue.getFailedCount();
  
  const healthy = waiting < thresholds.maxWaiting && failed < thresholds.maxFailed;
  
  return {
    name,
    healthy,
    details: {
      waiting,
      active,
      delayed,
      failed,
      thresholds,
    },
  };
}
```


## 9. Testing Specification

### 9.1 Unit Tests

```typescript
// ============================================================================
// e-Factura Unit Tests
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  EfacturaSendWorker,
  EfacturaStatusCheckWorker,
  EfacturaDeadlineMonitorWorker 
} from '../workers';
import { UblInvoiceGenerator, UblXmlValidator } from '../ubl';
import { EfacturaIdempotencyManager, classifyEfacturaError } from '../errors';

describe('UblInvoiceGenerator', () => {
  let generator: UblInvoiceGenerator;
  
  beforeEach(() => {
    generator = new UblInvoiceGenerator();
  });
  
  describe('generateInvoiceXml', () => {
    it('should generate valid UBL XML with all required fields', () => {
      const invoice = createTestInvoice();
      const xml = generator.generateInvoiceXml(invoice);
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Invoice');
      expect(xml).toContain('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2');
      expect(xml).toContain('urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1');
    });
    
    it('should include supplier party with Romanian CIF', () => {
      const invoice = createTestInvoice({
        supplier: {
          registrationName: 'Test SRL',
          companyId: '12345678',
          companyTaxId: 'RO12345678',
          taxSchemeId: 'VAT',
          address: {
            streetName: 'Strada Test 123',
            cityName: 'București',
            country: 'RO',
          },
        },
      });
      
      const xml = generator.generateInvoiceXml(invoice);
      
      expect(xml).toContain('<cbc:CompanyID>RO12345678</cbc:CompanyID>');
      expect(xml).toContain('<cbc:RegistrationName>Test SRL</cbc:RegistrationName>');
    });
    
    it('should calculate correct tax totals', () => {
      const invoice = createTestInvoice({
        taxTotals: [{
          taxAmount: 190,
          taxCurrency: 'RON',
          taxSubtotals: [{
            taxableAmount: 1000,
            taxAmount: 190,
            taxCategory: {
              id: 'S',
              percent: 19,
              taxScheme: 'VAT',
            },
          }],
        }],
      });
      
      const xml = generator.generateInvoiceXml(invoice);
      
      expect(xml).toContain('<cbc:TaxAmount currencyID="RON">190.00</cbc:TaxAmount>');
      expect(xml).toContain('<cbc:Percent>19</cbc:Percent>');
    });
    
    it('should include multiple VAT rates correctly', () => {
      const invoice = createTestInvoice({
        taxTotals: [{
          taxAmount: 235,
          taxCurrency: 'RON',
          taxSubtotals: [
            {
              taxableAmount: 1000,
              taxAmount: 190,
              taxCategory: { id: 'S', percent: 19, taxScheme: 'VAT' },
            },
            {
              taxableAmount: 500,
              taxAmount: 45,
              taxCategory: { id: 'S', percent: 9, taxScheme: 'VAT' },
            },
          ],
        }],
      });
      
      const xml = generator.generateInvoiceXml(invoice);
      
      expect(xml).toContain('<cbc:Percent>19</cbc:Percent>');
      expect(xml).toContain('<cbc:Percent>9</cbc:Percent>');
    });
  });
});

describe('UblXmlValidator', () => {
  let validator: UblXmlValidator;
  
  beforeEach(() => {
    validator = new UblXmlValidator();
  });
  
  describe('validate', () => {
    it('should pass valid invoice XML', async () => {
      const xml = generateValidTestXml();
      const result = await validator.validate(xml);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should fail on malformed XML', async () => {
      const xml = '<Invoice><broken';
      const result = await validator.validate(xml);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'XML-001' })
      );
    });
    
    it('should fail on missing invoice ID', async () => {
      const xml = generateTestXmlWithout('cbc:ID');
      const result = await validator.validate(xml);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'BR-01' })
      );
    });
    
    it('should fail on invalid Romanian CIF', async () => {
      const xml = generateTestXmlWithCIF('RO99999999'); // Invalid checksum
      const result = await validator.validate(xml);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'BR-RO-010' })
      );
    });
    
    it('should fail on future invoice date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const xml = generateTestXmlWithDate(futureDate);
      const result = await validator.validate(xml);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'BR-RO-040' })
      );
    });
    
    it('should fail on invalid VAT rate', async () => {
      const xml = generateTestXmlWithVatRate(15); // Invalid rate
      const result = await validator.validate(xml);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'BR-RO-050' })
      );
    });
    
    it('should fail on calculation mismatch', async () => {
      const xml = generateTestXmlWithWrongTotal();
      const result = await validator.validate(xml);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'BR-RO-070' })
      );
    });
  });
});

describe('EfacturaIdempotencyManager', () => {
  let manager: EfacturaIdempotencyManager;
  let mockRedis: any;
  
  beforeEach(() => {
    mockRedis = createMockRedis();
    manager = new EfacturaIdempotencyManager(mockRedis);
  });
  
  describe('generateSubmissionKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = manager.generateSubmissionKey('tenant1', 'ABC', 123);
      const key2 = manager.generateSubmissionKey('tenant1', 'ABC', 123);
      
      expect(key1).toBe(key2);
    });
    
    it('should generate different keys for different input', () => {
      const key1 = manager.generateSubmissionKey('tenant1', 'ABC', 123);
      const key2 = manager.generateSubmissionKey('tenant1', 'ABC', 124);
      
      expect(key1).not.toBe(key2);
    });
  });
  
  describe('checkSubmission', () => {
    it('should return exists: false for new submission', async () => {
      mockRedis.hgetall.mockResolvedValue({});
      
      const result = await manager.checkSubmission('test-key');
      
      expect(result.exists).toBe(false);
    });
    
    it('should return existing submission data', async () => {
      mockRedis.hgetall.mockResolvedValue({
        status: 'completed',
        indexIncarcare: 'ABC123',
        submittedAt: '2024-01-15T10:00:00Z',
      });
      
      const result = await manager.checkSubmission('test-key');
      
      expect(result.exists).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.indexIncarcare).toBe('ABC123');
    });
  });
  
  describe('markSubmissionPending', () => {
    it('should set pending status for new submission', async () => {
      mockRedis.hsetnx.mockResolvedValue(1); // Successfully set
      
      const result = await manager.markSubmissionPending('test-key', 'job-1');
      
      expect(result).toBe(true);
      expect(mockRedis.hset).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalled();
    });
    
    it('should reject if already pending', async () => {
      mockRedis.hsetnx.mockResolvedValue(0); // Already exists
      mockRedis.hget.mockResolvedValue(new Date().toISOString()); // Recent
      
      const result = await manager.markSubmissionPending('test-key', 'job-2');
      
      expect(result).toBe(false);
    });
    
    it('should allow retry for stale pending', async () => {
      mockRedis.hsetnx.mockResolvedValue(0);
      // 45 minutes ago (stale)
      const staleTime = new Date(Date.now() - 45 * 60 * 1000).toISOString();
      mockRedis.hget.mockResolvedValue(staleTime);
      
      const result = await manager.markSubmissionPending('test-key', 'job-2');
      
      expect(result).toBe(true);
    });
  });
});

describe('classifyEfacturaError', () => {
  it('should classify network errors as retryable', () => {
    const error = { code: 'ECONNREFUSED' };
    expect(classifyEfacturaError(error)).toBe('NETWORK_ERROR');
  });
  
  it('should classify timeout as retryable', () => {
    const error = { code: 'ETIMEDOUT' };
    expect(classifyEfacturaError(error)).toBe('TIMEOUT');
  });
  
  it('should classify 429 as rate limit', () => {
    const error = { response: { status: 429 } };
    expect(classifyEfacturaError(error)).toBe('RATE_LIMIT');
  });
  
  it('should classify 401 as authentication error', () => {
    const error = { response: { status: 401 } };
    expect(classifyEfacturaError(error)).toBe('AUTHENTICATION_ERROR');
  });
  
  it('should classify duplicate error from response', () => {
    const error = {
      response: {
        status: 400,
        data: { errorCode: 'DUPLICAT', message: 'Factura a fost deja trimisă' },
      },
    };
    expect(classifyEfacturaError(error)).toBe('DUPLICATE_ERROR');
  });
  
  it('should classify schema error', () => {
    const error = {
      response: {
        status: 400,
        data: { errorCode: 'UBL-CR-001', message: 'Schema validation failed' },
      },
    };
    expect(classifyEfacturaError(error)).toBe('SCHEMA_ERROR');
  });
  
  it('should classify ANAF busy as retryable', () => {
    const error = {
      response: {
        status: 503,
        data: { message: 'Sistem indisponibil temporar' },
      },
    };
    expect(classifyEfacturaError(error)).toBe('ANAF_BUSY');
  });
});
```

### 9.2 Integration Tests

```typescript
// ============================================================================
// e-Factura Integration Tests
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContainer } from '../test-utils';

describe('e-Factura Integration Tests', () => {
  let container: TestContainer;
  let oblioMock: OblioMockServer;
  
  beforeAll(async () => {
    container = await createTestContainer();
    oblioMock = await OblioMockServer.start();
  });
  
  afterAll(async () => {
    await container.cleanup();
    await oblioMock.stop();
  });
  
  describe('efactura:send worker', () => {
    it('should submit invoice to ANAF via Oblio', async () => {
      // Setup
      const invoice = await container.createTestInvoice({
        series: 'TEST',
        number: 1,
        status: 'INVOICED',
      });
      
      // Mock Oblio response
      oblioMock.onEfacturaSend().reply(200, {
        index_incarcare: 'ABC123456',
        data_incarcare: '2024-01-15T10:00:00Z',
      });
      
      // Execute
      const job = await container.addJob('efactura:send', {
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
      });
      
      await container.waitForJob(job.id);
      
      // Verify
      const updatedInvoice = await container.getInvoice(invoice.id);
      expect(updatedInvoice.efacturaStatus).toBe('PENDING');
      expect(updatedInvoice.efacturaIndexIncarcare).toBe('ABC123456');
      
      const submission = await container.getEfacturaSubmission(invoice.id);
      expect(submission.status).toBe('pending');
    });
    
    it('should validate XML before submission', async () => {
      // Setup invalid invoice
      const invoice = await container.createTestInvoice({
        series: 'TEST',
        number: 2,
        supplierCif: 'INVALID', // Invalid CIF
      });
      
      // Execute
      const job = await container.addJob('efactura:send', {
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
      });
      
      await container.waitForJob(job.id, { expectFailure: true });
      
      // Verify HITL task created
      const hitlTasks = await container.getHitlTasks({
        type: 'efactura_error',
        invoiceId: invoice.id,
      });
      expect(hitlTasks).toHaveLength(1);
      expect(hitlTasks[0].errorType).toBe('VALIDATION_ERROR');
    });
    
    it('should handle duplicate submission', async () => {
      const invoice = await container.createTestInvoice({
        series: 'TEST',
        number: 3,
        efacturaIndexIncarcare: 'EXISTING123', // Already submitted
      });
      
      // Execute
      const job = await container.addJob('efactura:send', {
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
      });
      
      const result = await container.waitForJob(job.id);
      
      // Should succeed without re-submission
      expect(result.alreadySubmitted).toBe(true);
      expect(oblioMock.getCallCount('efactura/send')).toBe(0);
    });
  });
  
  describe('efactura:status:check worker', () => {
    it('should update status when ANAF accepts', async () => {
      const submission = await container.createTestSubmission({
        indexIncarcare: 'TEST123',
        status: 'pending',
      });
      
      // Mock ANAF accepted status
      oblioMock.onEfacturaStatus('TEST123').reply(200, {
        stare: 'ok',
        id_solicitare: 'SOL123',
        data_creare: '2024-01-15T10:00:00Z',
      });
      
      // Execute
      const job = await container.addJob('efactura:status:check', {
        indexIncarcare: 'TEST123',
        tenantId: submission.tenantId,
        invoiceId: submission.invoiceId,
      });
      
      await container.waitForJob(job.id);
      
      // Verify
      const updatedSubmission = await container.getEfacturaSubmission(submission.invoiceId);
      expect(updatedSubmission.status).toBe('accepted');
      
      const invoice = await container.getInvoice(submission.invoiceId);
      expect(invoice.efacturaStatus).toBe('SENT');
    });
    
    it('should reschedule check when still processing', async () => {
      const submission = await container.createTestSubmission({
        indexIncarcare: 'TEST456',
        status: 'pending',
      });
      
      // Mock still processing
      oblioMock.onEfacturaStatus('TEST456').reply(200, {
        stare: 'in_prelucrare',
      });
      
      // Execute
      const job = await container.addJob('efactura:status:check', {
        indexIncarcare: 'TEST456',
        tenantId: submission.tenantId,
        invoiceId: submission.invoiceId,
      });
      
      await container.waitForJob(job.id);
      
      // Verify new check scheduled
      const delayedJobs = await container.getDelayedJobs('efactura:status:check');
      expect(delayedJobs.some(j => 
        j.data.indexIncarcare === 'TEST456'
      )).toBe(true);
    });
    
    it('should create HITL task on rejection', async () => {
      const submission = await container.createTestSubmission({
        indexIncarcare: 'TEST789',
        status: 'pending',
      });
      
      // Mock ANAF rejection
      oblioMock.onEfacturaStatus('TEST789').reply(200, {
        stare: 'nok',
        detalii: 'BR-RO-010: CIF furnizor invalid',
      });
      
      // Execute
      const job = await container.addJob('efactura:status:check', {
        indexIncarcare: 'TEST789',
        tenantId: submission.tenantId,
        invoiceId: submission.invoiceId,
      });
      
      await container.waitForJob(job.id);
      
      // Verify HITL task
      const hitlTasks = await container.getHitlTasks({
        type: 'efactura_rejection',
        invoiceId: submission.invoiceId,
      });
      expect(hitlTasks).toHaveLength(1);
      expect(hitlTasks[0].details).toContain('BR-RO-010');
    });
  });
  
  describe('efactura:deadline:monitor worker', () => {
    it('should warn on day 4 invoices', async () => {
      // Create invoice from 4 days ago
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      
      await container.createTestInvoice({
        series: 'WARN',
        number: 1,
        invoiceDate: fourDaysAgo,
        efacturaStatus: null, // Not submitted
      });
      
      // Execute deadline monitor
      const job = await container.addJob('efactura:deadline:monitor', {
        type: 'scheduled',
      });
      
      await container.waitForJob(job.id);
      
      // Verify warning was triggered
      const warnings = await container.getDeadlineWarnings({ type: 'day4' });
      expect(warnings.length).toBeGreaterThan(0);
    });
    
    it('should auto-submit critical deadline invoices', async () => {
      // Create invoice from 5 days ago
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      const invoice = await container.createTestInvoice({
        series: 'CRIT',
        number: 1,
        invoiceDate: fiveDaysAgo,
        efacturaStatus: null,
      });
      
      // Mock Oblio response
      oblioMock.onEfacturaSend().reply(200, {
        index_incarcare: 'AUTO123',
        data_incarcare: new Date().toISOString(),
      });
      
      // Execute deadline monitor
      const job = await container.addJob('efactura:deadline:monitor', {
        type: 'scheduled',
      });
      
      await container.waitForJob(job.id);
      
      // Verify auto-submission was triggered
      const sendJobs = await container.getCompletedJobs('efactura:send');
      expect(sendJobs.some(j => j.data.invoiceId === invoice.id)).toBe(true);
    });
  });
});
```

### 9.3 E2E Tests

```typescript
// ============================================================================
// e-Factura End-to-End Tests
// ============================================================================

import { test, expect } from '@playwright/test';

test.describe('e-Factura Flow', () => {
  test('complete invoice to e-Factura flow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@cerniq.app');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to negotiations
    await page.goto('/negotiations');
    
    // Find negotiation in PROFORMA_ACCEPTED status
    await page.click('[data-testid="filter-status"]');
    await page.click('[data-testid="status-PROFORMA_ACCEPTED"]');
    
    // Click first negotiation
    await page.click('[data-testid="negotiation-row"]:first-child');
    
    // Create invoice from proforma
    await page.click('[data-testid="create-invoice-button"]');
    await page.waitForSelector('[data-testid="invoice-preview"]');
    
    // Verify invoice details
    expect(await page.textContent('[data-testid="invoice-total"]')).toContain('RON');
    
    // Confirm invoice creation
    await page.click('[data-testid="confirm-invoice-button"]');
    
    // Wait for invoice created
    await page.waitForSelector('[data-testid="invoice-created-success"]');
    
    // Verify e-Factura status shows pending
    await expect(page.locator('[data-testid="efactura-status"]')).toContainText('În așteptare');
    
    // Navigate to e-Factura monitor
    await page.goto('/efactura');
    
    // Verify invoice appears in pending list
    await expect(page.locator('[data-testid="pending-submissions"]')).toContainText('1');
  });
  
  test('e-Factura HITL resolution flow', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@cerniq.app');
    await page.fill('[data-testid="password"]', 'adminpassword');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to HITL tasks
    await page.goto('/hitl');
    
    // Filter for e-Factura tasks
    await page.click('[data-testid="filter-type"]');
    await page.click('[data-testid="type-efactura"]');
    
    // Click first task
    await page.click('[data-testid="hitl-task-row"]:first-child');
    
    // View task details
    await expect(page.locator('[data-testid="task-type"]')).toContainText('e-Factura');
    await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
    
    // Edit invoice data to fix error
    await page.click('[data-testid="edit-invoice-button"]');
    await page.fill('[data-testid="supplier-cif"]', 'RO12345678'); // Fix CIF
    await page.click('[data-testid="save-changes-button"]');
    
    // Approve resubmission
    await page.click('[data-testid="approve-resubmit-button"]');
    
    // Confirm
    await page.click('[data-testid="confirm-dialog-yes"]');
    
    // Verify task resolved
    await expect(page.locator('[data-testid="task-status"]')).toContainText('Rezolvat');
  });
});
```

