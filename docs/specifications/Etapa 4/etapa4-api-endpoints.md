# CERNIQ.APP — ETAPA 4: API ENDPOINTS
## Complete REST API Specification
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [API Overview](#1-overview)
2. [Orders API](#2-orders)
3. [Payments API](#3-payments)
4. [Credit API](#4-credit)
5. [Shipments API](#5-shipments)
6. [Contracts API](#6-contracts)
7. [Returns API](#7-returns)
8. [HITL API](#8-hitl)
9. [Webhooks API](#9-webhooks)

---

## 1. API Overview {#1-overview}

```
Base URL: /api/v1/monitoring
Authentication: Bearer JWT Token
Content-Type: application/json
Rate Limit: 1000 req/min per tenant
```

### Common Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

---

## 2. Orders API {#2-orders}

### GET /api/v1/monitoring/orders
```typescript
// Query Parameters
interface OrdersQueryParams {
  page?: number;           // Default: 1
  pageSize?: number;       // Default: 25, Max: 100
  status?: string[];       // Filter by status
  clientId?: string;       // Filter by client
  dateFrom?: string;       // ISO date
  dateTo?: string;         // ISO date
  search?: string;         // Search order number, client name
  sortBy?: 'createdAt' | 'totalAmount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Response
interface OrdersResponse {
  orders: Order[];
  meta: PaginationMeta;
}
```

### GET /api/v1/monitoring/orders/:orderId
```typescript
// Response
interface OrderDetailResponse {
  order: Order & {
    items: OrderItem[];
    client: Client;
    payments: Payment[];
    shipment?: Shipment;
    contract?: Contract;
    timeline: TimelineEvent[];
  };
}
```

### PATCH /api/v1/monitoring/orders/:orderId/status
```typescript
// Request Body
interface UpdateOrderStatusRequest {
  status: OrderStatus;
  reason?: string;
}

// Response
interface UpdateOrderStatusResponse {
  order: Order;
  triggeredActions: string[];
}
```

### POST /api/v1/monitoring/orders/:orderId/cancel
```typescript
// Request Body
interface CancelOrderRequest {
  reason: string;
  refundAmount?: number;
}

// Response
interface CancelOrderResponse {
  order: Order;
  refundId?: string;
  creditReleased: number;
}
```

---

## 3. Payments API {#3-payments}

### GET /api/v1/monitoring/payments
```typescript
interface PaymentsQueryParams {
  page?: number;
  pageSize?: number;
  status?: PaymentStatus[];
  reconciliationStatus?: ReconciliationStatus[];
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

interface PaymentsResponse {
  payments: Payment[];
  summary: {
    totalAmount: number;
    pendingReconciliation: number;
    reconciled: number;
  };
  meta: PaginationMeta;
}
```

### POST /api/v1/monitoring/payments/:paymentId/reconcile
```typescript
// Request Body
interface ReconcilePaymentRequest {
  invoiceId: string;
  notes?: string;
}

// Response
interface ReconcilePaymentResponse {
  payment: Payment;
  invoice: Invoice;
  orderUpdated: boolean;
}
```

### GET /api/v1/monitoring/payments/overdue
```typescript
interface OverduePaymentsResponse {
  invoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    orderId: string;
    clientId: string;
    clientName: string;
    amountDue: number;
    dueDate: string;
    daysOverdue: number;
    lastReminderAt?: string;
    reminderCount: number;
  }>;
  summary: {
    totalOverdue: number;
    clientsAffected: number;
    avgDaysOverdue: number;
  };
}
```

### POST /api/v1/monitoring/payments/:invoiceId/send-reminder
```typescript
interface SendReminderRequest {
  channels: ('email' | 'whatsapp' | 'sms')[];
  escalationLevel?: 'FIRST' | 'SECOND' | 'FINAL';
}

interface SendReminderResponse {
  sent: boolean;
  channels: string[];
  nextReminderAt?: string;
}
```

---

## 4. Credit API {#4-credit}

### GET /api/v1/monitoring/credit/profiles
```typescript
interface CreditProfilesQueryParams {
  riskTier?: RiskTier[];
  minScore?: number;
  maxScore?: number;
  hasAvailableCredit?: boolean;
  isBlocked?: boolean;
}

interface CreditProfilesResponse {
  profiles: CreditProfile[];
  distribution: {
    BLOCKED: number;
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    PREMIUM: number;
  };
}
```

### GET /api/v1/monitoring/credit/profiles/:clientId
```typescript
interface CreditProfileDetailResponse {
  profile: CreditProfile;
  scoreHistory: ScoreHistoryEntry[];
  reservations: CreditReservation[];
  overrides: CreditOverride[];
  paymentHistory: {
    totalOrders: number;
    avgPaymentDays: number;
    onTimeRate: number;
    latePaymentsCount: number;
  };
}
```

### POST /api/v1/monitoring/credit/profiles/:clientId/refresh
```typescript
// Trigger credit score recalculation
interface RefreshCreditResponse {
  jobId: string;
  estimatedCompletion: string;
}
```

### POST /api/v1/monitoring/credit/check
```typescript
// Request - Pre-check credit before order
interface CreditCheckRequest {
  clientId: string;
  amount: number;
  currency: string;
}

interface CreditCheckResponse {
  result: 'APPROVED' | 'INSUFFICIENT_CREDIT' | 'BLOCKED' | 'NEEDS_REVIEW';
  availableCredit: number;
  creditLimit: number;
  overage?: number;
}
```

### POST /api/v1/monitoring/credit/override
```typescript
// Request manual credit override
interface CreditOverrideRequest {
  clientId: string;
  orderId: string;
  overrideType: 'ONE_TIME' | 'TEMPORARY' | 'PERMANENT';
  amount: number;
  reason: string;
}

interface CreditOverrideResponse {
  hitlTaskId: string;
  status: 'PENDING_APPROVAL';
}
```

---

## 5. Shipments API {#5-shipments}

### GET /api/v1/monitoring/shipments
```typescript
interface ShipmentsQueryParams {
  status?: ShipmentStatus[];
  carrier?: string;
  dateFrom?: string;
  dateTo?: string;
  hasCod?: boolean;
  codCollected?: boolean;
}

interface ShipmentsResponse {
  shipments: Shipment[];
  summary: {
    inTransit: number;
    delivered: number;
    pendingCod: number;
    totalCodPending: number;
  };
}
```

### GET /api/v1/monitoring/shipments/:shipmentId/tracking
```typescript
interface TrackingResponse {
  shipment: Shipment;
  events: TrackingEvent[];
  estimatedDelivery?: string;
  currentLocation?: {
    city: string;
    county: string;
  };
}
```

### POST /api/v1/monitoring/shipments/:shipmentId/refresh
```typescript
// Force refresh tracking from carrier
interface RefreshTrackingResponse {
  updated: boolean;
  newStatus?: ShipmentStatus;
  lastEvent?: TrackingEvent;
}
```

---

## 6. Contracts API {#6-contracts}

### GET /api/v1/monitoring/contracts
```typescript
interface ContractsQueryParams {
  status?: ContractStatus[];
  clientId?: string;
  expiringWithinDays?: number;
}

interface ContractsResponse {
  contracts: Contract[];
  pendingSignatures: number;
  expiringThisWeek: number;
}
```

### POST /api/v1/monitoring/contracts/:contractId/resend
```typescript
// Resend signature request
interface ResendContractResponse {
  sent: boolean;
  sentTo: string[];
  newExpiryDate: string;
}
```

### GET /api/v1/monitoring/contracts/templates
```typescript
interface TemplatesResponse {
  templates: ContractTemplate[];
}
```

---

## 7. Returns API {#7-returns}

### GET /api/v1/monitoring/returns
```typescript
interface ReturnsQueryParams {
  status?: ReturnStatus[];
  clientId?: string;
  orderId?: string;
}

interface ReturnsResponse {
  returns: Return[];
  summary: {
    pending: number;
    awaitingInspection: number;
    refundsPending: number;
  };
}
```

### POST /api/v1/monitoring/returns
```typescript
// Create return request
interface CreateReturnRequest {
  orderId: string;
  items: Array<{
    orderItemId: string;
    quantity: number;
    reason: ReturnReason;
  }>;
  customerNotes?: string;
}

interface CreateReturnResponse {
  return: Return;
  requiresApproval: boolean;
  hitlTaskId?: string;
}
```

### PATCH /api/v1/monitoring/returns/:returnId/inspect
```typescript
// Record inspection result
interface InspectReturnRequest {
  result: 'APPROVED' | 'PARTIAL' | 'REJECTED';
  notes: string;
  photos?: string[];
  approvedItems?: Array<{
    orderItemId: string;
    quantity: number;
    condition: string;
  }>;
}

interface InspectReturnResponse {
  return: Return;
  refundAmount: number;
  refundId?: string;
}
```

---

## 8. HITL API {#8-hitl}

### GET /api/v1/monitoring/hitl/queue
```typescript
interface HITLQueueParams {
  taskType?: string[];
  priority?: ('LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL')[];
  assignedRole?: string;
  slaStatus?: 'OK' | 'WARNING' | 'BREACHED';
}

interface HITLQueueResponse {
  tasks: HITLTask[];
  summary: {
    total: number;
    critical: number;
    slaBreached: number;
    avgResolutionTime: number;
  };
}
```

### GET /api/v1/monitoring/hitl/tasks/:taskId
```typescript
interface HITLTaskDetailResponse {
  task: HITLTask;
  entity: Order | Payment | Return | CreditProfile;
  history: Array<{
    action: string;
    userId: string;
    userName: string;
    timestamp: string;
    notes?: string;
  }>;
}
```

### POST /api/v1/monitoring/hitl/tasks/:taskId/resolve
```typescript
interface ResolveHITLRequest {
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
  selectedOption?: string; // For payment reconciliation - selected invoice
}

interface ResolveHITLResponse {
  task: HITLTask;
  executedActions: string[];
}
```

### POST /api/v1/monitoring/hitl/tasks/:taskId/reassign
```typescript
interface ReassignHITLRequest {
  assignToUserId?: string;
  assignToRole?: string;
  reason: string;
}
```

---

## 9. Webhooks API {#9-webhooks}

### POST /webhooks/revolut/business
```typescript
// Revolut Business Webhook
// Headers: X-Revolut-Signature-V1
// Body: RevolutWebhookPayload
```

### POST /webhooks/sameday/status
```typescript
// Sameday Status Update Webhook
interface SamedayWebhook {
  awbNumber: string;
  status: string;
  statusCode: string;
  timestamp: string;
  location?: string;
}
```

### POST /webhooks/docusign/connect
```typescript
// DocuSign Connect Webhook
interface DocuSignWebhook {
  event: string;
  data: {
    envelopeSummary: {
      envelopeId: string;
      status: string;
      recipientStatuses: Array<{
        recipientId: string;
        status: string;
        signedAt?: string;
      }>;
    };
  };
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
