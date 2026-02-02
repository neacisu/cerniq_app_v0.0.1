# CERNIQ.APP — ETAPA 2: API ENDPOINTS
## Complete REST API Specification for Cold Outreach
### Versiunea 1.1 | 2 Februarie 2026

---

# 1. API OVERVIEW

## 1.1 Base Configuration

```typescript
// Base URL: https://api.cerniq.app/v1
// Authentication: Bearer Token (JWT)
// Content-Type: application/json
// Rate Limits: 100 req/min per tenant

const API_PREFIX = '/api/v1';

// Outreach module routes
const OUTREACH_ROUTES = {
  leads: `${API_PREFIX}/outreach/leads`,
  journey: `${API_PREFIX}/outreach/journey`,
  sequences: `${API_PREFIX}/outreach/sequences`,
  templates: `${API_PREFIX}/outreach/templates`,
  phones: `${API_PREFIX}/outreach/phones`,
  campaigns: `${API_PREFIX}/outreach/campaigns`,
  reviews: `${API_PREFIX}/outreach/reviews`,
  analytics: `${API_PREFIX}/outreach/analytics`,
  webhooks: `${API_PREFIX}/webhooks`,
};
```

---

# 2. LEADS ENDPOINTS

## 2.1 GET /outreach/leads

List leads with filtering and pagination.

```typescript
// Request
GET /api/v1/outreach/leads?state=WARM_REPLY&channel=WHATSAPP&page=1&limit=20

// Query Parameters
interface LeadsQueryParams {
  state?: 'COLD' | 'CONTACTED_WA' | 'CONTACTED_EMAIL' | 'WARM_REPLY' | 'NEGOTIATION' | 'CONVERTED' | 'DEAD' | 'PAUSED';
  channel?: 'WHATSAPP' | 'EMAIL_COLD' | 'EMAIL_WARM';
  assignedTo?: string;      // User UUID
  assignedPhone?: string;   // Phone UUID
  hasReply?: boolean;
  needsReview?: boolean;
  search?: string;          // Company name, email, phone
  minSentiment?: number;    // -100 to 100
  maxSentiment?: number;
  createdAfter?: string;    // ISO date
  createdBefore?: string;
  sortBy?: 'nextActionAt' | 'lastContactAt' | 'sentimentScore' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;            // Default: 1
  limit?: number;           // Default: 20, Max: 100
}

// Response
interface LeadsResponse {
  data: Lead[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    filters: Record<string, any>;
  };
}

interface Lead {
  id: string;
  leadId: string;
  currentState: string;
  company: {
    id: string;
    denumire: string;
    cui: string;
    judet: string;
    localitate: string;
    emailPrincipal: string;
    telefonPrincipal: string;
  };
  assignedPhone: {
    id: string;
    label: string;
    phoneNumber: string;
  } | null;
  sentimentScore: number;
  replyCount: number;
  lastContactAt: string | null;
  lastReplyAt: string | null;
  nextActionAt: string | null;
  requiresHumanReview: boolean;
  currentSequence: {
    id: string;
    name: string;
    step: number;
    totalSteps: number;
  } | null;
  createdAt: string;
}
```

## 2.2 GET /outreach/leads/:id

Get single lead with full details.

```typescript
// Response includes full conversation history
interface LeadDetailResponse {
  journey: {
    id: string;
    leadId: string;
    currentState: string;
    previousState: string | null;
    stateChangedAt: string;
    assignedPhoneId: string | null;
    sentimentScore: number;
    engagementScore: number;
    replyCount: number;
    openCount: number;
    clickCount: number;
    requiresHumanReview: boolean;
    humanReviewReason: string | null;
    isHumanControlled: boolean;
    assignedToUser: string | null;
    currentSequenceId: string | null;
    sequenceStep: number;
    nextActionAt: string | null;
    firstContactAt: string | null;
    lastContactAt: string | null;
    lastReplyAt: string | null;
    tags: string[];
    customFields: Record<string, any>;
  };
  company: GoldCompany;
  communications: Communication[];
  sequence: Sequence | null;
  assignedPhone: Phone | null;
  pendingReview: ReviewItem | null;
}
```

## 2.3 PATCH /outreach/leads/:id

Update lead journey.

```typescript
// Request
interface UpdateLeadRequest {
  currentState?: string;      // Manual state change
  assignedToUser?: string | null;
  tags?: string[];
  customFields?: Record<string, any>;
  preferredChannel?: 'WHATSAPP' | 'EMAIL';
  notes?: string;
}

// Response
{ success: true, lead: Lead }
```

## 2.4 POST /outreach/leads/:id/send-message

Send manual message to lead.

```typescript
// Request
interface SendMessageRequest {
  channel: 'WHATSAPP' | 'EMAIL_WARM';
  content: string;
  subject?: string;           // For email
  templateId?: string;        // Optional template
  scheduledAt?: string;       // ISO date for scheduled send
}

// Response
{
  success: true,
  messageId: string,
  status: 'QUEUED' | 'SENT',
  scheduledAt?: string
}
```

## 2.5 POST /outreach/leads/:id/takeover

Initiate human takeover of conversation.

```typescript
// Request
interface TakeoverRequest {
  reason: string;
}

// Response
{ success: true, message: "Takeover initiated" }
```

---

# 3. SEQUENCES ENDPOINTS

## 3.1 GET /outreach/sequences

```typescript
// Response
interface SequencesResponse {
  data: Sequence[];
  meta: PaginationMeta;
}

interface Sequence {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  primaryChannel: string;
  fallbackChannel: string | null;
  respectBusinessHours: boolean;
  stopOnReply: boolean;
  steps: SequenceStep[];
  stats: {
    totalEnrolled: number;
    completed: number;
    conversions: number;
    avgResponseRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface SequenceStep {
  id: string;
  stepNumber: number;
  delayHours: number;
  delayMinutes: number;
  channel: string;
  templateId: string;
  template: Template;
  skipIfReplied: boolean;
  skipIfOpened: boolean;
}
```

## 3.2 POST /outreach/sequences

```typescript
// Request
interface CreateSequenceRequest {
  name: string;
  description?: string;
  primaryChannel: 'WHATSAPP' | 'EMAIL';
  fallbackChannel?: string;
  respectBusinessHours?: boolean;
  stopOnReply?: boolean;
  steps: Array<{
    delayHours: number;
    delayMinutes?: number;
    channel: string;
    templateId: string;
    skipIfReplied?: boolean;
    skipIfOpened?: boolean;
  }>;
}
```

## 3.3 POST /outreach/sequences/:id/enroll

Enroll leads in sequence.

```typescript
// Request
interface EnrollRequest {
  leadIds: string[];           // Array of lead IDs
  startStep?: number;          // Default: 1
  scheduledStart?: string;     // ISO date
}

// Response
{
  success: true,
  enrolled: number,
  skipped: number,             // Already enrolled or ineligible
  errors: Array<{ leadId: string; reason: string }>
}
```

---

# 4. TEMPLATES ENDPOINTS

## 4.1 GET /outreach/templates

```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  channel: 'WHATSAPP' | 'EMAIL';
  subject: string | null;      // For email
  content: string;             // Supports spintax
  variables: Array<{
    name: string;
    required: boolean;
    defaultValue?: string;
  }>;
  hasMedia: boolean;
  mediaType: string | null;
  mediaUrl: string | null;
  isActive: boolean;
  isApproved: boolean;
  stats: {
    timesUsed: number;
    avgOpenRate: number;
    avgReplyRate: number;
  };
  versions: TemplateVersion[];
}
```

## 4.2 POST /outreach/templates

```typescript
// Request
interface CreateTemplateRequest {
  name: string;
  description?: string;
  channel: 'WHATSAPP' | 'EMAIL';
  subject?: string;
  content: string;
  variables?: Array<{
    name: string;
    required: boolean;
    defaultValue?: string;
  }>;
  hasMedia?: boolean;
  mediaType?: 'image' | 'document' | 'video';
  mediaUrl?: string;
}
```

## 4.3 POST /outreach/templates/:id/preview

Preview template with sample data.

```typescript
// Request
interface PreviewRequest {
  personalization: {
    companyName: string;
    contactName?: string;
    [key: string]: string | undefined;
  };
}

// Response
{
  preview: string,              // Rendered content
  spintaxVariant: string,       // Which variant was selected
  variablesUsed: string[],
  missingVariables: string[]
}
```

---

# 5. PHONES ENDPOINTS

## 5.1 GET /outreach/phones

```typescript
interface Phone {
  id: string;
  phoneNumber: string;
  label: string;
  timelinesaiAccountId: string;
  status: 'ACTIVE' | 'PAUSED' | 'OFFLINE' | 'BANNED' | 'QUARANTINE';
  statusChangedAt: string;
  statusReason: string | null;
  isOnline: boolean;
  lastHealthCheckAt: string;
  quota: {
    used: number;
    limit: number;
    remaining: number;
    resetAt: string;
  };
  stats: {
    totalMessagesSent: number;
    totalLeadsAssigned: number;
    replyRate: number;
  };
  isEnabled: boolean;
  priority: number;
}
```

## 5.2 PATCH /outreach/phones/:id

```typescript
// Request
interface UpdatePhoneRequest {
  label?: string;
  isEnabled?: boolean;
  priority?: number;           // For load balancing
  status?: 'ACTIVE' | 'PAUSED'; // Manual status change
}
```

## 5.3 POST /outreach/phones/:id/health-check

Trigger manual health check.

```typescript
// Response
{
  isOnline: boolean,
  lastMessage: string | null,
  batteryLevel?: number,
  connectionQuality: 'GOOD' | 'FAIR' | 'POOR'
}
```

---

# 6. ANALYTICS ENDPOINTS

## 6.1 GET /outreach/analytics/overview

```typescript
// Query: period=7d|30d|90d|custom&from=&to=

interface AnalyticsOverview {
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalLeadsContacted: number;
    totalMessages: number;
    totalReplies: number;
    replyRate: number;
    conversions: number;
    conversionRate: number;
  };
  byChannel: {
    whatsapp: {
      sent: number;
      delivered: number;
      read: number;
      replied: number;
      quotaUsed: number;
    };
    emailCold: {
      sent: number;
      opened: number;
      clicked: number;
      replied: number;
      bounced: number;
      bounceRate: number;
    };
    emailWarm: {
      sent: number;
      opened: number;
      clicked: number;
      replied: number;
    };
  };
  funnel: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
    avgScore: number;
  };
  topPerformingSequences: Array<{
    id: string;
    name: string;
    enrollments: number;
    responseRate: number;
    conversions: number;
  }>;
}
```

## 6.2 GET /outreach/analytics/daily

```typescript
// Returns time series data
interface DailyAnalytics {
  dates: string[];
  metrics: {
    contacted: number[];
    replied: number[];
    converted: number[];
    reviewsResolved: number[];
  };
}
```

## 6.3 GET /outreach/analytics/phones

```typescript
// Phone performance comparison
interface PhoneAnalytics {
  phones: Array<{
    id: string;
    label: string;
    quotaUsed: number;
    messagesSent: number;
    repliesReceived: number;
    replyRate: number;
    avgResponseTime: number;
    status: string;
  }>;
}
```

---

# 7. WEBHOOKS ENDPOINTS

## 7.1 POST /webhooks/timelinesai

```typescript
// TimelinesAI webhook handler
// Signature verification via X-TimelinesAI-Signature header

// Handled events:
// - message.received
// - message.sent
// - message.delivered
// - message.read
// - chat.created
// - account.disconnected
```

## 7.2 POST /webhooks/instantly

```typescript
// Instantly.ai webhook handler

// Handled events:
// - email_sent
// - email_opened
// - email_link_clicked
// - reply_received
// - email_bounced
// - lead_unsubscribed
```

## 7.3 POST /webhooks/resend

```typescript
// Resend webhook handler

// Handled events:
// - email.sent
// - email.delivered
// - email.bounced
// - email.opened
// - email.clicked
// - email.complained
```

---

# 8. ERROR RESPONSES

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  requestId: string;
  timestamp: string;
}

// Common error codes:
// - VALIDATION_ERROR (400)
// - UNAUTHORIZED (401)
// - FORBIDDEN (403)
// - NOT_FOUND (404)
// - CONFLICT (409) - e.g., lead already enrolled
// - RATE_LIMITED (429)
// - INTERNAL_ERROR (500)
// - SERVICE_UNAVAILABLE (503)
```

---

# 9. FASTIFY ROUTE IMPLEMENTATION

```typescript
// apps/api/src/features/outreach/index.ts

import { FastifyInstance } from 'fastify';
import { leadsRoutes } from './leads.routes';
import { sequencesRoutes } from './sequences.routes';
import { templatesRoutes } from './templates.routes';
import { phonesRoutes } from './phones.routes';
import { analyticsRoutes } from './analytics.routes';
import { reviewsRoutes } from './reviews.routes';

export async function outreachModule(fastify: FastifyInstance) {
  // Register all outreach routes
  await fastify.register(leadsRoutes, { prefix: '/leads' });
  await fastify.register(sequencesRoutes, { prefix: '/sequences' });
  await fastify.register(templatesRoutes, { prefix: '/templates' });
  await fastify.register(phonesRoutes, { prefix: '/phones' });
  await fastify.register(analyticsRoutes, { prefix: '/analytics' });
  await fastify.register(reviewsRoutes, { prefix: '/reviews' });
}

// Register in main app
fastify.register(outreachModule, { prefix: '/api/v1/outreach' });
```

---

**Document generat:** 15 Ianuarie 2026
**Total Endpoints:** 35+
**Conformitate:** Master Spec v1.2
