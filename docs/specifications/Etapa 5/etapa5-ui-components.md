# CERNIQ.APP — ETAPA 5: UI COMPONENTS
## Reusable Components & Forms
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Status Components

### NurturingStateBadge
```typescript
interface NurturingStateBadgeProps {
  state: NurturingState;
  size?: 'sm' | 'md' | 'lg';
}

const STATE_CONFIG = {
  ONBOARDING: { color: 'blue', icon: UserPlus, label: 'Onboarding' },
  NURTURING_ACTIVE: { color: 'green', icon: Heart, label: 'Active' },
  AT_RISK: { color: 'orange', icon: AlertTriangle, label: 'At Risk' },
  LOYAL_CLIENT: { color: 'purple', icon: Star, label: 'Loyal' },
  ADVOCATE: { color: 'gold', icon: Crown, label: 'Advocate' },
  CHURNED: { color: 'red', icon: UserX, label: 'Churned' },
  REACTIVATED: { color: 'teal', icon: RefreshCw, label: 'Reactivated' }
};
```

### ChurnRiskIndicator
```typescript
interface ChurnRiskIndicatorProps {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  showLabel?: boolean;
}

// Visual: Progress bar with color gradient
// LOW (0-25): Green
// MEDIUM (25-50): Yellow
// HIGH (50-75): Orange
// CRITICAL (75-100): Red
```

### ReferralStatusBadge
```typescript
const REFERRAL_STATUS_CONFIG = {
  PENDING_CONSENT: { color: 'gray', label: 'Pending Consent' },
  AWAITING_CONSENT: { color: 'yellow', label: 'Awaiting' },
  ACTIVE: { color: 'blue', label: 'Active' },
  CONTACTED: { color: 'purple', label: 'Contacted' },
  CONVERTED: { color: 'green', label: 'Converted' },
  REJECTED: { color: 'red', label: 'Rejected' },
  EXPIRED: { color: 'gray', label: 'Expired' }
};
```

### KOLTierBadge
```typescript
const KOL_TIER_CONFIG = {
  ELITE: { color: 'gold', stars: 3, label: 'Elite KOL' },
  ESTABLISHED: { color: 'silver', stars: 2, label: 'Established' },
  EMERGING: { color: 'bronze', stars: 1, label: 'Emerging' }
};
```

---

## 2. Cards

### ClientNurturingCard
```typescript
interface ClientNurturingCardProps {
  client: {
    id: string;
    companyName: string;
    contactName: string;
    state: NurturingState;
    churnRiskScore: number;
    npsScore: number;
    totalRevenue: number;
    lastOrderAt: Date;
  };
  onViewDetail: () => void;
  onQuickAction?: (action: string) => void;
}

// Layout:
// ┌─────────────────────────────────┐
// │ [State Badge]  Agro Farm SRL    │
// │ Contact: Ion Popescu            │
// ├─────────────────────────────────┤
// │ Churn Risk: ████░░░░ 35%       │
// │ NPS: 8   Revenue: €12,450      │
// │ Last Order: 15 days ago        │
// ├─────────────────────────────────┤
// │ [View] [Call] [Email] [...]    │
// └─────────────────────────────────┘
```

### ChurnSignalCard
```typescript
interface ChurnSignalCardProps {
  signal: {
    type: ChurnSignalType;
    strength: number;
    detectedAt: Date;
    evidenceText?: string;
    isResolved: boolean;
  };
  onResolve?: () => void;
}
```

### ReferralCard
```typescript
interface ReferralCardProps {
  referral: {
    id: string;
    referrerName: string;
    referredName: string;
    type: ReferralType;
    status: ReferralStatus;
    consentGiven: boolean;
    distanceKm?: number;
    convertedValue?: number;
  };
  onAction: (action: 'contact' | 'approve' | 'reject') => void;
}
```

### ClusterCard
```typescript
interface ClusterCardProps {
  cluster: {
    id: string;
    name: string;
    type: ClusterType;
    memberCount: number;
    penetrationRate: number;
    kolName?: string;
    totalRevenue: number;
    territoryAreaKm2?: number;
  };
  onViewOnMap: () => void;
  onViewMembers: () => void;
}
```

---

## 3. Charts

### StateDistributionChart
```typescript
interface StateDistributionChartProps {
  data: Array<{
    state: NurturingState;
    count: number;
    percentage: number;
  }>;
  onStateClick?: (state: NurturingState) => void;
}

// Donut chart with legend
```

### ChurnTrendChart
```typescript
interface ChurnTrendChartProps {
  data: Array<{
    date: string;
    avgChurnScore: number;
    atRiskCount: number;
    churnedCount: number;
  }>;
  period: '7d' | '30d' | '90d';
}

// Line chart: avg score over time
// Area chart: at risk count
```

### ReferralFunnelChart
```typescript
interface ReferralFunnelChartProps {
  data: {
    detected: number;
    consentAsked: number;
    consentGiven: number;
    contacted: number;
    converted: number;
  };
}
```

### ClusterMapChart
```typescript
interface ClusterMapChartProps {
  clusters: Array<{
    id: string;
    name: string;
    centerPoint: [number, number];
    territory?: GeoJSON.Polygon;
    memberLocations: Array<[number, number]>;
    penetrationRate: number;
  }>;
  onClusterClick: (clusterId: string) => void;
}

// Leaflet/MapLibre map with PostGIS territories
```

---

## 4. Forms & Dialogs

### CreateReferralDialog
```typescript
interface CreateReferralDialogProps {
  referrerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateReferralData) => void;
}

interface CreateReferralData {
  referredName: string;
  referredPhone?: string;
  referredEmail?: string;
  referredCompany?: string;
  relationship: string;
  notes?: string;
}

// Form fields:
// - Referred Contact Name (required)
// - Phone Number
// - Email Address
// - Company Name
// - Relationship to Referrer
// - Additional Notes
// - [x] I confirm consent to share contact
```

### ChurnInterventionDialog
```typescript
interface ChurnInterventionDialogProps {
  clientId: string;
  churnSignals: ChurnSignal[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (intervention: InterventionData) => void;
}

interface InterventionData {
  interventionType: 'CALL' | 'EMAIL' | 'VISIT' | 'OFFER';
  notes: string;
  scheduledAt?: Date;
  assignedTo?: string;
  offerType?: string;
  offerValue?: number;
}
```

### ReferralConsentRequestDialog
```typescript
interface ReferralConsentRequestDialogProps {
  referral: Referral;
  isOpen: boolean;
  onClose: () => void;
  onSendRequest: (channel: 'WHATSAPP' | 'EMAIL') => void;
}

// Shows:
// - Referrer name
// - Referred person name
// - Context message
// - Channel selection
// - Preview of consent request message
```

### WinBackCampaignDialog
```typescript
interface WinBackCampaignDialogProps {
  clientId: string;
  clientData: ClientSummary;
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: WinBackConfig) => void;
}

interface WinBackConfig {
  campaignType: 'DISCOUNT' | 'PERSONAL_CALL' | 'PRODUCT_UPDATE';
  offerType?: string;
  offerValue?: number;
  customMessage?: string;
}
```

### HITLResolutionDialog
```typescript
interface HITLResolutionDialogProps {
  task: HITLTask;
  context: any;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: HITLResolution) => void;
}

interface HITLResolution {
  decision: 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'DEFERRED';
  notes: string;
  actionTaken?: string;
  scheduledFollowup?: Date;
}
```

---

## 5. Tables

### NurturingClientsTable
```typescript
const columns = [
  { key: 'companyName', header: 'Client', sortable: true },
  { key: 'state', header: 'State', render: NurturingStateBadge },
  { key: 'churnRiskScore', header: 'Churn Risk', render: ChurnRiskIndicator },
  { key: 'npsScore', header: 'NPS', sortable: true },
  { key: 'totalOrders', header: 'Orders', sortable: true },
  { key: 'lastOrderAt', header: 'Last Order', render: RelativeDate },
  { key: 'actions', header: '', render: ActionsDropdown }
];
```

### ReferralsTable
```typescript
const columns = [
  { key: 'referrerName', header: 'Referrer' },
  { key: 'referredName', header: 'Referred' },
  { key: 'type', header: 'Type', render: ReferralTypeBadge },
  { key: 'status', header: 'Status', render: ReferralStatusBadge },
  { key: 'distanceKm', header: 'Distance', render: DistanceFormat },
  { key: 'convertedValue', header: 'Value', render: CurrencyFormat },
  { key: 'actions', header: '', render: ActionsDropdown }
];
```

### ClustersTable
```typescript
const columns = [
  { key: 'name', header: 'Cluster Name', sortable: true },
  { key: 'type', header: 'Type', render: ClusterTypeBadge },
  { key: 'memberCount', header: 'Members', sortable: true },
  { key: 'penetrationRate', header: 'Penetration', render: PercentBar },
  { key: 'kolName', header: 'KOL' },
  { key: 'totalRevenue', header: 'Revenue', render: CurrencyFormat },
  { key: 'actions', header: '', render: ActionsDropdown }
];
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
