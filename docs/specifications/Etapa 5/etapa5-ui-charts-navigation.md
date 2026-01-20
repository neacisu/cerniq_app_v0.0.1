# CERNIQ.APP — ETAPA 5: UI CHARTS & NAVIGATION
## Charts, Navigation, și Layout Specifications
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Navigation Structure

```
/nurturing                          # Dashboard principal
├── /nurturing/clients             # Lista clienți
│   └── /nurturing/clients/:id     # Client detail
├── /nurturing/churn               # Churn risk dashboard
│   └── /nurturing/churn/:id       # Churn detail
├── /nurturing/referrals           # Referral management
│   └── /nurturing/referrals/:id   # Referral detail
├── /nurturing/clusters            # Clusters & Associations
│   └── /nurturing/clusters/:id    # Cluster detail
├── /nurturing/kol                 # KOL management
│   └── /nurturing/kol/:id         # KOL profile
├── /nurturing/winback             # Win-back campaigns
│   └── /nurturing/winback/:id     # Campaign detail
├── /nurturing/hitl                # HITL queue
│   └── /nurturing/hitl/:id        # Task detail
└── /nurturing/analytics           # Analytics & Reports
```

### Sidebar Menu Configuration

```typescript
// navigation/nurturing-menu.ts
export const nurturingMenuItems: MenuItem[] = [
  {
    key: 'nurturing-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/nurturing',
    badge: null
  },
  {
    key: 'nurturing-clients',
    label: 'Clienți',
    icon: Users,
    path: '/nurturing/clients',
    badge: null
  },
  {
    key: 'nurturing-churn',
    label: 'Risc Churn',
    icon: AlertTriangle,
    path: '/nurturing/churn',
    badge: { type: 'warning', count: 'atRiskCount' }
  },
  {
    key: 'nurturing-referrals',
    label: 'Referral',
    icon: UserPlus,
    path: '/nurturing/referrals',
    badge: { type: 'info', count: 'pendingReferrals' }
  },
  {
    key: 'nurturing-clusters',
    label: 'Clustere',
    icon: Network,
    path: '/nurturing/clusters',
    badge: null
  },
  {
    key: 'nurturing-kol',
    label: 'KOL',
    icon: Crown,
    path: '/nurturing/kol',
    badge: null
  },
  {
    key: 'nurturing-winback',
    label: 'Win-Back',
    icon: Undo,
    path: '/nurturing/winback',
    badge: { type: 'info', count: 'activeCampaigns' }
  },
  {
    key: 'nurturing-hitl',
    label: 'HITL Queue',
    icon: ClipboardList,
    path: '/nurturing/hitl',
    badge: { type: 'error', count: 'criticalTasks' }
  },
  {
    key: 'nurturing-analytics',
    label: 'Analiză',
    icon: BarChart2,
    path: '/nurturing/analytics',
    badge: null
  }
];
```

---

## 2. Chart Components

### 2.1 StateDistributionChart (Donut)

```typescript
// components/charts/StateDistributionChart.tsx
interface StateDistributionChartProps {
  data: Array<{
    state: NurturingState;
    count: number;
    percentage: number;
  }>;
  onStateClick?: (state: NurturingState) => void;
}

const STATE_COLORS = {
  ONBOARDING: '#3B82F6',      // Blue
  NURTURING_ACTIVE: '#10B981', // Green
  AT_RISK: '#F59E0B',          // Amber
  LOYAL_CLIENT: '#8B5CF6',     // Purple
  ADVOCATE: '#F59E0B',         // Gold
  CHURNED: '#EF4444',          // Red
  REACTIVATED: '#14B8A6'       // Teal
};

export const StateDistributionChart: React.FC<StateDistributionChartProps> = ({
  data,
  onStateClick
}) => {
  const chartData = data.map(d => ({
    name: STATE_LABELS[d.state],
    value: d.count,
    percentage: d.percentage,
    fill: STATE_COLORS[d.state]
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="value"
          onClick={(_, index) => onStateClick?.(data[index].state)}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name, props) => [
            `${value} (${props.payload.percentage.toFixed(1)}%)`,
            name
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
```

### 2.2 ChurnTrendChart (Line)

```typescript
// components/charts/ChurnTrendChart.tsx
interface ChurnTrendChartProps {
  data: Array<{
    date: string;
    avgChurnScore: number;
    atRiskCount: number;
    churnedCount: number;
  }>;
  period: '7d' | '30d' | '90d';
}

export const ChurnTrendChart: React.FC<ChurnTrendChartProps> = ({
  data,
  period
}) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(date) => formatDate(date, period)} 
        />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        
        <Tooltip />
        <Legend />
        
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="avgChurnScore"
          stroke="#EF4444"
          name="Avg Churn Score"
          strokeWidth={2}
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="atRiskCount"
          fill="#F59E0B"
          fillOpacity={0.3}
          stroke="#F59E0B"
          name="At Risk"
        />
        <Bar
          yAxisId="right"
          dataKey="churnedCount"
          fill="#DC2626"
          name="Churned"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
```

### 2.3 ReferralFunnelChart

```typescript
// components/charts/ReferralFunnelChart.tsx
interface ReferralFunnelChartProps {
  data: {
    detected: number;
    consentAsked: number;
    consentGiven: number;
    contacted: number;
    converted: number;
  };
}

export const ReferralFunnelChart: React.FC<ReferralFunnelChartProps> = ({
  data
}) => {
  const funnelData = [
    { name: 'Detectate', value: data.detected, fill: '#3B82F6' },
    { name: 'Consent Cerut', value: data.consentAsked, fill: '#6366F1' },
    { name: 'Consent Dat', value: data.consentGiven, fill: '#8B5CF6' },
    { name: 'Contactate', value: data.contacted, fill: '#A855F7' },
    { name: 'Convertite', value: data.converted, fill: '#10B981' }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <FunnelChart>
        <Funnel
          dataKey="value"
          data={funnelData}
          isAnimationActive
        >
          <LabelList position="right" fill="#000" dataKey="name" />
        </Funnel>
        <Tooltip />
      </FunnelChart>
    </ResponsiveContainer>
  );
};
```

### 2.4 ClusterMapChart (Leaflet/MapLibre)

```typescript
// components/charts/ClusterMapChart.tsx
interface ClusterMapChartProps {
  clusters: Array<{
    id: string;
    name: string;
    type: ClusterType;
    centerPoint: [number, number];  // [lat, lng]
    territory?: GeoJSON.Polygon;
    memberLocations: Array<[number, number]>;
    penetrationRate: number;
    memberCount: number;
  }>;
  onClusterClick: (clusterId: string) => void;
  selectedClusterId?: string;
}

const CLUSTER_COLORS = {
  OUAI: '#3B82F6',
  COOPERATIVE: '#10B981',
  GEOGRAPHIC: '#F59E0B',
  IMPLICIT_COOPERATIVE: '#8B5CF6',
  BEHAVIORAL: '#EC4899'
};

export const ClusterMapChart: React.FC<ClusterMapChartProps> = ({
  clusters,
  onClusterClick,
  selectedClusterId
}) => {
  return (
    <MapContainer
      center={[44.4268, 26.1025]}  // Romania center
      zoom={7}
      style={{ height: '400px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      
      {clusters.map((cluster) => (
        <React.Fragment key={cluster.id}>
          {/* Territory polygon */}
          {cluster.territory && (
            <GeoJSON
              data={cluster.territory}
              style={{
                fillColor: CLUSTER_COLORS[cluster.type],
                fillOpacity: 0.2,
                color: CLUSTER_COLORS[cluster.type],
                weight: selectedClusterId === cluster.id ? 3 : 1
              }}
              eventHandlers={{
                click: () => onClusterClick(cluster.id)
              }}
            />
          )}
          
          {/* Center marker */}
          <Marker
            position={cluster.centerPoint}
            eventHandlers={{
              click: () => onClusterClick(cluster.id)
            }}
          >
            <Popup>
              <strong>{cluster.name}</strong>
              <br />
              Type: {cluster.type}
              <br />
              Members: {cluster.memberCount}
              <br />
              Penetration: {(cluster.penetrationRate * 100).toFixed(1)}%
            </Popup>
          </Marker>
          
          {/* Member markers (small) */}
          {cluster.memberLocations.map((loc, idx) => (
            <CircleMarker
              key={idx}
              center={loc}
              radius={4}
              fillColor={CLUSTER_COLORS[cluster.type]}
              fillOpacity={0.6}
              stroke={false}
            />
          ))}
        </React.Fragment>
      ))}
    </MapContainer>
  );
};
```

### 2.5 NPSTrendChart

```typescript
// components/charts/NPSTrendChart.tsx
interface NPSTrendChartProps {
  data: Array<{
    date: string;
    npsScore: number;
    promoters: number;
    passives: number;
    detractors: number;
    responseCount: number;
  }>;
}

export const NPSTrendChart: React.FC<NPSTrendChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis yAxisId="left" domain={[-100, 100]} />
        <YAxis yAxisId="right" orientation="right" />
        
        <Tooltip />
        <Legend />
        
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="npsScore"
          stroke="#10B981"
          strokeWidth={3}
          name="NPS Score"
        />
        
        <Bar yAxisId="right" dataKey="promoters" stackId="a" fill="#10B981" name="Promoters" />
        <Bar yAxisId="right" dataKey="passives" stackId="a" fill="#F59E0B" name="Passives" />
        <Bar yAxisId="right" dataKey="detractors" stackId="a" fill="#EF4444" name="Detractors" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
```

---

## 3. KPI Card Components

```typescript
// components/kpi/NurturingKPICards.tsx
export const NurturingKPICards: React.FC<{ stats: NurturingStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-4 gap-4">
      <KPICard
        title="Total Clienți"
        value={stats.totalClients}
        icon={Users}
        trend={stats.clientsTrend}
        trendLabel="vs last month"
      />
      <KPICard
        title="Active Nurturing"
        value={stats.activeNurturing}
        icon={Heart}
        color="green"
        percentage={(stats.activeNurturing / stats.totalClients) * 100}
      />
      <KPICard
        title="La Risc"
        value={stats.atRiskCount}
        icon={AlertTriangle}
        color="orange"
        alert={stats.atRiskCount > 20}
      />
      <KPICard
        title="Advocates (KOL)"
        value={stats.advocateCount}
        icon={Crown}
        color="gold"
        subtext={`${stats.kolCount} KOLs identificați`}
      />
    </div>
  );
};
```

---

## 4. Table Configurations

### 4.1 Clients Table

```typescript
// components/tables/NurturingClientsTable.tsx
export const nurturingClientsColumns: ColumnDef<NurturingClient>[] = [
  {
    accessorKey: 'companyName',
    header: 'Client',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar name={row.original.companyName} />
        <div>
          <div className="font-medium">{row.original.companyName}</div>
          <div className="text-sm text-gray-500">{row.original.contactName}</div>
        </div>
      </div>
    )
  },
  {
    accessorKey: 'currentState',
    header: 'State',
    cell: ({ row }) => <NurturingStateBadge state={row.original.currentState} />
  },
  {
    accessorKey: 'churnRiskScore',
    header: 'Churn Risk',
    cell: ({ row }) => (
      <ChurnRiskIndicator 
        score={row.original.churnRiskScore} 
        level={row.original.churnRiskLevel} 
      />
    )
  },
  {
    accessorKey: 'npsScore',
    header: 'NPS',
    cell: ({ row }) => (
      <NPSBadge 
        score={row.original.npsScore} 
        category={row.original.npsCategory} 
      />
    )
  },
  {
    accessorKey: 'totalOrders',
    header: 'Orders',
    cell: ({ row }) => row.original.totalOrders
  },
  {
    accessorKey: 'totalRevenue',
    header: 'Revenue',
    cell: ({ row }) => formatCurrency(row.original.totalRevenue, 'RON')
  },
  {
    accessorKey: 'lastOrderAt',
    header: 'Last Order',
    cell: ({ row }) => <RelativeDate date={row.original.lastOrderAt} />
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <ActionsDropdown
        items={[
          { label: 'View Details', onClick: () => navigate(`/nurturing/clients/${row.original.id}`) },
          { label: 'Call', onClick: () => initiateCall(row.original.phone) },
          { label: 'Email', onClick: () => composeEmail(row.original.email) },
          { label: 'Create Intervention', onClick: () => openInterventionDialog(row.original.id) }
        ]}
      />
    )
  }
];
```

---

## 5. Filter Components

```typescript
// components/filters/NurturingFilters.tsx
export const NurturingFilters: React.FC<{
  filters: NurturingFilters;
  onChange: (filters: NurturingFilters) => void;
}> = ({ filters, onChange }) => {
  return (
    <div className="flex gap-4 flex-wrap">
      <MultiSelect
        label="State"
        options={NURTURING_STATE_OPTIONS}
        value={filters.states}
        onChange={(states) => onChange({ ...filters, states })}
      />
      
      <MultiSelect
        label="Risk Level"
        options={RISK_LEVEL_OPTIONS}
        value={filters.riskLevels}
        onChange={(riskLevels) => onChange({ ...filters, riskLevels })}
      />
      
      <RangeSlider
        label="NPS Score"
        min={0}
        max={10}
        value={filters.npsRange}
        onChange={(npsRange) => onChange({ ...filters, npsRange })}
      />
      
      <Select
        label="Days Since Order"
        options={[
          { value: '7', label: '< 7 days' },
          { value: '30', label: '< 30 days' },
          { value: '90', label: '< 90 days' },
          { value: '180', label: '< 180 days' }
        ]}
        value={filters.daysSinceOrder}
        onChange={(daysSinceOrder) => onChange({ ...filters, daysSinceOrder })}
      />
      
      <Toggle
        label="Only Advocates"
        checked={filters.onlyAdvocates}
        onChange={(onlyAdvocates) => onChange({ ...filters, onlyAdvocates })}
      />
    </div>
  );
};
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
