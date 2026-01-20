# CERNIQ.APP — ETAPA 5: API ENDPOINTS
## Complete REST API Specification
### Versiunea 1.0 | 19 Ianuarie 2026

---

## Base URL: /api/v1/nurturing

---

## 1. Nurturing State API

### GET /api/v1/nurturing/clients
```typescript
// Query params
interface ClientsQuery {
  page?: number;
  pageSize?: number;
  state?: NurturingState[];
  churnRiskLevel?: string[];
  minNps?: number;
  maxNps?: number;
  isAdvocate?: boolean;
  sortBy?: 'churnRiskScore' | 'lastOrderAt' | 'npsScore' | 'totalRevenue';
  sortOrder?: 'asc' | 'desc';
}

// Response
interface ClientsResponse {
  clients: NurturingClientSummary[];
  meta: PaginationMeta;
  aggregations: {
    byState: Record<NurturingState, number>;
    byRiskLevel: Record<string, number>;
    avgNps: number;
    avgChurnScore: number;
  };
}
```

### GET /api/v1/nurturing/clients/:clientId
```typescript
interface ClientDetailResponse {
  nurturingState: NurturingState & {
    client: Client;
    churnSignals: ChurnSignal[];
    recentActions: NurturingAction[];
    npsHistory: NpsSurvey[];
    referrals: Referral[];
    relationships: EntityRelationship[];
    clusters: Cluster[];
  };
}
```

### PATCH /api/v1/nurturing/clients/:clientId/state
```typescript
interface UpdateStateRequest {
  newState: NurturingState;
  reason: string;
}
```

---

## 2. Churn API

### GET /api/v1/nurturing/churn/signals
```typescript
interface ChurnSignalsQuery {
  clientId?: string;
  signalType?: ChurnSignalType[];
  isResolved?: boolean;
  minStrength?: number;
}
```

### GET /api/v1/nurturing/churn/at-risk
```typescript
interface AtRiskResponse {
  clients: Array<{
    clientId: string;
    clientName: string;
    churnScore: number;
    riskLevel: string;
    topSignals: ChurnSignal[];
    daysSinceLastOrder: number;
    recommendedAction: string;
  }>;
  summary: {
    critical: number;
    high: number;
    medium: number;
  };
}
```

### POST /api/v1/nurturing/churn/signals/:signalId/resolve
```typescript
interface ResolveSignalRequest {
  resolutionType: 'NATURAL' | 'INTERVENTION' | 'FALSE_POSITIVE';
  notes: string;
}
```

### POST /api/v1/nurturing/churn/intervention
```typescript
interface CreateInterventionRequest {
  clientId: string;
  interventionType: 'CALL' | 'EMAIL' | 'VISIT' | 'OFFER';
  notes: string;
  scheduledAt?: string;
  assignedTo?: string;
}
```

---

## 3. Referral API

### GET /api/v1/nurturing/referrals
```typescript
interface ReferralsQuery {
  referrerId?: string;
  status?: ReferralStatus[];
  type?: ReferralType[];
  converted?: boolean;
}
```

### POST /api/v1/nurturing/referrals
```typescript
interface CreateReferralRequest {
  referrerClientId: string;
  referredContactName: string;
  referredContactPhone?: string;
  referredContactEmail?: string;
  referredCompanyName?: string;
  relationship: string;
  notes?: string;
}
```

### POST /api/v1/nurturing/referrals/:referralId/consent-request
```typescript
interface ConsentRequestRequest {
  channel: 'WHATSAPP' | 'EMAIL';
  customMessage?: string;
}
```

### POST /api/v1/nurturing/referrals/:referralId/consent-response
```typescript
interface ConsentResponseRequest {
  response: 'APPROVED' | 'REJECTED' | 'LATER';
  contactDetails?: {
    phone?: string;
    email?: string;
  };
  messageId: string;
}
```

### POST /api/v1/nurturing/referrals/:referralId/outreach
```typescript
interface OutreachRequest {
  channel: 'WHATSAPP' | 'EMAIL' | 'PHONE';
  notes?: string;
}
```

---

## 4. Clusters API

### GET /api/v1/nurturing/clusters
```typescript
interface ClustersQuery {
  type?: ClusterType[];
  county?: string;
  minPenetration?: number;
  hasKol?: boolean;
}

interface ClustersResponse {
  clusters: Cluster[];
  geoJson?: GeoJSON.FeatureCollection;  // For map display
}
```

### GET /api/v1/nurturing/clusters/:clusterId
```typescript
interface ClusterDetailResponse {
  cluster: Cluster & {
    members: ClusterMember[];
    kol: KOLProfile | null;
    territory: GeoJSON.Polygon | null;
  };
}
```

### POST /api/v1/nurturing/clusters/detect
```typescript
// Trigger community detection
interface DetectClustersRequest {
  algorithm: 'LEIDEN' | 'LOUVAIN';
  minCommunitySize?: number;
  resolution?: number;
}
```

---

## 5. Associations API

### GET /api/v1/nurturing/associations
```typescript
interface AssociationsQuery {
  type?: 'OUAI' | 'COOPERATIVE' | 'PRODUCER_GROUP'[];
  county?: string;
  search?: string;
}
```

### GET /api/v1/nurturing/associations/:associationId
```typescript
interface AssociationDetailResponse {
  association: Association & {
    members: Affiliation[];
    linkedCluster?: Cluster;
  };
}
```

### POST /api/v1/nurturing/associations/sync
```typescript
// Trigger MADR data sync
interface SyncRequest {
  source: 'OUAI_REGISTRY' | 'COOPERATIVE_REGISTRY';
  year?: number;
}
```

---

## 6. KOL API

### GET /api/v1/nurturing/kol
```typescript
interface KOLQuery {
  tier?: 'ELITE' | 'ESTABLISHED' | 'EMERGING'[];
  minScore?: number;
}
```

### GET /api/v1/nurturing/kol/:clientId
```typescript
interface KOLDetailResponse {
  profile: KOLProfile & {
    client: Client;
    referrals: Referral[];
    influencedClients: Client[];
    clusters: Cluster[];
  };
}
```

### POST /api/v1/nurturing/kol/identify
```typescript
// Trigger KOL identification
interface IdentifyKOLRequest {
  minConnections?: number;
}
```

---

## 7. Win-Back API

### GET /api/v1/nurturing/winback/campaigns
```typescript
interface WinBackQuery {
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'[];
  clientId?: string;
}
```

### POST /api/v1/nurturing/winback/campaigns
```typescript
interface CreateWinBackRequest {
  clientId: string;
  campaignType: 'DISCOUNT' | 'PERSONAL_CALL' | 'PRODUCT_UPDATE';
  offerType?: string;
  offerValue?: number;
  customMessage?: string;
}
```

### POST /api/v1/nurturing/winback/campaigns/:campaignId/execute-step
```typescript
interface ExecuteStepRequest {
  stepIndex: number;
  notes?: string;
}
```

---

## 8. Geospatial API

### GET /api/v1/nurturing/geo/proximity
```typescript
interface ProximityQuery {
  anchorClientId: string;
  radiusKm?: number;
  maxResults?: number;
}

interface ProximityResponse {
  anchor: { id: string; location: [number, number] };
  prospects: Array<{
    id: string;
    name: string;
    distance_km: number;
    proximityScore: number;
    sharedAttributes: string[];
  }>;
}
```

### GET /api/v1/nurturing/geo/territories
```typescript
interface TerritoriesResponse {
  territories: Array<{
    entityId: string;
    entityType: string;
    entityName: string;
    territory: GeoJSON.Polygon;
    centerPoint: [number, number];
    areaKm2: number;
  }>;
}
```

---

## 9. HITL API (Unified)

> **REFERINȚĂ CANONICĂ:** API-ul HITL este unificat pentru toate etapele.
>
> Endpoint-urile canonice sunt definite în [hitl-unified-system.md § 7](../hitl-unified-system.md#7-api-endpoints).
>
> Pentru Etapa 5, folosiți filtrul `pipelineStage=E5`.

### GET /api/v1/hitl/queue (Unified Endpoint)

```typescript
// Accesare task-uri E5 prin endpoint-ul unificat
interface HITLQueueQuery {
  pipelineStage?: ('E1' | 'E2' | 'E3' | 'E4' | 'E5')[];  // Filtru pentru E5
  approvalType?: string[];     // e.g., ['churn_intervention', 'nps_followup']
  priority?: ('critical' | 'high' | 'normal' | 'low')[];  // lowercase
  status?: ('pending' | 'assigned' | 'in_review')[];
  assignedTo?: string;         // UUID user.id
  slaStatus?: 'ok' | 'warning' | 'breached';
}

// Exemplu: GET /api/v1/hitl/queue?pipelineStage=E5&priority=critical,high
```

### POST /api/v1/hitl/tasks/:taskId/resolve (Unified Endpoint)

```typescript
interface ResolveApprovalTaskRequest {
  decision: 'approved' | 'rejected';    // lowercase, conform schema canonică
  decision_reason?: string;              // fostul 'notes'
  // Extensii pentru E5 pot fi incluse în metadata:
  metadata_updates?: {
    action_taken?: string;
    followup_scheduled?: boolean;
    followup_at?: string;              // ISO timestamp
  };
}

// Exemplu response
interface ResolveApprovalTaskResponse {
  task: ApprovalTask;
  executedActions: string[];
  resumedJobId?: string;               // BullMQ job resumed dacă exista
}
```

### POST /api/v1/hitl/tasks/:taskId/reassign (Unified)

```typescript
interface ReassignRequest {
  assignToUserId?: string;    // UUID
  assignToRole?: string;      // e.g., 'sales_manager'
  reason: string;
}
```

### Endpoint-uri E5-specific (Convenience Wrappers)

```typescript
// Aceste endpoint-uri sunt alias-uri pentru endpoint-urile unificate cu filtru E5 pre-setat

// GET /api/v1/nurturing/hitl/queue
// → Redirect intern la: GET /api/v1/hitl/queue?pipelineStage=E5

// POST /api/v1/nurturing/hitl/tasks/:taskId/resolve
// → Forward la: POST /api/v1/hitl/tasks/:taskId/resolve
```

---

## 10. Analytics API

### GET /api/v1/nurturing/analytics/overview
```typescript
interface OverviewResponse {
  stateDistribution: Record<NurturingState, number>;
  churnRiskDistribution: Record<string, number>;
  avgNps: number;
  avgChurnScore: number;
  referralConversionRate: number;
  clusterPenetrationAvg: number;
  trends: {
    nps30d: Array<{ date: string; value: number }>;
    churn30d: Array<{ date: string; value: number }>;
    referrals30d: Array<{ date: string; count: number; converted: number }>;
  };
}
```

---

**Document generat**: 2026-01-20  
**Versiunea**: 1.1 (HITL API aliniat la sistem unificat)  
**Status**: ACTUALIZAT ✅
