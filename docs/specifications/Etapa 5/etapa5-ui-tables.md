# CERNIQ.APP — ETAPA 5: UI TABLES
## Complete Table Specifications
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. NurturingClientsTable

### Columns Definition
```typescript
interface NurturingClientRow {
  id: string;
  companyName: string;
  contactName: string;
  state: NurturingState;
  churnRiskScore: number;
  churnRiskLevel: string;
  npsScore: number | null;
  npsCategory: string | null;
  totalOrders: number;
  totalRevenue: number;
  lastOrderAt: Date | null;
  daysSinceLastOrder: number;
  isAdvocate: boolean;
  isKol: boolean;
  clusterCount: number;
  referralCount: number;
  createdAt: Date;
}

const nurturingClientsColumns: ColumnDef<NurturingClientRow>[] = [
  {
    id: 'select',
    header: ({ table }) => <Checkbox checked={table.getIsAllSelected()} />,
    cell: ({ row }) => <Checkbox checked={row.getIsSelected()} />,
    enableSorting: false
  },
  {
    accessorKey: 'companyName',
    header: 'Client',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link to={`/nurturing/clients/${row.original.id}`} className="font-medium">
          {row.original.companyName}
        </Link>
        <span className="text-sm text-muted">{row.original.contactName}</span>
      </div>
    ),
    enableSorting: true
  },
  {
    accessorKey: 'state',
    header: 'Status',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <NurturingStateBadge state={row.original.state} />
        {row.original.isKol && <Badge variant="gold">KOL</Badge>}
        {row.original.isAdvocate && <Badge variant="purple">Advocate</Badge>}
      </div>
    ),
    enableSorting: true,
    filterFn: 'equals'
  },
  {
    accessorKey: 'churnRiskScore',
    header: 'Risc Churn',
    cell: ({ row }) => (
      <ChurnRiskIndicator 
        score={row.original.churnRiskScore} 
        level={row.original.churnRiskLevel}
        showLabel 
      />
    ),
    enableSorting: true
  },
  {
    accessorKey: 'npsScore',
    header: 'NPS',
    cell: ({ row }) => (
      row.original.npsScore !== null ? (
        <NPSScoreBadge score={row.original.npsScore} category={row.original.npsCategory} />
      ) : (
        <span className="text-muted">-</span>
      )
    ),
    enableSorting: true
  },
  {
    accessorKey: 'totalOrders',
    header: 'Comenzi',
    cell: ({ row }) => row.original.totalOrders,
    enableSorting: true
  },
  {
    accessorKey: 'totalRevenue',
    header: 'Revenue',
    cell: ({ row }) => formatCurrency(row.original.totalRevenue, 'EUR'),
    enableSorting: true
  },
  {
    accessorKey: 'lastOrderAt',
    header: 'Ultima Comandă',
    cell: ({ row }) => (
      row.original.lastOrderAt ? (
        <div className="flex flex-col">
          <RelativeDate date={row.original.lastOrderAt} />
          <span className="text-xs text-muted">
            {row.original.daysSinceLastOrder} zile
          </span>
        </div>
      ) : '-'
    ),
    enableSorting: true
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(`/nurturing/clients/${row.original.id}`)}>
            <Eye className="mr-2 h-4 w-4" /> Vezi Detalii
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openInterventionDialog(row.original.id)}>
            <Phone className="mr-2 h-4 w-4" /> Intervenție
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openReferralDialog(row.original.id)}>
            <Users className="mr-2 h-4 w-4" /> Adaugă Referral
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openWinBackDialog(row.original.id)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Win-Back
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
];
```

### Filters
```typescript
const nurturingFilters = [
  {
    id: 'state',
    label: 'Status',
    type: 'multi-select',
    options: [
      { value: 'ONBOARDING', label: 'Onboarding' },
      { value: 'NURTURING_ACTIVE', label: 'Active' },
      { value: 'AT_RISK', label: 'At Risk' },
      { value: 'LOYAL_CLIENT', label: 'Loyal' },
      { value: 'ADVOCATE', label: 'Advocate' },
      { value: 'CHURNED', label: 'Churned' },
      { value: 'REACTIVATED', label: 'Reactivated' }
    ]
  },
  {
    id: 'churnRiskLevel',
    label: 'Risc Churn',
    type: 'multi-select',
    options: [
      { value: 'CRITICAL', label: '🔴 Critical' },
      { value: 'HIGH', label: '🟠 High' },
      { value: 'MEDIUM', label: '🟡 Medium' },
      { value: 'LOW', label: '🟢 Low' }
    ]
  },
  {
    id: 'npsScore',
    label: 'NPS',
    type: 'range',
    min: 0,
    max: 10
  },
  {
    id: 'daysSinceLastOrder',
    label: 'Zile de la ultima comandă',
    type: 'range',
    presets: [
      { label: '< 30 zile', value: [0, 30] },
      { label: '30-60 zile', value: [30, 60] },
      { label: '60-90 zile', value: [60, 90] },
      { label: '> 90 zile', value: [90, 999] }
    ]
  },
  {
    id: 'isKol',
    label: 'Este KOL',
    type: 'boolean'
  }
];
```

---

## 2. ReferralsTable

### Columns Definition
```typescript
interface ReferralRow {
  id: string;
  referrerClientId: string;
  referrerName: string;
  referrerCompany: string;
  referredContactName: string;
  referredCompanyName: string | null;
  referredPhone: string | null;
  referredEmail: string | null;
  referralType: ReferralType;
  referralSource: string;
  status: ReferralStatus;
  consentGiven: boolean;
  distanceKm: number | null;
  proximityScore: number | null;
  convertedAt: Date | null;
  convertedValue: number | null;
  createdAt: Date;
  expiresAt: Date | null;
}

const referralsColumns: ColumnDef<ReferralRow>[] = [
  {
    accessorKey: 'referrerName',
    header: 'Referrer',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link to={`/nurturing/clients/${row.original.referrerClientId}`}>
          {row.original.referrerName}
        </Link>
        <span className="text-sm text-muted">{row.original.referrerCompany}</span>
      </div>
    )
  },
  {
    accessorKey: 'referredContactName',
    header: 'Persoană Referită',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.referredContactName}</span>
        {row.original.referredCompanyName && (
          <span className="text-sm text-muted">{row.original.referredCompanyName}</span>
        )}
      </div>
    )
  },
  {
    accessorKey: 'referralType',
    header: 'Tip',
    cell: ({ row }) => <ReferralTypeBadge type={row.original.referralType} />
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <ReferralStatusBadge status={row.original.status} />
        {row.original.consentGiven && (
          <Tooltip content="Consimțământ acordat">
            <Check className="h-4 w-4 text-green-500" />
          </Tooltip>
        )}
      </div>
    )
  },
  {
    accessorKey: 'distanceKm',
    header: 'Distanță',
    cell: ({ row }) => (
      row.original.distanceKm !== null 
        ? `${row.original.distanceKm.toFixed(1)} km`
        : '-'
    )
  },
  {
    accessorKey: 'convertedValue',
    header: 'Valoare Conversie',
    cell: ({ row }) => (
      row.original.convertedValue !== null ? (
        <div className="flex flex-col">
          <span className="font-medium text-green-600">
            {formatCurrency(row.original.convertedValue, 'EUR')}
          </span>
          <span className="text-xs text-muted">
            <RelativeDate date={row.original.convertedAt!} />
          </span>
        </div>
      ) : '-'
    )
  },
  {
    accessorKey: 'createdAt',
    header: 'Data',
    cell: ({ row }) => <RelativeDate date={row.original.createdAt} />
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {row.original.status === 'PENDING_CONSENT' && (
            <DropdownMenuItem onClick={() => openConsentRequestDialog(row.original.id)}>
              <Send className="mr-2 h-4 w-4" /> Solicită Consimțământ
            </DropdownMenuItem>
          )}
          {row.original.status === 'ACTIVE' && row.original.consentGiven && (
            <DropdownMenuItem onClick={() => openOutreachDialog(row.original.id)}>
              <Phone className="mr-2 h-4 w-4" /> Contactează
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => navigate(`/nurturing/referrals/${row.original.id}`)}>
            <Eye className="mr-2 h-4 w-4" /> Vezi Detalii
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
];
```

---

## 3. ClustersTable

### Columns Definition
```typescript
interface ClusterRow {
  id: string;
  clusterName: string;
  clusterCode: string | null;
  clusterType: ClusterType;
  detectionMethod: string;
  memberCount: number;
  clientCount: number;
  prospectCount: number;
  penetrationRate: number;
  totalRevenue: number;
  avgOrderValue: number;
  kolClientId: string | null;
  kolName: string | null;
  county: string;
  areaKm2: number | null;
  cohesionScore: number | null;
  isVerified: boolean;
  createdAt: Date;
}

const clustersColumns: ColumnDef<ClusterRow>[] = [
  {
    accessorKey: 'clusterName',
    header: 'Cluster',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link to={`/nurturing/clusters/${row.original.id}`} className="font-medium">
          {row.original.clusterName}
        </Link>
        {row.original.clusterCode && (
          <span className="text-xs text-muted">{row.original.clusterCode}</span>
        )}
      </div>
    )
  },
  {
    accessorKey: 'clusterType',
    header: 'Tip',
    cell: ({ row }) => <ClusterTypeBadge type={row.original.clusterType} />
  },
  {
    accessorKey: 'memberCount',
    header: 'Membri',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.memberCount}</span>
        <span className="text-xs text-muted">
          {row.original.clientCount} clienți / {row.original.prospectCount} prospecți
        </span>
      </div>
    )
  },
  {
    accessorKey: 'penetrationRate',
    header: 'Penetrare',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Progress value={row.original.penetrationRate} className="w-16" />
        <span className="text-sm">{row.original.penetrationRate.toFixed(0)}%</span>
      </div>
    )
  },
  {
    accessorKey: 'totalRevenue',
    header: 'Revenue',
    cell: ({ row }) => formatCurrency(row.original.totalRevenue, 'EUR')
  },
  {
    accessorKey: 'kolName',
    header: 'KOL',
    cell: ({ row }) => (
      row.original.kolName ? (
        <Link to={`/nurturing/kol/${row.original.kolClientId}`}>
          {row.original.kolName}
        </Link>
      ) : '-'
    )
  },
  {
    accessorKey: 'county',
    header: 'Județ',
    cell: ({ row }) => row.original.county
  },
  {
    accessorKey: 'cohesionScore',
    header: 'Coeziune',
    cell: ({ row }) => (
      row.original.cohesionScore !== null 
        ? `${row.original.cohesionScore.toFixed(0)}%`
        : '-'
    )
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(`/nurturing/clusters/${row.original.id}`)}>
            <Eye className="mr-2 h-4 w-4" /> Vezi Membri
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openMapView(row.original.id)}>
            <Map className="mr-2 h-4 w-4" /> Vezi pe Hartă
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => recalculateCluster(row.original.id)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Recalculează
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
];
```

---

## 4. HITLQueueTable

### Columns Definition
```typescript
interface HITLTaskRow {
  id: string;
  taskType: HitlTaskType;
  taskCategory: string;
  relatedEntityType: string;
  relatedEntityId: string;
  relatedEntityName: string;
  priority: TaskPriority;
  slaDeadline: Date;
  slaStatus: 'OK' | 'WARNING' | 'BREACHED';
  timeRemaining: number; // minutes
  contextSummary: string;
  recommendedAction: string;
  aiConfidence: number;
  assignedTo: string | null;
  assignedToName: string | null;
  createdAt: Date;
}

const hitlQueueColumns: ColumnDef<HITLTaskRow>[] = [
  {
    accessorKey: 'priority',
    header: 'P',
    cell: ({ row }) => <PriorityIndicator priority={row.original.priority} />
  },
  {
    accessorKey: 'taskType',
    header: 'Tip Task',
    cell: ({ row }) => <HITLTaskTypeBadge type={row.original.taskType} />
  },
  {
    accessorKey: 'relatedEntityName',
    header: 'Entitate',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.relatedEntityName}</span>
        <span className="text-xs text-muted">{row.original.relatedEntityType}</span>
      </div>
    )
  },
  {
    accessorKey: 'contextSummary',
    header: 'Context',
    cell: ({ row }) => (
      <div className="max-w-xs truncate">
        {row.original.contextSummary}
      </div>
    )
  },
  {
    accessorKey: 'recommendedAction',
    header: 'Acțiune Recomandată',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="truncate max-w-[150px]">{row.original.recommendedAction}</span>
        <Badge variant="outline">{row.original.aiConfidence}%</Badge>
      </div>
    )
  },
  {
    accessorKey: 'slaDeadline',
    header: 'SLA',
    cell: ({ row }) => (
      <SLAIndicator 
        status={row.original.slaStatus}
        timeRemaining={row.original.timeRemaining}
        deadline={row.original.slaDeadline}
      />
    )
  },
  {
    accessorKey: 'assignedToName',
    header: 'Asignat',
    cell: ({ row }) => (
      row.original.assignedToName || <span className="text-muted">Neasignat</span>
    )
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="default"
          onClick={() => openResolutionDialog(row.original.id)}
        >
          Rezolvă
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => claimTask(row.original.id)}
          disabled={!!row.original.assignedTo}
        >
          Preia
        </Button>
      </div>
    )
  }
];
```

---

## 5. WinBackCampaignsTable

### Columns Definition
```typescript
interface WinBackCampaignRow {
  id: string;
  clientId: string;
  clientName: string;
  campaignType: WinBackCampaignType;
  status: WinBackStatus;
  currentStep: number;
  totalSteps: number;
  offerType: string | null;
  offerValue: number | null;
  daysDormant: number;
  historicalRevenue: number;
  converted: boolean;
  conversionValue: number | null;
  assignedToName: string | null;
  startedAt: Date | null;
  createdAt: Date;
}

const winbackCampaignsColumns: ColumnDef<WinBackCampaignRow>[] = [
  {
    accessorKey: 'clientName',
    header: 'Client',
    cell: ({ row }) => (
      <Link to={`/nurturing/clients/${row.original.clientId}`}>
        {row.original.clientName}
      </Link>
    )
  },
  {
    accessorKey: 'campaignType',
    header: 'Tip',
    cell: ({ row }) => <WinBackTypeBadge type={row.original.campaignType} />
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <WinBackStatusBadge status={row.original.status} />
  },
  {
    accessorKey: 'currentStep',
    header: 'Progres',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Progress 
          value={(row.original.currentStep / row.original.totalSteps) * 100} 
          className="w-16" 
        />
        <span className="text-sm">
          {row.original.currentStep}/{row.original.totalSteps}
        </span>
      </div>
    )
  },
  {
    accessorKey: 'offerValue',
    header: 'Ofertă',
    cell: ({ row }) => (
      row.original.offerType ? (
        <Badge variant="outline">
          {row.original.offerType}: {row.original.offerValue}%
        </Badge>
      ) : '-'
    )
  },
  {
    accessorKey: 'daysDormant',
    header: 'Zile Inactiv',
    cell: ({ row }) => `${row.original.daysDormant} zile`
  },
  {
    accessorKey: 'historicalRevenue',
    header: 'Revenue Istoric',
    cell: ({ row }) => formatCurrency(row.original.historicalRevenue, 'EUR')
  },
  {
    accessorKey: 'converted',
    header: 'Conversie',
    cell: ({ row }) => (
      row.original.converted ? (
        <div className="flex flex-col">
          <Badge variant="success">Convertit</Badge>
          {row.original.conversionValue && (
            <span className="text-xs text-green-600">
              {formatCurrency(row.original.conversionValue, 'EUR')}
            </span>
          )}
        </div>
      ) : '-'
    )
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => viewCampaignDetail(row.original.id)}>
            <Eye className="mr-2 h-4 w-4" /> Vezi Detalii
          </DropdownMenuItem>
          {row.original.status === 'ACTIVE' && (
            <>
              <DropdownMenuItem onClick={() => executeNextStep(row.original.id)}>
                <Play className="mr-2 h-4 w-4" /> Execută Pasul Următor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => pauseCampaign(row.original.id)}>
                <Pause className="mr-2 h-4 w-4" /> Pauză
              </DropdownMenuItem>
            </>
          )}
          {row.original.status === 'PAUSED' && (
            <DropdownMenuItem onClick={() => resumeCampaign(row.original.id)}>
              <Play className="mr-2 h-4 w-4" /> Reia
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
];
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
