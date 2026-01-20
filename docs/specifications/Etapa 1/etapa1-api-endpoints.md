# CERNIQ.APP — ETAPA 1: REST API ENDPOINTS

## Backend API Complet

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. API OVERVIEW

### 1.1 Base Configuration

```typescript
// Base URL
const BASE_URL = '/api/v1';

// Standard Response Format
interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Standard Error Codes
const ERROR_CODES = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};
```

### 1.2 Authentication

```typescript
// JWT Token in Authorization header
headers: {
  'Authorization': 'Bearer <access_token>',
  'X-Tenant-ID': '<tenant_uuid>', // Multi-tenant header
  'Content-Type': 'application/json',
}
```

---

## 2. DASHBOARD ENDPOINTS

### 2.1 GET /dashboard/stats

```typescript
// Request
GET /api/v1/dashboard/stats

// Response
{
  "success": true,
  "data": {
    "bronze": {
      "total": 45230,
      "today": 1250,
      "pending": 3420,
      "promoted": 38500,
      "rejected": 3310
    },
    "silver": {
      "total": 38500,
      "validated": 35200,
      "enriched": 32100,
      "eligible": 28500
    },
    "gold": {
      "total": 28500,
      "promoted": 450,
      "thisWeek": 450
    },
    "approvals": {
      "pending": 23,
      "urgent": 5,
      "avgResolutionHours": 4.2
    },
    "quality": {
      "average": 72.5,
      "distribution": {
        "high": 18500,
        "medium": 12000,
        "low": 8000
      }
    },
    "enrichment": {
      "queues": [
        { "name": "anaf", "depth": 120, "processing": 5 },
        { "name": "termene", "depth": 85, "processing": 10 },
        { "name": "geocoding", "depth": 200, "processing": 20 }
      ],
      "completionRate": 0.92
    }
  }
}
```

### 2.2 GET /dashboard/activity

```typescript
// Request
GET /api/v1/dashboard/activity?limit=20

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "import_completed",
      "title": "CSV Import Completed",
      "description": "1,250 contacts imported from prospects_jan.csv",
      "timestamp": "2026-01-15T10:30:00Z",
      "metadata": { "batchId": "uuid", "successRate": 0.95 }
    },
    {
      "id": "uuid",
      "type": "approval_required",
      "title": "Data Quality Review Required",
      "description": "Company AGRO FARM SRL needs manual review",
      "timestamp": "2026-01-15T10:25:00Z",
      "metadata": { "approvalId": "uuid", "entityType": "company" }
    }
  ]
}
```

---

## 3. IMPORT ENDPOINTS

### 3.1 GET /imports

```typescript
// Request
GET /api/v1/imports?page=1&pageSize=20&status=completed&sourceType=csv_import

// Query Parameters
interface ImportListParams {
  page?: number;
  pageSize?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  sourceType?: 'csv_import' | 'excel_import' | 'api' | 'webhook';
  startDate?: string; // ISO date
  endDate?: string;
  sortBy?: 'createdAt' | 'filename' | 'totalRows';
  sortOrder?: 'asc' | 'desc';
}

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "filename": "prospects_jan_2026.csv",
      "sourceType": "csv_import",
      "fileSizeBytes": 2450000,
      "totalRows": 5000,
      "processedRows": 5000,
      "successRows": 4750,
      "errorRows": 150,
      "duplicateRows": 100,
      "status": "completed",
      "importedBy": {
        "id": "uuid",
        "name": "John Doe"
      },
      "startedAt": "2026-01-15T09:00:00Z",
      "completedAt": "2026-01-15T09:05:30Z",
      "createdAt": "2026-01-15T09:00:00Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

### 3.2 POST /imports

```typescript
// Request - Multipart Form Data
POST /api/v1/imports
Content-Type: multipart/form-data

// Form Fields
{
  file: File,                    // Required
  mapping: string,               // JSON string of column mapping
  hasHeader: boolean,            // Default: true
  skipRows: number,              // Default: 0
  encoding: string,              // Default: 'utf-8'
  delimiter: string,             // Default: ',' (for CSV)
  sheetName: string,             // For Excel files
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "prospects.csv",
    "status": "processing",
    "estimatedRows": 5000,
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

### 3.3 GET /imports/:id

```typescript
// Request
GET /api/v1/imports/uuid

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "prospects.csv",
    "sourceType": "csv_import",
    "fileSizeBytes": 2450000,
    "fileChecksum": "sha256:abc123...",
    "totalRows": 5000,
    "processedRows": 3500,
    "successRows": 3400,
    "errorRows": 100,
    "duplicateRows": 50,
    "status": "processing",
    "progress": 70,
    "mapping": {
      "Company Name": "denumire",
      "CUI": "cui",
      "Address": "adresa",
      "Phone": "telefon",
      "Email": "email"
    },
    "errors": [
      { "row": 125, "field": "cui", "error": "Invalid CUI format" },
      { "row": 340, "field": "email", "error": "Invalid email format" }
    ],
    "importedBy": { "id": "uuid", "name": "John Doe" },
    "startedAt": "2026-01-15T09:00:00Z",
    "createdAt": "2026-01-15T09:00:00Z"
  }
}
```

### 3.4 POST /imports/:id/cancel

```typescript
// Request
POST /api/v1/imports/uuid/cancel

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "processedRows": 2500,
    "cancelledAt": "2026-01-15T09:03:00Z"
  }
}
```

---

## 4. BRONZE ENDPOINTS

### 4.1 GET /bronze/contacts

```typescript
// Request
GET /api/v1/bronze/contacts?page=1&pageSize=25&status=pending

// Query Parameters
interface BronzeContactsParams {
  page?: number;
  pageSize?: number;
  status?: 'pending' | 'processing' | 'promoted' | 'rejected' | 'error';
  sourceType?: string;
  search?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'extractedName' | 'sourceType';
  sortOrder?: 'asc' | 'desc';
}

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "extractedName": "AGRO FARM SRL",
      "extractedCui": "12345678",
      "extractedEmail": "contact@agrofarm.ro",
      "extractedPhone": "+40721123456",
      "sourceType": "csv_import",
      "sourceIdentifier": "prospects.csv:row_42",
      "processingStatus": "pending",
      "isDuplicate": false,
      "createdAt": "2026-01-15T09:00:00Z"
    }
  ],
  "meta": {
    "total": 45230,
    "page": 1,
    "pageSize": 25,
    "totalPages": 1810
  }
}
```

### 4.2 GET /bronze/contacts/:id

```typescript
// Request
GET /api/v1/bronze/contacts/uuid

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "rawPayload": {
      "denumire": "AGRO FARM SRL",
      "cui": "12345678",
      "adresa": "Str. Principala Nr. 10, Braila",
      "telefon": "0721123456",
      "email": "contact@agrofarm.ro"
    },
    "extractedName": "AGRO FARM SRL",
    "extractedCui": "12345678",
    "extractedEmail": "contact@agrofarm.ro",
    "extractedPhone": "+40721123456",
    "sourceType": "csv_import",
    "sourceIdentifier": "prospects.csv:row_42",
    "sourceMetadata": {
      "batchId": "uuid",
      "rowNumber": 42,
      "fileName": "prospects.csv"
    },
    "contentHash": "sha256:def456...",
    "processingStatus": "pending",
    "processingError": null,
    "isDuplicate": false,
    "duplicateOfId": null,
    "promotedToSilverId": null,
    "promotedAt": null,
    "createdAt": "2026-01-15T09:00:00Z"
  }
}
```

### 4.3 POST /bronze/contacts/:id/reprocess

```typescript
// Request
POST /api/v1/bronze/contacts/uuid/reprocess

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "processingStatus": "pending",
    "jobId": "bronze-contact-uuid-1705312000000"
  }
}
```

---

## 5. SILVER ENDPOINTS

### 5.1 GET /silver/companies

```typescript
// Request
GET /api/v1/silver/companies?page=1&pageSize=25&enrichmentStatus=complete

// Query Parameters
interface SilverCompaniesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  cuiValidated?: boolean;
  enrichmentStatus?: 'pending' | 'in_progress' | 'partial' | 'complete' | 'failed';
  promotionStatus?: 'pending' | 'eligible' | 'promoted' | 'blocked';
  statusFirma?: 'ACTIVA' | 'INACTIVA' | 'RADIATA';
  judet?: string;
  minQualityScore?: number;
  maxQualityScore?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "cui": "12345678",
      "denumire": "AGRO FARM SRL",
      "localitate": "Braila",
      "judet": "Braila",
      "statusFirma": "ACTIVA",
      "cuiValidated": true,
      "enrichmentStatus": "complete",
      "enrichmentSourcesCompleted": ["anaf", "termene", "geocoding"],
      "totalQualityScore": 85,
      "completenessScore": 90,
      "accuracyScore": 82,
      "promotionStatus": "eligible",
      "updatedAt": "2026-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 38500,
    "page": 1,
    "pageSize": 25,
    "totalPages": 1540
  }
}
```

### 5.2 GET /silver/companies/:id

```typescript
// Request
GET /api/v1/silver/companies/uuid

// Response - Full company details with all fields
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "sourceBronzeId": "uuid",
    
    // Identification
    "cui": "12345678",
    "cuiRo": "RO12345678",
    "cuiValidated": true,
    "cuiValidationDate": "2026-01-15T09:30:00Z",
    "cuiValidationSource": "anaf_api",
    "nrRegCom": "J09/123/2015",
    
    // Name
    "denumire": "AGRO FARM SRL",
    "denumireNormalizata": "AGRO FARM SRL",
    "formaJuridica": "SRL",
    
    // Address
    "adresaCompleta": "Str. Principala Nr. 10, Braila, Braila",
    "localitate": "Braila",
    "judet": "Braila",
    "judetCod": "BR",
    "codSiruta": 91234,
    "latitude": 45.2692,
    "longitude": 27.9575,
    "geocodingAccuracy": "street",
    
    // Fiscal (from ANAF)
    "statusFirma": "ACTIVA",
    "dataInregistrare": "2015-03-15",
    "platitorTva": true,
    "dataInceputTva": "2015-04-01",
    "inregistratEFactura": true,
    "codCaenPrincipal": "0111",
    "denumireCaen": "Cultivarea cerealelor",
    
    // Financial (from Termene.ro)
    "cifraAfaceri": 2500000,
    "profitNet": 350000,
    "numarAngajati": 15,
    "anBilant": 2024,
    "scorRiscTermene": 25,
    "categorieRisc": "LOW",
    
    // Enrichment
    "enrichmentStatus": "complete",
    "enrichmentSourcesCompleted": ["anaf", "termene", "onrc", "geocoding"],
    "lastEnrichmentAt": "2026-01-15T10:00:00Z",
    
    // Quality
    "completenessScore": 90,
    "accuracyScore": 82,
    "freshnessScore": 95,
    "totalQualityScore": 85,
    
    // Promotion
    "promotionStatus": "eligible",
    "promotedToGoldId": null,
    
    "createdAt": "2026-01-15T09:00:00Z",
    "updatedAt": "2026-01-15T10:00:00Z"
  }
}
```

### 5.3 POST /silver/companies/:id/enrich

```typescript
// Request
POST /api/v1/silver/companies/uuid/enrich
{
  "sources": ["anaf", "termene", "geocoding"], // Optional, default: all
  "force": false // Re-enrich even if already complete
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "enrichmentStatus": "in_progress",
    "jobIds": {
      "anaf": "enrich-anaf-uuid-123",
      "termene": "enrich-termene-uuid-123",
      "geocoding": "enrich-geo-uuid-123"
    }
  }
}
```

### 5.4 POST /silver/companies/:id/promote

```typescript
// Request
POST /api/v1/silver/companies/uuid/promote
{
  "force": false // Promote even if quality < 70
}

// Response
{
  "success": true,
  "data": {
    "silverId": "uuid",
    "goldId": "uuid",
    "promotedAt": "2026-01-15T10:30:00Z"
  }
}
```

### 5.5 GET /silver/enrichment-log

```typescript
// Request
GET /api/v1/silver/enrichment-log?entityId=uuid&page=1

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "entityType": "company",
      "entityId": "uuid",
      "source": "anaf_fiscal",
      "operation": "fetch",
      "status": "success",
      "fieldsUpdated": ["statusFirma", "platitorTva", "codCaenPrincipal"],
      "durationMs": 450,
      "createdAt": "2026-01-15T09:30:00Z"
    }
  ],
  "meta": { "total": 12, "page": 1, "pageSize": 20, "totalPages": 1 }
}
```

---

## 6. GOLD ENDPOINTS

### 6.1 GET /gold/companies

```typescript
// Request
GET /api/v1/gold/companies?page=1&pageSize=25&currentState=COLD

// Query Parameters
interface GoldCompaniesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  currentState?: string | string[];
  minLeadScore?: number;
  maxLeadScore?: number;
  categorieDimensiune?: string;
  isAgricultural?: boolean;
  judetCod?: string;
  categorieRisc?: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedTo?: string;
  unassigned?: boolean;
  doNotContact?: boolean;
  sortBy?: 'leadScore' | 'denumire' | 'createdAt' | 'dataUltimaInteractiune';
  sortOrder?: 'asc' | 'desc';
}

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "cui": "12345678",
      "denumire": "AGRO FARM SRL",
      "localitate": "Braila",
      "judet": "Braila",
      "codCaenPrincipal": "0111",
      "isAgricultural": true,
      "categorieDimensiune": "MEDIE",
      "leadScore": 78,
      "fitScore": 85,
      "engagementScore": 65,
      "intentScore": 75,
      "currentState": "COLD",
      "categorieRisc": "LOW",
      "assignedTo": {
        "id": "uuid",
        "name": "Sales Rep 1"
      },
      "dataUltimaInteractiune": null,
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ],
  "meta": { "total": 28500, "page": 1, "pageSize": 25, "totalPages": 1140 }
}
```

### 6.2 GET /gold/companies/:id

```typescript
// Full gold company with all 10 sections (see schema)
// Response includes all fields from gold_companies table
```

### 6.3 PATCH /gold/companies/:id

```typescript
// Request - Partial update
PATCH /api/v1/gold/companies/uuid
{
  "currentState": "CONTACTED_WA",
  "assignedTo": "uuid",
  "canalPreferat": "WHATSAPP"
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "currentState": "CONTACTED_WA",
    "previousState": "COLD",
    "stateChangedAt": "2026-01-15T11:00:00Z",
    "assignedTo": "uuid",
    "updatedAt": "2026-01-15T11:00:00Z"
  }
}
```

### 6.4 POST /gold/companies/:id/transition

```typescript
// Request - FSM State Transition
POST /api/v1/gold/companies/uuid/transition
{
  "toState": "CONTACTED_EMAIL",
  "metadata": {
    "channel": "email",
    "campaignId": "uuid",
    "templateId": "uuid"
  }
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "fromState": "COLD",
    "toState": "CONTACTED_EMAIL",
    "transitionedAt": "2026-01-15T11:00:00Z",
    "journeyEventId": "uuid"
  }
}
```

---

## 7. APPROVAL ENDPOINTS

### 7.1 GET /approvals

```typescript
// Request
GET /api/v1/approvals?status=pending,assigned&page=1

// Query Parameters
interface ApprovalListParams {
  page?: number;
  pageSize?: number;
  status?: string | string[];
  approvalType?: string;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  assignedTo?: string;
  pipelineStage?: 'E1' | 'E2' | 'E3' | 'E4' | 'E5';
  sortBy?: 'createdAt' | 'dueAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "entityType": "company",
      "entityId": "uuid",
      "entityTitle": "AGRO FARM SRL",
      "pipelineStage": "E1",
      "approvalType": "data_quality",
      "status": "pending",
      "priority": "normal",
      "slaMinutes": 1440,
      "dueAt": "2026-01-16T09:30:00Z",
      "assignedTo": null,
      "metadata": {
        "qualityScore": 55,
        "missingFields": ["email", "telefon"],
        "reason": "Quality score between 40-70"
      },
      "createdAt": "2026-01-15T09:30:00Z"
    }
  ],
  "meta": { "total": 23, "page": 1, "pageSize": 20, "totalPages": 2 }
}
```

### 7.2 GET /approvals/:id

```typescript
// Full approval details with entity data and decision context
```

### 7.3 POST /approvals/:id/assign

```typescript
// Request
POST /api/v1/approvals/uuid/assign
{
  "assignTo": "uuid" // User ID, null for unassign
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "assigned",
    "assignedTo": "uuid",
    "assignedAt": "2026-01-15T10:00:00Z"
  }
}
```

### 7.4 POST /approvals/:id/decide

```typescript
// Request
POST /api/v1/approvals/uuid/decide
{
  "decision": "approved", // or "rejected"
  "reason": "Data verified manually, all fields correct"
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "approved",
    "decision": "approved",
    "decisionReason": "Data verified manually, all fields correct",
    "decidedBy": "uuid",
    "decidedAt": "2026-01-15T10:30:00Z"
  }
}
```

---

## 8. ENRICHMENT QUEUE ENDPOINTS

### 8.1 GET /enrichment/queues

```typescript
// Request
GET /api/v1/enrichment/queues

// Response
{
  "success": true,
  "data": [
    {
      "name": "enrich:anaf:fiscal-status",
      "displayName": "ANAF Fiscal Status",
      "waiting": 120,
      "active": 5,
      "completed": 45230,
      "failed": 150,
      "delayed": 30,
      "paused": false,
      "rateLimit": { "max": 1, "duration": 1000 },
      "lastJobAt": "2026-01-15T10:29:55Z"
    },
    {
      "name": "enrich:termene:balance",
      "displayName": "Termene.ro Balance",
      "waiting": 85,
      "active": 10,
      "completed": 38500,
      "failed": 200,
      "delayed": 0,
      "paused": false
    }
  ]
}
```

### 8.2 POST /enrichment/queues/:name/pause

```typescript
// Request
POST /api/v1/enrichment/queues/enrich:anaf:fiscal-status/pause

// Response
{
  "success": true,
  "data": { "name": "enrich:anaf:fiscal-status", "paused": true }
}
```

### 8.3 POST /enrichment/queues/:name/resume

```typescript
// Similar to pause
```

---

**Document generat:** 15 Ianuarie 2026
**Total endpoints:** ~40
**Conformitate:** REST, OpenAPI 3.1
