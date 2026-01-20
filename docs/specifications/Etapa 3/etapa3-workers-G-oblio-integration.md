# Etapa 3 - Workers Category G: Oblio Integration

> **Document Version**: 1.0.0
> **Last Updated**: 2026-01-18
> **Author**: Cerniq Development Team
> **Status**: Complete Specification
> **Category**: G - External Fiscal Integration
> **Workers Count**: 4

---

## Table of Contents

1. [Category Overview](#1-category-overview)
2. [Worker #19: oblio:client:validate](#2-worker-19-oblioclientvalidate)
3. [Worker #20: oblio:proforma:create](#3-worker-20-oblioproformacreate)
4. [Worker #21: oblio:invoice:create](#4-worker-21-oblioinvoicecreate)
5. [Worker #22: oblio:invoice:cancel](#5-worker-22-oblioinvoicecancel)
6. [Oblio API Integration](#6-oblio-api-integration)
7. [Retry & Error Handling](#7-retry--error-handling)
8. [Monitoring & Alerts](#8-monitoring--alerts)
9. [Queue Configuration](#9-queue-configuration)

---

## 1. Category Overview

### 1.1 Purpose

Category G workers handle all integration with Oblio.eu, Romania's leading cloud invoicing platform. These workers manage:

- **Client Validation**: Verify client fiscal data against Oblio records
- **Proforma Creation**: Generate proforma invoices for negotiation approval
- **Invoice Creation**: Convert approved profomas to fiscal invoices
- **Invoice Cancellation**: Handle storno/cancellation with proper fiscal trail

### 1.2 Oblio.eu Platform

**Platform Details:**
- **Website**: https://www.oblio.eu
- **API Documentation**: https://www.oblio.eu/api
- **Service Type**: Cloud-based invoicing & fiscal compliance
- **Romanian Compliance**: ANAF-certified e-Factura integration
- **Features**: Proforma, invoice, receipt, e-Factura SPV

### 1.3 Architecture Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OBLIO INTEGRATION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │ Negotiation FSM │                                                        │
│  │ (Category D)    │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼ CLOSING → PROFORMA_SENT                                         │
│  ┌─────────────────┐      ┌──────────────────┐      ┌──────────────────┐   │
│  │ oblio:client:   │─────▶│ oblio:proforma:  │─────▶│ oblio:invoice:   │   │
│  │ validate (#19)  │      │ create (#20)     │      │ create (#21)     │   │
│  └─────────────────┘      └──────────────────┘      └──────────────────┘   │
│           │                        │                         │              │
│           ▼                        ▼                         ▼              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         OBLIO.EU API                                │   │
│  │  • POST /api/v1/clients       - Validate/Create client              │   │
│  │  • POST /api/v1/proforma      - Create proforma invoice             │   │
│  │  • POST /api/v1/invoice       - Create fiscal invoice               │   │
│  │  • POST /api/v1/invoice/storno - Cancel/storno invoice              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │ oblio:invoice:  │◀──── Manual cancellation / Client dispute             │
│  │ cancel (#22)    │                                                        │
│  └─────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Workers Summary

| # | Worker | Queue | Concurrency | Timeout | Retries | Priority |
|---|--------|-------|-------------|---------|---------|----------|
| 19 | oblio:client:validate | `oblio:client:validate` | 50 | 15s | 3 | HIGH |
| 20 | oblio:proforma:create | `oblio:proforma:create` | 30 | 30s | 5 | CRITICAL |
| 21 | oblio:invoice:create | `oblio:invoice:create` | 30 | 30s | 5 | CRITICAL |
| 22 | oblio:invoice:cancel | `oblio:invoice:cancel` | 20 | 30s | 3 | HIGH |

### 1.5 Critical Path Integration

```
                    NEGOTIATION STATE MACHINE TRIGGERS
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  CLOSING ──trigger──▶ oblio:client:validate                     │
│      │                       │                                  │
│      │               ┌───────┴───────┐                          │
│      │               ▼               ▼                          │
│      │           VALID          INVALID                         │
│      │               │               │                          │
│      │               ▼               ▼                          │
│      │       oblio:proforma     HITL: Fix                       │
│      │       :create            client data                     │
│      │               │                                          │
│      ▼               ▼                                          │
│  PROFORMA_SENT ◀─────┘                                          │
│      │                                                          │
│      ▼ (client accepts)                                         │
│  PROFORMA_ACCEPTED ──trigger──▶ oblio:invoice:create            │
│      │                                │                         │
│      ▼                                ▼                         │
│  INVOICED ◀───────────────────────────┘                         │
│      │                                                          │
│      ▼ (e-Factura integration continues...)                     │
│  EINVOICE_PENDING                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Worker #19: oblio:client:validate

### 2.1 Worker Specification

| Property | Value |
|----------|-------|
| **Queue Name** | `oblio:client:validate` |
| **Concurrency** | 50 |
| **Timeout** | 15 seconds |
| **Retries** | 3 |
| **Backoff** | Exponential (2s base) |
| **Priority** | HIGH |
| **Rate Limit** | 100/minute (Oblio API limit) |

### 2.2 Purpose

Validates client fiscal data before proforma/invoice creation. Ensures:
- CUI/CIF validity against ANAF records
- Client exists in Oblio or creates new client
- Fiscal attributes match (TVA payer status, company name)
- Contact information is complete for invoice delivery

### 2.3 Job Data Interface

```typescript
// ============================================================================
// WORKER #19: oblio:client:validate - Job Interfaces
// ============================================================================

import { z } from 'zod';

/**
 * Client data for validation
 */
export const OblioClientDataSchema = z.object({
  // Required fiscal identification
  cui: z.string().regex(/^(RO)?[0-9]{2,10}$/, 'Invalid CUI format'),
  companyName: z.string().min(2).max(200),
  
  // Address (required for invoicing)
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  county: z.string().min(2).max(50),
  country: z.string().default('Romania'),
  postalCode: z.string().optional(),
  
  // Contact (required for invoice delivery)
  email: z.string().email(),
  phone: z.string().optional(),
  
  // Fiscal attributes
  isVatPayer: z.boolean(),
  vatNumber: z.string().optional(), // RO + CUI for VAT payers
  
  // Registration info
  registrationNumber: z.string().optional(), // J40/1234/2020 format
  
  // Banking (optional but recommended)
  bankName: z.string().optional(),
  bankAccount: z.string().optional(), // IBAN
});

export type OblioClientData = z.infer<typeof OblioClientDataSchema>;

/**
 * Job data for client validation
 */
export const ClientValidateJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  negotiationId: z.string().uuid(),
  contactId: z.string().uuid(),
  
  // Client data to validate
  clientData: OblioClientDataSchema,
  
  // Options
  options: z.object({
    // Create client in Oblio if not exists
    createIfNotExists: z.boolean().default(true),
    
    // Update existing client with new data
    updateIfDifferent: z.boolean().default(true),
    
    // Verify against ANAF records
    verifyWithAnaf: z.boolean().default(true),
    
    // Skip validation if already validated recently
    cacheValidation: z.boolean().default(true),
    cacheTtlSeconds: z.number().default(86400), // 24 hours
  }).optional(),
  
  // Correlation for tracing
  correlationId: z.string().uuid().optional(),
});

export type ClientValidateJobData = z.infer<typeof ClientValidateJobDataSchema>;

/**
 * Validation result
 */
export interface ClientValidateResult {
  valid: boolean;
  
  // Oblio client reference
  oblioClientId?: string;
  oblioClientCif?: string;
  
  // Validation details
  validation: {
    cuiValid: boolean;
    cuiMessage?: string;
    
    companyNameMatch: boolean;
    companyNameOblio?: string;
    companyNameAnaf?: string;
    
    vatStatusMatch: boolean;
    vatStatusOblio?: boolean;
    vatStatusAnaf?: boolean;
    
    addressComplete: boolean;
    addressIssues?: string[];
    
    contactComplete: boolean;
    contactIssues?: string[];
  };
  
  // Action taken
  action: 'VALIDATED_EXISTING' | 'CREATED_NEW' | 'UPDATED_EXISTING' | 'VALIDATION_FAILED';
  
  // If failed, what needs to be fixed
  requiredFixes?: Array<{
    field: string;
    issue: string;
    suggestion?: string;
  }>;
  
  // Cached until
  cachedUntil?: Date;
  
  // ANAF data if fetched
  anafData?: {
    denumire: string;
    adresa: string;
    stare_inregistrare: string;
    scpTVA: boolean;
    data_inregistrare_tva?: string;
    statusRO_e_Factura: boolean;
  };
}
```

### 2.4 Worker Implementation

```typescript
// ============================================================================
// WORKER #19: oblio:client:validate - Implementation
// ============================================================================

import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { db } from '@/db';
import { 
  contacts, 
  negotiations, 
  oblioClients,
  oblioClientValidations,
  anafVerifications,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { OblioClient } from '@/integrations/oblio';
import { AnafClient } from '@/integrations/anaf';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';
import {
  ClientValidateJobData,
  ClientValidateJobDataSchema,
  ClientValidateResult,
  OblioClientData,
} from './types';

const redis = new Redis(process.env.REDIS_URL!);

/**
 * Worker #19: Oblio Client Validation
 * 
 * Validates and syncs client data with Oblio.eu before fiscal document creation
 */
export const oblioClientValidateWorker = new Worker<ClientValidateJobData, ClientValidateResult>(
  'oblio:client:validate',
  async (job: Job<ClientValidateJobData, ClientValidateResult>) => {
    const startTime = Date.now();
    const { tenantId, negotiationId, contactId, clientData, options } = job.data;
    
    const log = logger.child({
      worker: 'oblio:client:validate',
      jobId: job.id,
      tenantId,
      negotiationId,
      cui: clientData.cui,
    });
    
    log.info('Starting client validation');
    
    try {
      // 1. Validate input
      const validated = ClientValidateJobDataSchema.parse(job.data);
      
      // 2. Check cache if enabled
      if (options?.cacheValidation !== false) {
        const cached = await checkValidationCache(tenantId, clientData.cui);
        if (cached) {
          log.info('Returning cached validation', { cachedUntil: cached.cachedUntil });
          metrics.oblioClientValidationsCached.inc({ tenant_id: tenantId });
          return cached;
        }
      }
      
      // 3. Initialize clients
      const oblioClient = await getOblioClient(tenantId);
      const anafClient = new AnafClient();
      
      // 4. Verify with ANAF if enabled
      let anafData = null;
      if (options?.verifyWithAnaf !== false) {
        anafData = await verifyWithAnaf(anafClient, clientData.cui);
        
        // Store ANAF verification
        await db.insert(anafVerifications).values({
          tenantId,
          cui: clientData.cui.replace(/^RO/, ''),
          responseData: anafData,
          verifiedAt: new Date(),
        });
      }
      
      // 5. Validate client data
      const validation = validateClientData(clientData, anafData);
      
      // 6. If validation failed, return with required fixes
      if (!validation.isValid) {
        const result: ClientValidateResult = {
          valid: false,
          validation: validation.details,
          action: 'VALIDATION_FAILED',
          requiredFixes: validation.requiredFixes,
          anafData: anafData || undefined,
        };
        
        // Record validation failure
        await recordValidation(tenantId, negotiationId, contactId, clientData.cui, result, false);
        
        metrics.oblioClientValidationsFailed.inc({ 
          tenant_id: tenantId,
          reason: validation.requiredFixes?.[0]?.field || 'unknown',
        });
        
        return result;
      }
      
      // 7. Check if client exists in Oblio
      let oblioClientRecord = await findOblioClient(oblioClient, clientData.cui);
      let action: ClientValidateResult['action'] = 'VALIDATED_EXISTING';
      
      // 8. Create or update client in Oblio
      if (!oblioClientRecord && options?.createIfNotExists !== false) {
        oblioClientRecord = await createOblioClient(oblioClient, clientData, anafData);
        action = 'CREATED_NEW';
        log.info('Created new client in Oblio', { oblioClientId: oblioClientRecord.cif });
      } else if (oblioClientRecord && options?.updateIfDifferent !== false) {
        const needsUpdate = checkNeedsUpdate(oblioClientRecord, clientData);
        if (needsUpdate) {
          oblioClientRecord = await updateOblioClient(oblioClient, oblioClientRecord.cif, clientData);
          action = 'UPDATED_EXISTING';
          log.info('Updated client in Oblio', { oblioClientId: oblioClientRecord.cif });
        }
      }
      
      // 9. Store Oblio client reference locally
      await db.insert(oblioClients)
        .values({
          tenantId,
          contactId,
          cui: clientData.cui,
          oblioClientCif: oblioClientRecord?.cif,
          oblioClientData: oblioClientRecord,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [oblioClients.tenantId, oblioClients.cui],
          set: {
            oblioClientCif: oblioClientRecord?.cif,
            oblioClientData: oblioClientRecord,
            lastSyncedAt: new Date(),
          },
        });
      
      // 10. Build success result
      const cachedUntil = new Date(Date.now() + (options?.cacheTtlSeconds || 86400) * 1000);
      
      const result: ClientValidateResult = {
        valid: true,
        oblioClientId: oblioClientRecord?.cif,
        oblioClientCif: oblioClientRecord?.cif,
        validation: validation.details,
        action,
        cachedUntil,
        anafData: anafData || undefined,
      };
      
      // 11. Cache result
      if (options?.cacheValidation !== false) {
        await cacheValidation(tenantId, clientData.cui, result, options?.cacheTtlSeconds || 86400);
      }
      
      // 12. Record successful validation
      await recordValidation(tenantId, negotiationId, contactId, clientData.cui, result, true);
      
      // 13. Emit success metric
      metrics.oblioClientValidationsSuccess.inc({ 
        tenant_id: tenantId,
        action,
      });
      
      const duration = Date.now() - startTime;
      metrics.oblioClientValidationDuration.observe({ tenant_id: tenantId }, duration);
      
      log.info('Client validation completed', { action, duration });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('Client validation failed', { error, duration });
      
      metrics.oblioClientValidationsError.inc({ 
        tenant_id: tenantId,
        error_type: error instanceof Error ? error.constructor.name : 'Unknown',
      });
      
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 50,
    limiter: {
      max: 100,
      duration: 60000, // 100 per minute
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
 * Verify CUI with ANAF
 */
async function verifyWithAnaf(client: AnafClient, cui: string): Promise<any> {
  // Normalize CUI (remove RO prefix if present)
  const normalizedCui = cui.replace(/^RO/, '');
  
  const result = await client.getCompanyInfo([normalizedCui]);
  
  if (!result || result.length === 0) {
    throw new Error(`CUI ${normalizedCui} not found in ANAF records`);
  }
  
  return result[0];
}

/**
 * Validate client data against ANAF records
 */
function validateClientData(
  clientData: OblioClientData,
  anafData: any | null
): {
  isValid: boolean;
  details: ClientValidateResult['validation'];
  requiredFixes?: ClientValidateResult['requiredFixes'];
} {
  const details: ClientValidateResult['validation'] = {
    cuiValid: true,
    companyNameMatch: true,
    vatStatusMatch: true,
    addressComplete: true,
    contactComplete: true,
  };
  
  const requiredFixes: ClientValidateResult['requiredFixes'] = [];
  
  // Validate CUI format
  const cuiRegex = /^(RO)?[0-9]{2,10}$/;
  if (!cuiRegex.test(clientData.cui)) {
    details.cuiValid = false;
    details.cuiMessage = 'Invalid CUI format';
    requiredFixes.push({
      field: 'cui',
      issue: 'Invalid CUI format',
      suggestion: 'CUI should be 2-10 digits, optionally prefixed with RO',
    });
  }
  
  // Validate against ANAF if data available
  if (anafData) {
    // Company name match (fuzzy)
    const anafName = anafData.denumire?.toUpperCase() || '';
    const clientName = clientData.companyName.toUpperCase();
    const nameMatch = anafName.includes(clientName) || clientName.includes(anafName) ||
                      levenshteinDistance(anafName, clientName) < 5;
    
    if (!nameMatch) {
      details.companyNameMatch = false;
      details.companyNameOblio = clientData.companyName;
      details.companyNameAnaf = anafData.denumire;
      requiredFixes.push({
        field: 'companyName',
        issue: 'Company name does not match ANAF records',
        suggestion: `Use ANAF registered name: ${anafData.denumire}`,
      });
    }
    
    // VAT status match
    const anafVatPayer = anafData.scpTVA === true;
    if (clientData.isVatPayer !== anafVatPayer) {
      details.vatStatusMatch = false;
      details.vatStatusOblio = clientData.isVatPayer;
      details.vatStatusAnaf = anafVatPayer;
      requiredFixes.push({
        field: 'isVatPayer',
        issue: `VAT status mismatch: client says ${clientData.isVatPayer}, ANAF says ${anafVatPayer}`,
        suggestion: `Set isVatPayer to ${anafVatPayer}`,
      });
    }
  }
  
  // Validate address completeness
  const addressIssues: string[] = [];
  if (!clientData.address || clientData.address.length < 5) {
    addressIssues.push('Address is required and must be at least 5 characters');
  }
  if (!clientData.city || clientData.city.length < 2) {
    addressIssues.push('City is required');
  }
  if (!clientData.county || clientData.county.length < 2) {
    addressIssues.push('County is required');
  }
  
  if (addressIssues.length > 0) {
    details.addressComplete = false;
    details.addressIssues = addressIssues;
    requiredFixes.push({
      field: 'address',
      issue: 'Address information incomplete',
      suggestion: addressIssues.join('; '),
    });
  }
  
  // Validate contact completeness
  const contactIssues: string[] = [];
  if (!clientData.email) {
    contactIssues.push('Email is required for invoice delivery');
  } else if (!isValidEmail(clientData.email)) {
    contactIssues.push('Invalid email format');
  }
  
  if (contactIssues.length > 0) {
    details.contactComplete = false;
    details.contactIssues = contactIssues;
    requiredFixes.push({
      field: 'email',
      issue: 'Contact information incomplete or invalid',
      suggestion: contactIssues.join('; '),
    });
  }
  
  const isValid = details.cuiValid && 
                  details.companyNameMatch && 
                  details.vatStatusMatch && 
                  details.addressComplete && 
                  details.contactComplete;
  
  return { isValid, details, requiredFixes: requiredFixes.length > 0 ? requiredFixes : undefined };
}

/**
 * Find existing client in Oblio
 */
async function findOblioClient(client: OblioClient, cui: string): Promise<any | null> {
  try {
    const result = await client.getClients({ cif: cui });
    return result?.data?.[0] || null;
  } catch (error) {
    if ((error as any).status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Create new client in Oblio
 */
async function createOblioClient(
  client: OblioClient, 
  clientData: OblioClientData,
  anafData: any | null
): Promise<any> {
  const oblioData = {
    cif: clientData.cui,
    name: anafData?.denumire || clientData.companyName,
    rc: clientData.registrationNumber || '',
    address: clientData.address,
    city: clientData.city,
    county: clientData.county,
    country: clientData.country,
    email: clientData.email,
    phone: clientData.phone || '',
    bank: clientData.bankName || '',
    iban: clientData.bankAccount || '',
    vatPayer: clientData.isVatPayer,
  };
  
  return await client.createClient(oblioData);
}

/**
 * Update existing client in Oblio
 */
async function updateOblioClient(
  client: OblioClient,
  cif: string,
  clientData: OblioClientData
): Promise<any> {
  const oblioData = {
    name: clientData.companyName,
    address: clientData.address,
    city: clientData.city,
    county: clientData.county,
    country: clientData.country,
    email: clientData.email,
    phone: clientData.phone || '',
    bank: clientData.bankName || '',
    iban: clientData.bankAccount || '',
    vatPayer: clientData.isVatPayer,
  };
  
  return await client.updateClient(cif, oblioData);
}

/**
 * Check if client needs update
 */
function checkNeedsUpdate(oblioClient: any, clientData: OblioClientData): boolean {
  return oblioClient.email !== clientData.email ||
         oblioClient.phone !== clientData.phone ||
         oblioClient.address !== clientData.address ||
         oblioClient.city !== clientData.city ||
         oblioClient.bank !== clientData.bankName ||
         oblioClient.iban !== clientData.bankAccount;
}

/**
 * Cache validation result
 */
async function cacheValidation(
  tenantId: string,
  cui: string,
  result: ClientValidateResult,
  ttlSeconds: number
): Promise<void> {
  const cacheKey = `oblio:client:validation:${tenantId}:${cui}`;
  await redis.setex(cacheKey, ttlSeconds, JSON.stringify(result));
}

/**
 * Check validation cache
 */
async function checkValidationCache(
  tenantId: string,
  cui: string
): Promise<ClientValidateResult | null> {
  const cacheKey = `oblio:client:validation:${tenantId}:${cui}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  return null;
}

/**
 * Record validation in database
 */
async function recordValidation(
  tenantId: string,
  negotiationId: string,
  contactId: string,
  cui: string,
  result: ClientValidateResult,
  success: boolean
): Promise<void> {
  await db.insert(oblioClientValidations).values({
    tenantId,
    negotiationId,
    contactId,
    cui,
    validationResult: result,
    success,
    validatedAt: new Date(),
  });
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// Event Handlers
// ============================================================================

oblioClientValidateWorker.on('completed', (job, result) => {
  logger.info('Client validation completed', {
    jobId: job.id,
    negotiationId: job.data.negotiationId,
    valid: result.valid,
    action: result.action,
  });
});

oblioClientValidateWorker.on('failed', (job, error) => {
  logger.error('Client validation failed', {
    jobId: job?.id,
    negotiationId: job?.data.negotiationId,
    error: error.message,
  });
});
```

### 2.5 Error Handling

```typescript
/**
 * Error codes for client validation
 */
export enum ClientValidationErrorCode {
  INVALID_CUI = 'INVALID_CUI',
  CUI_NOT_FOUND_ANAF = 'CUI_NOT_FOUND_ANAF',
  COMPANY_NAME_MISMATCH = 'COMPANY_NAME_MISMATCH',
  VAT_STATUS_MISMATCH = 'VAT_STATUS_MISMATCH',
  INCOMPLETE_ADDRESS = 'INCOMPLETE_ADDRESS',
  INVALID_EMAIL = 'INVALID_EMAIL',
  OBLIO_API_ERROR = 'OBLIO_API_ERROR',
  ANAF_API_ERROR = 'ANAF_API_ERROR',
  TENANT_NOT_CONFIGURED = 'TENANT_NOT_CONFIGURED',
}

/**
 * Custom error for validation failures
 */
export class ClientValidationError extends Error {
  constructor(
    public code: ClientValidationErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ClientValidationError';
  }
}
```

---

## 3. Worker #20: oblio:proforma:create

### 3.1 Worker Specification

| Property | Value |
|----------|-------|
| **Queue Name** | `oblio:proforma:create` |
| **Concurrency** | 30 |
| **Timeout** | 30 seconds |
| **Retries** | 5 |
| **Backoff** | Exponential (3s base) |
| **Priority** | CRITICAL |
| **Rate Limit** | 60/minute (Oblio API) |

### 3.2 Purpose

Creates proforma invoices in Oblio when a negotiation reaches CLOSING state. The proforma:
- Is NOT a fiscal document (no ANAF reporting)
- Serves as a formal price quote / offer
- Can be converted to invoice upon client acceptance
- Allows client to verify details before committing

### 3.3 Job Data Interface

```typescript
// ============================================================================
// WORKER #20: oblio:proforma:create - Job Interfaces
// ============================================================================

import { z } from 'zod';

/**
 * Cart item for proforma
 */
export const ProformaItemSchema = z.object({
  sku: z.string(),
  name: z.string(),
  description: z.string().optional(),
  quantity: z.number().positive(),
  unit: z.string().default('buc'),
  unitPrice: z.number().positive(), // Price without VAT
  vatRate: z.number().default(19), // 19% standard, 9% reduced, 0% exempt
  discount: z.number().min(0).max(100).default(0),
});

export type ProformaItem = z.infer<typeof ProformaItemSchema>;

/**
 * Job data for proforma creation
 */
export const ProformaCreateJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  negotiationId: z.string().uuid(),
  
  // Client reference (must be validated first)
  oblioClientCif: z.string(),
  
  // Items to include
  items: z.array(ProformaItemSchema).min(1),
  
  // Proforma details
  details: z.object({
    // Series and number (auto-generated if not provided)
    seriesName: z.string().optional(),
    number: z.number().optional(),
    
    // Dates
    issueDate: z.string().optional(), // ISO date, defaults to today
    dueDate: z.string().optional(), // ISO date
    validUntil: z.string().optional(), // Offer validity
    
    // Delivery
    deliveryDate: z.string().optional(),
    deliveryAddress: z.string().optional(),
    
    // Payment terms
    paymentMethod: z.enum(['TRANSFER', 'CASH', 'CARD', 'RAMBURS']).default('TRANSFER'),
    
    // Currency
    currency: z.string().default('RON'),
    exchangeRate: z.number().optional(),
    
    // Notes
    mentions: z.string().optional(), // Legal mentions
    notes: z.string().optional(), // Internal notes
    
    // Reference
    reference: z.string().optional(), // Client reference / PO number
  }).optional(),
  
  // Options
  options: z.object({
    // Send to client email
    sendEmail: z.boolean().default(true),
    emailSubject: z.string().optional(),
    emailBody: z.string().optional(),
    
    // Generate PDF
    generatePdf: z.boolean().default(true),
    
    // Language
    language: z.enum(['ro', 'en']).default('ro'),
  }).optional(),
  
  // Correlation
  correlationId: z.string().uuid().optional(),
});

export type ProformaCreateJobData = z.infer<typeof ProformaCreateJobDataSchema>;

/**
 * Proforma creation result
 */
export interface ProformaCreateResult {
  success: boolean;
  
  // Oblio proforma reference
  proformaId: string;
  seriesName: string;
  number: number;
  
  // Totals
  subtotal: number; // Without VAT
  vatAmount: number;
  totalDiscount: number;
  grandTotal: number; // With VAT
  
  // Currency
  currency: string;
  
  // PDF
  pdfUrl?: string;
  pdfStoragePath?: string;
  
  // Email
  emailSent: boolean;
  emailSentTo?: string;
  
  // Dates
  issueDate: string;
  dueDate?: string;
  validUntil?: string;
  
  // Link to view in Oblio
  oblioViewUrl: string;
}
```

### 3.4 Worker Implementation

```typescript
// ============================================================================
// WORKER #20: oblio:proforma:create - Implementation
// ============================================================================

import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { db } from '@/db';
import { 
  negotiations, 
  negotiationCarts,
  proformas,
  negotiationStateHistory,
  tenants,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { OblioClient } from '@/integrations/oblio';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';
import {
  ProformaCreateJobData,
  ProformaCreateJobDataSchema,
  ProformaCreateResult,
  ProformaItem,
} from './types';

const redis = new Redis(process.env.REDIS_URL!);

/**
 * Worker #20: Oblio Proforma Creation
 * 
 * Creates proforma invoices (offers) in Oblio for negotiation closing
 */
export const oblioProformaCreateWorker = new Worker<ProformaCreateJobData, ProformaCreateResult>(
  'oblio:proforma:create',
  async (job: Job<ProformaCreateJobData, ProformaCreateResult>) => {
    const startTime = Date.now();
    const { tenantId, negotiationId, oblioClientCif, items, details, options } = job.data;
    
    const log = logger.child({
      worker: 'oblio:proforma:create',
      jobId: job.id,
      tenantId,
      negotiationId,
    });
    
    log.info('Starting proforma creation', { itemCount: items.length });
    
    try {
      // 1. Validate input
      ProformaCreateJobDataSchema.parse(job.data);
      
      // 2. Verify negotiation state
      const negotiation = await db.query.negotiations.findFirst({
        where: and(
          eq(negotiations.id, negotiationId),
          eq(negotiations.tenantId, tenantId)
        ),
      });
      
      if (!negotiation) {
        throw new Error(`Negotiation ${negotiationId} not found`);
      }
      
      if (negotiation.state !== 'CLOSING') {
        throw new Error(`Cannot create proforma in state ${negotiation.state}, expected CLOSING`);
      }
      
      // 3. Get Oblio client
      const oblioClient = await getOblioClient(tenantId);
      
      // 4. Calculate totals
      const calculations = calculateProformaTotals(items);
      
      // 5. Build Oblio proforma request
      const proformaRequest = buildOblioProformaRequest(
        oblioClientCif,
        items,
        calculations,
        details,
        options
      );
      
      // 6. Create proforma in Oblio
      const oblioResponse = await oblioClient.createProforma(proformaRequest);
      
      log.info('Proforma created in Oblio', {
        seriesName: oblioResponse.seriesName,
        number: oblioResponse.number,
      });
      
      // 7. Download and store PDF if requested
      let pdfUrl: string | undefined;
      let pdfStoragePath: string | undefined;
      
      if (options?.generatePdf !== false) {
        const pdfData = await oblioClient.getProformaPdf(
          oblioResponse.seriesName,
          oblioResponse.number
        );
        
        const storagePath = `tenants/${tenantId}/proformas/${negotiationId}/${oblioResponse.seriesName}-${oblioResponse.number}.pdf`;
        pdfStoragePath = storagePath;
        pdfUrl = await uploadToStorage(pdfData, storagePath);
        
        log.info('Proforma PDF stored', { pdfStoragePath });
      }
      
      // 8. Store proforma record locally
      const [proformaRecord] = await db.insert(proformas).values({
        tenantId,
        negotiationId,
        oblioProformaId: `${oblioResponse.seriesName}-${oblioResponse.number}`,
        seriesName: oblioResponse.seriesName,
        number: oblioResponse.number,
        clientCif: oblioClientCif,
        items: items,
        subtotal: calculations.subtotal,
        vatAmount: calculations.vatAmount,
        totalDiscount: calculations.totalDiscount,
        grandTotal: calculations.grandTotal,
        currency: details?.currency || 'RON',
        issueDate: new Date(oblioResponse.issueDate),
        dueDate: oblioResponse.dueDate ? new Date(oblioResponse.dueDate) : null,
        validUntil: details?.validUntil ? new Date(details.validUntil) : null,
        pdfUrl,
        pdfStoragePath,
        oblioViewUrl: oblioResponse.viewUrl,
        status: 'SENT',
        createdAt: new Date(),
      }).returning();
      
      // 9. Update negotiation state to PROFORMA_SENT
      await db.update(negotiations)
        .set({
          state: 'PROFORMA_SENT',
          currentProformaId: proformaRecord.id,
          updatedAt: new Date(),
        })
        .where(eq(negotiations.id, negotiationId));
      
      // 10. Record state transition
      await db.insert(negotiationStateHistory).values({
        tenantId,
        negotiationId,
        fromState: 'CLOSING',
        toState: 'PROFORMA_SENT',
        triggeredBy: 'SYSTEM',
        triggeredByWorker: 'oblio:proforma:create',
        metadata: {
          proformaId: proformaRecord.id,
          oblioProformaId: proformaRecord.oblioProformaId,
        },
        transitionedAt: new Date(),
      });
      
      // 11. Send email if requested
      let emailSent = false;
      let emailSentTo: string | undefined;
      
      if (options?.sendEmail !== false && oblioResponse.clientEmail) {
        await oblioClient.sendProformaEmail(
          oblioResponse.seriesName,
          oblioResponse.number,
          {
            to: oblioResponse.clientEmail,
            subject: options?.emailSubject || `Proforma ${oblioResponse.seriesName}-${oblioResponse.number}`,
            body: options?.emailBody || buildDefaultEmailBody(oblioResponse),
          }
        );
        emailSent = true;
        emailSentTo = oblioResponse.clientEmail;
        
        log.info('Proforma email sent', { emailSentTo });
      }
      
      // 12. Build result
      const result: ProformaCreateResult = {
        success: true,
        proformaId: proformaRecord.id,
        seriesName: oblioResponse.seriesName,
        number: oblioResponse.number,
        subtotal: calculations.subtotal,
        vatAmount: calculations.vatAmount,
        totalDiscount: calculations.totalDiscount,
        grandTotal: calculations.grandTotal,
        currency: details?.currency || 'RON',
        pdfUrl,
        pdfStoragePath,
        emailSent,
        emailSentTo,
        issueDate: oblioResponse.issueDate,
        dueDate: oblioResponse.dueDate,
        validUntil: details?.validUntil,
        oblioViewUrl: oblioResponse.viewUrl,
      };
      
      // 13. Emit metrics
      const duration = Date.now() - startTime;
      metrics.oblioProformasCreated.inc({ tenant_id: tenantId });
      metrics.oblioProformaTotal.inc({ tenant_id: tenantId }, calculations.grandTotal);
      metrics.oblioProformaCreateDuration.observe({ tenant_id: tenantId }, duration);
      
      log.info('Proforma creation completed', {
        proformaId: proformaRecord.id,
        grandTotal: calculations.grandTotal,
        duration,
      });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('Proforma creation failed', { error, duration });
      
      metrics.oblioProformasFailed.inc({
        tenant_id: tenantId,
        error_type: error instanceof Error ? error.constructor.name : 'Unknown',
      });
      
      throw error;
    }
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
 * Calculate proforma totals
 */
function calculateProformaTotals(items: ProformaItem[]): {
  subtotal: number;
  vatAmount: number;
  totalDiscount: number;
  grandTotal: number;
  itemsWithTotals: Array<ProformaItem & { lineTotal: number; lineVat: number }>;
} {
  let subtotal = 0;
  let vatAmount = 0;
  let totalDiscount = 0;
  
  const itemsWithTotals = items.map(item => {
    const grossPrice = item.unitPrice * item.quantity;
    const discountAmount = grossPrice * (item.discount / 100);
    const netPrice = grossPrice - discountAmount;
    const vat = netPrice * (item.vatRate / 100);
    
    subtotal += netPrice;
    vatAmount += vat;
    totalDiscount += discountAmount;
    
    return {
      ...item,
      lineTotal: netPrice,
      lineVat: vat,
    };
  });
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    grandTotal: Math.round((subtotal + vatAmount) * 100) / 100,
    itemsWithTotals,
  };
}

/**
 * Build Oblio proforma request
 */
function buildOblioProformaRequest(
  clientCif: string,
  items: ProformaItem[],
  calculations: ReturnType<typeof calculateProformaTotals>,
  details?: ProformaCreateJobData['details'],
  options?: ProformaCreateJobData['options']
): any {
  const request: any = {
    cif: clientCif,
    issueDate: details?.issueDate || new Date().toISOString().split('T')[0],
    dueDate: details?.dueDate,
    seriesName: details?.seriesName,
    collect: details?.paymentMethod || 'TRANSFER',
    language: options?.language || 'ro',
    currency: details?.currency || 'RON',
    exchangeRate: details?.exchangeRate,
    mentions: details?.mentions,
    observations: details?.notes,
    reference: details?.reference,
    deliveryDate: details?.deliveryDate,
    deliveryAddress: details?.deliveryAddress,
    products: items.map(item => ({
      name: item.name,
      code: item.sku,
      description: item.description || '',
      quantity: item.quantity,
      unit: item.unit,
      price: item.unitPrice,
      vatName: getVatName(item.vatRate),
      vatPercentage: item.vatRate,
      discount: item.discount,
    })),
  };
  
  return request;
}

/**
 * Get VAT name for rate
 */
function getVatName(vatRate: number): string {
  switch (vatRate) {
    case 19: return 'Normala';
    case 9: return 'Redusa';
    case 5: return 'Redusa';
    case 0: return 'Scutit';
    default: return 'Normala';
  }
}

/**
 * Upload file to S3-compatible storage
 */
async function uploadToStorage(data: Buffer, path: string): Promise<string> {
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
    ContentType: 'application/pdf',
  }));
  
  return `${process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${path}`;
}

/**
 * Build default email body for proforma
 */
function buildDefaultEmailBody(proforma: any): string {
  return `Stimate client,

Va transmitem atasat proforma ${proforma.seriesName}-${proforma.number} in valoare de ${proforma.grandTotal} ${proforma.currency}.

Aceasta proforma este valabila pana la data de ${proforma.validUntil || proforma.dueDate || 'nedeterminata'}.

Pentru orice intrebari, va rugam sa ne contactati.

Cu stima,
Echipa noastra`;
}

// ============================================================================
// Event Handlers
// ============================================================================

oblioProformaCreateWorker.on('completed', (job, result) => {
  logger.info('Proforma creation completed', {
    jobId: job.id,
    negotiationId: job.data.negotiationId,
    proformaId: result.proformaId,
    grandTotal: result.grandTotal,
  });
});

oblioProformaCreateWorker.on('failed', (job, error) => {
  logger.error('Proforma creation failed', {
    jobId: job?.id,
    negotiationId: job?.data.negotiationId,
    error: error.message,
  });
});
```

---

## 4. Worker #21: oblio:invoice:create

### 4.1 Worker Specification

| Property | Value |
|----------|-------|
| **Queue Name** | `oblio:invoice:create` |
| **Concurrency** | 30 |
| **Timeout** | 30 seconds |
| **Retries** | 5 |
| **Backoff** | Exponential (3s base) |
| **Priority** | CRITICAL |
| **Rate Limit** | 60/minute |

### 4.2 Purpose

Converts accepted proformas into fiscal invoices. This is a fiscal document that:
- Must be reported to ANAF (triggers e-Factura workflow)
- Is legally binding
- Has a unique number in series
- Must follow Romanian invoicing regulations

### 4.3 Job Data Interface

```typescript
// ============================================================================
// WORKER #21: oblio:invoice:create - Job Interfaces
// ============================================================================

import { z } from 'zod';

/**
 * Job data for invoice creation
 */
export const InvoiceCreateJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  negotiationId: z.string().uuid(),
  proformaId: z.string().uuid(), // Local proforma ID
  
  // Options
  options: z.object({
    // Convert proforma (use proforma items) or create new
    convertProforma: z.boolean().default(true),
    
    // Override proforma items (if not converting)
    items: z.array(z.object({
      sku: z.string(),
      name: z.string(),
      description: z.string().optional(),
      quantity: z.number().positive(),
      unit: z.string().default('buc'),
      unitPrice: z.number().positive(),
      vatRate: z.number().default(19),
      discount: z.number().min(0).max(100).default(0),
    })).optional(),
    
    // Invoice details
    seriesName: z.string().optional(), // Auto-select if not provided
    issueDate: z.string().optional(), // ISO date, today if not provided
    dueDate: z.string().optional(),
    
    // Delivery
    deliveryDate: z.string().optional(),
    deliveryAddress: z.string().optional(),
    
    // Payment
    paymentMethod: z.enum(['TRANSFER', 'CASH', 'CARD', 'RAMBURS']).optional(),
    
    // Notes
    mentions: z.string().optional(),
    notes: z.string().optional(),
    reference: z.string().optional(),
    
    // Email options
    sendEmail: z.boolean().default(true),
    emailSubject: z.string().optional(),
    emailBody: z.string().optional(),
    
    // e-Factura
    autoSendEfactura: z.boolean().default(true), // Auto-trigger e-Factura workflow
  }).optional(),
  
  // Correlation
  correlationId: z.string().uuid().optional(),
});

export type InvoiceCreateJobData = z.infer<typeof InvoiceCreateJobDataSchema>;

/**
 * Invoice creation result
 */
export interface InvoiceCreateResult {
  success: boolean;
  
  // Invoice reference
  invoiceId: string; // Local ID
  oblioInvoiceId: string; // Oblio reference
  seriesName: string;
  number: number;
  
  // Totals
  subtotal: number;
  vatAmount: number;
  totalDiscount: number;
  grandTotal: number;
  currency: string;
  
  // Converted from
  fromProformaId: string;
  fromProformaSeries: string;
  fromProformaNumber: number;
  
  // PDF
  pdfUrl?: string;
  pdfStoragePath?: string;
  
  // Email
  emailSent: boolean;
  emailSentTo?: string;
  
  // Dates
  issueDate: string;
  dueDate?: string;
  
  // e-Factura
  efacturaTriggered: boolean;
  efacturaJobId?: string;
  
  // Oblio link
  oblioViewUrl: string;
}
```

### 4.4 Worker Implementation

```typescript
// ============================================================================
// WORKER #21: oblio:invoice:create - Implementation
// ============================================================================

import { Worker, Job, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { db } from '@/db';
import { 
  negotiations, 
  proformas,
  invoices,
  negotiationStateHistory,
  tenants,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { OblioClient } from '@/integrations/oblio';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';
import {
  InvoiceCreateJobData,
  InvoiceCreateJobDataSchema,
  InvoiceCreateResult,
} from './types';

const redis = new Redis(process.env.REDIS_URL!);

// e-Factura queue for triggering SPV submission
const efacturaQueue = new Queue('efactura:send', { connection: redis });

/**
 * Worker #21: Oblio Invoice Creation
 * 
 * Creates fiscal invoices from accepted proformas
 */
export const oblioInvoiceCreateWorker = new Worker<InvoiceCreateJobData, InvoiceCreateResult>(
  'oblio:invoice:create',
  async (job: Job<InvoiceCreateJobData, InvoiceCreateResult>) => {
    const startTime = Date.now();
    const { tenantId, negotiationId, proformaId, options } = job.data;
    
    const log = logger.child({
      worker: 'oblio:invoice:create',
      jobId: job.id,
      tenantId,
      negotiationId,
      proformaId,
    });
    
    log.info('Starting invoice creation');
    
    try {
      // 1. Validate input
      InvoiceCreateJobDataSchema.parse(job.data);
      
      // 2. Verify negotiation state
      const negotiation = await db.query.negotiations.findFirst({
        where: and(
          eq(negotiations.id, negotiationId),
          eq(negotiations.tenantId, tenantId)
        ),
      });
      
      if (!negotiation) {
        throw new Error(`Negotiation ${negotiationId} not found`);
      }
      
      if (negotiation.state !== 'PROFORMA_ACCEPTED') {
        throw new Error(`Cannot create invoice in state ${negotiation.state}, expected PROFORMA_ACCEPTED`);
      }
      
      // 3. Get proforma details
      const proforma = await db.query.proformas.findFirst({
        where: and(
          eq(proformas.id, proformaId),
          eq(proformas.tenantId, tenantId)
        ),
      });
      
      if (!proforma) {
        throw new Error(`Proforma ${proformaId} not found`);
      }
      
      if (proforma.status !== 'ACCEPTED') {
        throw new Error(`Proforma ${proformaId} is not accepted (status: ${proforma.status})`);
      }
      
      // 4. Get Oblio client
      const oblioClient = await getOblioClient(tenantId);
      
      // 5. Prepare items (from proforma or override)
      const items = options?.convertProforma !== false 
        ? proforma.items 
        : options?.items;
      
      if (!items || items.length === 0) {
        throw new Error('No items to invoice');
      }
      
      // 6. Calculate totals
      const calculations = calculateInvoiceTotals(items);
      
      // 7. Build Oblio invoice request
      const invoiceRequest = buildOblioInvoiceRequest(
        proforma.clientCif,
        items,
        calculations,
        proforma,
        options
      );
      
      // 8. Create invoice in Oblio
      const oblioResponse = await oblioClient.createInvoice(invoiceRequest);
      
      log.info('Invoice created in Oblio', {
        seriesName: oblioResponse.seriesName,
        number: oblioResponse.number,
      });
      
      // 9. Download and store PDF
      let pdfUrl: string | undefined;
      let pdfStoragePath: string | undefined;
      
      const pdfData = await oblioClient.getInvoicePdf(
        oblioResponse.seriesName,
        oblioResponse.number
      );
      
      const storagePath = `tenants/${tenantId}/invoices/${negotiationId}/${oblioResponse.seriesName}-${oblioResponse.number}.pdf`;
      pdfStoragePath = storagePath;
      pdfUrl = await uploadToStorage(pdfData, storagePath);
      
      log.info('Invoice PDF stored', { pdfStoragePath });
      
      // 10. Store invoice record locally
      const [invoiceRecord] = await db.insert(invoices).values({
        tenantId,
        negotiationId,
        proformaId,
        oblioInvoiceId: `${oblioResponse.seriesName}-${oblioResponse.number}`,
        seriesName: oblioResponse.seriesName,
        number: oblioResponse.number,
        clientCif: proforma.clientCif,
        items: items,
        subtotal: calculations.subtotal,
        vatAmount: calculations.vatAmount,
        totalDiscount: calculations.totalDiscount,
        grandTotal: calculations.grandTotal,
        currency: proforma.currency,
        issueDate: new Date(oblioResponse.issueDate),
        dueDate: oblioResponse.dueDate ? new Date(oblioResponse.dueDate) : null,
        pdfUrl,
        pdfStoragePath,
        oblioViewUrl: oblioResponse.viewUrl,
        status: 'ISSUED',
        efacturaStatus: 'PENDING',
        createdAt: new Date(),
      }).returning();
      
      // 11. Mark proforma as converted
      await db.update(proformas)
        .set({
          status: 'CONVERTED',
          convertedToInvoiceId: invoiceRecord.id,
          updatedAt: new Date(),
        })
        .where(eq(proformas.id, proformaId));
      
      // 12. Update negotiation state to INVOICED
      await db.update(negotiations)
        .set({
          state: 'INVOICED',
          currentInvoiceId: invoiceRecord.id,
          updatedAt: new Date(),
        })
        .where(eq(negotiations.id, negotiationId));
      
      // 13. Record state transition
      await db.insert(negotiationStateHistory).values({
        tenantId,
        negotiationId,
        fromState: 'PROFORMA_ACCEPTED',
        toState: 'INVOICED',
        triggeredBy: 'SYSTEM',
        triggeredByWorker: 'oblio:invoice:create',
        metadata: {
          invoiceId: invoiceRecord.id,
          oblioInvoiceId: invoiceRecord.oblioInvoiceId,
          proformaId,
        },
        transitionedAt: new Date(),
      });
      
      // 14. Send email if requested
      let emailSent = false;
      let emailSentTo: string | undefined;
      
      if (options?.sendEmail !== false && oblioResponse.clientEmail) {
        await oblioClient.sendInvoiceEmail(
          oblioResponse.seriesName,
          oblioResponse.number,
          {
            to: oblioResponse.clientEmail,
            subject: options?.emailSubject || `Factura ${oblioResponse.seriesName}-${oblioResponse.number}`,
            body: options?.emailBody || buildDefaultInvoiceEmailBody(oblioResponse),
          }
        );
        emailSent = true;
        emailSentTo = oblioResponse.clientEmail;
        
        log.info('Invoice email sent', { emailSentTo });
      }
      
      // 15. Trigger e-Factura if enabled
      let efacturaTriggered = false;
      let efacturaJobId: string | undefined;
      
      if (options?.autoSendEfactura !== false) {
        const efacturaJob = await efacturaQueue.add('send', {
          tenantId,
          negotiationId,
          invoiceId: invoiceRecord.id,
          oblioInvoiceId: invoiceRecord.oblioInvoiceId,
          correlationId: job.data.correlationId,
        });
        
        efacturaTriggered = true;
        efacturaJobId = efacturaJob.id;
        
        log.info('e-Factura job triggered', { efacturaJobId });
        
        // Update negotiation state to EINVOICE_PENDING
        await db.update(negotiations)
          .set({
            state: 'EINVOICE_PENDING',
            updatedAt: new Date(),
          })
          .where(eq(negotiations.id, negotiationId));
        
        await db.insert(negotiationStateHistory).values({
          tenantId,
          negotiationId,
          fromState: 'INVOICED',
          toState: 'EINVOICE_PENDING',
          triggeredBy: 'SYSTEM',
          triggeredByWorker: 'oblio:invoice:create',
          metadata: {
            efacturaJobId,
          },
          transitionedAt: new Date(),
        });
      }
      
      // 16. Build result
      const result: InvoiceCreateResult = {
        success: true,
        invoiceId: invoiceRecord.id,
        oblioInvoiceId: invoiceRecord.oblioInvoiceId,
        seriesName: oblioResponse.seriesName,
        number: oblioResponse.number,
        subtotal: calculations.subtotal,
        vatAmount: calculations.vatAmount,
        totalDiscount: calculations.totalDiscount,
        grandTotal: calculations.grandTotal,
        currency: proforma.currency,
        fromProformaId: proforma.id,
        fromProformaSeries: proforma.seriesName,
        fromProformaNumber: proforma.number,
        pdfUrl,
        pdfStoragePath,
        emailSent,
        emailSentTo,
        issueDate: oblioResponse.issueDate,
        dueDate: oblioResponse.dueDate,
        efacturaTriggered,
        efacturaJobId,
        oblioViewUrl: oblioResponse.viewUrl,
      };
      
      // 17. Emit metrics
      const duration = Date.now() - startTime;
      metrics.oblioInvoicesCreated.inc({ tenant_id: tenantId });
      metrics.oblioInvoiceTotal.inc({ tenant_id: tenantId }, calculations.grandTotal);
      metrics.oblioInvoiceCreateDuration.observe({ tenant_id: tenantId }, duration);
      
      log.info('Invoice creation completed', {
        invoiceId: invoiceRecord.id,
        grandTotal: calculations.grandTotal,
        duration,
      });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('Invoice creation failed', { error, duration });
      
      metrics.oblioInvoicesFailed.inc({
        tenant_id: tenantId,
        error_type: error instanceof Error ? error.constructor.name : 'Unknown',
      });
      
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 30,
    limiter: {
      max: 60,
      duration: 60000,
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
 * Calculate invoice totals
 */
function calculateInvoiceTotals(items: any[]): {
  subtotal: number;
  vatAmount: number;
  totalDiscount: number;
  grandTotal: number;
} {
  let subtotal = 0;
  let vatAmount = 0;
  let totalDiscount = 0;
  
  items.forEach(item => {
    const grossPrice = item.unitPrice * item.quantity;
    const discountAmount = grossPrice * ((item.discount || 0) / 100);
    const netPrice = grossPrice - discountAmount;
    const vat = netPrice * ((item.vatRate || 19) / 100);
    
    subtotal += netPrice;
    vatAmount += vat;
    totalDiscount += discountAmount;
  });
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    grandTotal: Math.round((subtotal + vatAmount) * 100) / 100,
  };
}

/**
 * Build Oblio invoice request
 */
function buildOblioInvoiceRequest(
  clientCif: string,
  items: any[],
  calculations: ReturnType<typeof calculateInvoiceTotals>,
  proforma: any,
  options?: InvoiceCreateJobData['options']
): any {
  return {
    cif: clientCif,
    issueDate: options?.issueDate || new Date().toISOString().split('T')[0],
    dueDate: options?.dueDate || proforma.dueDate,
    seriesName: options?.seriesName,
    collect: options?.paymentMethod || proforma.paymentMethod || 'TRANSFER',
    language: 'ro',
    currency: proforma.currency || 'RON',
    mentions: options?.mentions || proforma.mentions,
    observations: options?.notes || proforma.notes,
    reference: options?.reference || proforma.reference,
    deliveryDate: options?.deliveryDate,
    deliveryAddress: options?.deliveryAddress,
    // Link to proforma
    proforma: {
      seriesName: proforma.seriesName,
      number: proforma.number,
    },
    products: items.map((item: any) => ({
      name: item.name,
      code: item.sku,
      description: item.description || '',
      quantity: item.quantity,
      unit: item.unit || 'buc',
      price: item.unitPrice,
      vatName: getVatName(item.vatRate || 19),
      vatPercentage: item.vatRate || 19,
      discount: item.discount || 0,
    })),
  };
}

/**
 * Get VAT name for rate
 */
function getVatName(vatRate: number): string {
  switch (vatRate) {
    case 19: return 'Normala';
    case 9: return 'Redusa';
    case 5: return 'Redusa';
    case 0: return 'Scutit';
    default: return 'Normala';
  }
}

/**
 * Upload file to S3-compatible storage
 */
async function uploadToStorage(data: Buffer, path: string): Promise<string> {
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
    ContentType: 'application/pdf',
  }));
  
  return `${process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${path}`;
}

/**
 * Build default email body for invoice
 */
function buildDefaultInvoiceEmailBody(invoice: any): string {
  return `Stimate client,

Va transmitem atasat factura fiscala ${invoice.seriesName}-${invoice.number} in valoare de ${invoice.grandTotal} ${invoice.currency}.

Termen de plata: ${invoice.dueDate || 'conform contract'}.

Metoda de plata: transfer bancar.

Pentru orice intrebari, va rugam sa ne contactati.

Cu stima,
Echipa noastra`;
}

// ============================================================================
// Event Handlers
// ============================================================================

oblioInvoiceCreateWorker.on('completed', (job, result) => {
  logger.info('Invoice creation completed', {
    jobId: job.id,
    negotiationId: job.data.negotiationId,
    invoiceId: result.invoiceId,
    grandTotal: result.grandTotal,
  });
});

oblioInvoiceCreateWorker.on('failed', (job, error) => {
  logger.error('Invoice creation failed', {
    jobId: job?.id,
    negotiationId: job?.data.negotiationId,
    error: error.message,
  });
});
```

---

## 5. Worker #22: oblio:invoice:cancel

### 5.1 Worker Specification

| Property | Value |
|----------|-------|
| **Queue Name** | `oblio:invoice:cancel` |
| **Concurrency** | 20 |
| **Timeout** | 30 seconds |
| **Retries** | 3 |
| **Backoff** | Exponential (3s base) |
| **Priority** | HIGH |
| **Rate Limit** | 30/minute |

### 5.2 Purpose

Handles invoice cancellation (storno) in Oblio. This is needed when:
- Client disputes the invoice
- Incorrect data was invoiced
- Order was cancelled after invoicing
- Credit note is required

**Important Romanian Fiscal Rules:**
- Once an invoice is sent to ANAF via e-Factura, it cannot be simply deleted
- A storno (cancellation invoice) must be issued
- The storno is also sent to ANAF
- Original invoice + storno must both exist in records

### 5.3 Job Data Interface

```typescript
// ============================================================================
// WORKER #22: oblio:invoice:cancel - Job Interfaces
// ============================================================================

import { z } from 'zod';

/**
 * Cancellation reason codes
 */
export enum CancellationReasonCode {
  CLIENT_DISPUTE = 'CLIENT_DISPUTE',
  DATA_ERROR = 'DATA_ERROR',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  DUPLICATE_INVOICE = 'DUPLICATE_INVOICE',
  PRICE_ADJUSTMENT = 'PRICE_ADJUSTMENT',
  RETURNED_GOODS = 'RETURNED_GOODS',
  OTHER = 'OTHER',
}

/**
 * Job data for invoice cancellation
 */
export const InvoiceCancelJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  negotiationId: z.string().uuid(),
  invoiceId: z.string().uuid(), // Local invoice ID
  
  // Cancellation details
  cancellation: z.object({
    // Why are we cancelling?
    reasonCode: z.nativeEnum(CancellationReasonCode),
    reasonText: z.string().min(10).max(500),
    
    // Who requested the cancellation?
    requestedBy: z.enum(['CLIENT', 'SALES_REP', 'MANAGER', 'SYSTEM']),
    requestedByUserId: z.string().uuid().optional(),
    
    // Partial or full cancellation
    type: z.enum(['FULL', 'PARTIAL']).default('FULL'),
    
    // For partial cancellation - items to cancel
    itemsToCancel: z.array(z.object({
      sku: z.string(),
      quantity: z.number().positive(),
    })).optional(),
    
    // Issue corrective invoice after cancellation?
    issueCorrectiveInvoice: z.boolean().default(false),
    
    // Notes for audit
    internalNotes: z.string().optional(),
  }),
  
  // Options
  options: z.object({
    // Email notification
    sendEmail: z.boolean().default(true),
    emailSubject: z.string().optional(),
    emailBody: z.string().optional(),
    
    // Auto-trigger e-Factura storno
    autoSendEfacturaStorno: z.boolean().default(true),
  }).optional(),
  
  // Requires HITL approval
  hitlApprovalId: z.string().uuid().optional(),
  
  // Correlation
  correlationId: z.string().uuid().optional(),
});

export type InvoiceCancelJobData = z.infer<typeof InvoiceCancelJobDataSchema>;

/**
 * Invoice cancellation result
 */
export interface InvoiceCancelResult {
  success: boolean;
  
  // Storno invoice reference
  stornoInvoiceId: string; // Local ID
  stornoOblioId: string;
  stornoSeriesName: string;
  stornoNumber: number;
  
  // Original invoice reference
  originalInvoiceId: string;
  originalOblioId: string;
  
  // Amounts
  cancelledAmount: number;
  cancelledVat: number;
  cancelledTotal: number;
  
  // Type
  cancellationType: 'FULL' | 'PARTIAL';
  itemsCancelled: number;
  
  // PDF
  stornoPdfUrl?: string;
  stornoPdfStoragePath?: string;
  
  // Email
  emailSent: boolean;
  emailSentTo?: string;
  
  // e-Factura
  efacturaStornoTriggered: boolean;
  efacturaStornoJobId?: string;
  
  // Corrective invoice
  correctiveInvoiceTriggered: boolean;
  correctiveInvoiceJobId?: string;
}
```

### 5.4 Worker Implementation

```typescript
// ============================================================================
// WORKER #22: oblio:invoice:cancel - Implementation
// ============================================================================

import { Worker, Job, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { db } from '@/db';
import { 
  negotiations, 
  invoices,
  stornoInvoices,
  negotiationStateHistory,
  cancellationRequests,
  tenants,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { OblioClient } from '@/integrations/oblio';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';
import {
  InvoiceCancelJobData,
  InvoiceCancelJobDataSchema,
  InvoiceCancelResult,
  CancellationReasonCode,
} from './types';

const redis = new Redis(process.env.REDIS_URL!);

// Queues for downstream processes
const efacturaStornoQueue = new Queue('efactura:storno', { connection: redis });
const invoiceCreateQueue = new Queue('oblio:invoice:create', { connection: redis });

/**
 * Worker #22: Oblio Invoice Cancellation
 * 
 * Handles invoice storno/cancellation with proper fiscal compliance
 */
export const oblioInvoiceCancelWorker = new Worker<InvoiceCancelJobData, InvoiceCancelResult>(
  'oblio:invoice:cancel',
  async (job: Job<InvoiceCancelJobData, InvoiceCancelResult>) => {
    const startTime = Date.now();
    const { tenantId, negotiationId, invoiceId, cancellation, options, hitlApprovalId } = job.data;
    
    const log = logger.child({
      worker: 'oblio:invoice:cancel',
      jobId: job.id,
      tenantId,
      negotiationId,
      invoiceId,
    });
    
    log.info('Starting invoice cancellation', {
      reasonCode: cancellation.reasonCode,
      type: cancellation.type,
    });
    
    try {
      // 1. Validate input
      InvoiceCancelJobDataSchema.parse(job.data);
      
      // 2. Verify HITL approval if required
      if (hitlApprovalId) {
        const approval = await verifyHitlApproval(hitlApprovalId);
        if (!approval.approved) {
          throw new Error(`HITL approval ${hitlApprovalId} not approved or expired`);
        }
      }
      
      // 3. Get invoice details
      const invoice = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, invoiceId),
          eq(invoices.tenantId, tenantId)
        ),
      });
      
      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }
      
      if (invoice.status === 'CANCELLED') {
        throw new Error(`Invoice ${invoiceId} is already cancelled`);
      }
      
      // 4. Get Oblio client
      const oblioClient = await getOblioClient(tenantId);
      
      // 5. Calculate cancellation amounts
      const cancelledAmounts = calculateCancelledAmounts(
        invoice,
        cancellation.type,
        cancellation.itemsToCancel
      );
      
      // 6. Create storno invoice in Oblio
      const stornoRequest = buildStornoRequest(invoice, cancellation, cancelledAmounts);
      const oblioStorno = await oblioClient.createStorno(stornoRequest);
      
      log.info('Storno created in Oblio', {
        stornoSeriesName: oblioStorno.seriesName,
        stornoNumber: oblioStorno.number,
      });
      
      // 7. Download and store PDF
      let stornoPdfUrl: string | undefined;
      let stornoPdfStoragePath: string | undefined;
      
      const pdfData = await oblioClient.getInvoicePdf(
        oblioStorno.seriesName,
        oblioStorno.number
      );
      
      const storagePath = `tenants/${tenantId}/stornos/${negotiationId}/${oblioStorno.seriesName}-${oblioStorno.number}.pdf`;
      stornoPdfStoragePath = storagePath;
      stornoPdfUrl = await uploadToStorage(pdfData, storagePath);
      
      // 8. Store storno record locally
      const [stornoRecord] = await db.insert(stornoInvoices).values({
        tenantId,
        negotiationId,
        originalInvoiceId: invoiceId,
        oblioStornoId: `${oblioStorno.seriesName}-${oblioStorno.number}`,
        seriesName: oblioStorno.seriesName,
        number: oblioStorno.number,
        clientCif: invoice.clientCif,
        cancelledItems: cancellation.itemsToCancel || invoice.items,
        cancelledSubtotal: cancelledAmounts.subtotal,
        cancelledVatAmount: cancelledAmounts.vatAmount,
        cancelledTotal: cancelledAmounts.total,
        cancellationType: cancellation.type,
        reasonCode: cancellation.reasonCode,
        reasonText: cancellation.reasonText,
        requestedBy: cancellation.requestedBy,
        requestedByUserId: cancellation.requestedByUserId,
        hitlApprovalId,
        pdfUrl: stornoPdfUrl,
        pdfStoragePath: stornoPdfStoragePath,
        issueDate: new Date(),
        status: 'ISSUED',
        efacturaStatus: 'PENDING',
        createdAt: new Date(),
      }).returning();
      
      // 9. Update original invoice status
      await db.update(invoices)
        .set({
          status: cancellation.type === 'FULL' ? 'CANCELLED' : 'PARTIAL_CANCELLED',
          stornoInvoiceId: stornoRecord.id,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
      
      // 10. Record cancellation request
      await db.insert(cancellationRequests).values({
        tenantId,
        negotiationId,
        invoiceId,
        stornoInvoiceId: stornoRecord.id,
        reasonCode: cancellation.reasonCode,
        reasonText: cancellation.reasonText,
        requestedBy: cancellation.requestedBy,
        requestedByUserId: cancellation.requestedByUserId,
        internalNotes: cancellation.internalNotes,
        status: 'PROCESSED',
        processedAt: new Date(),
        createdAt: new Date(),
      });
      
      // 11. Update negotiation state
      const newState = cancellation.type === 'FULL' ? 'DEAD' : negotiation.state;
      
      if (cancellation.type === 'FULL') {
        await db.update(negotiations)
          .set({
            state: 'DEAD',
            deadReason: `Invoice cancelled: ${cancellation.reasonCode}`,
            updatedAt: new Date(),
          })
          .where(eq(negotiations.id, negotiationId));
        
        await db.insert(negotiationStateHistory).values({
          tenantId,
          negotiationId,
          fromState: 'INVOICED', // Or current state
          toState: 'DEAD',
          triggeredBy: cancellation.requestedBy,
          triggeredByUserId: cancellation.requestedByUserId,
          triggeredByWorker: 'oblio:invoice:cancel',
          metadata: {
            stornoInvoiceId: stornoRecord.id,
            reasonCode: cancellation.reasonCode,
          },
          transitionedAt: new Date(),
        });
      }
      
      // 12. Send email if requested
      let emailSent = false;
      let emailSentTo: string | undefined;
      
      if (options?.sendEmail !== false && oblioStorno.clientEmail) {
        await oblioClient.sendInvoiceEmail(
          oblioStorno.seriesName,
          oblioStorno.number,
          {
            to: oblioStorno.clientEmail,
            subject: options?.emailSubject || `Stornare factura ${invoice.seriesName}-${invoice.number}`,
            body: options?.emailBody || buildStornoEmailBody(invoice, oblioStorno, cancellation),
          }
        );
        emailSent = true;
        emailSentTo = oblioStorno.clientEmail;
      }
      
      // 13. Trigger e-Factura storno if enabled
      let efacturaStornoTriggered = false;
      let efacturaStornoJobId: string | undefined;
      
      if (options?.autoSendEfacturaStorno !== false && invoice.efacturaStatus === 'SENT') {
        const efacturaJob = await efacturaStornoQueue.add('send', {
          tenantId,
          negotiationId,
          stornoInvoiceId: stornoRecord.id,
          originalInvoiceId: invoiceId,
          correlationId: job.data.correlationId,
        });
        
        efacturaStornoTriggered = true;
        efacturaStornoJobId = efacturaJob.id;
      }
      
      // 14. Trigger corrective invoice if requested
      let correctiveInvoiceTriggered = false;
      let correctiveInvoiceJobId: string | undefined;
      
      if (cancellation.issueCorrectiveInvoice) {
        // This would create a new negotiation/invoice with corrected data
        // Implementation depends on business requirements
        log.info('Corrective invoice requested - manual process required');
      }
      
      // 15. Build result
      const result: InvoiceCancelResult = {
        success: true,
        stornoInvoiceId: stornoRecord.id,
        stornoOblioId: stornoRecord.oblioStornoId,
        stornoSeriesName: oblioStorno.seriesName,
        stornoNumber: oblioStorno.number,
        originalInvoiceId: invoiceId,
        originalOblioId: invoice.oblioInvoiceId,
        cancelledAmount: cancelledAmounts.subtotal,
        cancelledVat: cancelledAmounts.vatAmount,
        cancelledTotal: cancelledAmounts.total,
        cancellationType: cancellation.type,
        itemsCancelled: cancellation.itemsToCancel?.length || invoice.items.length,
        stornoPdfUrl,
        stornoPdfStoragePath,
        emailSent,
        emailSentTo,
        efacturaStornoTriggered,
        efacturaStornoJobId,
        correctiveInvoiceTriggered,
        correctiveInvoiceJobId,
      };
      
      // 16. Emit metrics
      const duration = Date.now() - startTime;
      metrics.oblioStornosCreated.inc({ 
        tenant_id: tenantId,
        reason_code: cancellation.reasonCode,
        type: cancellation.type,
      });
      metrics.oblioStornoTotal.inc({ tenant_id: tenantId }, cancelledAmounts.total);
      metrics.oblioStornoDuration.observe({ tenant_id: tenantId }, duration);
      
      log.info('Invoice cancellation completed', {
        stornoInvoiceId: stornoRecord.id,
        cancelledTotal: cancelledAmounts.total,
        duration,
      });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('Invoice cancellation failed', { error, duration });
      
      metrics.oblioStornosFailed.inc({
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
      duration: 60000,
    },
  }
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify HITL approval
 */
async function verifyHitlApproval(approvalId: string): Promise<{ approved: boolean }> {
  const approval = await db.query.hitlApprovals.findFirst({
    where: eq(hitlApprovals.id, approvalId),
  });
  
  if (!approval) {
    return { approved: false };
  }
  
  return {
    approved: approval.status === 'APPROVED' && 
              (!approval.expiresAt || approval.expiresAt > new Date()),
  };
}

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
 * Calculate cancelled amounts
 */
function calculateCancelledAmounts(
  invoice: any,
  type: 'FULL' | 'PARTIAL',
  itemsToCancel?: Array<{ sku: string; quantity: number }>
): { subtotal: number; vatAmount: number; total: number } {
  if (type === 'FULL') {
    return {
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      total: invoice.grandTotal,
    };
  }
  
  // Partial cancellation
  let subtotal = 0;
  let vatAmount = 0;
  
  const cancelMap = new Map(itemsToCancel?.map(i => [i.sku, i.quantity]) || []);
  
  invoice.items.forEach((item: any) => {
    const cancelQty = cancelMap.get(item.sku);
    if (cancelQty) {
      const ratio = cancelQty / item.quantity;
      subtotal += item.lineTotal * ratio;
      vatAmount += item.lineVat * ratio;
    }
  });
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    total: Math.round((subtotal + vatAmount) * 100) / 100,
  };
}

/**
 * Build storno request for Oblio
 */
function buildStornoRequest(
  invoice: any,
  cancellation: InvoiceCancelJobData['cancellation'],
  cancelledAmounts: ReturnType<typeof calculateCancelledAmounts>
): any {
  return {
    seriesName: invoice.seriesName,
    number: invoice.number,
    reason: `${cancellation.reasonCode}: ${cancellation.reasonText}`,
    issueDate: new Date().toISOString().split('T')[0],
    // For partial storno, specify items
    ...(cancellation.type === 'PARTIAL' && {
      items: cancellation.itemsToCancel,
    }),
  };
}

/**
 * Build storno email body
 */
function buildStornoEmailBody(
  originalInvoice: any,
  storno: any,
  cancellation: InvoiceCancelJobData['cancellation']
): string {
  return `Stimate client,

Va informam ca factura ${originalInvoice.seriesName}-${originalInvoice.number} a fost anulata (stornata).

Motiv: ${cancellation.reasonText}

Document de stornare: ${storno.seriesName}-${storno.number}

Pentru orice intrebari, va rugam sa ne contactati.

Cu stima,
Echipa noastra`;
}

/**
 * Upload file to S3-compatible storage
 */
async function uploadToStorage(data: Buffer, path: string): Promise<string> {
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
    ContentType: 'application/pdf',
  }));
  
  return `${process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${path}`;
}

// ============================================================================
// Event Handlers
// ============================================================================

oblioInvoiceCancelWorker.on('completed', (job, result) => {
  logger.info('Invoice cancellation completed', {
    jobId: job.id,
    negotiationId: job.data.negotiationId,
    stornoInvoiceId: result.stornoInvoiceId,
    cancelledTotal: result.cancelledTotal,
  });
});

oblioInvoiceCancelWorker.on('failed', (job, error) => {
  logger.error('Invoice cancellation failed', {
    jobId: job?.id,
    negotiationId: job?.data.negotiationId,
    error: error.message,
  });
});
```

---

## 6. Oblio API Integration

### 6.1 Oblio Client Implementation

```typescript
// ============================================================================
// OBLIO API CLIENT
// ============================================================================

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';

/**
 * Oblio API configuration
 */
export interface OblioConfig {
  apiKey: string;
  apiSecret: string;
  companyCif: string;
  baseUrl?: string;
  timeout?: number;
}

/**
 * Oblio API Response wrapper
 */
interface OblioResponse<T> {
  status: number;
  statusMessage: string;
  data: T;
}

/**
 * Oblio API Client
 */
export class OblioClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private config: OblioConfig;
  
  constructor(config: OblioConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://www.oblio.eu/api',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Request interceptor for auth
    this.client.interceptors.request.use(async (request) => {
      if (!request.url?.includes('/authorize')) {
        const token = await this.getAccessToken();
        request.headers.Authorization = `Bearer ${token}`;
      }
      return request;
    });
    
    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        metrics.oblioApiCalls.inc({ 
          method: response.config.method,
          status: response.status.toString(),
        });
        return response;
      },
      (error: AxiosError) => {
        metrics.oblioApiErrors.inc({
          method: error.config?.method,
          status: error.response?.status?.toString() || 'network_error',
        });
        throw error;
      }
    );
  }
  
  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<string> {
    // Check if token is still valid (with 5 min buffer)
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date(Date.now() + 300000)) {
      return this.accessToken;
    }
    
    const response = await this.client.post('/authorize/token', {
      client_id: this.config.apiKey,
      client_secret: this.config.apiSecret,
    });
    
    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
    
    return this.accessToken;
  }
  
  // =========================================================================
  // Client Methods
  // =========================================================================
  
  /**
   * Get clients with optional filter
   */
  async getClients(filter?: { cif?: string; name?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (filter?.cif) params.append('cif', filter.cif);
    if (filter?.name) params.append('name', filter.name);
    params.append('cif', this.config.companyCif);
    
    const response = await this.client.get(`/v1/api/clients?${params}`);
    return response.data;
  }
  
  /**
   * Create a new client
   */
  async createClient(data: any): Promise<any> {
    const response = await this.client.post('/v1/api/clients', {
      ...data,
      cif_company: this.config.companyCif,
    });
    return response.data.data;
  }
  
  /**
   * Update an existing client
   */
  async updateClient(clientCif: string, data: any): Promise<any> {
    const response = await this.client.put(`/v1/api/clients/${clientCif}`, {
      ...data,
      cif_company: this.config.companyCif,
    });
    return response.data.data;
  }
  
  // =========================================================================
  // Proforma Methods
  // =========================================================================
  
  /**
   * Create a proforma invoice
   */
  async createProforma(data: any): Promise<any> {
    const response = await this.client.post('/v1/api/proforma', {
      ...data,
      cif_company: this.config.companyCif,
    });
    return response.data.data;
  }
  
  /**
   * Get proforma PDF
   */
  async getProformaPdf(seriesName: string, number: number): Promise<Buffer> {
    const response = await this.client.get(
      `/v1/api/proforma/pdf/${seriesName}/${number}`,
      {
        params: { cif: this.config.companyCif },
        responseType: 'arraybuffer',
      }
    );
    return Buffer.from(response.data);
  }
  
  /**
   * Send proforma via email
   */
  async sendProformaEmail(seriesName: string, number: number, options: {
    to: string;
    subject: string;
    body: string;
  }): Promise<void> {
    await this.client.post(`/v1/api/proforma/email/${seriesName}/${number}`, {
      cif: this.config.companyCif,
      ...options,
    });
  }
  
  // =========================================================================
  // Invoice Methods
  // =========================================================================
  
  /**
   * Create a fiscal invoice
   */
  async createInvoice(data: any): Promise<any> {
    const response = await this.client.post('/v1/api/invoice', {
      ...data,
      cif_company: this.config.companyCif,
    });
    return response.data.data;
  }
  
  /**
   * Get invoice PDF
   */
  async getInvoicePdf(seriesName: string, number: number): Promise<Buffer> {
    const response = await this.client.get(
      `/v1/api/invoice/pdf/${seriesName}/${number}`,
      {
        params: { cif: this.config.companyCif },
        responseType: 'arraybuffer',
      }
    );
    return Buffer.from(response.data);
  }
  
  /**
   * Send invoice via email
   */
  async sendInvoiceEmail(seriesName: string, number: number, options: {
    to: string;
    subject: string;
    body: string;
  }): Promise<void> {
    await this.client.post(`/v1/api/invoice/email/${seriesName}/${number}`, {
      cif: this.config.companyCif,
      ...options,
    });
  }
  
  /**
   * Create storno (cancellation) invoice
   */
  async createStorno(data: {
    seriesName: string;
    number: number;
    reason: string;
    issueDate: string;
    items?: any[];
  }): Promise<any> {
    const response = await this.client.post('/v1/api/invoice/storno', {
      cif: this.config.companyCif,
      ...data,
    });
    return response.data.data;
  }
  
  // =========================================================================
  // e-Factura Methods
  // =========================================================================
  
  /**
   * Get e-Factura XML for invoice
   */
  async getEfacturaXml(seriesName: string, number: number): Promise<string> {
    const response = await this.client.get(
      `/v1/api/efactura/xml/${seriesName}/${number}`,
      {
        params: { cif: this.config.companyCif },
      }
    );
    return response.data.data.xml;
  }
  
  /**
   * Send invoice to ANAF via e-Factura
   */
  async sendEfactura(seriesName: string, number: number): Promise<{
    indexIncarcare: string;
    dataIncarcare: string;
  }> {
    const response = await this.client.post(
      `/v1/api/efactura/send/${seriesName}/${number}`,
      { cif: this.config.companyCif }
    );
    return response.data.data;
  }
  
  /**
   * Check e-Factura status
   */
  async checkEfacturaStatus(indexIncarcare: string): Promise<{
    stare: 'in_prelucrare' | 'ok' | 'nok' | 'eroare_validare';
    idDescarcare?: string;
    erori?: string[];
  }> {
    const response = await this.client.get(
      `/v1/api/efactura/status/${indexIncarcare}`,
      {
        params: { cif: this.config.companyCif },
      }
    );
    return response.data.data;
  }
  
  /**
   * Get e-Factura PDF from ANAF
   */
  async getEfacturaPdf(idDescarcare: string): Promise<Buffer> {
    const response = await this.client.get(
      `/v1/api/efactura/download/${idDescarcare}`,
      {
        params: { cif: this.config.companyCif },
        responseType: 'arraybuffer',
      }
    );
    return Buffer.from(response.data);
  }
  
  // =========================================================================
  // Product/Nomenclature Methods
  // =========================================================================
  
  /**
   * Get product nomenclature
   */
  async getProducts(page: number = 1, perPage: number = 100): Promise<any> {
    const response = await this.client.get('/v1/api/nomenclature/products', {
      params: {
        cif: this.config.companyCif,
        page,
        per_page: perPage,
      },
    });
    return response.data;
  }
  
  /**
   * Create product in nomenclature
   */
  async createProduct(data: {
    name: string;
    code: string;
    price: number;
    unit: string;
    vatName: string;
  }): Promise<any> {
    const response = await this.client.post('/v1/api/nomenclature/products', {
      ...data,
      cif: this.config.companyCif,
    });
    return response.data.data;
  }
  
  // =========================================================================
  // Series Methods
  // =========================================================================
  
  /**
   * Get available invoice series
   */
  async getInvoiceSeries(): Promise<Array<{
    name: string;
    startNumber: number;
    currentNumber: number;
    type: 'invoice' | 'proforma' | 'receipt';
  }>> {
    const response = await this.client.get('/v1/api/nomenclature/series', {
      params: { cif: this.config.companyCif },
    });
    return response.data.data;
  }
}
```

### 6.2 Rate Limiting Configuration

```typescript
/**
 * Oblio API Rate Limits (as of 2024)
 */
export const OBLIO_RATE_LIMITS = {
  // Global limits per company
  REQUESTS_PER_MINUTE: 120,
  REQUESTS_PER_HOUR: 3600,
  
  // Endpoint-specific limits
  ENDPOINTS: {
    '/authorize/token': {
      perMinute: 10,
      perHour: 100,
    },
    '/v1/api/invoice': {
      perMinute: 60,
      perHour: 1000,
    },
    '/v1/api/proforma': {
      perMinute: 60,
      perHour: 1000,
    },
    '/v1/api/efactura/send': {
      perMinute: 30,
      perHour: 500,
    },
    '/v1/api/clients': {
      perMinute: 100,
      perHour: 2000,
    },
  },
};

/**
 * Rate limiter using Redis
 */
export class OblioRateLimiter {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  async checkLimit(tenantId: string, endpoint: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    const key = `oblio:rate:${tenantId}:${endpoint}:${Math.floor(Date.now() / 60000)}`;
    const limit = OBLIO_RATE_LIMITS.ENDPOINTS[endpoint]?.perMinute || 
                  OBLIO_RATE_LIMITS.REQUESTS_PER_MINUTE;
    
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, 60);
    }
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt: new Date(Math.ceil(Date.now() / 60000) * 60000),
    };
  }
}
```

---

## 7. Retry & Error Handling

### 7.1 Error Classification

```typescript
/**
 * Oblio error codes and handling
 */
export enum OblioErrorType {
  // Retryable errors
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Non-retryable errors
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE = 'DUPLICATE',
  FISCAL_VIOLATION = 'FISCAL_VIOLATION',
}

/**
 * Classify Oblio error
 */
export function classifyOblioError(error: AxiosError): {
  type: OblioErrorType;
  retryable: boolean;
  delay?: number;
} {
  const status = error.response?.status;
  const code = (error.response?.data as any)?.code;
  
  // Rate limit
  if (status === 429) {
    const retryAfter = parseInt(error.response?.headers['retry-after'] || '60');
    return { type: OblioErrorType.RATE_LIMIT, retryable: true, delay: retryAfter * 1000 };
  }
  
  // Server errors
  if (status && status >= 500) {
    return { type: OblioErrorType.SERVER_ERROR, retryable: true, delay: 5000 };
  }
  
  // Timeout
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return { type: OblioErrorType.TIMEOUT, retryable: true, delay: 3000 };
  }
  
  // Network errors
  if (!error.response) {
    return { type: OblioErrorType.NETWORK_ERROR, retryable: true, delay: 2000 };
  }
  
  // Authentication
  if (status === 401 || status === 403) {
    return { type: OblioErrorType.AUTHENTICATION, retryable: false };
  }
  
  // Not found
  if (status === 404) {
    return { type: OblioErrorType.NOT_FOUND, retryable: false };
  }
  
  // Validation errors
  if (status === 400 || status === 422) {
    // Check for fiscal violations
    if (code === 'EFACTURA_ALREADY_SENT' || code === 'INVOICE_ALREADY_CANCELLED') {
      return { type: OblioErrorType.FISCAL_VIOLATION, retryable: false };
    }
    return { type: OblioErrorType.VALIDATION, retryable: false };
  }
  
  // Duplicate
  if (status === 409) {
    return { type: OblioErrorType.DUPLICATE, retryable: false };
  }
  
  // Default to non-retryable
  return { type: OblioErrorType.VALIDATION, retryable: false };
}
```

### 7.2 Retry Strategy

```typescript
/**
 * Retry configuration per worker
 */
export const OBLIO_RETRY_CONFIG = {
  'oblio:client:validate': {
    maxRetries: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
      maxDelay: 30000,
    },
    retryOn: [
      OblioErrorType.RATE_LIMIT,
      OblioErrorType.TIMEOUT,
      OblioErrorType.SERVER_ERROR,
      OblioErrorType.NETWORK_ERROR,
    ],
  },
  'oblio:proforma:create': {
    maxRetries: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 3000,
      maxDelay: 60000,
    },
    retryOn: [
      OblioErrorType.RATE_LIMIT,
      OblioErrorType.TIMEOUT,
      OblioErrorType.SERVER_ERROR,
      OblioErrorType.NETWORK_ERROR,
    ],
  },
  'oblio:invoice:create': {
    maxRetries: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 3000,
      maxDelay: 60000,
    },
    retryOn: [
      OblioErrorType.RATE_LIMIT,
      OblioErrorType.TIMEOUT,
      OblioErrorType.SERVER_ERROR,
      OblioErrorType.NETWORK_ERROR,
    ],
    // Critical: Idempotency check before retry
    idempotencyCheck: true,
  },
  'oblio:invoice:cancel': {
    maxRetries: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 3000,
      maxDelay: 30000,
    },
    retryOn: [
      OblioErrorType.RATE_LIMIT,
      OblioErrorType.TIMEOUT,
      OblioErrorType.SERVER_ERROR,
      OblioErrorType.NETWORK_ERROR,
    ],
    // Critical: Idempotency check before retry
    idempotencyCheck: true,
  },
};
```

### 7.3 Idempotency for Fiscal Operations

```typescript
/**
 * Idempotency manager for invoice creation
 * Prevents duplicate invoices on retry
 */
export class OblioIdempotencyManager {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  /**
   * Generate idempotency key
   */
  generateKey(tenantId: string, operation: string, params: Record<string, any>): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ tenantId, operation, ...params }))
      .digest('hex')
      .substring(0, 16);
    
    return `oblio:idempotency:${tenantId}:${operation}:${hash}`;
  }
  
  /**
   * Check if operation was already completed
   */
  async checkCompleted(key: string): Promise<{
    completed: boolean;
    result?: any;
  }> {
    const data = await this.redis.get(key);
    if (data) {
      return { completed: true, result: JSON.parse(data) };
    }
    return { completed: false };
  }
  
  /**
   * Mark operation as completed
   */
  async markCompleted(key: string, result: any, ttlSeconds: number = 86400): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(result));
  }
  
  /**
   * Acquire lock for operation (prevent concurrent execution)
   */
  async acquireLock(key: string, ttlSeconds: number = 60): Promise<boolean> {
    const lockKey = `${key}:lock`;
    const result = await this.redis.set(lockKey, '1', 'NX', 'EX', ttlSeconds);
    return result === 'OK';
  }
  
  /**
   * Release lock
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = `${key}:lock`;
    await this.redis.del(lockKey);
  }
}
```

---

## 8. Monitoring & Alerts

### 8.1 Prometheus Metrics

```typescript
// ============================================================================
// OBLIO INTEGRATION METRICS
// ============================================================================

import { Counter, Histogram, Gauge } from 'prom-client';

// Client validation metrics
export const oblioClientValidationsSuccess = new Counter({
  name: 'oblio_client_validations_success_total',
  help: 'Total successful client validations',
  labelNames: ['tenant_id', 'action'],
});

export const oblioClientValidationsFailed = new Counter({
  name: 'oblio_client_validations_failed_total',
  help: 'Total failed client validations',
  labelNames: ['tenant_id', 'reason'],
});

export const oblioClientValidationsCached = new Counter({
  name: 'oblio_client_validations_cached_total',
  help: 'Total client validations served from cache',
  labelNames: ['tenant_id'],
});

export const oblioClientValidationsError = new Counter({
  name: 'oblio_client_validations_error_total',
  help: 'Total client validation errors',
  labelNames: ['tenant_id', 'error_type'],
});

export const oblioClientValidationDuration = new Histogram({
  name: 'oblio_client_validation_duration_ms',
  help: 'Client validation duration in milliseconds',
  labelNames: ['tenant_id'],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 15000],
});

// Proforma metrics
export const oblioProformasCreated = new Counter({
  name: 'oblio_proformas_created_total',
  help: 'Total proformas created',
  labelNames: ['tenant_id'],
});

export const oblioProformasFailed = new Counter({
  name: 'oblio_proformas_failed_total',
  help: 'Total proforma creation failures',
  labelNames: ['tenant_id', 'error_type'],
});

export const oblioProformaTotal = new Counter({
  name: 'oblio_proforma_total_ron',
  help: 'Total value of proformas in RON',
  labelNames: ['tenant_id'],
});

export const oblioProformaCreateDuration = new Histogram({
  name: 'oblio_proforma_create_duration_ms',
  help: 'Proforma creation duration in milliseconds',
  labelNames: ['tenant_id'],
  buckets: [500, 1000, 2000, 5000, 10000, 20000, 30000],
});

// Invoice metrics
export const oblioInvoicesCreated = new Counter({
  name: 'oblio_invoices_created_total',
  help: 'Total invoices created',
  labelNames: ['tenant_id'],
});

export const oblioInvoicesFailed = new Counter({
  name: 'oblio_invoices_failed_total',
  help: 'Total invoice creation failures',
  labelNames: ['tenant_id', 'error_type'],
});

export const oblioInvoiceTotal = new Counter({
  name: 'oblio_invoice_total_ron',
  help: 'Total value of invoices in RON',
  labelNames: ['tenant_id'],
});

export const oblioInvoiceCreateDuration = new Histogram({
  name: 'oblio_invoice_create_duration_ms',
  help: 'Invoice creation duration in milliseconds',
  labelNames: ['tenant_id'],
  buckets: [500, 1000, 2000, 5000, 10000, 20000, 30000],
});

// Storno metrics
export const oblioStornosCreated = new Counter({
  name: 'oblio_stornos_created_total',
  help: 'Total stornos created',
  labelNames: ['tenant_id', 'reason_code', 'type'],
});

export const oblioStornosFailed = new Counter({
  name: 'oblio_stornos_failed_total',
  help: 'Total storno creation failures',
  labelNames: ['tenant_id', 'error_type'],
});

export const oblioStornoTotal = new Counter({
  name: 'oblio_storno_total_ron',
  help: 'Total value of stornos in RON',
  labelNames: ['tenant_id'],
});

export const oblioStornoDuration = new Histogram({
  name: 'oblio_storno_duration_ms',
  help: 'Storno creation duration in milliseconds',
  labelNames: ['tenant_id'],
  buckets: [500, 1000, 2000, 5000, 10000, 20000, 30000],
});

// API metrics
export const oblioApiCalls = new Counter({
  name: 'oblio_api_calls_total',
  help: 'Total Oblio API calls',
  labelNames: ['method', 'status'],
});

export const oblioApiErrors = new Counter({
  name: 'oblio_api_errors_total',
  help: 'Total Oblio API errors',
  labelNames: ['method', 'status'],
});

export const oblioApiLatency = new Histogram({
  name: 'oblio_api_latency_ms',
  help: 'Oblio API latency in milliseconds',
  labelNames: ['method', 'endpoint'],
  buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000],
});

// Rate limit metrics
export const oblioRateLimitHits = new Counter({
  name: 'oblio_rate_limit_hits_total',
  help: 'Total rate limit hits',
  labelNames: ['tenant_id', 'endpoint'],
});

export const oblioRateLimitRemaining = new Gauge({
  name: 'oblio_rate_limit_remaining',
  help: 'Remaining API calls before rate limit',
  labelNames: ['tenant_id', 'endpoint'],
});
```

### 8.2 Alerting Rules

```yaml
# ============================================================================
# OBLIO INTEGRATION ALERTS
# ============================================================================

groups:
  - name: oblio_integration_alerts
    interval: 30s
    rules:
      # High error rate on client validation
      - alert: OblioClientValidationHighErrorRate
        expr: |
          (
            rate(oblio_client_validations_failed_total[5m]) /
            (rate(oblio_client_validations_success_total[5m]) + rate(oblio_client_validations_failed_total[5m]))
          ) > 0.1
        for: 5m
        labels:
          severity: warning
          component: oblio
          worker: client_validate
        annotations:
          summary: "High client validation error rate"
          description: "Client validation error rate is {{ $value | humanizePercentage }} (>10%)"
      
      # Invoice creation failures
      - alert: OblioInvoiceCreationFailing
        expr: |
          rate(oblio_invoices_failed_total[10m]) > 0.5
        for: 5m
        labels:
          severity: critical
          component: oblio
          worker: invoice_create
        annotations:
          summary: "Invoice creation is failing"
          description: "Invoice creation failure rate: {{ $value }} failures/min"
      
      # Proforma creation slow
      - alert: OblioProformaCreationSlow
        expr: |
          histogram_quantile(0.95, rate(oblio_proforma_create_duration_ms_bucket[5m])) > 20000
        for: 5m
        labels:
          severity: warning
          component: oblio
          worker: proforma_create
        annotations:
          summary: "Proforma creation is slow"
          description: "P95 proforma creation time is {{ $value | humanizeDuration }}"
      
      # Rate limit approaching
      - alert: OblioRateLimitApproaching
        expr: |
          oblio_rate_limit_remaining < 10
        for: 1m
        labels:
          severity: warning
          component: oblio
        annotations:
          summary: "Oblio API rate limit approaching"
          description: "Only {{ $value }} API calls remaining before rate limit"
      
      # Rate limit hit
      - alert: OblioRateLimitHit
        expr: |
          increase(oblio_rate_limit_hits_total[5m]) > 5
        for: 1m
        labels:
          severity: critical
          component: oblio
        annotations:
          summary: "Oblio API rate limit hit"
          description: "Rate limit hit {{ $value }} times in last 5 minutes"
      
      # High storno rate (potential issue indicator)
      - alert: OblioHighStornoRate
        expr: |
          (
            rate(oblio_stornos_created_total[1h]) /
            rate(oblio_invoices_created_total[1h])
          ) > 0.05
        for: 30m
        labels:
          severity: warning
          component: oblio
        annotations:
          summary: "High invoice storno rate"
          description: "Storno rate is {{ $value | humanizePercentage }} of invoices (>5%)"
      
      # API consistently slow
      - alert: OblioApiSlowResponse
        expr: |
          histogram_quantile(0.95, rate(oblio_api_latency_ms_bucket[5m])) > 5000
        for: 10m
        labels:
          severity: warning
          component: oblio
        annotations:
          summary: "Oblio API responding slowly"
          description: "P95 API latency is {{ $value }}ms (>5s)"
      
      # No invoices created (potential issue)
      - alert: OblioNoInvoicesCreated
        expr: |
          increase(oblio_invoices_created_total[1h]) == 0
        for: 2h
        labels:
          severity: warning
          component: oblio
        annotations:
          summary: "No invoices created in 2 hours"
          description: "No invoices have been created in the last 2 hours during business hours"
```

### 8.3 Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Oblio Integration Dashboard",
    "uid": "oblio-integration",
    "panels": [
      {
        "title": "Invoice Creation Rate",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 0, "w": 8, "h": 6 },
        "targets": [
          {
            "expr": "rate(oblio_invoices_created_total[5m])",
            "legendFormat": "{{ tenant_id }}"
          }
        ]
      },
      {
        "title": "Invoice Value (RON)",
        "type": "stat",
        "gridPos": { "x": 8, "y": 0, "w": 4, "h": 6 },
        "targets": [
          {
            "expr": "sum(increase(oblio_invoice_total_ron[24h]))",
            "legendFormat": "Last 24h"
          }
        ]
      },
      {
        "title": "Success Rate",
        "type": "gauge",
        "gridPos": { "x": 12, "y": 0, "w": 4, "h": 6 },
        "targets": [
          {
            "expr": "sum(rate(oblio_invoices_created_total[1h])) / (sum(rate(oblio_invoices_created_total[1h])) + sum(rate(oblio_invoices_failed_total[1h])))",
            "legendFormat": ""
          }
        ]
      },
      {
        "title": "API Latency (P95)",
        "type": "timeseries",
        "gridPos": { "x": 16, "y": 0, "w": 8, "h": 6 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(oblio_api_latency_ms_bucket[5m]))",
            "legendFormat": "{{ endpoint }}"
          }
        ]
      },
      {
        "title": "Error Breakdown",
        "type": "piechart",
        "gridPos": { "x": 0, "y": 6, "w": 8, "h": 6 },
        "targets": [
          {
            "expr": "sum by (error_type) (increase(oblio_invoices_failed_total[24h]))",
            "legendFormat": "{{ error_type }}"
          }
        ]
      },
      {
        "title": "Storno Rate",
        "type": "timeseries",
        "gridPos": { "x": 8, "y": 6, "w": 8, "h": 6 },
        "targets": [
          {
            "expr": "rate(oblio_stornos_created_total[1h]) / rate(oblio_invoices_created_total[1h]) * 100",
            "legendFormat": "Storno %"
          }
        ]
      },
      {
        "title": "Rate Limit Status",
        "type": "gauge",
        "gridPos": { "x": 16, "y": 6, "w": 8, "h": 6 },
        "targets": [
          {
            "expr": "min(oblio_rate_limit_remaining)",
            "legendFormat": "Remaining"
          }
        ]
      }
    ]
  }
}
```

---

## 9. Queue Configuration

### 9.1 BullMQ Queue Setup

```typescript
// ============================================================================
// OBLIO QUEUE CONFIGURATION
// ============================================================================

import { Queue, QueueScheduler, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

// ============================================================================
// Queue Definitions
// ============================================================================

/**
 * Client validation queue
 */
export const oblioClientValidateQueue = new Queue('oblio:client:validate', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});

/**
 * Proforma creation queue
 */
export const oblioProformaCreateQueue = new Queue('oblio:proforma:create', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      age: 172800, // 48 hours
      count: 500,
    },
    removeOnFail: {
      age: 2592000, // 30 days (critical data)
    },
  },
});

/**
 * Invoice creation queue
 */
export const oblioInvoiceCreateQueue = new Queue('oblio:invoice:create', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      age: 172800, // 48 hours
      count: 500,
    },
    removeOnFail: {
      age: 2592000, // 30 days (critical fiscal data)
    },
  },
});

/**
 * Invoice cancellation queue
 */
export const oblioInvoiceCancelQueue = new Queue('oblio:invoice:cancel', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      age: 172800, // 48 hours
      count: 200,
    },
    removeOnFail: {
      age: 2592000, // 30 days (critical fiscal data)
    },
  },
});

// ============================================================================
// Queue Schedulers (for delayed jobs)
// ============================================================================

export const clientValidateScheduler = new QueueScheduler('oblio:client:validate', {
  connection: redis,
});

export const proformaCreateScheduler = new QueueScheduler('oblio:proforma:create', {
  connection: redis,
});

export const invoiceCreateScheduler = new QueueScheduler('oblio:invoice:create', {
  connection: redis,
});

export const invoiceCancelScheduler = new QueueScheduler('oblio:invoice:cancel', {
  connection: redis,
});

// ============================================================================
// Queue Events (for monitoring)
// ============================================================================

export const oblioQueueEvents = {
  clientValidate: new QueueEvents('oblio:client:validate', { connection: redis }),
  proformaCreate: new QueueEvents('oblio:proforma:create', { connection: redis }),
  invoiceCreate: new QueueEvents('oblio:invoice:create', { connection: redis }),
  invoiceCancel: new QueueEvents('oblio:invoice:cancel', { connection: redis }),
};

// Setup event listeners
Object.entries(oblioQueueEvents).forEach(([name, events]) => {
  events.on('completed', ({ jobId }) => {
    logger.debug(`Job completed`, { queue: name, jobId });
  });
  
  events.on('failed', ({ jobId, failedReason }) => {
    logger.error(`Job failed`, { queue: name, jobId, reason: failedReason });
  });
  
  events.on('stalled', ({ jobId }) => {
    logger.warn(`Job stalled`, { queue: name, jobId });
    metrics.oblioStalledJobs.inc({ queue: name });
  });
});

// ============================================================================
// Queue Health Check
// ============================================================================

export async function checkOblioQueuesHealth(): Promise<{
  healthy: boolean;
  queues: Record<string, {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }>;
}> {
  const queues = [
    { name: 'client:validate', queue: oblioClientValidateQueue },
    { name: 'proforma:create', queue: oblioProformaCreateQueue },
    { name: 'invoice:create', queue: oblioInvoiceCreateQueue },
    { name: 'invoice:cancel', queue: oblioInvoiceCancelQueue },
  ];
  
  const results: Record<string, any> = {};
  let healthy = true;
  
  for (const { name, queue } of queues) {
    const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);
    
    results[name] = { waiting, active, completed, failed, delayed, paused: isPaused };
    
    // Check for issues
    if (failed > 100 || waiting > 1000 || isPaused) {
      healthy = false;
    }
  }
  
  return { healthy, queues: results };
}
```

### 9.2 Worker Scaling Configuration

```typescript
/**
 * Worker scaling recommendations based on load
 */
export const OBLIO_WORKER_SCALING = {
  'oblio:client:validate': {
    minInstances: 1,
    maxInstances: 5,
    concurrency: 50,
    scaleUpThreshold: 100, // waiting jobs
    scaleDownThreshold: 10,
    cooldownSeconds: 300,
  },
  'oblio:proforma:create': {
    minInstances: 1,
    maxInstances: 3,
    concurrency: 30,
    scaleUpThreshold: 50,
    scaleDownThreshold: 5,
    cooldownSeconds: 300,
  },
  'oblio:invoice:create': {
    minInstances: 1,
    maxInstances: 3,
    concurrency: 30,
    scaleUpThreshold: 50,
    scaleDownThreshold: 5,
    cooldownSeconds: 300,
  },
  'oblio:invoice:cancel': {
    minInstances: 1,
    maxInstances: 2,
    concurrency: 20,
    scaleUpThreshold: 30,
    scaleDownThreshold: 5,
    cooldownSeconds: 300,
  },
};
```

---

## Appendix A: Oblio API Reference Links

| Resource | URL |
|----------|-----|
| Oblio Website | https://www.oblio.eu |
| API Documentation | https://www.oblio.eu/api |
| OAuth2 Authentication | https://www.oblio.eu/api-doc/auth |
| Invoice API | https://www.oblio.eu/api-doc/invoice |
| Proforma API | https://www.oblio.eu/api-doc/proforma |
| e-Factura Integration | https://www.oblio.eu/api-doc/efactura |
| Client API | https://www.oblio.eu/api-doc/clients |
| Nomenclature API | https://www.oblio.eu/api-doc/nomenclature |

---

## Appendix B: Romanian Fiscal Compliance Notes

### B.1 e-Factura Requirements

- **Mandatory for B2B**: All B2B invoices in Romania must be sent to ANAF via e-Factura
- **Deadline**: Invoice must be sent within 5 days of issuance
- **Format**: UBL 2.1 XML format
- **Validation**: ANAF validates and may reject invoices
- **Storno**: Cancelled invoices require a storno document also sent to ANAF

### B.2 Invoice Series Rules

- Each company can have multiple invoice series
- Series must be registered with ANAF
- Numbers must be sequential within series
- Cannot skip numbers (audit trail requirement)

### B.3 VAT Rates (2024)

| Rate | Name | Usage |
|------|------|-------|
| 19% | Normală | Standard rate for most goods/services |
| 9% | Redusă | Food, medicines, some services |
| 5% | Redusă | Books, newspapers, some housing |
| 0% | Scutit | Exports, intra-EU deliveries |

---

**Document End**

*This document specifies the complete implementation for Oblio.eu integration workers in Etapa 3 of the Cerniq platform. All workers are designed for high reliability, proper error handling, and Romanian fiscal compliance.*
