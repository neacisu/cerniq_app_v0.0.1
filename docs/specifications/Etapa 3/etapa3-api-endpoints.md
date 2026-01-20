# CERNIQ.APP — ETAPA 3: API ENDPOINTS
## REST API Documentation - AI Sales Agent
### Versiunea 1.0 | 18 Ianuarie 2026

---

# CUPRINS

1. [API Overview](#1-api-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Products API](#3-products-api)
4. [Negotiations API](#4-negotiations-api)
5. [Pricing API](#5-pricing-api)
6. [Stock API](#6-stock-api)
7. [Documents API](#7-documents-api)
8. [AI Agent API](#8-ai-agent-api)
9. [HITL API](#9-hitl-api)
10. [Webhooks API](#10-webhooks-api)
11. [Error Handling](#11-error-handling)
12. [Rate Limiting](#12-rate-limiting)
13. [OpenAPI Specification](#13-openapi-specification)

---

# 1. API OVERVIEW

## 1.1 Base URL

```
Production: https://api.cerniq.app/v1
Staging:    https://api.staging.cerniq.app/v1
Local:      http://localhost:3000/api/v1
```

## 1.2 API Versioning

```typescript
// Versioning via URL path
GET /api/v1/products
GET /api/v2/products  // Future version

// Version header (optional)
Accept-Version: v1
```

## 1.3 Content Types

```typescript
// Request Content-Type
Content-Type: application/json

// Response Content-Type
Content-Type: application/json; charset=utf-8

// File uploads
Content-Type: multipart/form-data

// PDF responses
Content-Type: application/pdf
```

## 1.4 Request Structure

```typescript
// Standard request with pagination
interface PaginatedRequest {
  page?: number;        // Default: 1
  limit?: number;       // Default: 25, Max: 100
  sort?: string;        // Field name
  order?: 'asc' | 'desc'; // Default: 'asc'
  search?: string;      // Full-text search
  filters?: Record<string, unknown>;
}

// Standard request with cursor pagination
interface CursorPaginatedRequest {
  cursor?: string;      // Base64 encoded cursor
  limit?: number;       // Default: 25, Max: 100
  direction?: 'forward' | 'backward'; // Default: 'forward'
}
```

## 1.5 Response Structure

```typescript
// Success response with data
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    duration: number; // ms
  };
}

// Success response with pagination
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  meta?: ResponseMeta;
}

// Success response with cursor pagination
interface CursorPaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    count: number;
  };
  meta?: ResponseMeta;
}

// Error response
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    validationErrors?: ValidationError[];
    stack?: string; // Only in development
  };
  meta?: ResponseMeta;
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}
```

## 1.6 HTTP Status Codes

```typescript
// Success codes
200 OK              // Successful GET, PATCH
201 Created         // Successful POST
204 No Content      // Successful DELETE

// Client error codes
400 Bad Request     // Invalid request body
401 Unauthorized    // Missing/invalid auth
403 Forbidden       // Insufficient permissions
404 Not Found       // Resource not found
409 Conflict        // Resource conflict (duplicate)
422 Unprocessable   // Validation failed
429 Too Many Requests // Rate limit exceeded

// Server error codes
500 Internal Error  // Unexpected server error
502 Bad Gateway     // Upstream service error
503 Service Unavailable // Maintenance/overload
504 Gateway Timeout // Upstream timeout
```

---

# 2. AUTHENTICATION & AUTHORIZATION

## 2.1 JWT Authentication

```typescript
// Request header
Authorization: Bearer <jwt_token>

// JWT payload structure
interface JWTPayload {
  sub: string;        // User ID
  tenantId: string;   // Tenant ID
  email: string;      // User email
  roles: string[];    // User roles
  permissions: string[]; // Explicit permissions
  iat: number;        // Issued at
  exp: number;        // Expiration
  jti: string;        // JWT ID (for revocation)
}
```

## 2.2 API Key Authentication

```typescript
// Request header (for service-to-service)
X-API-Key: sk_live_xxxxxxxxxxxxxxxx

// API key structure
interface APIKey {
  id: string;
  tenantId: string;
  name: string;
  prefix: string;      // 'sk_live_' or 'sk_test_'
  scopes: string[];    // Allowed operations
  rateLimit: number;   // Requests per minute
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}
```

## 2.3 Permission Scopes

```typescript
// Product permissions
const PRODUCT_SCOPES = [
  'products:read',
  'products:write',
  'products:delete',
  'products:import',
  'products:export',
] as const;

// Negotiation permissions
const NEGOTIATION_SCOPES = [
  'negotiations:read',
  'negotiations:write',
  'negotiations:approve',
  'negotiations:close',
  'negotiations:archive',
] as const;

// Document permissions
const DOCUMENT_SCOPES = [
  'documents:read',
  'documents:create',
  'documents:send',
  'documents:cancel',
] as const;

// HITL permissions
const HITL_SCOPES = [
  'hitl:read',
  'hitl:approve',
  'hitl:reject',
  'hitl:escalate',
] as const;

// Admin permissions
const ADMIN_SCOPES = [
  'admin:users',
  'admin:settings',
  'admin:audit',
  'admin:api-keys',
] as const;
```

## 2.4 Role-Based Access

```typescript
// Role definitions
const ROLES = {
  admin: {
    name: 'Administrator',
    permissions: [...PRODUCT_SCOPES, ...NEGOTIATION_SCOPES, 
                  ...DOCUMENT_SCOPES, ...HITL_SCOPES, ...ADMIN_SCOPES],
  },
  sales_manager: {
    name: 'Sales Manager',
    permissions: [...PRODUCT_SCOPES, ...NEGOTIATION_SCOPES.filter(p => p !== 'negotiations:archive'),
                  ...DOCUMENT_SCOPES, 'hitl:read', 'hitl:approve', 'hitl:reject'],
  },
  sales_rep: {
    name: 'Sales Representative',
    permissions: ['products:read', 'negotiations:read', 'negotiations:write',
                  'documents:read', 'documents:create'],
  },
  viewer: {
    name: 'Viewer',
    permissions: ['products:read', 'negotiations:read', 'documents:read'],
  },
} as const;
```

## 2.5 Authentication Endpoints

```typescript
// POST /api/v1/auth/login
interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;    // If MFA enabled
  deviceId?: string;   // For device tracking
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;   // Seconds
  tokenType: 'Bearer';
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    tenantId: string;
    tenantName: string;
  };
}

// POST /api/v1/auth/refresh
interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// POST /api/v1/auth/logout
interface LogoutRequest {
  refreshToken: string;
  allDevices?: boolean; // Logout from all devices
}

// POST /api/v1/auth/api-keys
interface CreateAPIKeyRequest {
  name: string;
  scopes: string[];
  expiresAt?: string;  // ISO date
  rateLimit?: number;  // Requests per minute
}

interface CreateAPIKeyResponse {
  id: string;
  key: string;         // Only shown once!
  name: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
}
```

---

# 3. PRODUCTS API

## 3.1 List Products

```typescript
// GET /api/v1/products
// Permissions: products:read

interface ListProductsQuery {
  page?: number;
  limit?: number;
  sort?: 'name' | 'sku' | 'price' | 'stock' | 'createdAt';
  order?: 'asc' | 'desc';
  search?: string;           // Full-text search
  category?: string;         // Filter by category
  status?: 'active' | 'inactive' | 'discontinued';
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;         // Only products with stock > 0
  hasEmbedding?: boolean;    // Only RAG-indexed products
}

interface ProductListItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  currency: 'RON' | 'EUR' | 'USD';
  vatRate: number;           // 0, 5, 9, 19
  unit: string;              // 'buc', 'kg', 'l', etc.
  stock: number;
  status: 'active' | 'inactive' | 'discontinued';
  hasEmbedding: boolean;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// Response: PaginatedResponse<ProductListItem>
```

## 3.2 Get Product Detail

```typescript
// GET /api/v1/products/:id
// Permissions: products:read

interface ProductDetail {
  id: string;
  sku: string;
  name: string;
  description: string;
  shortDescription: string;
  category: string;
  subcategory: string | null;
  
  // Pricing
  price: number;
  currency: 'RON' | 'EUR' | 'USD';
  vatRate: number;
  priceWithVat: number;
  costPrice: number | null;
  margin: number | null;
  
  // Stock
  stock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number;
  reorderPoint: number;
  
  // Attributes
  unit: string;
  weight: number | null;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'm';
  } | null;
  
  // Media
  images: {
    id: string;
    url: string;
    alt: string;
    isPrimary: boolean;
    order: number;
  }[];
  documents: {
    id: string;
    name: string;
    type: 'datasheet' | 'manual' | 'certificate' | 'other';
    url: string;
    size: number;
  }[];
  
  // Technical specs
  specifications: Record<string, string | number>;
  
  // RAG/Embeddings
  embedding: {
    hasEmbedding: boolean;
    lastIndexedAt: string | null;
    chunkCount: number;
    model: string;
  };
  
  // Metadata
  status: 'active' | 'inactive' | 'discontinued';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // Related products
  relatedProducts: {
    id: string;
    sku: string;
    name: string;
    price: number;
    relation: 'upsell' | 'crosssell' | 'accessory';
  }[];
  
  // Pricing rules
  pricingRules: {
    id: string;
    name: string;
    type: 'discount' | 'quantity' | 'customer_tier';
    value: number;
    conditions: Record<string, unknown>;
  }[];
}

// Response: SuccessResponse<ProductDetail>
```

## 3.3 Create Product

```typescript
// POST /api/v1/products
// Permissions: products:write

interface CreateProductRequest {
  sku: string;               // Unique SKU
  name: string;
  description?: string;
  shortDescription?: string;
  category: string;
  subcategory?: string;
  
  price: number;
  currency?: 'RON' | 'EUR' | 'USD'; // Default: 'RON'
  vatRate: number;           // 0, 5, 9, 19
  costPrice?: number;
  
  unit: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: 'cm' | 'm';
  };
  
  stock?: number;            // Default: 0
  minStock?: number;         // Default: 0
  reorderPoint?: number;     // Default: 0
  
  specifications?: Record<string, string | number>;
  tags?: string[];
  
  status?: 'active' | 'inactive'; // Default: 'active'
  
  // Auto-index for RAG
  indexForRAG?: boolean;     // Default: true
}

interface CreateProductResponse {
  id: string;
  sku: string;
  name: string;
  status: 'active' | 'inactive';
  ragIndexJobId?: string;    // If indexForRAG is true
  createdAt: string;
}

// Response: SuccessResponse<CreateProductResponse>
// Status: 201 Created
```

## 3.4 Update Product

```typescript
// PATCH /api/v1/products/:id
// Permissions: products:write

interface UpdateProductRequest {
  name?: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  subcategory?: string | null;
  
  price?: number;
  currency?: 'RON' | 'EUR' | 'USD';
  vatRate?: number;
  costPrice?: number | null;
  
  unit?: string;
  weight?: number | null;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: 'cm' | 'm';
  } | null;
  
  minStock?: number;
  reorderPoint?: number;
  
  specifications?: Record<string, string | number>;
  tags?: string[];
  
  status?: 'active' | 'inactive' | 'discontinued';
  
  // Re-index for RAG
  reindexForRAG?: boolean;
}

interface UpdateProductResponse {
  id: string;
  sku: string;
  name: string;
  status: 'active' | 'inactive' | 'discontinued';
  ragReindexJobId?: string;
  updatedAt: string;
  changedFields: string[];
}

// Response: SuccessResponse<UpdateProductResponse>
```

## 3.5 Delete Product

```typescript
// DELETE /api/v1/products/:id
// Permissions: products:delete

// Query params
interface DeleteProductQuery {
  hard?: boolean;            // Default: false (soft delete)
  cascade?: boolean;         // Delete related data
}

// Response: 204 No Content

// If product is in active negotiations:
// Status: 409 Conflict
// Error: "Cannot delete product with active negotiations"
```

## 3.6 Bulk Import Products

```typescript
// POST /api/v1/products/import
// Permissions: products:import
// Content-Type: multipart/form-data

interface ImportProductsRequest {
  file: File;                // CSV or Excel file
  mapping: {
    [csvColumn: string]: string; // Map to product fields
  };
  options: {
    updateExisting: boolean; // Update products with same SKU
    skipInvalid: boolean;    // Skip invalid rows
    dryRun?: boolean;        // Validate only, don't import
  };
}

interface ImportProductsResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: {
    row: number;
    field: string;
    message: string;
  }[];
}

// Response: SuccessResponse<ImportProductsResponse>
// Status: 202 Accepted (async processing)

// GET /api/v1/products/import/:jobId - Check import status
```

## 3.7 Search Products with RAG

```typescript
// POST /api/v1/products/search
// Permissions: products:read

interface SearchProductsRequest {
  query: string;             // Natural language query
  searchType?: 'hybrid' | 'semantic' | 'keyword'; // Default: 'hybrid'
  limit?: number;            // Default: 10, Max: 50
  threshold?: number;        // Similarity threshold (0-1)
  filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    status?: 'active' | 'inactive';
  };
  includeChunks?: boolean;   // Include matched text chunks
}

interface SearchProductResult {
  product: ProductListItem;
  score: number;             // Relevance score (0-1)
  matchType: 'semantic' | 'keyword' | 'hybrid';
  matchedChunks?: {
    text: string;
    score: number;
    highlight: string;       // With <mark> tags
  }[];
}

interface SearchProductsResponse {
  results: SearchProductResult[];
  totalFound: number;
  queryEmbedding?: number[]; // For debugging
  searchTime: number;        // ms
}

// Response: SuccessResponse<SearchProductsResponse>
```

## 3.8 Export Products

```typescript
// POST /api/v1/products/export
// Permissions: products:export

interface ExportProductsRequest {
  format: 'csv' | 'xlsx' | 'json';
  filters?: {
    category?: string;
    status?: string;
    ids?: string[];          // Specific product IDs
  };
  fields?: string[];         // Specific fields to export
  includeImages?: boolean;   // Include image URLs
}

interface ExportProductsResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed';
  downloadUrl?: string;      // When completed
  expiresAt?: string;        // URL expiration
}

// Response: SuccessResponse<ExportProductsResponse>
// Status: 202 Accepted
```

---

# 4. NEGOTIATIONS API

## 4.1 List Negotiations

```typescript
// GET /api/v1/negotiations
// Permissions: negotiations:read

interface ListNegotiationsQuery {
  page?: number;
  limit?: number;
  sort?: 'createdAt' | 'updatedAt' | 'totalValue' | 'state' | 'contactName';
  order?: 'asc' | 'desc';
  search?: string;           // Search contact name, reference
  
  // Filters
  state?: NegotiationState | NegotiationState[];
  contactId?: string;
  assignedTo?: string;       // User ID
  channel?: 'whatsapp' | 'email' | 'web' | 'phone';
  minValue?: number;
  maxValue?: number;
  hasDiscount?: boolean;
  needsApproval?: boolean;
  
  // Date filters
  createdAfter?: string;     // ISO date
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

type NegotiationState = 
  | 'draft'
  | 'qualifying'
  | 'presenting'
  | 'negotiating'
  | 'pending_approval'
  | 'approved'
  | 'pending_payment'
  | 'paid'
  | 'invoiced'
  | 'completed'
  | 'lost'
  | 'cancelled';

interface NegotiationListItem {
  id: string;
  reference: string;         // NEG-2026-00001
  
  // Contact
  contact: {
    id: string;
    name: string;
    company: string | null;
    cui: string | null;
    tier: 'bronze' | 'silver' | 'gold';
  };
  
  // State
  state: NegotiationState;
  stateLabel: string;        // Romanian label
  stateSince: string;        // When entered state
  
  // Values
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  vatAmount: number;
  totalValue: number;
  currency: 'RON' | 'EUR' | 'USD';
  
  // Flags
  hasDiscount: boolean;
  needsApproval: boolean;
  hasProforma: boolean;
  hasInvoice: boolean;
  
  // Channel & Assignment
  channel: 'whatsapp' | 'email' | 'web' | 'phone';
  assignedTo: {
    id: string;
    name: string;
  } | null;
  
  // AI
  aiHandled: boolean;
  lastAiAction: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

// Response: PaginatedResponse<NegotiationListItem>
```

## 4.2 Get Negotiation Detail

```typescript
// GET /api/v1/negotiations/:id
// Permissions: negotiations:read

interface NegotiationDetail {
  id: string;
  reference: string;
  
  // Contact details
  contact: {
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string | null;
    cui: string | null;
    regCom: string | null;
    address: {
      street: string;
      city: string;
      county: string;
      postalCode: string;
      country: string;
    } | null;
    tier: 'bronze' | 'silver' | 'gold';
    totalOrders: number;
    totalValue: number;
    avgOrderValue: number;
    lastOrderDate: string | null;
  };
  
  // State machine
  state: NegotiationState;
  stateLabel: string;
  stateHistory: {
    state: NegotiationState;
    enteredAt: string;
    exitedAt: string | null;
    duration: number | null;  // ms
    actor: {
      type: 'user' | 'ai' | 'system';
      id: string;
      name: string;
    };
    reason: string | null;
  }[];
  allowedTransitions: NegotiationState[];
  
  // Items
  items: {
    id: string;
    product: {
      id: string;
      sku: string;
      name: string;
      price: number;
      vatRate: number;
      stock: number;
    };
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    subtotal: number;
    vatAmount: number;
    total: number;
    notes: string | null;
    reserved: boolean;
    reservedUntil: string | null;
  }[];
  
  // Pricing
  pricing: {
    subtotal: number;
    totalDiscountAmount: number;
    totalDiscountPercent: number;
    vatAmount: number;
    totalValue: number;
    currency: 'RON' | 'EUR' | 'USD';
    
    discountBreakdown: {
      type: 'manual' | 'rule' | 'volume' | 'customer_tier';
      name: string;
      amount: number;
      percent: number;
    }[];
    
    vatBreakdown: {
      rate: number;
      base: number;
      amount: number;
    }[];
  };
  
  // Terms
  terms: {
    paymentTerms: number;    // Days
    paymentMethod: 'transfer' | 'cash' | 'card' | 'credit';
    deliveryMethod: 'pickup' | 'delivery' | 'courier';
    deliveryAddress: string | null;
    validUntil: string;
    notes: string | null;
  };
  
  // Documents
  documents: {
    proforma: {
      id: string;
      number: string;
      status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
      createdAt: string;
      sentAt: string | null;
      pdfUrl: string;
    } | null;
    invoice: {
      id: string;
      number: string;
      oblioId: string;
      status: 'draft' | 'issued' | 'sent' | 'paid' | 'cancelled';
      createdAt: string;
      pdfUrl: string;
      spvStatus: 'pending' | 'sent' | 'accepted' | 'rejected';
    } | null;
  };
  
  // Approvals
  approvals: {
    id: string;
    type: 'discount' | 'credit' | 'terms';
    status: 'pending' | 'approved' | 'rejected';
    requestedValue: number;
    requestReason: string;
    requestedAt: string;
    requestedBy: {
      type: 'user' | 'ai';
      id: string;
      name: string;
    };
    reviewedAt: string | null;
    reviewedBy: {
      id: string;
      name: string;
    } | null;
    reviewNotes: string | null;
  }[];
  
  // Communication
  channel: 'whatsapp' | 'email' | 'web' | 'phone';
  conversation: {
    messageCount: number;
    lastMessageAt: string;
    unreadCount: number;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  };
  
  // Assignment
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  
  // AI handling
  ai: {
    handled: boolean;
    handledSince: string | null;
    lastAction: {
      type: string;
      description: string;
      timestamp: string;
    } | null;
    confidence: number | null;
    escalationReason: string | null;
    toolCallCount: number;
  };
  
  // Metadata
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    type: 'user' | 'ai' | 'system';
    id: string;
    name: string;
  };
}

// Response: SuccessResponse<NegotiationDetail>
```

## 4.3 Create Negotiation

```typescript
// POST /api/v1/negotiations
// Permissions: negotiations:write

interface CreateNegotiationRequest {
  contactId: string;
  
  items: {
    productId: string;
    quantity: number;
    discountPercent?: number; // Manual discount
    notes?: string;
  }[];
  
  terms?: {
    paymentTerms?: number;   // Default: 30
    paymentMethod?: 'transfer' | 'cash' | 'card' | 'credit';
    deliveryMethod?: 'pickup' | 'delivery' | 'courier';
    deliveryAddress?: string;
    validityDays?: number;   // Default: 15
    notes?: string;
  };
  
  channel?: 'whatsapp' | 'email' | 'web' | 'phone'; // Default: 'web'
  assignedTo?: string;       // User ID
  
  initialState?: 'draft' | 'qualifying'; // Default: 'draft'
  
  // AI handling
  enableAI?: boolean;        // Default: true
  
  tags?: string[];
  customFields?: Record<string, unknown>;
}

interface CreateNegotiationResponse {
  id: string;
  reference: string;
  state: NegotiationState;
  totalValue: number;
  currency: string;
  itemCount: number;
  
  // If discount needs approval
  pendingApproval?: {
    id: string;
    type: 'discount';
    requestedValue: number;
  };
  
  // If stock was reserved
  stockReservations?: {
    productId: string;
    quantity: number;
    reservedUntil: string;
  }[];
  
  createdAt: string;
}

// Response: SuccessResponse<CreateNegotiationResponse>
// Status: 201 Created
```

## 4.4 Update Negotiation

```typescript
// PATCH /api/v1/negotiations/:id
// Permissions: negotiations:write

interface UpdateNegotiationRequest {
  // Items can be added/updated/removed
  items?: {
    add?: {
      productId: string;
      quantity: number;
      discountPercent?: number;
      notes?: string;
    }[];
    update?: {
      id: string;
      quantity?: number;
      discountPercent?: number;
      notes?: string;
    }[];
    remove?: string[];       // Item IDs
  };
  
  terms?: {
    paymentTerms?: number;
    paymentMethod?: 'transfer' | 'cash' | 'card' | 'credit';
    deliveryMethod?: 'pickup' | 'delivery' | 'courier';
    deliveryAddress?: string;
    validityDays?: number;
    notes?: string;
  };
  
  assignedTo?: string | null;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

interface UpdateNegotiationResponse {
  id: string;
  reference: string;
  state: NegotiationState;
  totalValue: number;
  itemCount: number;
  
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  
  pendingApproval?: {
    id: string;
    type: 'discount';
    requestedValue: number;
  };
  
  updatedAt: string;
}

// Response: SuccessResponse<UpdateNegotiationResponse>
```

## 4.5 Transition Negotiation State

```typescript
// POST /api/v1/negotiations/:id/transition
// Permissions: negotiations:write

interface TransitionNegotiationRequest {
  targetState: NegotiationState;
  reason?: string;
  
  // State-specific data
  data?: {
    // For 'approved' - manual approval
    approvalNotes?: string;
    
    // For 'lost' - loss reason
    lossReason?: 'price' | 'competitor' | 'budget' | 'timing' | 'no_response' | 'other';
    competitorName?: string;
    
    // For 'cancelled'
    cancellationReason?: string;
    
    // For 'paid'
    paymentReference?: string;
    paymentDate?: string;
    paymentMethod?: string;
  };
}

interface TransitionNegotiationResponse {
  id: string;
  previousState: NegotiationState;
  currentState: NegotiationState;
  transitionedAt: string;
  
  // Side effects
  sideEffects: {
    type: 'proforma_generated' | 'invoice_generated' | 'stock_released' | 
          'email_sent' | 'notification_sent' | 'ai_enabled' | 'ai_disabled';
    details: Record<string, unknown>;
  }[];
}

// Response: SuccessResponse<TransitionNegotiationResponse>

// Possible errors:
// 400: Invalid transition from current state
// 403: Transition requires approval
// 409: Pending approvals must be resolved first
```

## 4.6 Get Negotiation Conversation

```typescript
// GET /api/v1/negotiations/:id/conversation
// Permissions: negotiations:read

interface GetConversationQuery {
  cursor?: string;
  limit?: number;            // Default: 50
  direction?: 'forward' | 'backward';
  includeInternal?: boolean; // Include internal notes
}

interface ConversationMessage {
  id: string;
  type: 'inbound' | 'outbound' | 'internal' | 'system';
  
  // Sender
  sender: {
    type: 'contact' | 'user' | 'ai' | 'system';
    id: string;
    name: string;
    avatar?: string;
  };
  
  // Content
  content: {
    type: 'text' | 'image' | 'document' | 'template';
    text?: string;
    mediaUrl?: string;
    mediaType?: string;
    fileName?: string;
    templateName?: string;
    templateParams?: Record<string, string>;
  };
  
  // Channel info
  channel: 'whatsapp' | 'email' | 'web' | 'phone';
  channelMessageId?: string;
  
  // Status (for outbound)
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  statusUpdatedAt?: string;
  errorMessage?: string;
  
  // AI analysis (if applicable)
  aiAnalysis?: {
    intent: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    entities: Record<string, string>;
    suggestedResponse?: string;
    confidence: number;
  };
  
  // Metadata
  isEdited: boolean;
  isDeleted: boolean;
  replyToId?: string;
  createdAt: string;
}

// Response: CursorPaginatedResponse<ConversationMessage>
```

## 4.7 Send Message in Negotiation

```typescript
// POST /api/v1/negotiations/:id/messages
// Permissions: negotiations:write

interface SendMessageRequest {
  type: 'text' | 'template' | 'document';
  
  // For text messages
  text?: string;
  
  // For template messages
  templateName?: string;
  templateParams?: Record<string, string>;
  
  // For document messages
  documentId?: string;       // Existing document
  documentFile?: File;       // New upload
  
  // Options
  channel?: 'whatsapp' | 'email'; // Override default
  scheduleAt?: string;       // Schedule for later
  isInternal?: boolean;      // Internal note, not sent
  
  // AI options
  useAI?: boolean;           // Let AI craft response
  aiInstructions?: string;   // Instructions for AI
}

interface SendMessageResponse {
  id: string;
  status: 'queued' | 'sending' | 'sent' | 'scheduled';
  channel: string;
  scheduledAt?: string;
  
  // If AI generated
  aiGenerated?: {
    originalPrompt: string;
    generatedText: string;
    confidence: number;
    guardrailsApplied: string[];
  };
  
  createdAt: string;
}

// Response: SuccessResponse<SendMessageResponse>
// Status: 201 Created
```

## 4.8 Apply Discount to Negotiation

```typescript
// POST /api/v1/negotiations/:id/discount
// Permissions: negotiations:write

interface ApplyDiscountRequest {
  type: 'percent' | 'amount';
  value: number;
  
  scope: 'all' | 'items';
  itemIds?: string[];        // If scope is 'items'
  
  reason: string;
  
  // Override approval threshold
  forceApproval?: boolean;   // Request approval even if within limits
}

interface ApplyDiscountResponse {
  id: string;
  discountApplied: number;
  discountPercent: number;
  
  newSubtotal: number;
  newTotal: number;
  
  // If needs approval
  approvalRequired: boolean;
  approvalId?: string;
  approvalReason?: string;
  
  // Affected items
  affectedItems: {
    id: string;
    sku: string;
    oldPrice: number;
    newPrice: number;
    discountAmount: number;
  }[];
}

// Response: SuccessResponse<ApplyDiscountResponse>
```

## 4.9 Generate Proforma

```typescript
// POST /api/v1/negotiations/:id/proforma
// Permissions: documents:create

interface GenerateProformaRequest {
  // Override contact billing details
  billingDetails?: {
    name?: string;
    cui?: string;
    regCom?: string;
    address?: string;
    bankAccount?: string;
    bankName?: string;
  };
  
  notes?: string;
  internalNotes?: string;
  
  sendImmediately?: boolean;
  sendChannel?: 'email' | 'whatsapp';
}

interface GenerateProformaResponse {
  id: string;
  number: string;            // PROF-2026-00001
  status: 'draft' | 'sent';
  pdfUrl: string;
  
  // If sent
  sentAt?: string;
  sentChannel?: string;
  messageId?: string;
  
  totals: {
    subtotal: number;
    discount: number;
    vat: number;
    total: number;
    currency: string;
  };
  
  validUntil: string;
  createdAt: string;
}

// Response: SuccessResponse<GenerateProformaResponse>
// Status: 201 Created
```

## 4.10 Convert to Invoice

```typescript
// POST /api/v1/negotiations/:id/invoice
// Permissions: documents:create

interface ConvertToInvoiceRequest {
  // Use Oblio for generation
  useOblio?: boolean;        // Default: true
  
  // Override defaults
  series?: string;           // Invoice series
  issueDate?: string;        // Default: today
  dueDate?: string;          // Default: based on payment terms
  
  // Override contact details
  billingDetails?: {
    name?: string;
    cui?: string;
    regCom?: string;
    address?: string;
    bankAccount?: string;
    bankName?: string;
  };
  
  notes?: string;
  internalNotes?: string;
  
  // e-Factura options
  submitToSPV?: boolean;     // Default: true if B2B
  spvPriority?: 'normal' | 'high';
}

interface ConvertToInvoiceResponse {
  id: string;
  number: string;            // FACT-2026-00001
  oblioId?: string;
  status: 'draft' | 'issued';
  pdfUrl: string;
  
  // e-Factura
  spv?: {
    submissionId: string;
    status: 'pending' | 'queued';
    estimatedProcessing: string;
  };
  
  totals: {
    subtotal: number;
    discount: number;
    vat: number;
    total: number;
    currency: string;
  };
  
  createdAt: string;
}

// Response: SuccessResponse<ConvertToInvoiceResponse>
// Status: 201 Created
```

---

# 5. PRICING API

## 5.1 List Pricing Rules

```typescript
// GET /api/v1/pricing/rules
// Permissions: products:read

interface ListPricingRulesQuery {
  page?: number;
  limit?: number;
  type?: 'discount' | 'markup' | 'quantity' | 'customer_tier' | 'seasonal';
  status?: 'active' | 'inactive' | 'scheduled';
  productId?: string;
  categoryId?: string;
}

interface PricingRule {
  id: string;
  name: string;
  description: string;
  type: 'discount' | 'markup' | 'quantity' | 'customer_tier' | 'seasonal';
  
  // Conditions
  conditions: {
    field: 'quantity' | 'total' | 'customer_tier' | 'date' | 'product' | 'category';
    operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
    value: unknown;
  }[];
  
  // Action
  action: {
    type: 'percent' | 'amount' | 'fixed_price';
    value: number;
    maxDiscount?: number;    // Cap
  };
  
  // Scope
  scope: {
    type: 'all' | 'products' | 'categories' | 'customers';
    productIds?: string[];
    categoryIds?: string[];
    customerTiers?: string[];
  };
  
  // Approval
  requiresApproval: boolean;
  approvalThreshold?: number;
  
  // Scheduling
  status: 'active' | 'inactive' | 'scheduled';
  startsAt: string | null;
  endsAt: string | null;
  
  // Priority
  priority: number;          // Higher = applied first
  stackable: boolean;        // Can combine with other rules
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Response: PaginatedResponse<PricingRule>
```

## 5.2 Create Pricing Rule

```typescript
// POST /api/v1/pricing/rules
// Permissions: products:write

interface CreatePricingRuleRequest {
  name: string;
  description?: string;
  type: 'discount' | 'markup' | 'quantity' | 'customer_tier' | 'seasonal';
  
  conditions: {
    field: 'quantity' | 'total' | 'customer_tier' | 'date' | 'product' | 'category';
    operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
    value: unknown;
  }[];
  
  action: {
    type: 'percent' | 'amount' | 'fixed_price';
    value: number;
    maxDiscount?: number;
  };
  
  scope: {
    type: 'all' | 'products' | 'categories' | 'customers';
    productIds?: string[];
    categoryIds?: string[];
    customerTiers?: string[];
  };
  
  requiresApproval?: boolean;
  approvalThreshold?: number;
  
  status?: 'active' | 'inactive' | 'scheduled';
  startsAt?: string;
  endsAt?: string;
  
  priority?: number;
  stackable?: boolean;
}

// Response: SuccessResponse<PricingRule>
// Status: 201 Created
```

## 5.3 Calculate Price

```typescript
// POST /api/v1/pricing/calculate
// Permissions: products:read

interface CalculatePriceRequest {
  items: {
    productId: string;
    quantity: number;
  }[];
  
  customerId?: string;       // For customer-specific rules
  customerTier?: 'bronze' | 'silver' | 'gold';
  
  couponCode?: string;       // If coupon system enabled
  
  // Simulation
  simulateDate?: string;     // Test seasonal rules
  simulateRules?: string[];  // Test specific rules
}

interface CalculatePriceResponse {
  items: {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    
    originalPrice: number;
    finalPrice: number;
    discount: number;
    discountPercent: number;
    
    appliedRules: {
      id: string;
      name: string;
      type: string;
      discount: number;
    }[];
    
    subtotal: number;
    vatRate: number;
    vatAmount: number;
    total: number;
  }[];
  
  summary: {
    subtotal: number;
    totalDiscount: number;
    totalDiscountPercent: number;
    vatAmount: number;
    grandTotal: number;
    currency: string;
    
    couponApplied?: {
      code: string;
      discount: number;
    };
    
    warnings: {
      type: 'max_discount_reached' | 'rule_conflict' | 'stock_warning';
      message: string;
      itemIds?: string[];
    }[];
  };
  
  // If any discount requires approval
  approvalRequired: boolean;
  approvalReason?: string;
}

// Response: SuccessResponse<CalculatePriceResponse>
```

## 5.4 Get Discount Approval Thresholds

```typescript
// GET /api/v1/pricing/thresholds
// Permissions: products:read

interface DiscountThresholds {
  global: {
    maxDiscountPercent: number;
    maxDiscountAmount: number;
    approvalThreshold: number;
    currency: string;
  };
  
  byCategory: {
    categoryId: string;
    categoryName: string;
    maxDiscountPercent: number;
    approvalThreshold: number;
  }[];
  
  byCustomerTier: {
    tier: 'bronze' | 'silver' | 'gold';
    maxDiscountPercent: number;
    autoApproveThreshold: number;
  }[];
  
  byUserRole: {
    role: string;
    maxDiscountPercent: number;
    canApproveUp: number;
  }[];
}

// Response: SuccessResponse<DiscountThresholds>
```

---

# 6. STOCK API

## 6.1 Get Stock Status

```typescript
// GET /api/v1/stock
// Permissions: products:read

interface GetStockQuery {
  page?: number;
  limit?: number;
  productId?: string;
  sku?: string;
  category?: string;
  
  // Filters
  status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'reserved';
  belowReorderPoint?: boolean;
  hasReservations?: boolean;
}

interface StockItem {
  productId: string;
  sku: string;
  name: string;
  
  // Stock levels
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number;
  reorderPoint: number;
  
  // Status
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  statusLabel: string;
  
  // Reservations
  activeReservations: {
    id: string;
    negotiationId: string;
    negotiationRef: string;
    quantity: number;
    expiresAt: string;
  }[];
  
  // Movement summary
  lastMovement: {
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    date: string;
    reason: string;
  } | null;
  
  // Alerts
  alerts: {
    type: 'low_stock' | 'out_of_stock' | 'below_reorder';
    message: string;
    createdAt: string;
  }[];
  
  updatedAt: string;
}

// Response: PaginatedResponse<StockItem>
```

## 6.2 Get Stock Movements

```typescript
// GET /api/v1/stock/:productId/movements
// Permissions: products:read

interface GetStockMovementsQuery {
  page?: number;
  limit?: number;
  type?: 'in' | 'out' | 'adjustment' | 'reservation' | 'release';
  dateFrom?: string;
  dateTo?: string;
}

interface StockMovement {
  id: string;
  productId: string;
  
  type: 'in' | 'out' | 'adjustment' | 'reservation' | 'release';
  typeLabel: string;
  
  quantity: number;
  previousStock: number;
  newStock: number;
  
  reason: string;
  reference: {
    type: 'negotiation' | 'invoice' | 'manual' | 'import' | 'system';
    id?: string;
    name?: string;
  };
  
  createdAt: string;
  createdBy: {
    type: 'user' | 'system';
    id: string;
    name: string;
  };
}

// Response: PaginatedResponse<StockMovement>
```

## 6.3 Adjust Stock

```typescript
// POST /api/v1/stock/:productId/adjust
// Permissions: products:write

interface AdjustStockRequest {
  type: 'set' | 'add' | 'subtract';
  quantity: number;
  reason: string;
  
  // Optional reference
  referenceType?: 'inventory_count' | 'damage' | 'return' | 'transfer' | 'other';
  referenceId?: string;
  notes?: string;
}

interface AdjustStockResponse {
  productId: string;
  sku: string;
  
  previousStock: number;
  adjustment: number;
  newStock: number;
  
  movementId: string;
  
  // Alerts triggered
  alerts: {
    type: string;
    message: string;
  }[];
  
  updatedAt: string;
}

// Response: SuccessResponse<AdjustStockResponse>
```

## 6.4 Reserve Stock

```typescript
// POST /api/v1/stock/reserve
// Permissions: negotiations:write

interface ReserveStockRequest {
  negotiationId: string;
  
  items: {
    productId: string;
    quantity: number;
  }[];
  
  expiresIn?: number;        // Minutes, default: 60
  notes?: string;
}

interface ReserveStockResponse {
  reservationId: string;
  negotiationId: string;
  
  items: {
    productId: string;
    sku: string;
    requestedQuantity: number;
    reservedQuantity: number;
    shortfall: number;
  }[];
  
  expiresAt: string;
  
  warnings: {
    productId: string;
    message: string;
  }[];
  
  createdAt: string;
}

// Response: SuccessResponse<ReserveStockResponse>
// Status: 201 Created
```

## 6.5 Release Stock Reservation

```typescript
// DELETE /api/v1/stock/reservations/:id
// Permissions: negotiations:write

interface ReleaseStockResponse {
  reservationId: string;
  negotiationId: string;
  
  releasedItems: {
    productId: string;
    sku: string;
    quantity: number;
  }[];
  
  releasedAt: string;
}

// Response: SuccessResponse<ReleaseStockResponse>
```

---

# 7. DOCUMENTS API

## 7.1 List Documents

```typescript
// GET /api/v1/documents
// Permissions: documents:read

interface ListDocumentsQuery {
  page?: number;
  limit?: number;
  type?: 'proforma' | 'invoice' | 'credit_note' | 'receipt';
  status?: string;
  negotiationId?: string;
  contactId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;           // Search by number, contact name
}

interface DocumentListItem {
  id: string;
  type: 'proforma' | 'invoice' | 'credit_note' | 'receipt';
  typeLabel: string;
  
  number: string;
  series: string;
  
  // Contact
  contact: {
    id: string;
    name: string;
    cui: string | null;
  };
  
  // Negotiation
  negotiationId: string | null;
  negotiationRef: string | null;
  
  // Status
  status: string;
  statusLabel: string;
  
  // Amounts
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  currency: string;
  
  // e-Factura (for invoices)
  spvStatus?: 'pending' | 'sent' | 'accepted' | 'rejected' | 'na';
  spvId?: string;
  
  // External
  oblioId?: string;
  
  // Dates
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  
  createdAt: string;
}

// Response: PaginatedResponse<DocumentListItem>
```

## 7.2 Get Document Detail

```typescript
// GET /api/v1/documents/:id
// Permissions: documents:read

interface DocumentDetail {
  id: string;
  type: 'proforma' | 'invoice' | 'credit_note' | 'receipt';
  
  number: string;
  series: string;
  
  // Issuer
  issuer: {
    name: string;
    cui: string;
    regCom: string;
    address: string;
    bankAccount: string;
    bankName: string;
    email: string;
    phone: string;
  };
  
  // Client
  client: {
    contactId: string;
    name: string;
    cui: string | null;
    regCom: string | null;
    address: string;
    email: string;
    phone: string;
  };
  
  // Items
  items: {
    id: string;
    productId: string | null;
    sku: string | null;
    name: string;
    description: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    discount: number;
    vatRate: number;
    subtotal: number;
    vatAmount: number;
    total: number;
  }[];
  
  // Totals
  totals: {
    subtotal: number;
    totalDiscount: number;
    totalVat: number;
    grandTotal: number;
    currency: string;
    
    vatBreakdown: {
      rate: number;
      base: number;
      amount: number;
    }[];
  };
  
  // Status
  status: string;
  statusHistory: {
    status: string;
    timestamp: string;
    actor: string;
    notes: string | null;
  }[];
  
  // Payment (for invoices)
  payment: {
    terms: number;
    method: string;
    dueDate: string;
    paidAt: string | null;
    paidAmount: number | null;
    paidReference: string | null;
  } | null;
  
  // e-Factura
  spv: {
    status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'na';
    submissionId: string | null;
    downloadId: string | null;
    responseCode: string | null;
    responseMessage: string | null;
    submittedAt: string | null;
    processedAt: string | null;
    xmlUrl: string | null;
  } | null;
  
  // Oblio
  oblio: {
    id: string | null;
    syncStatus: 'synced' | 'pending' | 'error';
    lastSyncAt: string | null;
    errorMessage: string | null;
  } | null;
  
  // PDF
  pdfUrl: string;
  pdfGeneratedAt: string;
  
  // Notes
  notes: string | null;
  internalNotes: string | null;
  
  // References
  negotiationId: string | null;
  parentDocumentId: string | null;  // For credit notes
  
  // Dates
  issueDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Response: SuccessResponse<DocumentDetail>
```

## 7.3 Create Document

```typescript
// POST /api/v1/documents
// Permissions: documents:create

interface CreateDocumentRequest {
  type: 'proforma' | 'invoice' | 'credit_note' | 'receipt';
  
  // Source
  negotiationId?: string;    // Create from negotiation
  parentDocumentId?: string; // For credit notes
  
  // Manual creation
  client?: {
    contactId?: string;      // Existing contact
    name: string;
    cui?: string;
    regCom?: string;
    address: string;
    email?: string;
    phone?: string;
  };
  
  items?: {
    productId?: string;
    sku?: string;
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    discount?: number;
    vatRate: number;
  }[];
  
  // Options
  series?: string;
  issueDate?: string;
  dueDate?: string;
  paymentTerms?: number;
  
  notes?: string;
  internalNotes?: string;
  
  // Integrations
  syncToOblio?: boolean;     // Default: true
  submitToSPV?: boolean;     // Default: true for B2B invoices
  
  // Send options
  sendImmediately?: boolean;
  sendChannel?: 'email' | 'whatsapp';
}

interface CreateDocumentResponse {
  id: string;
  type: string;
  number: string;
  series: string;
  status: string;
  
  pdfUrl: string;
  
  totals: {
    subtotal: number;
    vat: number;
    total: number;
    currency: string;
  };
  
  // Integration status
  oblioSync?: {
    status: 'queued' | 'synced' | 'error';
    oblioId?: string;
  };
  
  spvSubmission?: {
    status: 'queued' | 'pending';
    submissionId?: string;
  };
  
  // If sent
  sent?: {
    channel: string;
    sentAt: string;
    messageId: string;
  };
  
  createdAt: string;
}

// Response: SuccessResponse<CreateDocumentResponse>
// Status: 201 Created
```

## 7.4 Download Document PDF

```typescript
// GET /api/v1/documents/:id/pdf
// Permissions: documents:read

// Response: Binary PDF
// Content-Type: application/pdf
// Content-Disposition: attachment; filename="FACT-2026-00001.pdf"
```

## 7.5 Send Document

```typescript
// POST /api/v1/documents/:id/send
// Permissions: documents:send

interface SendDocumentRequest {
  channel: 'email' | 'whatsapp';
  
  // Override recipient
  recipient?: {
    email?: string;
    phone?: string;
  };
  
  // Email options
  subject?: string;
  message?: string;
  
  // Schedule
  scheduleAt?: string;
}

interface SendDocumentResponse {
  id: string;
  documentId: string;
  channel: string;
  
  status: 'queued' | 'sending' | 'sent' | 'scheduled';
  scheduledAt?: string;
  
  messageId?: string;
  sentAt?: string;
}

// Response: SuccessResponse<SendDocumentResponse>
```

## 7.6 Cancel Document

```typescript
// POST /api/v1/documents/:id/cancel
// Permissions: documents:cancel

interface CancelDocumentRequest {
  reason: string;
  
  // For invoices - create credit note
  createCreditNote?: boolean;
  
  // SPV options
  cancelInSPV?: boolean;     // Send cancellation to ANAF
}

interface CancelDocumentResponse {
  id: string;
  status: 'cancelled';
  cancelledAt: string;
  cancellationReason: string;
  
  // If credit note created
  creditNote?: {
    id: string;
    number: string;
    pdfUrl: string;
  };
  
  // SPV cancellation
  spvCancellation?: {
    status: 'queued' | 'sent';
    submissionId?: string;
  };
}

// Response: SuccessResponse<CancelDocumentResponse>
```

---

# 8. AI AGENT API

## 8.1 Process AI Message

```typescript
// POST /api/v1/ai/process
// Permissions: negotiations:write

interface ProcessAIMessageRequest {
  negotiationId: string;
  
  // Incoming message
  message: {
    type: 'text' | 'voice_transcript';
    content: string;
    channel: 'whatsapp' | 'email';
    channelMessageId?: string;
  };
  
  // Context (optional, usually auto-fetched)
  context?: {
    includeConversationHistory?: boolean;
    includeProductCatalog?: boolean;
    maxHistoryMessages?: number;
  };
  
  // AI options
  options?: {
    model?: 'grok-4' | 'gpt-4o';
    temperature?: number;
    maxTokens?: number;
    forceResponse?: boolean;  // Skip guardrails check
    dryRun?: boolean;         // Don't save/send
  };
}

interface ProcessAIMessageResponse {
  messageId: string;
  negotiationId: string;
  
  // AI analysis
  analysis: {
    intent: {
      primary: string;
      confidence: number;
      secondary: string[];
    };
    sentiment: {
      label: 'positive' | 'neutral' | 'negative';
      score: number;
    };
    entities: {
      type: string;
      value: string;
      confidence: number;
    }[];
    urgency: 'low' | 'medium' | 'high' | 'critical';
    requiresHuman: boolean;
    humanReason?: string;
  };
  
  // Generated response
  response: {
    text: string;
    confidence: number;
    
    // Tool calls made
    toolCalls: {
      tool: string;
      input: Record<string, unknown>;
      output: Record<string, unknown>;
      duration: number;
    }[];
    
    // Guardrails applied
    guardrails: {
      rule: string;
      triggered: boolean;
      action: 'none' | 'modified' | 'blocked';
      original?: string;
    }[];
  };
  
  // Actions taken
  actions: {
    type: 'state_transition' | 'discount_applied' | 'document_generated' | 
          'stock_reserved' | 'approval_requested' | 'human_escalation';
    details: Record<string, unknown>;
    success: boolean;
    error?: string;
  }[];
  
  // Status
  status: 'sent' | 'pending_approval' | 'escalated' | 'blocked';
  
  // If pending approval
  approvalRequired?: {
    id: string;
    type: string;
    reason: string;
  };
  
  // If escalated
  escalation?: {
    reason: string;
    priority: string;
    assignedTo?: string;
  };
  
  // Metrics
  metrics: {
    processingTime: number;
    llmTokens: {
      input: number;
      output: number;
    };
    llmCost: number;
    ragSearchTime: number;
  };
}

// Response: SuccessResponse<ProcessAIMessageResponse>
```

## 8.2 Get AI Conversation Context

```typescript
// GET /api/v1/ai/context/:negotiationId
// Permissions: negotiations:read

interface AIContextResponse {
  negotiationId: string;
  
  // Current state
  state: {
    current: string;
    allowedTransitions: string[];
    stateData: Record<string, unknown>;
  };
  
  // Contact context
  contact: {
    name: string;
    tier: string;
    orderHistory: {
      totalOrders: number;
      totalValue: number;
      avgOrderValue: number;
      lastOrderDate: string | null;
      favoriteProducts: string[];
    };
    preferences: Record<string, unknown>;
    communicationStyle: string;
  };
  
  // Product context
  products: {
    inNegotiation: {
      id: string;
      name: string;
      quantity: number;
      price: number;
    }[];
    recommended: {
      id: string;
      name: string;
      reason: string;
      score: number;
    }[];
  };
  
  // Conversation summary
  conversation: {
    messageCount: number;
    summaryText: string;
    keyTopics: string[];
    openQuestions: string[];
    lastAiAction: string;
  };
  
  // AI configuration
  aiConfig: {
    model: string;
    guardrailsProfile: string;
    autoApproveThreshold: number;
    allowedTools: string[];
  };
}

// Response: SuccessResponse<AIContextResponse>
```

## 8.3 Regenerate AI Response

```typescript
// POST /api/v1/ai/regenerate/:messageId
// Permissions: negotiations:write

interface RegenerateAIRequest {
  instructions?: string;     // Additional instructions
  model?: string;            // Override model
  temperature?: number;      // Override temperature
}

interface RegenerateAIResponse {
  originalMessageId: string;
  newMessageId: string;
  
  response: {
    text: string;
    confidence: number;
    changes: string[];       // What changed from original
  };
  
  status: 'sent' | 'pending_approval' | 'draft';
}

// Response: SuccessResponse<RegenerateAIResponse>
```

## 8.4 Submit AI Feedback

```typescript
// POST /api/v1/ai/feedback
// Permissions: negotiations:write

interface AIFeedbackRequest {
  messageId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  
  feedbackType: 'response_quality' | 'accuracy' | 'tone' | 'relevance' | 'guardrail';
  
  feedback: string;
  
  correctedResponse?: string; // If user corrected the response
  
  shouldRetrain?: boolean;   // Flag for model improvement
}

interface AIFeedbackResponse {
  id: string;
  messageId: string;
  status: 'received' | 'processed';
  
  // If correction was provided
  correctionApplied?: boolean;
  newMessageId?: string;
}

// Response: SuccessResponse<AIFeedbackResponse>
// Status: 201 Created
```

---

# 9. HITL APPROVALS API

## 9.1 List Pending Approvals

```typescript
// GET /api/v1/hitl/approvals
// Permissions: approvals:read

interface ApprovalListParams {
  page?: number;           // Default: 1
  limit?: number;          // Default: 20, Max: 100
  
  status?: 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';
  type?: ApprovalType;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  
  assignedTo?: string;     // User ID
  contactId?: string;
  negotiationId?: string;
  
  slaStatus?: 'ok' | 'warning' | 'breached';
  
  sortBy?: 'createdAt' | 'slaDeadline' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

type ApprovalType = 
  | 'discount_approval'
  | 'ai_response_review'
  | 'document_approval'
  | 'pricing_override'
  | 'stock_exception'
  | 'efactura_submission'
  | 'handover_escalation'
  | 'guardrail_violation';

interface ApprovalListItem {
  id: string;
  type: ApprovalType;
  status: string;
  priority: string;
  
  title: string;
  description: string;
  
  // Context
  entityType: 'negotiation' | 'document' | 'ai_message' | 'contact';
  entityId: string;
  
  // Requester
  requestedBy: {
    type: 'user' | 'ai' | 'system';
    id?: string;
    name: string;
  };
  
  // Assignment
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  
  // SLA
  slaDeadline: string;         // ISO datetime
  slaStatus: 'ok' | 'warning' | 'breached';
  timeRemaining: number;       // Seconds
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

interface ApprovalListResponse {
  items: ApprovalListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    pending: number;
    urgent: number;
    breached: number;
  };
}

// Response: SuccessResponse<ApprovalListResponse>
```

## 9.2 Get Approval Detail

```typescript
// GET /api/v1/hitl/approvals/:id
// Permissions: approvals:read

interface ApprovalDetail {
  id: string;
  type: ApprovalType;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  title: string;
  description: string;
  
  // Full context based on type
  context: DiscountApprovalContext | AIResponseContext | DocumentApprovalContext;
  
  // Request details
  requestedBy: {
    type: 'user' | 'ai' | 'system';
    id?: string;
    name: string;
  };
  requestedAt: string;
  reason: string;
  
  // Current assignment
  assignment: {
    assignedTo: {
      id: string;
      name: string;
      email: string;
    };
    assignedAt: string;
    assignedBy: string;
  } | null;
  
  // SLA information
  sla: {
    deadline: string;
    status: 'ok' | 'warning' | 'breached';
    timeRemaining: number;
    escalationLevel: number;
    escalationHistory: EscalationEvent[];
  };
  
  // History
  history: ApprovalHistoryEvent[];
  
  // Attachments
  attachments: {
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  }[];
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

interface DiscountApprovalContext {
  negotiation: {
    id: string;
    contactName: string;
    totalValue: number;
    currency: string;
  };
  originalPrice: number;
  requestedPrice: number;
  discountPercent: number;
  discountAmount: number;
  products: {
    id: string;
    name: string;
    quantity: number;
    originalPrice: number;
    requestedPrice: number;
    discountPercent: number;
  }[];
  justification: string;
  customerHistory?: {
    totalOrders: number;
    totalValue: number;
    averageOrderValue: number;
    lastOrderDate: string;
  };
}

interface AIResponseContext {
  conversation: {
    id: string;
    negotiationId: string;
    contactName: string;
  };
  originalMessage: {
    id: string;
    content: string;
    timestamp: string;
    sender: 'contact' | 'ai';
  };
  proposedResponse: {
    content: string;
    confidence: number;
    reasoning: string;
    suggestedActions: string[];
  };
  guardrailFlags: {
    type: string;
    severity: 'warning' | 'block';
    message: string;
  }[];
  alternativeResponses?: {
    content: string;
    confidence: number;
  }[];
}

interface DocumentApprovalContext {
  document: {
    id: string;
    type: 'proforma' | 'invoice' | 'contract' | 'offer';
    number: string;
    totalValue: number;
    currency: string;
  };
  negotiation: {
    id: string;
    contactName: string;
  };
  validationIssues?: {
    field: string;
    issue: string;
    severity: 'warning' | 'error';
  }[];
  previousVersionId?: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

interface EscalationEvent {
  level: number;
  escalatedAt: string;
  reason: string;
  escalatedFrom?: string;
  escalatedTo: string;
}

interface ApprovalHistoryEvent {
  action: 'created' | 'assigned' | 'reassigned' | 'escalated' | 'approved' | 'rejected' | 'commented';
  performedBy: {
    id: string;
    name: string;
  };
  performedAt: string;
  details: Record<string, any>;
}

// Response: SuccessResponse<ApprovalDetail>
```

## 9.3 Approve Request

```typescript
// POST /api/v1/hitl/approvals/:id/approve
// Permissions: approvals:approve

interface ApproveRequest {
  notes?: string;                // Approval notes
  
  // For discount approvals - can modify
  approvedDiscount?: number;     // If different from requested
  conditions?: string[];         // Conditions for approval
  
  // For AI response - can modify
  modifiedResponse?: string;     // If editing before approval
  
  // For document approvals
  documentCorrections?: {
    field: string;
    correctedValue: any;
  }[];
}

interface ApproveResponse {
  id: string;
  status: 'approved';
  
  approvedBy: {
    id: string;
    name: string;
  };
  approvedAt: string;
  
  // Next actions taken automatically
  actionsTriggered: {
    action: string;
    status: 'completed' | 'pending' | 'failed';
    result?: any;
    error?: string;
  }[];
  
  // Updated entity
  entityStatus: string;
  entityUrl: string;
}

// Response: SuccessResponse<ApproveResponse>
// Status: 200 OK
```

## 9.4 Reject Request

```typescript
// POST /api/v1/hitl/approvals/:id/reject
// Permissions: approvals:approve

interface RejectRequest {
  reason: string;               // Required - reason for rejection
  
  suggestAlternative?: boolean; // Should suggest alternative
  alternativeValue?: number;    // For discount - counter-offer
  
  // For AI response
  correctedResponse?: string;   // If providing correct response
  
  blockFutureSimilar?: boolean; // Block similar requests
}

interface RejectResponse {
  id: string;
  status: 'rejected';
  
  rejectedBy: {
    id: string;
    name: string;
  };
  rejectedAt: string;
  
  reason: string;
  
  // Notifications sent
  notificationsSent: {
    type: 'email' | 'push' | 'in_app';
    recipient: string;
    status: 'sent' | 'failed';
  }[];
  
  // If alternative suggested
  alternative?: {
    type: string;
    value: any;
    message: string;
  };
}

// Response: SuccessResponse<RejectResponse>
// Status: 200 OK
```

## 9.5 Escalate Request

```typescript
// POST /api/v1/hitl/approvals/:id/escalate
// Permissions: approvals:escalate

interface EscalateRequest {
  reason: string;
  
  targetAssignee?: string;      // Specific user to escalate to
  targetRole?: string;          // Or role-based escalation
  
  priority?: 'high' | 'critical'; // Increase priority
  
  additionalContext?: string;
}

interface EscalateResponse {
  id: string;
  status: 'escalated';
  
  escalatedBy: {
    id: string;
    name: string;
  };
  escalatedAt: string;
  
  newAssignment: {
    assignedTo: {
      id: string;
      name: string;
      email: string;
    };
    assignedAt: string;
  };
  
  escalationLevel: number;
  newSlaDeadline: string;
}

// Response: SuccessResponse<EscalateResponse>
// Status: 200 OK
```

## 9.6 Reassign Request

```typescript
// POST /api/v1/hitl/approvals/:id/reassign
// Permissions: approvals:assign

interface ReassignRequest {
  assignToUserId: string;
  reason?: string;
  resetSla?: boolean;          // Reset SLA countdown
}

interface ReassignResponse {
  id: string;
  
  previousAssignee: {
    id: string;
    name: string;
  } | null;
  
  newAssignee: {
    id: string;
    name: string;
    email: string;
  };
  
  reassignedBy: {
    id: string;
    name: string;
  };
  reassignedAt: string;
  
  slaDeadline: string;         // Updated if reset
}

// Response: SuccessResponse<ReassignResponse>
// Status: 200 OK
```

## 9.7 Add Comment

```typescript
// POST /api/v1/hitl/approvals/:id/comments
// Permissions: approvals:read

interface AddCommentRequest {
  content: string;
  
  // Optional mentions
  mentions?: string[];          // User IDs
  
  // Optional attachment
  attachmentIds?: string[];
  
  isInternal?: boolean;        // Internal note vs visible comment
}

interface CommentResponse {
  id: string;
  approvalId: string;
  
  content: string;
  
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  
  mentions: {
    id: string;
    name: string;
  }[];
  
  attachments: {
    id: string;
    name: string;
    url: string;
  }[];
  
  isInternal: boolean;
  
  createdAt: string;
}

// Response: SuccessResponse<CommentResponse>
// Status: 201 Created
```

## 9.8 Bulk Approve/Reject

```typescript
// POST /api/v1/hitl/approvals/bulk
// Permissions: approvals:approve

interface BulkApprovalRequest {
  action: 'approve' | 'reject';
  
  approvalIds: string[];
  
  // Common parameters
  notes?: string;
  reason?: string;             // Required for reject
}

interface BulkApprovalResponse {
  processed: number;
  succeeded: number;
  failed: number;
  
  results: {
    id: string;
    status: 'success' | 'failed';
    error?: string;
  }[];
}

// Response: SuccessResponse<BulkApprovalResponse>
// Status: 200 OK
```

## 9.9 Get Approval Statistics

```typescript
// GET /api/v1/hitl/approvals/stats
// Permissions: approvals:read

interface ApprovalStatsParams {
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
  userId?: string;             // Filter by approver
  type?: ApprovalType;
}

interface ApprovalStatsResponse {
  period: {
    start: string;
    end: string;
  };
  
  overview: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    escalated: number;
    expired: number;
  };
  
  slaMetrics: {
    averageResponseTime: number;     // Seconds
    medianResponseTime: number;
    slaComplianceRate: number;       // Percentage
    breachCount: number;
  };
  
  byType: {
    type: ApprovalType;
    count: number;
    approvedCount: number;
    rejectedCount: number;
    avgResponseTime: number;
  }[];
  
  byApprover: {
    userId: string;
    userName: string;
    handled: number;
    approved: number;
    rejected: number;
    avgResponseTime: number;
  }[];
  
  trends: {
    date: string;
    created: number;
    resolved: number;
    pending: number;
  }[];
}

// Response: SuccessResponse<ApprovalStatsResponse>
```

---

# 10. E-FACTURA & OBLIO API

## 10.1 Get E-Factura Status

```typescript
// GET /api/v1/fiscal/efactura/status
// Permissions: fiscal:read

interface EFacturaStatusResponse {
  configured: boolean;
  testMode: boolean;
  
  certificate: {
    valid: boolean;
    expiresAt: string;
    daysUntilExpiry: number;
    issuer: string;
    subject: string;
  } | null;
  
  spvConnection: {
    status: 'connected' | 'disconnected' | 'error';
    lastCheck: string;
    error?: string;
  };
  
  statistics: {
    totalSubmitted: number;
    totalAccepted: number;
    totalRejected: number;
    pendingValidation: number;
  };
  
  lastSubmission?: {
    documentId: string;
    documentNumber: string;
    submittedAt: string;
    status: string;
  };
}

// Response: SuccessResponse<EFacturaStatusResponse>
```

## 10.2 Submit Invoice to E-Factura

```typescript
// POST /api/v1/fiscal/efactura/submit
// Permissions: fiscal:write

interface EFacturaSubmitRequest {
  documentId: string;          // Internal document ID
  
  // Override test mode if needed
  forceProduction?: boolean;
  
  // Retry options
  retryOnError?: boolean;
  maxRetries?: number;
}

interface EFacturaSubmitResponse {
  submissionId: string;
  documentId: string;
  
  status: 'submitted' | 'validating' | 'accepted' | 'rejected';
  
  spvResponse: {
    indexIncarcare: string;
    dataReferinta: string;
    detalii?: string;
  };
  
  validationErrors?: {
    code: string;
    message: string;
    field?: string;
  }[];
  
  submittedAt: string;
  
  // Next steps
  nextActions: {
    action: string;
    description: string;
    url?: string;
  }[];
}

// Response: SuccessResponse<EFacturaSubmitResponse>
// Status: 202 Accepted (async processing)
```

## 10.3 Check E-Factura Submission Status

```typescript
// GET /api/v1/fiscal/efactura/submissions/:submissionId
// Permissions: fiscal:read

interface EFacturaSubmissionDetail {
  submissionId: string;
  documentId: string;
  
  // SPV reference
  indexIncarcare: string;
  
  status: 'submitted' | 'validating' | 'accepted' | 'rejected' | 'error';
  
  timeline: {
    event: string;
    timestamp: string;
    details?: string;
  }[];
  
  // If accepted
  acceptance?: {
    acceptedAt: string;
    responseXml: string;        // Base64 encoded
    downloadId: string;
  };
  
  // If rejected
  rejection?: {
    rejectedAt: string;
    errors: {
      code: string;
      message: string;
      severity: 'error' | 'warning';
    }[];
    responseXml: string;
  };
  
  // Original document
  document: {
    id: string;
    type: string;
    number: string;
    date: string;
    totalValue: number;
    buyer: string;
  };
}

// Response: SuccessResponse<EFacturaSubmissionDetail>
```

## 10.4 Download E-Factura Messages

```typescript
// GET /api/v1/fiscal/efactura/messages
// Permissions: fiscal:read

interface EFacturaMessagesParams {
  days?: number;               // Default: 60
  cif?: string;               // Filter by CIF
  filter?: 'E' | 'P' | 'R';   // Emise, Primite, Erori
}

interface EFacturaMessagesResponse {
  messages: {
    id: string;
    indexIncarcare: string;
    dataCriere: string;
    tip: 'FACTURA' | 'ERORI';
    detalii: string;
    cif: string;
  }[];
  
  pagination: {
    total: number;
    hasMore: boolean;
  };
  
  lastSync: string;
}

// Response: SuccessResponse<EFacturaMessagesResponse>
```

## 10.5 Sync with Oblio

```typescript
// POST /api/v1/fiscal/oblio/sync
// Permissions: fiscal:write

interface OblioSyncRequest {
  syncType: 'full' | 'incremental';
  
  // What to sync
  entities: ('products' | 'contacts' | 'invoices' | 'series')[];
  
  // Date range for incremental
  fromDate?: string;
  toDate?: string;
  
  // Conflict resolution
  conflictResolution?: 'local_wins' | 'oblio_wins' | 'manual';
}

interface OblioSyncResponse {
  syncId: string;
  status: 'in_progress' | 'completed' | 'completed_with_errors';
  
  results: {
    entity: string;
    total: number;
    synced: number;
    created: number;
    updated: number;
    errors: number;
  }[];
  
  conflicts: {
    entity: string;
    localId: string;
    oblioId: string;
    field: string;
    localValue: any;
    oblioValue: any;
  }[];
  
  errors: {
    entity: string;
    id: string;
    error: string;
  }[];
  
  startedAt: string;
  completedAt?: string;
}

// Response: SuccessResponse<OblioSyncResponse>
// Status: 202 Accepted (async processing)
```

## 10.6 Create Oblio Invoice

```typescript
// POST /api/v1/fiscal/oblio/invoices
// Permissions: fiscal:write

interface OblioInvoiceRequest {
  // Source document
  sourceDocumentId?: string;     // Create from existing document
  
  // Or manual data
  series?: string;
  client: {
    name: string;
    cui?: string;
    rc?: string;
    address: string;
    email?: string;
  };
  
  products: {
    name: string;
    code?: string;
    quantity: number;
    price: number;
    vatRate: number;
    unit?: string;
  }[];
  
  // Optional fields
  mentionClient?: string;
  issueDate?: string;
  dueDate?: string;
  
  // E-factura options
  submitToEfactura?: boolean;
}

interface OblioInvoiceResponse {
  oblioId: string;
  seriesName: string;
  number: string;
  
  link: string;                  // Oblio view link
  pdfUrl: string;
  
  // If e-factura submission requested
  efacturaSubmission?: {
    status: string;
    submissionId: string;
  };
  
  createdAt: string;
}

// Response: SuccessResponse<OblioInvoiceResponse>
// Status: 201 Created
```

## 10.7 Get Invoice Series

```typescript
// GET /api/v1/fiscal/series
// Permissions: fiscal:read

interface InvoiceSeriesResponse {
  series: {
    id: string;
    name: string;
    type: 'proforma' | 'invoice' | 'receipt' | 'aviz';
    
    prefix: string;
    currentNumber: number;
    
    defaultVatRate: number;
    defaultCurrency: string;
    
    // Oblio sync
    oblioSeries?: string;
    oblioSynced: boolean;
    
    isDefault: boolean;
    isActive: boolean;
  }[];
}

// Response: SuccessResponse<InvoiceSeriesResponse>
```

---

# 11. ANALYTICS & REPORTS API

## 11.1 Dashboard Overview

```typescript
// GET /api/v1/analytics/dashboard
// Permissions: analytics:read

interface DashboardParams {
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  compareWith?: 'previous_period' | 'same_period_last_year';
}

interface DashboardResponse {
  period: {
    start: string;
    end: string;
    label: string;
  };
  
  kpis: {
    // Revenue
    revenue: {
      value: number;
      currency: string;
      change: number;            // Percentage change
      trend: 'up' | 'down' | 'stable';
    };
    
    // Negotiations
    negotiations: {
      total: number;
      active: number;
      won: number;
      lost: number;
      winRate: number;
      change: number;
    };
    
    // AI Performance
    aiPerformance: {
      messagesHandled: number;
      automationRate: number;    // % handled without human
      avgResponseTime: number;   // Seconds
      satisfactionScore: number; // 1-5
    };
    
    // HITL
    hitl: {
      pending: number;
      avgApprovalTime: number;
      slaCompliance: number;
    };
    
    // Products
    products: {
      totalSku: number;
      lowStock: number;
      outOfStock: number;
    };
  };
  
  charts: {
    // Revenue trend
    revenueTrend: {
      labels: string[];
      datasets: {
        label: string;
        data: number[];
      }[];
    };
    
    // Negotiations funnel
    negotiationFunnel: {
      stage: string;
      count: number;
      value: number;
    }[];
    
    // AI vs Human responses
    responseBreakdown: {
      ai: number;
      human: number;
      hybrid: number;
    };
  };
  
  recentActivity: {
    type: string;
    description: string;
    timestamp: string;
    link?: string;
  }[];
}

// Response: SuccessResponse<DashboardResponse>
```

## 11.2 Sales Performance Report

```typescript
// GET /api/v1/analytics/sales
// Permissions: analytics:read

interface SalesReportParams {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
  
  // Filters
  salesRepId?: string;
  contactTier?: string;
  productCategory?: string;
  region?: string;
}

interface SalesReportResponse {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    
    newCustomers: number;
    repeatCustomers: number;
    
    topProducts: {
      id: string;
      name: string;
      revenue: number;
      quantity: number;
    }[];
    
    topCustomers: {
      id: string;
      name: string;
      revenue: number;
      orders: number;
    }[];
  };
  
  byPeriod: {
    period: string;
    revenue: number;
    orders: number;
    avgOrderValue: number;
    newCustomers: number;
  }[];
  
  bySalesRep: {
    userId: string;
    userName: string;
    revenue: number;
    deals: number;
    winRate: number;
    avgDealSize: number;
  }[];
  
  byRegion: {
    region: string;
    county: string;
    revenue: number;
    customers: number;
  }[];
  
  conversionFunnel: {
    stage: string;
    count: number;
    conversionRate: number;
    avgTimeInStage: number;
  }[];
}

// Response: SuccessResponse<SalesReportResponse>
```

## 11.3 AI Performance Report

```typescript
// GET /api/v1/analytics/ai-performance
// Permissions: analytics:read

interface AIPerformanceParams {
  startDate: string;
  endDate: string;
  model?: string;
}

interface AIPerformanceResponse {
  overview: {
    totalMessages: number;
    messagesHandledByAI: number;
    messagesEscalated: number;
    automationRate: number;
    
    avgConfidence: number;
    avgResponseTime: number;
    
    guardrailTriggered: number;
    guardrailRate: number;
  };
  
  byModel: {
    model: string;
    messages: number;
    avgConfidence: number;
    avgLatency: number;
    cost: number;
    costPerMessage: number;
  }[];
  
  guardrailAnalysis: {
    type: string;
    count: number;
    percentage: number;
    topReasons: string[];
  }[];
  
  feedbackAnalysis: {
    totalFeedback: number;
    avgRating: number;
    ratingDistribution: {
      rating: number;
      count: number;
    }[];
    commonIssues: {
      issue: string;
      count: number;
    }[];
  };
  
  costAnalysis: {
    totalCost: number;
    costTrend: {
      date: string;
      cost: number;
      messages: number;
    }[];
    costByModel: {
      model: string;
      cost: number;
      percentage: number;
    }[];
  };
  
  qualityMetrics: {
    responseRelevance: number;
    intentAccuracy: number;
    sentimentHandling: number;
    escalationAccuracy: number;
  };
}

// Response: SuccessResponse<AIPerformanceResponse>
```

## 11.4 HITL Performance Report

```typescript
// GET /api/v1/analytics/hitl
// Permissions: analytics:read

interface HITLReportParams {
  startDate: string;
  endDate: string;
  approverUserId?: string;
  approvalType?: string;
}

interface HITLReportResponse {
  overview: {
    totalApprovals: number;
    approved: number;
    rejected: number;
    expired: number;
    
    avgResponseTime: number;
    medianResponseTime: number;
    
    slaCompliance: number;
    breachCount: number;
  };
  
  byType: {
    type: string;
    count: number;
    approved: number;
    rejected: number;
    avgTime: number;
    slaCompliance: number;
  }[];
  
  byApprover: {
    userId: string;
    userName: string;
    handled: number;
    approved: number;
    rejected: number;
    avgTime: number;
    slaCompliance: number;
  }[];
  
  slaTrend: {
    date: string;
    total: number;
    withinSla: number;
    breached: number;
  }[];
  
  bottlenecks: {
    type: string;
    avgWaitTime: number;
    queueLength: number;
    suggestedAction: string;
  }[];
}

// Response: SuccessResponse<HITLReportResponse>
```

## 11.5 Generate Custom Report

```typescript
// POST /api/v1/analytics/reports
// Permissions: analytics:write

interface CustomReportRequest {
  name: string;
  type: 'sales' | 'ai' | 'hitl' | 'products' | 'custom';
  
  // Date range
  dateRange: {
    start: string;
    end: string;
  };
  
  // Metrics to include
  metrics: string[];
  
  // Dimensions for grouping
  dimensions: string[];
  
  // Filters
  filters: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains';
    value: any;
  }[];
  
  // Output format
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  
  // Schedule (optional)
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    recipients: string[];
  };
}

interface CustomReportResponse {
  reportId: string;
  name: string;
  status: 'generating' | 'ready' | 'failed';
  
  // If ready
  downloadUrl?: string;
  expiresAt?: string;
  
  // If scheduled
  scheduleId?: string;
  nextRun?: string;
  
  generatedAt?: string;
}

// Response: SuccessResponse<CustomReportResponse>
// Status: 202 Accepted
```

## 11.6 Export Data

```typescript
// POST /api/v1/analytics/export
// Permissions: analytics:export

interface DataExportRequest {
  entity: 'negotiations' | 'documents' | 'conversations' | 'approvals' | 'ai_messages';
  
  dateRange: {
    start: string;
    end: string;
  };
  
  filters?: Record<string, any>;
  
  fields?: string[];           // Specific fields to include
  
  format: 'csv' | 'xlsx' | 'json';
  
  // For large exports
  async?: boolean;
  notifyEmail?: string;
}

interface DataExportResponse {
  exportId: string;
  status: 'processing' | 'ready' | 'failed';
  
  // If ready immediately (small export)
  downloadUrl?: string;
  
  // If async
  estimatedCompletion?: string;
  notificationEmail?: string;
  
  recordCount?: number;
  fileSize?: number;
}

// Response: SuccessResponse<DataExportResponse>
// Status: 202 Accepted (async) or 200 OK (immediate)
```

---

# 12. GUARDRAILS & CONFIGURATION API

## 12.1 Get Guardrail Configuration

```typescript
// GET /api/v1/ai/guardrails
// Permissions: ai:admin

interface GuardrailConfigResponse {
  profile: 'strict' | 'balanced' | 'permissive' | 'custom';
  
  rules: {
    id: string;
    name: string;
    description: string;
    
    type: 'input' | 'output' | 'action';
    category: 'safety' | 'compliance' | 'business' | 'quality';
    
    enabled: boolean;
    severity: 'block' | 'warn' | 'log';
    
    conditions: {
      field: string;
      operator: string;
      value: any;
      logic?: 'and' | 'or';
    }[];
    
    action: {
      type: 'block' | 'escalate' | 'modify' | 'log';
      config: Record<string, any>;
    };
    
    exceptions: {
      type: string;
      value: any;
    }[];
  }[];
  
  thresholds: {
    maxDiscountPercent: number;
    maxOrderValue: number;
    minConfidenceForAuto: number;
    maxDailyAICost: number;
    maxMessagesPerConversation: number;
  };
  
  blockedPatterns: {
    id: string;
    pattern: string;
    type: 'regex' | 'keyword' | 'semantic';
    reason: string;
  }[];
  
  allowedTopics: string[];
  blockedTopics: string[];
  
  lastUpdated: string;
  updatedBy: string;
}

// Response: SuccessResponse<GuardrailConfigResponse>
```

## 12.2 Update Guardrail Configuration

```typescript
// PUT /api/v1/ai/guardrails
// Permissions: ai:admin

interface GuardrailUpdateRequest {
  profile?: 'strict' | 'balanced' | 'permissive' | 'custom';
  
  rules?: {
    id?: string;               // Update existing or create new
    name: string;
    enabled: boolean;
    severity: 'block' | 'warn' | 'log';
    conditions: any[];
    action: any;
  }[];
  
  thresholds?: {
    maxDiscountPercent?: number;
    maxOrderValue?: number;
    minConfidenceForAuto?: number;
    maxDailyAICost?: number;
  };
  
  blockedPatterns?: {
    pattern: string;
    type: 'regex' | 'keyword' | 'semantic';
    reason: string;
  }[];
  
  allowedTopics?: string[];
  blockedTopics?: string[];
}

interface GuardrailUpdateResponse {
  updated: boolean;
  
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  
  validationWarnings?: string[];
  
  updatedAt: string;
  updatedBy: string;
}

// Response: SuccessResponse<GuardrailUpdateResponse>
```

## 12.3 Test Guardrail Rule

```typescript
// POST /api/v1/ai/guardrails/test
// Permissions: ai:admin

interface GuardrailTestRequest {
  // Rule to test (or existing rule ID)
  ruleId?: string;
  rule?: {
    conditions: any[];
    action: any;
  };
  
  // Test input
  testInput: {
    type: 'message' | 'action' | 'context';
    content: string;
    context?: Record<string, any>;
  };
}

interface GuardrailTestResponse {
  triggered: boolean;
  
  matchDetails: {
    condition: string;
    matched: boolean;
    matchedValue?: any;
  }[];
  
  actionTaken: string;
  
  executionTime: number;
  
  suggestedImprovements?: string[];
}

// Response: SuccessResponse<GuardrailTestResponse>
```

## 12.4 Get AI Model Configuration

```typescript
// GET /api/v1/ai/config
// Permissions: ai:admin

interface AIConfigResponse {
  defaultModel: string;
  
  models: {
    id: string;
    name: string;
    provider: 'anthropic' | 'openai' | 'local';
    
    enabled: boolean;
    isDefault: boolean;
    
    config: {
      temperature: number;
      maxTokens: number;
      topP: number;
    };
    
    pricing: {
      inputTokenCost: number;
      outputTokenCost: number;
      currency: string;
    };
    
    limits: {
      maxDailyRequests: number;
      maxDailyCost: number;
      rateLimit: number;
    };
    
    usage: {
      today: {
        requests: number;
        cost: number;
        tokens: number;
      };
      thisMonth: {
        requests: number;
        cost: number;
        tokens: number;
      };
    };
  }[];
  
  routing: {
    defaultModel: string;
    rules: {
      condition: string;
      model: string;
    }[];
  };
  
  systemPrompts: {
    id: string;
    name: string;
    content: string;
    isDefault: boolean;
  }[];
}

// Response: SuccessResponse<AIConfigResponse>
```

## 12.5 Update AI Model Configuration

```typescript
// PUT /api/v1/ai/config
// Permissions: ai:admin

interface AIConfigUpdateRequest {
  defaultModel?: string;
  
  models?: {
    id: string;
    enabled?: boolean;
    config?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    };
    limits?: {
      maxDailyRequests?: number;
      maxDailyCost?: number;
    };
  }[];
  
  routing?: {
    defaultModel?: string;
    rules?: {
      condition: string;
      model: string;
    }[];
  };
  
  systemPrompts?: {
    id?: string;
    name: string;
    content: string;
    isDefault?: boolean;
  }[];
}

// Response: SuccessResponse<{ updated: boolean; changes: any[] }>
```

## 12.6 Get Conversation Templates

```typescript
// GET /api/v1/ai/templates
// Permissions: ai:read

interface ConversationTemplatesResponse {
  templates: {
    id: string;
    name: string;
    description: string;
    
    category: 'greeting' | 'followup' | 'closing' | 'objection' | 'escalation';
    
    content: string;
    
    variables: {
      name: string;
      type: 'string' | 'number' | 'date' | 'contact' | 'product';
      required: boolean;
      defaultValue?: any;
    }[];
    
    // When to use
    triggers: {
      type: 'intent' | 'sentiment' | 'context' | 'manual';
      condition: any;
    }[];
    
    // Performance
    usage: {
      timesUsed: number;
      avgRating: number;
      conversionRate: number;
    };
    
    isSystem: boolean;
    isActive: boolean;
    
    createdAt: string;
    updatedAt: string;
  }[];
}

// Response: SuccessResponse<ConversationTemplatesResponse>
```

## 12.7 Create/Update Conversation Template

```typescript
// POST /api/v1/ai/templates
// PUT /api/v1/ai/templates/:id
// Permissions: ai:write

interface TemplateRequest {
  name: string;
  description: string;
  category: string;
  content: string;
  
  variables?: {
    name: string;
    type: string;
    required: boolean;
    defaultValue?: any;
  }[];
  
  triggers?: {
    type: string;
    condition: any;
  }[];
  
  isActive?: boolean;
}

interface TemplateResponse {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Response: SuccessResponse<TemplateResponse>
// Status: 201 Created (POST) or 200 OK (PUT)
```

---

# 13. ADMIN & CONFIGURATION API

## 13.1 Get Tenant Configuration

```typescript
// GET /api/v1/admin/config
// Permissions: admin:read

interface TenantConfigResponse {
  tenant: {
    id: string;
    name: string;
    companyName: string;
    cui: string;
    
    createdAt: string;
    plan: 'starter' | 'professional' | 'enterprise';
    planExpiresAt: string;
  };
  
  features: {
    feature: string;
    enabled: boolean;
    limit?: number;
    usage?: number;
  }[];
  
  integrations: {
    name: string;
    enabled: boolean;
    status: 'active' | 'inactive' | 'error';
    lastSync?: string;
  }[];
  
  limits: {
    maxUsers: number;
    currentUsers: number;
    maxContacts: number;
    currentContacts: number;
    maxProducts: number;
    currentProducts: number;
    maxAIMessagesPerMonth: number;
    currentAIMessages: number;
  };
  
  branding: {
    logo?: string;
    primaryColor: string;
    companyName: string;
  };
  
  regional: {
    timezone: string;
    locale: string;
    currency: string;
    dateFormat: string;
  };
}

// Response: SuccessResponse<TenantConfigResponse>
```

## 13.2 Update Tenant Configuration

```typescript
// PUT /api/v1/admin/config
// Permissions: admin:write

interface TenantConfigUpdateRequest {
  branding?: {
    logo?: string;
    primaryColor?: string;
    companyName?: string;
  };
  
  regional?: {
    timezone?: string;
    locale?: string;
    currency?: string;
    dateFormat?: string;
  };
  
  defaults?: {
    paymentTerms?: number;
    validityDays?: number;
    defaultVatRate?: number;
  };
  
  notifications?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    dailyDigest?: boolean;
    weeklyReport?: boolean;
  };
  
  security?: {
    requireTwoFactor?: boolean;
    sessionTimeout?: number;
    ipWhitelist?: string[];
    passwordPolicy?: {
      minLength: number;
      requireUppercase: boolean;
      requireNumber: boolean;
      requireSpecial: boolean;
    };
  };
}

// Response: SuccessResponse<{ updated: boolean }>
```

## 13.3 List Users

```typescript
// GET /api/v1/admin/users
// Permissions: admin:read

interface UserListParams {
  page?: number;
  limit?: number;
  role?: string;
  status?: 'active' | 'inactive' | 'invited' | 'suspended';
  search?: string;
}

interface UserListResponse {
  users: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    
    role: 'admin' | 'sales_manager' | 'sales_rep' | 'viewer';
    status: string;
    
    lastLogin?: string;
    createdAt: string;
    
    // Activity summary
    activity: {
      negotiations: number;
      approvalsHandled: number;
      lastAction?: string;
    };
  }[];
  
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Response: SuccessResponse<UserListResponse>
```

## 13.4 Create User

```typescript
// POST /api/v1/admin/users
// Permissions: admin:write

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'sales_manager' | 'sales_rep' | 'viewer';
  
  sendInvite?: boolean;
  tempPassword?: string;       // If not sending invite
  
  permissions?: string[];      // Custom permissions
  
  metadata?: Record<string, any>;
}

interface CreateUserResponse {
  id: string;
  email: string;
  role: string;
  status: 'invited' | 'active';
  
  inviteLink?: string;
  inviteExpiresAt?: string;
  
  createdAt: string;
}

// Response: SuccessResponse<CreateUserResponse>
// Status: 201 Created
```

## 13.5 Update User

```typescript
// PUT /api/v1/admin/users/:id
// Permissions: admin:write

interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: string;
  
  permissions?: string[];
  
  status?: 'active' | 'suspended';
  
  metadata?: Record<string, any>;
}

// Response: SuccessResponse<{ updated: boolean }>
```

## 13.6 Delete User

```typescript
// DELETE /api/v1/admin/users/:id
// Permissions: admin:delete

interface DeleteUserParams {
  transferNegotiationsTo?: string;  // User ID
  hardDelete?: boolean;             // GDPR delete
}

interface DeleteUserResponse {
  deleted: boolean;
  
  transferredItems: {
    type: string;
    count: number;
    transferredTo: string;
  }[];
  
  // GDPR compliance
  dataDeleted?: {
    tables: string[];
    recordsRemoved: number;
    logsAnonymized: number;
  };
}

// Response: SuccessResponse<DeleteUserResponse>
```

## 13.7 Audit Log

```typescript
// GET /api/v1/admin/audit
// Permissions: admin:audit

interface AuditLogParams {
  page?: number;
  limit?: number;
  
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  
  startDate?: string;
  endDate?: string;
  
  ipAddress?: string;
}

interface AuditLogResponse {
  entries: {
    id: string;
    
    user: {
      id: string;
      email: string;
      name: string;
    };
    
    action: string;
    description: string;
    
    entityType: string;
    entityId: string;
    
    changes?: {
      field: string;
      oldValue: any;
      newValue: any;
    }[];
    
    metadata: {
      ipAddress: string;
      userAgent: string;
      sessionId: string;
    };
    
    timestamp: string;
  }[];
  
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Response: SuccessResponse<AuditLogResponse>
```

## 13.8 System Health

```typescript
// GET /api/v1/admin/health
// Permissions: admin:read

interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  services: {
    name: string;
    status: 'up' | 'down' | 'degraded';
    latency: number;
    lastCheck: string;
    error?: string;
  }[];
  
  database: {
    status: string;
    connections: {
      active: number;
      idle: number;
      max: number;
    };
    replicationLag?: number;
  };
  
  redis: {
    status: string;
    memory: {
      used: number;
      peak: number;
      maxConfigured: number;
    };
  };
  
  queues: {
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }[];
  
  storage: {
    used: number;
    available: number;
    percentage: number;
  };
  
  uptime: number;
  version: string;
}

// Response: SuccessResponse<SystemHealthResponse>
```

---

# 14. WEBHOOKS API

## 14.1 List Webhook Subscriptions

```typescript
// GET /api/v1/webhooks
// Permissions: webhooks:read

interface WebhookListResponse {
  webhooks: {
    id: string;
    name: string;
    url: string;
    
    events: string[];
    
    status: 'active' | 'paused' | 'failed';
    
    authentication: {
      type: 'none' | 'basic' | 'bearer' | 'hmac';
      configured: boolean;
    };
    
    // Delivery stats
    stats: {
      totalDeliveries: number;
      successRate: number;
      lastDelivery?: string;
      lastStatus?: number;
    };
    
    createdAt: string;
    updatedAt: string;
  }[];
}

// Response: SuccessResponse<WebhookListResponse>
```

## 14.2 Create Webhook Subscription

```typescript
// POST /api/v1/webhooks
// Permissions: webhooks:write

interface CreateWebhookRequest {
  name: string;
  url: string;
  
  events: WebhookEvent[];
  
  authentication?: {
    type: 'basic' | 'bearer' | 'hmac';
    username?: string;
    password?: string;
    token?: string;
    secret?: string;
  };
  
  // Optional filters
  filters?: {
    entityTypes?: string[];
    userIds?: string[];
    conditions?: Record<string, any>;
  };
  
  // Retry config
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  
  // Headers
  customHeaders?: Record<string, string>;
}

type WebhookEvent = 
  // Negotiations
  | 'negotiation.created'
  | 'negotiation.updated'
  | 'negotiation.stage_changed'
  | 'negotiation.won'
  | 'negotiation.lost'
  
  // Documents
  | 'document.created'
  | 'document.sent'
  | 'document.signed'
  
  // AI Events
  | 'ai.message_sent'
  | 'ai.escalation_requested'
  | 'ai.guardrail_triggered'
  
  // HITL
  | 'approval.created'
  | 'approval.resolved'
  | 'approval.escalated'
  
  // E-Factura
  | 'efactura.submitted'
  | 'efactura.accepted'
  | 'efactura.rejected'
  
  // Products
  | 'product.low_stock'
  | 'product.out_of_stock'
  
  // System
  | 'system.health_degraded'
  | 'system.backup_completed';

interface CreateWebhookResponse {
  id: string;
  name: string;
  secret: string;               // For HMAC verification
  status: 'active';
  createdAt: string;
}

// Response: SuccessResponse<CreateWebhookResponse>
// Status: 201 Created
```

## 14.3 Update Webhook

```typescript
// PUT /api/v1/webhooks/:id
// Permissions: webhooks:write

interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  events?: WebhookEvent[];
  status?: 'active' | 'paused';
  authentication?: any;
  filters?: any;
  retryPolicy?: any;
  customHeaders?: Record<string, string>;
}

// Response: SuccessResponse<{ updated: boolean }>
```

## 14.4 Delete Webhook

```typescript
// DELETE /api/v1/webhooks/:id
// Permissions: webhooks:delete

// Response: SuccessResponse<{ deleted: boolean }>
```

## 14.5 Test Webhook

```typescript
// POST /api/v1/webhooks/:id/test
// Permissions: webhooks:write

interface TestWebhookRequest {
  eventType: WebhookEvent;
  mockPayload?: Record<string, any>;
}

interface TestWebhookResponse {
  delivered: boolean;
  
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
  };
  
  response: {
    status: number;
    headers: Record<string, string>;
    body?: any;
    latency: number;
  };
  
  error?: string;
}

// Response: SuccessResponse<TestWebhookResponse>
```

## 14.6 Get Webhook Delivery History

```typescript
// GET /api/v1/webhooks/:id/deliveries
// Permissions: webhooks:read

interface DeliveryHistoryParams {
  page?: number;
  limit?: number;
  status?: 'success' | 'failed';
  startDate?: string;
  endDate?: string;
}

interface DeliveryHistoryResponse {
  deliveries: {
    id: string;
    eventType: string;
    
    status: 'success' | 'failed';
    httpStatus: number;
    
    attempt: number;
    maxAttempts: number;
    
    request: {
      timestamp: string;
      payload: any;
    };
    
    response: {
      timestamp: string;
      status: number;
      body?: any;
      error?: string;
    };
    
    latency: number;
    nextRetry?: string;
  }[];
  
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Response: SuccessResponse<DeliveryHistoryResponse>
```

## 14.7 Retry Failed Delivery

```typescript
// POST /api/v1/webhooks/:id/deliveries/:deliveryId/retry
// Permissions: webhooks:write

interface RetryDeliveryResponse {
  retried: boolean;
  newDeliveryId: string;
  status: 'pending' | 'success' | 'failed';
  result?: any;
}

// Response: SuccessResponse<RetryDeliveryResponse>
```

## 14.8 Webhook Payload Structure

```typescript
// Standard webhook payload sent to subscriber endpoints

interface WebhookPayload<T = any> {
  // Event metadata
  id: string;                    // Unique delivery ID
  timestamp: string;             // ISO 8601
  event: WebhookEvent;
  version: '1.0';
  
  // Tenant context
  tenant: {
    id: string;
    name: string;
  };
  
  // Event data
  data: T;
  
  // Related entities
  related?: {
    type: string;
    id: string;
    url: string;
  }[];
}

// Example: negotiation.won event
interface NegotiationWonPayload {
  negotiation: {
    id: string;
    contactId: string;
    contactName: string;
    totalValue: number;
    currency: string;
    products: {
      id: string;
      name: string;
      quantity: number;
      price: number;
    }[];
    closedAt: string;
    closedBy: string;
  };
  
  previousStage: string;
  
  timeline: {
    createdAt: string;
    firstContactAt: string;
    proposalSentAt: string;
    closedAt: string;
    daysToClose: number;
  };
}

// Webhook signature header
// X-Webhook-Signature: sha256=<HMAC-SHA256 of payload using webhook secret>
```

---

# 15. ERROR CODES & RESPONSES

## 15.1 Standard Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;              // Machine-readable code
    message: string;           // Human-readable message
    details?: any;             // Additional context
    field?: string;            // For validation errors
    requestId: string;         // For support reference
  };
}
```

## 15.2 HTTP Status Codes

| Status | Meaning | Usage |
|--------|---------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST creating resource |
| 202 | Accepted | Async operation started |
| 204 | No Content | Successful operation with no response body |
| 400 | Bad Request | Invalid request syntax or parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource state conflict |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Service temporarily unavailable |

## 15.3 Application Error Codes

### Authentication Errors (AUTH_*)

| Code | Message | Resolution |
|------|---------|------------|
| AUTH_TOKEN_MISSING | Authorization token required | Include Bearer token in header |
| AUTH_TOKEN_INVALID | Invalid authentication token | Check token format and validity |
| AUTH_TOKEN_EXPIRED | Authentication token has expired | Refresh token or re-authenticate |
| AUTH_REFRESH_INVALID | Invalid refresh token | Re-authenticate with credentials |
| AUTH_MFA_REQUIRED | Multi-factor authentication required | Complete MFA challenge |
| AUTH_SESSION_EXPIRED | Session has expired | Re-authenticate |
| AUTH_IP_BLOCKED | IP address not in whitelist | Contact administrator |

### Authorization Errors (AUTHZ_*)

| Code | Message | Resolution |
|------|---------|------------|
| AUTHZ_PERMISSION_DENIED | Insufficient permissions for this action | Contact administrator for access |
| AUTHZ_ROLE_REQUIRED | This action requires a specific role | Verify user role |
| AUTHZ_TENANT_MISMATCH | Resource belongs to different tenant | Check tenant context |
| AUTHZ_RESOURCE_LOCKED | Resource is locked by another user | Wait or force unlock (admin) |

### Validation Errors (VAL_*)

| Code | Message | Resolution |
|------|---------|------------|
| VAL_REQUIRED_FIELD | Required field is missing | Provide required field |
| VAL_INVALID_FORMAT | Field format is invalid | Check field format requirements |
| VAL_OUT_OF_RANGE | Value is out of allowed range | Check min/max constraints |
| VAL_INVALID_ENUM | Value not in allowed list | Check allowed values |
| VAL_DUPLICATE | Duplicate value not allowed | Use unique value |
| VAL_REFERENCE_INVALID | Referenced entity does not exist | Check referenced ID |
| VAL_CUI_INVALID | Invalid CUI format | Use format: RO12345678 |
| VAL_IBAN_INVALID | Invalid IBAN format | Use format: RO00XXXX... |
| VAL_EMAIL_INVALID | Invalid email address | Check email format |
| VAL_PHONE_INVALID | Invalid phone number | Use format: +40... |

### Resource Errors (RES_*)

| Code | Message | Resolution |
|------|---------|------------|
| RES_NOT_FOUND | Resource not found | Check resource ID |
| RES_ALREADY_EXISTS | Resource already exists | Use unique identifier |
| RES_DELETED | Resource has been deleted | Cannot access deleted resources |
| RES_ARCHIVED | Resource has been archived | Restore before accessing |
| RES_LOCKED | Resource is locked | Wait for unlock or contact admin |

### Business Logic Errors (BIZ_*)

| Code | Message | Resolution |
|------|---------|------------|
| BIZ_DISCOUNT_EXCEEDED | Discount exceeds maximum allowed | Request HITL approval |
| BIZ_STOCK_INSUFFICIENT | Insufficient stock for quantity | Reduce quantity or check stock |
| BIZ_NEGOTIATION_CLOSED | Negotiation is already closed | Create new negotiation |
| BIZ_DOCUMENT_FINALIZED | Document is finalized and cannot be edited | Create correction document |
| BIZ_APPROVAL_EXPIRED | Approval request has expired | Create new request |
| BIZ_SLA_BREACHED | SLA deadline has been breached | Escalate or handle immediately |
| BIZ_QUOTA_EXCEEDED | Usage quota exceeded | Upgrade plan or wait for reset |

### Integration Errors (INT_*)

| Code | Message | Resolution |
|------|---------|------------|
| INT_ANAF_UNAVAILABLE | ANAF service unavailable | Retry later |
| INT_ANAF_CUI_NOT_FOUND | CUI not found in ANAF registry | Verify CUI |
| INT_EFACTURA_REJECTED | E-Factura submission rejected | Check validation errors |
| INT_EFACTURA_CERT_INVALID | E-Factura certificate invalid | Update certificate |
| INT_OBLIO_AUTH_FAILED | Oblio authentication failed | Check API key |
| INT_OBLIO_SYNC_ERROR | Oblio synchronization failed | Check Oblio status |
| INT_HUNTER_QUOTA | Hunter.io quota exceeded | Wait for quota reset |
| INT_EMAIL_DELIVERY_FAILED | Email delivery failed | Check email configuration |

### AI Errors (AI_*)

| Code | Message | Resolution |
|------|---------|------------|
| AI_MODEL_UNAVAILABLE | AI model is unavailable | Try fallback model |
| AI_QUOTA_EXCEEDED | AI usage quota exceeded | Wait for reset or upgrade |
| AI_GUARDRAIL_BLOCKED | Response blocked by guardrail | Review and manually respond |
| AI_CONTEXT_TOO_LONG | Conversation context exceeds limit | Summarize or start new |
| AI_CONFIDENCE_LOW | AI confidence below threshold | Human review required |
| AI_TIMEOUT | AI processing timeout | Retry with simpler query |

### System Errors (SYS_*)

| Code | Message | Resolution |
|------|---------|------------|
| SYS_INTERNAL_ERROR | Internal server error | Contact support with requestId |
| SYS_DATABASE_ERROR | Database operation failed | Retry later |
| SYS_QUEUE_ERROR | Message queue error | Retry later |
| SYS_STORAGE_ERROR | Storage operation failed | Retry later |
| SYS_MAINTENANCE | System under maintenance | Try again after maintenance |

## 15.4 Error Response Examples

### Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VAL_REQUIRED_FIELD",
    "message": "Câmpul 'contactId' este obligatoriu",
    "field": "contactId",
    "requestId": "req_abc123"
  }
}
```

### Multiple Validation Errors

```json
{
  "success": false,
  "error": {
    "code": "VAL_MULTIPLE_ERRORS",
    "message": "Validation failed with multiple errors",
    "details": {
      "errors": [
        {
          "field": "email",
          "code": "VAL_EMAIL_INVALID",
          "message": "Adresa de email nu este validă"
        },
        {
          "field": "cui",
          "code": "VAL_CUI_INVALID",
          "message": "CUI-ul nu este valid"
        }
      ]
    },
    "requestId": "req_def456"
  }
}
```

### Business Logic Error

```json
{
  "success": false,
  "error": {
    "code": "BIZ_DISCOUNT_EXCEEDED",
    "message": "Discountul de 35% depășește limita maximă de 25%",
    "details": {
      "requestedDiscount": 35,
      "maxAllowed": 25,
      "approvalRequired": true,
      "approvalEndpoint": "/api/v1/hitl/approvals"
    },
    "requestId": "req_ghi789"
  }
}
```

### Integration Error

```json
{
  "success": false,
  "error": {
    "code": "INT_EFACTURA_REJECTED",
    "message": "Factura a fost respinsă de SPV ANAF",
    "details": {
      "indexIncarcare": "12345",
      "validationErrors": [
        {
          "code": "F_201",
          "message": "CUI cumpărător invalid"
        }
      ]
    },
    "requestId": "req_jkl012"
  }
}
```

---

# 16. RATE LIMITING

## 16.1 Rate Limit Headers

All API responses include rate limiting headers:

```
X-RateLimit-Limit: 1000           # Maximum requests per window
X-RateLimit-Remaining: 998        # Remaining requests in current window
X-RateLimit-Reset: 1705600800     # Unix timestamp when window resets
X-RateLimit-Window: 3600          # Window size in seconds
Retry-After: 60                   # Seconds to wait (only when limited)
```

## 16.2 Rate Limit Tiers

### By Plan

| Plan | Requests/Hour | Requests/Day | AI Requests/Day |
|------|---------------|--------------|-----------------|
| Starter | 500 | 5,000 | 500 |
| Professional | 2,000 | 20,000 | 2,000 |
| Enterprise | 10,000 | 100,000 | 10,000 |

### By Endpoint Category

| Category | Limit/Minute | Burst Limit |
|----------|--------------|-------------|
| Read (GET) | 100 | 150 |
| Write (POST/PUT) | 30 | 50 |
| Delete | 10 | 20 |
| Search | 20 | 30 |
| AI Operations | 10 | 15 |
| Bulk Operations | 5 | 10 |
| Export | 3 | 5 |

### Special Endpoints

| Endpoint | Limit | Notes |
|----------|-------|-------|
| /api/v1/auth/login | 5/minute | Per IP |
| /api/v1/ai/process | 10/minute | Per tenant |
| /api/v1/fiscal/efactura/submit | 100/day | ANAF limitation |
| /api/v1/analytics/export | 10/hour | Heavy operation |
| /api/v1/webhooks/:id/test | 10/hour | Testing limit |

## 16.3 Rate Limit Response

When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "details": {
      "limit": 100,
      "window": "1 minute",
      "retryAfter": 60
    },
    "requestId": "req_xyz789"
  }
}
```

HTTP Status: 429 Too Many Requests

## 16.4 Rate Limit Strategies

### Sliding Window

Most endpoints use sliding window rate limiting:
- Smoother distribution of requests
- No burst at window boundaries
- More accurate rate measurement

### Token Bucket (AI Endpoints)

AI endpoints use token bucket algorithm:
- Allows controlled bursts
- Tokens regenerate over time
- Better for variable workloads

### Fixed Window (Auth Endpoints)

Authentication endpoints use fixed windows:
- Simpler for security-sensitive operations
- Clear reset times
- Prevents credential stuffing

## 16.5 Best Practices

### Handling Rate Limits

```typescript
async function apiRequest(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  
  // Check rate limit headers
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
  const reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0');
  
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
    await sleep(retryAfter * 1000);
    return apiRequest(url, options); // Retry
  }
  
  // Proactive throttling when low
  if (remaining < 10) {
    console.warn(`Low rate limit: ${remaining} remaining, resets at ${new Date(reset * 1000)}`);
  }
  
  return response;
}
```

### Optimizing API Usage

1. **Batch requests** - Use bulk endpoints when available
2. **Cache responses** - Cache read operations client-side
3. **Use webhooks** - Subscribe to events instead of polling
4. **Request only needed fields** - Use sparse fieldsets
5. **Implement backoff** - Exponential backoff on errors

## 16.6 Rate Limit Monitoring

### Get Current Rate Limit Status

```typescript
// GET /api/v1/rate-limit/status
// Permissions: authenticated

interface RateLimitStatusResponse {
  tenant: {
    plan: string;
    limits: {
      requestsPerHour: number;
      requestsPerDay: number;
      aiRequestsPerDay: number;
    };
  };
  
  current: {
    hourly: {
      used: number;
      remaining: number;
      resetsAt: string;
    };
    daily: {
      used: number;
      remaining: number;
      resetsAt: string;
    };
    ai: {
      used: number;
      remaining: number;
      resetsAt: string;
    };
  };
  
  byEndpoint: {
    endpoint: string;
    used: number;
    limit: number;
    remaining: number;
  }[];
}

// Response: SuccessResponse<RateLimitStatusResponse>
```

---

# 17. APPENDIX

## 17.1 Common Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (1-indexed) |
| limit | number | Items per page (max 100) |
| sortBy | string | Field to sort by |
| sortOrder | 'asc' \| 'desc' | Sort direction |
| search | string | Full-text search query |
| fields | string | Comma-separated fields to include |
| include | string | Comma-separated relations to include |

## 17.2 Date/Time Formats

All dates use ISO 8601 format:
- Full datetime: `2026-01-18T14:30:00Z`
- Date only: `2026-01-18`
- Time only: `14:30:00`

Timezone: UTC by default, or tenant's configured timezone

## 17.3 Pagination Response Format

```typescript
interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

## 17.4 API Versioning

- Current version: v1
- Version in URL path: `/api/v1/...`
- Deprecation headers: `X-API-Deprecated: true`
- Sunset header: `Sunset: Sat, 01 Jan 2028 00:00:00 GMT`

## 17.5 SDK Support

Official SDKs available:
- TypeScript/JavaScript: `@cerniq/sdk`
- Python: `cerniq-sdk`

## 17.6 API Changelog

### v1.0.0 (2026-01-18)
- Initial release
- Full CRUD for products, negotiations, documents
- AI agent integration
- HITL approval system
- E-Factura integration
- Webhook support

---

**Document Version:** 2.0  
**Last Updated:** 18 Ianuarie 2026  
**Author:** Cerniq Development Team  
**Status:** FINAL - Production Ready
