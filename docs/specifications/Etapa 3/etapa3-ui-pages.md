# CERNIQ.APP — ETAPA 3: UI PAGES
## Frontend Pages & Layouts pentru AI Sales Agent
### Versiunea 1.0 | 18 Ianuarie 2026

---

# CUPRINS

1. [Overview Arhitectură Frontend](#1-overview-arhitectură-frontend)
2. [Page Layouts](#2-page-layouts)
3. [AI Sales Dashboard](#3-ai-sales-dashboard)
4. [Negotiations Pages](#4-negotiations-pages)
5. [Product Catalog Pages](#5-product-catalog-pages)
6. [Pricing & Discounts Pages](#6-pricing--discounts-pages)
7. [Documents Pages](#7-documents-pages)
8. [AI Conversations Pages](#8-ai-conversations-pages)
9. [HITL Approvals Pages](#9-hitl-approvals-pages)
10. [Reports & Analytics Pages](#10-reports--analytics-pages)
11. [Settings Pages](#11-settings-pages)
12. [Guardrails Monitor](#12-guardrails-monitor)
13. [e-Factura Status](#13-e-factura-status)
14. [Routing Configuration](#14-routing-configuration)

---

# 1. OVERVIEW ARHITECTURĂ FRONTEND

## 1.1 Technology Stack

| Component | Tehnologie | Versiune |
|-----------|------------|----------|
| Framework | React | 19.1.0 |
| Styling | Tailwind CSS | v4.1 |
| Component Library | shadcn/ui | latest |
| State Management | TanStack Query | v5 |
| Forms | React Hook Form + Zod | v7 + v3 |
| Tables | TanStack Table | v8 |
| Charts | Recharts | v2.15 |
| Router | React Router | v7 |
| Icons | Lucide React | v0.469 |
| Date/Time | date-fns | v4 |

## 1.2 Folder Structure

```
src/
├── app/
│   ├── sales/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # /sales → Dashboard
│   │   ├── dashboard/
│   │   │   └── page.tsx                # /sales/dashboard
│   │   ├── negotiations/
│   │   │   ├── page.tsx                # /sales/negotiations
│   │   │   └── [id]/
│   │   │       └── page.tsx            # /sales/negotiations/:id
│   │   ├── products/
│   │   │   ├── page.tsx                # /sales/products
│   │   │   └── [sku]/
│   │   │       └── page.tsx            # /sales/products/:sku
│   │   ├── pricing/
│   │   │   └── page.tsx                # /sales/pricing
│   │   ├── documents/
│   │   │   ├── page.tsx                # /sales/documents
│   │   │   └── [id]/
│   │   │       └── page.tsx            # /sales/documents/:id
│   │   ├── ai-conversations/
│   │   │   ├── page.tsx                # /sales/ai-conversations
│   │   │   └── [id]/
│   │   │       └── page.tsx            # /sales/ai-conversations/:id
│   │   ├── approvals/
│   │   │   └── page.tsx                # /sales/approvals
│   │   ├── reports/
│   │   │   └── page.tsx                # /sales/reports
│   │   ├── guardrails/
│   │   │   └── page.tsx                # /sales/guardrails
│   │   ├── einvoice/
│   │   │   └── page.tsx                # /sales/einvoice
│   │   └── settings/
│   │       └── page.tsx                # /sales/settings
│   └── layout.tsx
├── components/
│   ├── ui/                             # shadcn/ui primitives
│   ├── sales/                          # Etapa 3 specific
│   │   ├── dashboard/
│   │   ├── negotiations/
│   │   ├── products/
│   │   ├── pricing/
│   │   ├── documents/
│   │   ├── ai/
│   │   ├── hitl/
│   │   └── guardrails/
│   └── shared/
├── hooks/
│   └── sales/
├── lib/
│   └── api/
│       └── sales/
└── types/
    └── sales/
```

## 1.3 Design System Constants

```typescript
// src/lib/design-system.ts
export const COLORS = {
  // State colors
  negotiation: {
    INITIAL_CONTACT: 'bg-slate-100 text-slate-800',
    QUALIFICATION: 'bg-blue-100 text-blue-800',
    NEEDS_ANALYSIS: 'bg-purple-100 text-purple-800',
    PRODUCT_PRESENTATION: 'bg-indigo-100 text-indigo-800',
    OBJECTION_HANDLING: 'bg-amber-100 text-amber-800',
    QUOTE_SENT: 'bg-cyan-100 text-cyan-800',
    PROFORMA_SENT: 'bg-teal-100 text-teal-800',
    INVOICE_SENT: 'bg-emerald-100 text-emerald-800',
    CONVERTED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    STALLED: 'bg-gray-100 text-gray-800',
  },
  
  // Priority colors
  priority: {
    CRITICAL: 'bg-red-500 text-white',
    HIGH: 'bg-orange-500 text-white',
    MEDIUM: 'bg-yellow-500 text-black',
    LOW: 'bg-green-500 text-white',
  },
  
  // Sentiment colors
  sentiment: {
    VERY_POSITIVE: 'text-green-600',
    POSITIVE: 'text-green-500',
    NEUTRAL: 'text-gray-500',
    NEGATIVE: 'text-orange-500',
    VERY_NEGATIVE: 'text-red-600',
  },
  
  // Document status
  document: {
    DRAFT: 'bg-gray-100 text-gray-800',
    CREATED: 'bg-blue-100 text-blue-800',
    SENT: 'bg-cyan-100 text-cyan-800',
    PAID: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-200 text-gray-600',
  },
  
  // e-Factura status
  einvoice: {
    PENDING: 'bg-yellow-100 text-yellow-800',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-cyan-100 text-cyan-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  },
};

export const ICONS = {
  negotiation: {
    INITIAL_CONTACT: MessageSquare,
    QUALIFICATION: ClipboardCheck,
    NEEDS_ANALYSIS: Search,
    PRODUCT_PRESENTATION: Package,
    OBJECTION_HANDLING: MessageCircleWarning,
    QUOTE_SENT: FileText,
    PROFORMA_SENT: Receipt,
    INVOICE_SENT: FileCheck,
    CONVERTED: CheckCircle,
    CANCELLED: XCircle,
    STALLED: PauseCircle,
  },
};
```

---

# 2. PAGE LAYOUTS

## 2.1 Sales Layout (Wrapper pentru toate paginile Etapa 3)

```tsx
// src/app/sales/layout.tsx
'use client';

import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  DollarSign,
  FileText,
  Bot,
  CheckSquare,
  BarChart3,
  Shield,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useHitlPendingCount } from '@/hooks/sales/useHitlPendingCount';
import { useEinvoiceAlerts } from '@/hooks/sales/useEinvoiceAlerts';

const navigation = [
  { name: 'Dashboard', href: '/sales/dashboard', icon: LayoutDashboard },
  { name: 'Negocieri', href: '/sales/negotiations', icon: MessageSquare },
  { name: 'Produse', href: '/sales/products', icon: Package },
  { name: 'Prețuri', href: '/sales/pricing', icon: DollarSign },
  { name: 'Documente', href: '/sales/documents', icon: FileText },
  { name: 'Conversații AI', href: '/sales/ai-conversations', icon: Bot },
  { name: 'Aprobări', href: '/sales/approvals', icon: CheckSquare, badge: true },
  { name: 'Rapoarte', href: '/sales/reports', icon: BarChart3 },
  { name: 'Guardrails', href: '/sales/guardrails', icon: Shield },
  { name: 'e-Factura', href: '/sales/einvoice', icon: Receipt, alert: true },
  { name: 'Setări', href: '/sales/settings', icon: Settings },
];

export default function SalesLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { count: hitlPendingCount } = useHitlPendingCount();
  const { alertCount: einvoiceAlertCount } = useEinvoiceAlerts();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          {!sidebarCollapsed && (
            <span className="text-xl font-bold text-primary">
              Cerniq <span className="text-sm font-normal text-gray-500">Sales</span>
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && hitlPendingCount > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {hitlPendingCount}
                      </Badge>
                    )}
                    {item.alert && einvoiceAlertCount > 0 && (
                      <Badge variant="warning" className="ml-auto">
                        {einvoiceAlertCount}
                      </Badge>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        
        {/* AI Status */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-600">AI Agent Active</span>
            </div>
          </div>
        )}
      </aside>
      
      {/* Main content */}
      <main
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 bg-white border-b">
          {/* Search */}
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Caută negocieri, produse, clienți..."
              className="pl-10"
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {(hitlPendingCount + einvoiceAlertCount) > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                      {hitlPendingCount + einvoiceAlertCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuItem>
                  {hitlPendingCount} aprobări în așteptare
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {einvoiceAlertCount} alerte e-Factura
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                    AS
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profil</DropdownMenuItem>
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Page content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

---

# 3. AI SALES DASHBOARD

## 3.1 Dashboard Page

```tsx
// src/app/sales/dashboard/page.tsx
'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  FileText,
  MessageSquare,
  Bot,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardStats } from '@/hooks/sales/useDashboardStats';
import { useActiveNegotiations } from '@/hooks/sales/useActiveNegotiations';
import { useRecentConversions } from '@/hooks/sales/useRecentConversions';
import { useGuardrailStatus } from '@/hooks/sales/useGuardrailStatus';
import { KPICard } from '@/components/sales/dashboard/KPICard';
import { ConversionFunnel } from '@/components/sales/dashboard/ConversionFunnel';
import { ActiveNegotiationsTable } from '@/components/sales/dashboard/ActiveNegotiationsTable';
import { AIActivityFeed } from '@/components/sales/dashboard/AIActivityFeed';
import { SentimentChart } from '@/components/sales/dashboard/SentimentChart';
import { RevenueChart } from '@/components/sales/dashboard/RevenueChart';
import { GuardrailStatusCard } from '@/components/sales/dashboard/GuardrailStatusCard';
import { PendingApprovalsCard } from '@/components/sales/dashboard/PendingApprovalsCard';

export default function SalesDashboardPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const { data: stats, isLoading: statsLoading, refetch } = useDashboardStats(period);
  const { data: negotiations } = useActiveNegotiations({ limit: 10 });
  const { data: conversions } = useRecentConversions({ limit: 5 });
  const { data: guardrailStatus } = useGuardrailStatus();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Sales Dashboard</h1>
          <p className="text-gray-500">
            Monitorizare în timp real a agentului AI de vânzări
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList>
              <TabsTrigger value="today">Azi</TabsTrigger>
              <TabsTrigger value="week">Săptămâna</TabsTrigger>
              <TabsTrigger value="month">Luna</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizează
          </Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Negocieri Active"
          value={stats?.activeNegotiations ?? 0}
          change={stats?.activeNegotiationsChange}
          icon={MessageSquare}
          href="/sales/negotiations?status=active"
        />
        <KPICard
          title="Conversii"
          value={stats?.conversions ?? 0}
          change={stats?.conversionsChange}
          icon={CheckCircle}
          format="number"
          positive
        />
        <KPICard
          title="Venituri Generate"
          value={stats?.revenue ?? 0}
          change={stats?.revenueChange}
          icon={DollarSign}
          format="currency"
        />
        <KPICard
          title="Rată Conversie"
          value={stats?.conversionRate ?? 0}
          change={stats?.conversionRateChange}
          icon={TrendingUp}
          format="percent"
        />
      </div>
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Funnel Conversie</CardTitle>
              <CardDescription>
                Progresul negocierilor prin toate etapele
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConversionFunnel data={stats?.funnel} />
            </CardContent>
          </Card>
          
          {/* Active Negotiations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Negocieri Active</CardTitle>
                <CardDescription>
                  Cele mai recente conversații gestionate de AI
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/sales/negotiations">
                  Vezi toate
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              <ActiveNegotiationsTable negotiations={negotiations} />
            </CardContent>
          </Card>
          
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Venituri din Negocieri AI</CardTitle>
              <CardDescription>
                Evoluția veniturilor generate de agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart data={stats?.revenueHistory} period={period} />
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* AI Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Status AI Agent
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge className="bg-green-500">
                  <span className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                  Activ
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Model</span>
                <span className="text-sm font-medium">xAI Grok-4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Răspunsuri azi</span>
                <span className="text-sm font-medium">{stats?.aiResponsesToday ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Timp mediu răspuns</span>
                <span className="text-sm font-medium">{stats?.avgResponseTime ?? 0}s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Tokens utilizați</span>
                <span className="text-sm font-medium">
                  {(stats?.tokensUsedToday ?? 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
          
          {/* Guardrail Status */}
          <GuardrailStatusCard status={guardrailStatus} />
          
          {/* Pending Approvals */}
          <PendingApprovalsCard />
          
          {/* Sentiment Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuție Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <SentimentChart data={stats?.sentimentDistribution} />
            </CardContent>
          </Card>
          
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Activitate Recentă</CardTitle>
            </CardHeader>
            <CardContent>
              <AIActivityFeed />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Pagini Negocieri (Negotiations)

### 4.1 Lista Negocieri - `/sales/negotiations`

```typescript
// app/sales/negotiations/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  Eye,
  MessageSquare,
  FileText,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Bot,
  User,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import Link from 'next/link';
import { salesApi } from '@/lib/api/sales';
import { NegotiationState, NegotiationPriority } from '@/types/etapa3';
import { cn } from '@/lib/utils';

// State colors and labels
const STATE_CONFIG: Record<NegotiationState, { 
  label: string; 
  color: string;
  icon: typeof Clock;
}> = {
  NEW: { label: 'Nouă', color: 'bg-blue-100 text-blue-700', icon: Clock },
  QUALIFYING: { label: 'Calificare', color: 'bg-purple-100 text-purple-700', icon: MessageSquare },
  QUOTING: { label: 'Ofertare', color: 'bg-yellow-100 text-yellow-700', icon: FileText },
  NEGOTIATING: { label: 'Negociere', color: 'bg-orange-100 text-orange-700', icon: MessageSquare },
  PENDING_APPROVAL: { label: 'Aprobare', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  CLOSING: { label: 'Închidere', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  WON: { label: 'Câștigată', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  LOST: { label: 'Pierdută', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  STALE: { label: 'Inactivă', color: 'bg-amber-100 text-amber-700', icon: Clock },
  HUMAN_TAKEOVER: { label: 'Intervenție Umană', color: 'bg-red-100 text-red-700', icon: UserCog }
};

const PRIORITY_CONFIG: Record<NegotiationPriority, { 
  label: string; 
  color: string 
}> = {
  LOW: { label: 'Scăzută', color: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Medie', color: 'bg-blue-100 text-blue-600' },
  HIGH: { label: 'Ridicată', color: 'bg-orange-100 text-orange-600' },
  URGENT: { label: 'Urgentă', color: 'bg-red-100 text-red-600' }
};

interface NegotiationsFilters {
  search: string;
  state: NegotiationState | 'ALL';
  priority: NegotiationPriority | 'ALL';
  handledBy: 'ALL' | 'AI' | 'HUMAN';
  dateFrom: string | null;
  dateTo: string | null;
}

interface PaginationState {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function NegotiationsListPage() {
  const [filters, setFilters] = useState<NegotiationsFilters>({
    search: '',
    state: 'ALL',
    priority: 'ALL',
    handledBy: 'ALL',
    dateFrom: null,
    dateTo: null
  });
  
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 25,
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  });
  
  const [showFilters, setShowFilters] = useState(false);
  
  // Query pentru negocieri
  const { data, isLoading, error } = useQuery({
    queryKey: ['negotiations', filters, pagination],
    queryFn: () => salesApi.getNegotiations({
      ...filters,
      ...pagination,
      state: filters.state === 'ALL' ? undefined : filters.state,
      priority: filters.priority === 'ALL' ? undefined : filters.priority,
      handledBy: filters.handledBy === 'ALL' ? undefined : filters.handledBy
    }),
    staleTime: 30_000
  });
  
  // Query pentru statistici rapide
  const { data: stats } = useQuery({
    queryKey: ['negotiations-stats'],
    queryFn: () => salesApi.getNegotiationStats(),
    staleTime: 60_000
  });
  
  const negotiations = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pagination.pageSize);
  
  const handleSort = (column: string) => {
    setPagination(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const SortIcon = ({ column }: { column: string }) => {
    if (pagination.sortBy !== column) return null;
    return pagination.sortOrder === 'asc' 
      ? <SortAsc className="h-4 w-4 ml-1" />
      : <SortDesc className="h-4 w-4 ml-1" />;
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Negocieri Active</h1>
          <p className="text-gray-500">
            Gestionează negocierile cu clienții
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-4">
          <div className="text-center px-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats?.active ?? 0}
            </div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div className="text-center px-4 border-l">
            <div className="text-2xl font-bold text-green-600">
              {stats?.wonThisMonth ?? 0}
            </div>
            <div className="text-xs text-gray-500">Câștigate luna aceasta</div>
          </div>
          <div className="text-center px-4 border-l">
            <div className="text-2xl font-bold text-orange-600">
              {stats?.pendingApproval ?? 0}
            </div>
            <div className="text-xs text-gray-500">Așteaptă aprobare</div>
          </div>
        </div>
      </div>
      
      {/* Search & Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Caută după client, CUI, produs..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            {/* Quick Filters */}
            <Select
              value={filters.state}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                state: value as NegotiationState | 'ALL' 
              }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Toate stările" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toate stările</SelectItem>
                {Object.entries(STATE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={filters.handledBy}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                handledBy: value as 'ALL' | 'AI' | 'HUMAN' 
              }))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Gestionat de" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toți</SelectItem>
                <SelectItem value="AI">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    AI Agent
                  </div>
                </SelectItem>
                <SelectItem value="HUMAN">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Operator Uman
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Advanced Filters Toggle */}
            <Button 
              variant={showFilters ? 'secondary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtre
              {(filters.priority !== 'ALL' || filters.dateFrom || filters.dateTo) && (
                <Badge className="ml-2 bg-blue-500">
                  {[
                    filters.priority !== 'ALL' ? 1 : 0,
                    filters.dateFrom ? 1 : 0,
                    filters.dateTo ? 1 : 0
                  ].reduce((a, b) => a + b, 0)}
                </Badge>
              )}
            </Button>
          </div>
          
          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Prioritate
                </label>
                <Select
                  value={filters.priority}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    priority: value as NegotiationPriority | 'ALL' 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toate</SelectItem>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  De la data
                </label>
                <Input
                  type="date"
                  value={filters.dateFrom ?? ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateFrom: e.target.value || null 
                  }))}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Până la data
                </label>
                <Input
                  type="date"
                  value={filters.dateTo ?? ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateTo: e.target.value || null 
                  }))}
                />
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="ghost" 
                  onClick={() => setFilters({
                    search: '',
                    state: 'ALL',
                    priority: 'ALL',
                    handledBy: 'ALL',
                    dateFrom: null,
                    dateTo: null
                  })}
                >
                  Resetează filtrele
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Negotiations Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center">
                    Data
                    <SortIcon column="createdAt" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('clientName')}
                >
                  <div className="flex items-center">
                    Client
                    <SortIcon column="clientName" />
                  </div>
                </TableHead>
                <TableHead>Produse</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('state')}
                >
                  <div className="flex items-center">
                    Stare
                    <SortIcon column="state" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('estimatedValue')}
                >
                  <div className="flex items-center">
                    Valoare Est.
                    <SortIcon column="estimatedValue" />
                  </div>
                </TableHead>
                <TableHead>Gestionat de</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('updatedAt')}
                >
                  <div className="flex items-center">
                    Ultima activitate
                    <SortIcon column="updatedAt" />
                  </div>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton loading
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : negotiations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Nu există negocieri</p>
                      <p className="text-sm">
                        {filters.search || filters.state !== 'ALL' 
                          ? 'Încearcă să modifici filtrele'
                          : 'Negocierile vor apărea aici când clienții răspund'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                negotiations.map((negotiation) => {
                  const stateConfig = STATE_CONFIG[negotiation.state];
                  const priorityConfig = PRIORITY_CONFIG[negotiation.priority];
                  const StateIcon = stateConfig.icon;
                  
                  return (
                    <TableRow 
                      key={negotiation.id}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(negotiation.createdAt), 'dd MMM yyyy', { locale: ro })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(negotiation.createdAt), 'HH:mm')}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium">{negotiation.clientName}</div>
                        <div className="text-sm text-gray-500">
                          {negotiation.clientCui}
                        </div>
                        {negotiation.priority === 'URGENT' && (
                          <Badge className={cn('mt-1', priorityConfig.color)}>
                            {priorityConfig.label}
                          </Badge>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {negotiation.products.slice(0, 2).map((product, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {product.name}
                            </Badge>
                          ))}
                          {negotiation.products.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{negotiation.products.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={cn('flex items-center gap-1 w-fit', stateConfig.color)}>
                          <StateIcon className="h-3 w-3" />
                          {stateConfig.label}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium">
                          {negotiation.estimatedValue.toLocaleString('ro-RO')} RON
                        </div>
                        {negotiation.discountPercent > 0 && (
                          <div className="text-xs text-orange-600">
                            -{negotiation.discountPercent}% discount
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {negotiation.handledBy === 'AI' ? (
                            <>
                              <Bot className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">AI Agent</span>
                            </>
                          ) : (
                            <>
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">
                                {negotiation.operatorName ?? 'Operator'}
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(negotiation.updatedAt), { 
                            addSuffix: true,
                            locale: ro 
                          })}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/sales/negotiations/${negotiation.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Vezi detalii
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/sales/ai-conversations/${negotiation.conversationId}`}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Vezi conversația
                              </Link>
                            </DropdownMenuItem>
                            {negotiation.proformaId && (
                              <DropdownMenuItem asChild>
                                <Link href={`/sales/documents/${negotiation.proformaId}`}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Vezi proforma
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {negotiation.handledBy === 'AI' && (
                              <DropdownMenuItem 
                                onClick={() => handleTakeover(negotiation.id)}
                                className="text-orange-600"
                              >
                                <UserCog className="h-4 w-4 mr-2" />
                                Preia manual
                              </Link>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        
        {/* Pagination */}
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Afișez {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, totalCount)} din {totalCount} negocieri
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => setPagination(prev => ({ 
                ...prev, 
                pageSize: parseInt(value),
                page: 1 
              }))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / pag</SelectItem>
                <SelectItem value="25">25 / pag</SelectItem>
                <SelectItem value="50">50 / pag</SelectItem>
                <SelectItem value="100">100 / pag</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

### 4.2 Detalii Negociere - `/sales/negotiations/[id]`

```typescript
// app/sales/negotiations/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Bot,
  User,
  MessageSquare,
  FileText,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCog,
  Send,
  Receipt,
  History,
  TrendingUp,
  TrendingDown,
  Percent,
  Building2,
  Phone,
  Mail,
  MapPin,
  Edit,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import Link from 'next/link';
import { salesApi } from '@/lib/api/sales';
import { 
  NegotiationState, 
  NegotiationDetail,
  NegotiationProduct,
  NegotiationEvent,
  ConversationMessage
} from '@/types/etapa3';
import { cn } from '@/lib/utils';

// FSM State Machine Visualization
import { NegotiationStateMachine } from '@/components/sales/NegotiationStateMachine';
import { ConversationTimeline } from '@/components/sales/ConversationTimeline';
import { ProductsTable } from '@/components/sales/ProductsTable';
import { PriceHistoryChart } from '@/components/sales/PriceHistoryChart';
import { ClientInfoCard } from '@/components/sales/ClientInfoCard';
import { GuardrailViolationsCard } from '@/components/sales/GuardrailViolationsCard';
import { SentimentTrendChart } from '@/components/sales/SentimentTrendChart';
import { DocumentsList } from '@/components/sales/DocumentsList';
import { EventsTimeline } from '@/components/sales/EventsTimeline';

export default function NegotiationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const negotiationId = params.id as string;
  
  const [activeTab, setActiveTab] = useState('overview');
  const [takeoverReason, setTakeoverReason] = useState('');
  const [showTakeoverDialog, setShowTakeoverDialog] = useState(false);
  
  // Fetch negotiation details
  const { data: negotiation, isLoading, error } = useQuery({
    queryKey: ['negotiation', negotiationId],
    queryFn: () => salesApi.getNegotiation(negotiationId),
    refetchInterval: 10_000 // Auto-refresh every 10s for active negotiations
  });
  
  // Fetch conversation messages
  const { data: conversation } = useQuery({
    queryKey: ['negotiation-conversation', negotiationId],
    queryFn: () => salesApi.getNegotiationConversation(negotiationId),
    enabled: !!negotiation?.conversationId
  });
  
  // Fetch events history
  const { data: events } = useQuery({
    queryKey: ['negotiation-events', negotiationId],
    queryFn: () => salesApi.getNegotiationEvents(negotiationId)
  });
  
  // Mutation: Human takeover
  const takeoverMutation = useMutation({
    mutationFn: (reason: string) => salesApi.takeoverNegotiation(negotiationId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiation', negotiationId] });
      setShowTakeoverDialog(false);
    }
  });
  
  // Mutation: Return to AI
  const returnToAiMutation = useMutation({
    mutationFn: () => salesApi.returnNegotiationToAi(negotiationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiation', negotiationId] });
    }
  });
  
  // Mutation: Mark as Won/Lost
  const closeNegotiationMutation = useMutation({
    mutationFn: ({ outcome, reason }: { outcome: 'WON' | 'LOST'; reason?: string }) => 
      salesApi.closeNegotiation(negotiationId, outcome, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiation', negotiationId] });
    }
  });
  
  if (isLoading) {
    return <NegotiationDetailSkeleton />;
  }
  
  if (error || !negotiation) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Negociere negăsită</h2>
        <p className="text-gray-500 mb-4">
          Negocierea cu ID-ul {negotiationId} nu a fost găsită.
        </p>
        <Button onClick={() => router.push('/sales/negotiations')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Înapoi la listă
        </Button>
      </div>
    );
  }
  
  const isActive = !['WON', 'LOST', 'STALE'].includes(negotiation.state);
  const isAiHandled = negotiation.handledBy === 'AI';
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                Negociere #{negotiation.number}
              </h1>
              <NegotiationStateBadge state={negotiation.state} />
              <PriorityBadge priority={negotiation.priority} />
            </div>
            <p className="text-gray-500 flex items-center gap-2 mt-1">
              <Building2 className="h-4 w-4" />
              {negotiation.client.name}
              <span className="text-gray-300">|</span>
              <Clock className="h-4 w-4" />
              Creată {format(new Date(negotiation.createdAt), 'dd MMM yyyy, HH:mm', { locale: ro })}
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {isActive && (
            <>
              {isAiHandled ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline"
                        onClick={() => setShowTakeoverDialog(true)}
                      >
                        <UserCog className="h-4 w-4 mr-2" />
                        Preia Manual
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Oprește AI-ul și preia negocierea manual
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => returnToAiMutation.mutate()}
                  disabled={returnToAiMutation.isPending}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Returnează la AI
                </Button>
              )}
              
              <Button variant="outline" asChild>
                <Link href={`/sales/documents/proforma/new?negotiation=${negotiationId}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generează Proformă
                </Link>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => closeNegotiationMutation.mutate({ outcome: 'WON' })}
                    className="text-green-600"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marchează Câștigată
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => closeNegotiationMutation.mutate({ outcome: 'LOST' })}
                    className="text-red-600"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Marchează Pierdută
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
      
      {/* State Machine Visualization */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Flux Negociere
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NegotiationStateMachine 
            currentState={negotiation.state}
            stateHistory={negotiation.stateHistory}
          />
        </CardContent>
      </Card>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">
                <TrendingUp className="h-4 w-4 mr-2" />
                Sumar
              </TabsTrigger>
              <TabsTrigger value="conversation">
                <MessageSquare className="h-4 w-4 mr-2" />
                Conversație
              </TabsTrigger>
              <TabsTrigger value="products">
                <Package className="h-4 w-4 mr-2" />
                Produse
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-2" />
                Documente
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                Istoric
              </TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Value Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Sumar Financiar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <div className="text-sm text-gray-500">Valoare Inițială</div>
                      <div className="text-2xl font-bold">
                        {negotiation.initialValue.toLocaleString('ro-RO')} RON
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Discount Total</div>
                      <div className="text-2xl font-bold text-orange-600">
                        -{negotiation.totalDiscount.toLocaleString('ro-RO')} RON
                        <span className="text-sm font-normal ml-2">
                          ({negotiation.discountPercent}%)
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Valoare Curentă</div>
                      <div className="text-2xl font-bold text-green-600">
                        {negotiation.currentValue.toLocaleString('ro-RO')} RON
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Marja Estimată</div>
                      <div className="text-2xl font-bold">
                        {negotiation.estimatedMargin}%
                        {negotiation.estimatedMargin < negotiation.minAcceptableMargin && (
                          <AlertTriangle className="h-4 w-4 text-red-500 inline ml-2" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {negotiation.discountHistory.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-2">Evoluție Preț</h4>
                      <PriceHistoryChart data={negotiation.discountHistory} />
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* AI Performance */}
              {isAiHandled && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      Performanță AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <div className="text-sm text-gray-500">Mesaje AI</div>
                        <div className="text-2xl font-bold">
                          {negotiation.aiStats.messagesCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Timp Mediu Răspuns</div>
                        <div className="text-2xl font-bold">
                          {negotiation.aiStats.avgResponseTime}s
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Tokens Utilizați</div>
                        <div className="text-2xl font-bold">
                          {negotiation.aiStats.tokensUsed.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Guardrail Violations */}
                    {negotiation.guardrailViolations.length > 0 && (
                      <div className="mt-6">
                        <GuardrailViolationsCard violations={negotiation.guardrailViolations} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Sentiment Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Trend Sentiment Client</CardTitle>
                </CardHeader>
                <CardContent>
                  <SentimentTrendChart 
                    data={negotiation.sentimentHistory}
                    currentSentiment={negotiation.currentSentiment}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Conversation Tab */}
            <TabsContent value="conversation">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Conversație Completă</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/sales/ai-conversations/${negotiation.conversationId}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Deschide în pagină nouă
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <ConversationTimeline 
                    messages={conversation?.messages ?? []}
                    negotiationId={negotiationId}
                    isAiHandled={isAiHandled}
                    isActive={isActive}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Products Tab */}
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Produse în Negociere</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductsTable 
                    products={negotiation.products}
                    negotiationId={negotiationId}
                    editable={isActive && !isAiHandled}
                    onUpdate={() => queryClient.invalidateQueries({ 
                      queryKey: ['negotiation', negotiationId] 
                    })}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Documents Tab */}
            <TabsContent value="documents">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Documente Asociate</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/sales/documents/proforma/new?negotiation=${negotiationId}`}>
                      <FileText className="h-4 w-4 mr-2" />
                      Generează Proformă Nouă
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <DocumentsList 
                    documents={negotiation.documents}
                    negotiationId={negotiationId}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* History Tab */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Istoric Evenimente</CardTitle>
                </CardHeader>
                <CardContent>
                  <EventsTimeline events={events ?? []} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Client Info */}
          <ClientInfoCard 
            client={negotiation.client}
            contact={negotiation.contact}
          />
          
          {/* Handler Info */}
          <Card>
            <CardHeader>
              <CardTitle>Gestionat de</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {isAiHandled ? (
                  <>
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Bot className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">AI Sales Agent</div>
                      <div className="text-sm text-gray-500">
                        Model: xAI Grok-4
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {negotiation.operator?.name ?? 'Operator Uman'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {negotiation.operator?.email}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {negotiation.takeoverReason && (
                <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                  <div className="text-sm font-medium text-orange-700">
                    Motiv Preluare Manuală:
                  </div>
                  <div className="text-sm text-orange-600">
                    {negotiation.takeoverReason}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          {isActive && (
            <Card>
              <CardHeader>
                <CardTitle>Acțiuni Rapide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href={`/sales/pricing/discount/new?negotiation=${negotiationId}`}>
                    <Percent className="h-4 w-4 mr-2" />
                    Aplică Discount
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Trimite Mesaj Manual
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href={`/sales/documents/proforma/new?negotiation=${negotiationId}`}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Generează Proformă
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
          
          {/* Related Negotiations */}
          {negotiation.relatedNegotiations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Negocieri Anterioare</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {negotiation.relatedNegotiations.map((related) => (
                    <Link 
                      key={related.id}
                      href={`/sales/negotiations/${related.id}`}
                      className="block p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">#{related.number}</span>
                        <NegotiationStateBadge state={related.state} size="sm" />
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {format(new Date(related.createdAt), 'dd MMM yyyy', { locale: ro })}
                        {' • '}
                        {related.value.toLocaleString('ro-RO')} RON
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Takeover Dialog */}
      <AlertDialog open={showTakeoverDialog} onOpenChange={setShowTakeoverDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Preia Negocierea Manual</AlertDialogTitle>
            <AlertDialogDescription>
              AI Agent-ul va fi oprit pentru această negociere. 
              Toate mesajele viitoare vor fi gestionate manual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4">
            <label className="text-sm font-medium">
              Motiv preluare (opțional)
            </label>
            <Textarea
              value={takeoverReason}
              onChange={(e) => setTakeoverReason(e.target.value)}
              placeholder="Ex: Client important, necesită abordare personalizată..."
              className="mt-2"
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => takeoverMutation.mutate(takeoverReason)}
              disabled={takeoverMutation.isPending}
            >
              {takeoverMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserCog className="h-4 w-4 mr-2" />
              )}
              Confirmă Preluarea
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Supporting Components
function NegotiationStateBadge({ 
  state, 
  size = 'default' 
}: { 
  state: NegotiationState;
  size?: 'sm' | 'default';
}) {
  const config = STATE_CONFIG[state];
  const Icon = config.icon;
  
  return (
    <Badge className={cn(
      'flex items-center gap-1',
      config.color,
      size === 'sm' && 'text-xs px-2 py-0.5'
    )}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {config.label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: NegotiationPriority }) {
  const config = PRIORITY_CONFIG[priority];
  
  if (priority === 'LOW' || priority === 'MEDIUM') {
    return null; // Don't show badge for normal priorities
  }
  
  return (
    <Badge className={config.color}>
      {config.label}
    </Badge>
  );
}

function NegotiationDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-12 bg-gray-200 rounded animate-pulse w-1/3" />
      <div className="h-20 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="h-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Pagini Catalog Produse (Product Catalog)

### 5.1 Lista Produse - `/sales/products`

```typescript
// app/sales/products/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Search,
  Filter,
  Package,
  Plus,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Upload,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { salesApi } from '@/lib/api/sales';
import { Product, ProductCategory, ProductStatus } from '@/types/etapa3';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<ProductStatus, { 
  label: string; 
  color: string;
  icon: typeof CheckCircle;
}> = {
  ACTIVE: { label: 'Activ', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  OUT_OF_STOCK: { label: 'Stoc Epuizat', color: 'bg-red-100 text-red-700', icon: XCircle },
  DISCONTINUED: { label: 'Discontinuat', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  COMING_SOON: { label: 'În Curând', color: 'bg-blue-100 text-blue-700', icon: Clock },
  LOW_STOCK: { label: 'Stoc Scăzut', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle }
};

interface ProductFilters {
  search: string;
  category: string;
  status: ProductStatus | 'ALL';
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean | null;
}

export default function ProductsListPage() {
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: 'ALL',
    status: 'ALL',
    minPrice: null,
    maxPrice: null,
    inStock: null
  });
  
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [showFilters, setShowFilters] = useState(false);
  
  // Query pentru produse
  const { data, isLoading } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => salesApi.getProducts({
      ...filters,
      category: filters.category === 'ALL' ? undefined : filters.category,
      status: filters.status === 'ALL' ? undefined : filters.status
    }),
    staleTime: 60_000
  });
  
  // Query pentru categorii
  const { data: categories } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => salesApi.getProductCategories(),
    staleTime: 300_000
  });
  
  // Query pentru statistici
  const { data: stats } = useQuery({
    queryKey: ['products-stats'],
    queryFn: () => salesApi.getProductStats(),
    staleTime: 60_000
  });
  
  const products = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalog Produse</h1>
          <p className="text-gray-500">
            Gestionează produsele disponibile pentru AI Agent
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button asChild>
            <Link href="/sales/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Adaugă Produs
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Total Produse</div>
                <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Active</div>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.active ?? 0}
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Stoc Scăzut</div>
                <div className="text-2xl font-bold text-orange-600">
                  {stats?.lowStock ?? 0}
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Stoc Epuizat</div>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.outOfStock ?? 0}
                </div>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Valoare Stoc</div>
                <div className="text-2xl font-bold">
                  {(stats?.totalStockValue ?? 0).toLocaleString('ro-RO')}
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Caută după nume, SKU, cod..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Toate categoriile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toate categoriile</SelectItem>
                {(categories ?? []).map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name} ({cat.productCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                status: value as ProductStatus | 'ALL' 
              }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Toate stările" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toate stările</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant={showFilters ? 'secondary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtre
            </Button>
            
            {/* View Toggle */}
            <div className="flex items-center border rounded-lg">
              <Button
                variant={view === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('table')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('grid')}
              >
                <Package className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Preț Minim (RON)
                </label>
                <Input
                  type="number"
                  value={filters.minPrice ?? ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    minPrice: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Preț Maxim (RON)
                </label>
                <Input
                  type="number"
                  value={filters.maxPrice ?? ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    maxPrice: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="∞"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Doar în Stoc
                </label>
                <Select
                  value={filters.inStock === null ? 'ALL' : filters.inStock ? 'YES' : 'NO'}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    inStock: value === 'ALL' ? null : value === 'YES' 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toate</SelectItem>
                    <SelectItem value="YES">Da</SelectItem>
                    <SelectItem value="NO">Nu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="ghost"
                  onClick={() => setFilters({
                    search: '',
                    category: 'ALL',
                    status: 'ALL',
                    minPrice: null,
                    maxPrice: null,
                    inStock: null
                  })}
                >
                  Resetează filtrele
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Products Display */}
      {view === 'table' ? (
        <ProductsTable products={products} isLoading={isLoading} />
      ) : (
        <ProductsGrid products={products} isLoading={isLoading} />
      )}
    </div>
  );
}

// Products Table Component
function ProductsTable({ 
  products, 
  isLoading 
}: { 
  products: Product[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[80px]">Imagine</TableHead>
              <TableHead>Produs</TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead className="text-right">Preț Bază</TableHead>
              <TableHead className="text-right">Stoc</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>AI Activ</TableHead>
              <TableHead className="w-[100px]">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Nu există produse</p>
                  <p className="text-sm text-gray-500">
                    Adaugă primul produs în catalog
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const statusConfig = STATUS_CONFIG[product.status];
                const StatusIcon = statusConfig.icon;
                
                return (
                  <TableRow key={product.id} className="hover:bg-gray-50">
                    <TableCell>
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="h-12 w-12 object-cover rounded"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">
                        SKU: {product.sku}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline">{product.category.name}</Badge>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="font-medium">
                        {product.basePrice.toLocaleString('ro-RO')} RON
                      </div>
                      <div className="text-xs text-gray-500">
                        / {product.unit}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className={cn(
                        'font-medium',
                        product.stockQuantity <= product.lowStockThreshold && 'text-orange-600',
                        product.stockQuantity === 0 && 'text-red-600'
                      )}>
                        {product.stockQuantity.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {product.unit}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={cn('flex items-center gap-1 w-fit', statusConfig.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {product.aiEnabled ? (
                        <Badge className="bg-blue-100 text-blue-700">
                          <Bot className="h-3 w-3 mr-1" />
                          Activ
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          Inactiv
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/sales/products/${product.sku}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/sales/products/${product.sku}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Products Grid Component
function ProductsGrid({ 
  products, 
  isLoading 
}: { 
  products: Product[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-40 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-4 gap-4">
      {products.map((product) => {
        const statusConfig = STATUS_CONFIG[product.status];
        const StatusIcon = statusConfig.icon;
        
        return (
          <Card key={product.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              {/* Image */}
              <div className="relative mb-4">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-40 object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                
                {/* Status Badge */}
                <Badge className={cn(
                  'absolute top-2 right-2',
                  statusConfig.color
                )}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              
              {/* Info */}
              <div className="space-y-2">
                <div>
                  <h3 className="font-medium line-clamp-2">{product.name}</h3>
                  <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold">
                      {product.basePrice.toLocaleString('ro-RO')} RON
                    </div>
                    <div className="text-xs text-gray-500">
                      / {product.unit}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={cn(
                      'font-medium',
                      product.stockQuantity <= product.lowStockThreshold && 'text-orange-600',
                      product.stockQuantity === 0 && 'text-red-600'
                    )}>
                      {product.stockQuantity.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">în stoc</div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/sales/products/${product.sku}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      Detalii
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/sales/products/${product.sku}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

---

## 6. Pagini Prețuri și Discount-uri (Pricing & Discounts)

### 6.1 Pricing Rules List Page

Pagina de gestionare a regulilor de preț și discount-uri configurabile.

**Route:** `/sales/pricing`

```typescript
// app/sales/pricing/page.tsx
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Play,
  Pause,
  DollarSign,
  Percent,
  Tag,
  ShoppingCart,
  Users,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Download,
  Upload,
  History,
  Eye,
  Settings,
} from 'lucide-react';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ==================== TYPES ====================

interface PricingRule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: 'volume' | 'client_tier' | 'promotional' | 'bundle' | 'seasonal' | 'loyalty';
  status: 'active' | 'inactive' | 'scheduled' | 'expired';
  priority: number;
  
  // Conditions
  conditions: {
    minQuantity?: number;
    maxQuantity?: number;
    clientTiers?: string[];
    productCategories?: string[];
    productSkus?: string[];
    regionCodes?: string[];
    paymentTerms?: string[];
    orderValue?: { min?: number; max?: number };
  };
  
  // Discount Configuration
  discount: {
    type: 'percentage' | 'fixed' | 'tiered';
    value?: number;
    tiers?: Array<{ min: number; max: number; value: number }>;
    maxDiscount?: number;
    requiresApproval: boolean;
    approvalThreshold?: number;
  };
  
  // Validity
  validFrom: string;
  validTo?: string;
  
  // Usage limits
  usageLimit?: number;
  usageCount: number;
  perClientLimit?: number;
  
  // Stats
  totalDiscountGiven: number;
  ordersAffected: number;
  lastUsedAt?: string;
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface DiscountApprovalConfig {
  id: string;
  role: string;
  maxDiscountPercent: number;
  maxDiscountAmount: number;
  requiresJustification: boolean;
  escalateTo?: string;
}

// ==================== CONSTANTS ====================

const RULE_TYPES = {
  volume: { label: 'Volum', icon: ShoppingCart, color: 'bg-blue-100 text-blue-800' },
  client_tier: { label: 'Tier Client', icon: Users, color: 'bg-purple-100 text-purple-800' },
  promotional: { label: 'Promoțional', icon: Tag, color: 'bg-green-100 text-green-800' },
  bundle: { label: 'Bundle', icon: DollarSign, color: 'bg-orange-100 text-orange-800' },
  seasonal: { label: 'Sezonier', icon: Calendar, color: 'bg-yellow-100 text-yellow-800' },
  loyalty: { label: 'Loialitate', icon: TrendingUp, color: 'bg-pink-100 text-pink-800' },
};

const RULE_STATUS = {
  active: { label: 'Activ', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactiv', icon: Pause, color: 'bg-gray-100 text-gray-800' },
  scheduled: { label: 'Programat', icon: Clock, color: 'bg-blue-100 text-blue-800' },
  expired: { label: 'Expirat', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
};

// ==================== API FUNCTIONS ====================

async function fetchPricingRules(params: {
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ rules: PricingRule[]; total: number; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set('type', params.type);
  if (params.status) searchParams.set('status', params.status);
  if (params.search) searchParams.set('search', params.search);
  searchParams.set('page', String(params.page || 1));
  searchParams.set('limit', String(params.limit || 20));
  
  const response = await fetch(`/api/v1/sales/pricing/rules?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch pricing rules');
  return response.json();
}

async function toggleRuleStatus(ruleId: string, active: boolean): Promise<void> {
  const response = await fetch(`/api/v1/sales/pricing/rules/${ruleId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: active ? 'active' : 'inactive' }),
  });
  if (!response.ok) throw new Error('Failed to toggle rule status');
}

async function deleteRule(ruleId: string): Promise<void> {
  const response = await fetch(`/api/v1/sales/pricing/rules/${ruleId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete rule');
}

async function duplicateRule(ruleId: string): Promise<PricingRule> {
  const response = await fetch(`/api/v1/sales/pricing/rules/${ruleId}/duplicate`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to duplicate rule');
  return response.json();
}

async function fetchPricingStats(): Promise<{
  totalRules: number;
  activeRules: number;
  totalDiscountGiven: number;
  ordersAffected: number;
  avgDiscountPercent: number;
  topRules: Array<{ id: string; name: string; usage: number }>;
}> {
  const response = await fetch('/api/v1/sales/pricing/stats');
  if (!response.ok) throw new Error('Failed to fetch pricing stats');
  return response.json();
}

// ==================== MAIN COMPONENT ====================

export default function PricingRulesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Fetch pricing rules
  const { data: rulesData, isLoading } = useQuery({
    queryKey: ['pricing-rules', activeTab, statusFilter, typeFilter, searchQuery, page],
    queryFn: () => fetchPricingRules({
      type: typeFilter,
      status: statusFilter,
      search: searchQuery,
      page,
      limit: 20,
    }),
  });
  
  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['pricing-stats'],
    queryFn: fetchPricingStats,
  });
  
  // Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: ({ ruleId, active }: { ruleId: string; active: boolean }) =>
      toggleRuleStatus(ruleId, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      toast.success('Status actualizat');
    },
    onError: () => {
      toast.error('Eroare la actualizarea statusului');
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: deleteRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      toast.success('Regulă ștearsă');
    },
    onError: () => {
      toast.error('Eroare la ștergerea regulii');
    },
  });
  
  const duplicateMutation = useMutation({
    mutationFn: duplicateRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      toast.success('Regulă duplicată');
    },
    onError: () => {
      toast.error('Eroare la duplicarea regulii');
    },
  });
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prețuri și Discount-uri</h1>
          <p className="text-gray-500">
            Gestionează regulile de preț și discount-uri pentru AI Sales Agent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adaugă Regulă
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Creează Regulă de Preț</DialogTitle>
              </DialogHeader>
              <PricingRuleForm 
                onSuccess={() => {
                  setShowCreateDialog(false);
                  queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Reguli</p>
                <p className="text-2xl font-bold">{stats?.totalRules || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Reguli Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.activeRules || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Discount Total</p>
                <p className="text-2xl font-bold">
                  {(stats?.totalDiscountGiven || 0).toLocaleString('ro-RO')} RON
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Percent className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Comenzi Afectate</p>
                <p className="text-2xl font-bold">
                  {(stats?.ordersAffected || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Discount Mediu</p>
                <p className="text-2xl font-bold">
                  {(stats?.avgDiscountPercent || 0).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Reguli de Preț</CardTitle>
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Caută reguli..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              {/* Type Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    {typeFilter ? RULE_TYPES[typeFilter as keyof typeof RULE_TYPES]?.label : 'Tip'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setTypeFilter(undefined)}>
                    Toate tipurile
                  </DropdownMenuItem>
                  {Object.entries(RULE_TYPES).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={() => setTypeFilter(key)}>
                      <config.icon className="h-4 w-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    {statusFilter ? RULE_STATUS[statusFilter as keyof typeof RULE_STATUS]?.label : 'Status'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter(undefined)}>
                    Toate statusurile
                  </DropdownMenuItem>
                  {Object.entries(RULE_STATUS).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                      <config.icon className="h-4 w-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Toate</TabsTrigger>
              <TabsTrigger value="volume">Volum</TabsTrigger>
              <TabsTrigger value="client_tier">Tier Client</TabsTrigger>
              <TabsTrigger value="promotional">Promoționale</TabsTrigger>
              <TabsTrigger value="bundle">Bundle</TabsTrigger>
              <TabsTrigger value="seasonal">Sezoniere</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Activ</TableHead>
                    <TableHead>Nume Regulă</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Validitate</TableHead>
                    <TableHead>Utilizări</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Se încarcă...
                      </TableCell>
                    </TableRow>
                  ) : rulesData?.rules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Nu există reguli de preț
                      </TableCell>
                    </TableRow>
                  ) : (
                    rulesData?.rules.map((rule) => {
                      const typeConfig = RULE_TYPES[rule.type];
                      const statusConfig = RULE_STATUS[rule.status];
                      const TypeIcon = typeConfig.icon;
                      
                      return (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <Switch
                              checked={rule.status === 'active'}
                              onCheckedChange={(checked) =>
                                toggleStatusMutation.mutate({ ruleId: rule.id, active: checked })
                              }
                              disabled={rule.status === 'expired'}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{rule.name}</div>
                              <div className="text-sm text-gray-500 line-clamp-1">
                                {rule.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={typeConfig.color}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {typeConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {rule.discount.type === 'percentage' && (
                                <span>{rule.discount.value}%</span>
                              )}
                              {rule.discount.type === 'fixed' && (
                                <span>{rule.discount.value?.toLocaleString('ro-RO')} RON</span>
                              )}
                              {rule.discount.type === 'tiered' && (
                                <span>
                                  {rule.discount.tiers?.[0].value}% - {rule.discount.tiers?.[rule.discount.tiers.length - 1].value}%
                                </span>
                              )}
                            </div>
                            {rule.discount.requiresApproval && (
                              <Badge variant="outline" className="text-xs">
                                Necesită aprobare
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{format(parseISO(rule.validFrom), 'dd MMM yyyy', { locale: ro })}</div>
                              {rule.validTo && (
                                <div className="text-gray-500">
                                  → {format(parseISO(rule.validTo), 'dd MMM yyyy', { locale: ro })}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{rule.usageCount.toLocaleString()} utilizări</div>
                              {rule.usageLimit && (
                                <div className="text-gray-500">
                                  / {rule.usageLimit.toLocaleString()} limită
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {rule.totalDiscountGiven.toLocaleString('ro-RO')} RON
                              </div>
                              <div className="text-gray-500">
                                {rule.ordersAffected} comenzi
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedRule(rule)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Vizualizare
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editare
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => duplicateMutation.mutate(rule.id)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicare
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <History className="h-4 w-4 mr-2" />
                                  Istoric
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => deleteMutation.mutate(rule.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Ștergere
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {rulesData && rulesData.total > rulesData.limit && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Afișare {(page - 1) * rulesData.limit + 1} - {Math.min(page * rulesData.limit, rulesData.total)} din {rulesData.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page * rulesData.limit >= rulesData.total}
                      onClick={() => setPage(page + 1)}
                    >
                      Următor
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 6.2 Pricing Rule Form Component

```typescript
// components/sales/pricing/PricingRuleForm.tsx
'use client';

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Trash2,
  CalendarIcon,
  Info,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MultiSelect } from '@/components/ui/multi-select';

// ==================== SCHEMA ====================

const discountTierSchema = z.object({
  min: z.number().min(1, 'Cantitate minimă obligatorie'),
  max: z.number().min(1, 'Cantitate maximă obligatorie'),
  value: z.number().min(0.1, 'Discount minim 0.1%').max(100, 'Discount maxim 100%'),
});

const pricingRuleSchema = z.object({
  name: z.string().min(3, 'Numele trebuie să aibă minim 3 caractere'),
  description: z.string().optional(),
  type: z.enum(['volume', 'client_tier', 'promotional', 'bundle', 'seasonal', 'loyalty']),
  priority: z.number().min(1).max(100).default(50),
  
  // Conditions
  conditions: z.object({
    minQuantity: z.number().optional(),
    maxQuantity: z.number().optional(),
    clientTiers: z.array(z.string()).optional(),
    productCategories: z.array(z.string()).optional(),
    productSkus: z.array(z.string()).optional(),
    regionCodes: z.array(z.string()).optional(),
    paymentTerms: z.array(z.string()).optional(),
    orderValueMin: z.number().optional(),
    orderValueMax: z.number().optional(),
  }),
  
  // Discount
  discountType: z.enum(['percentage', 'fixed', 'tiered']),
  discountValue: z.number().optional(),
  discountTiers: z.array(discountTierSchema).optional(),
  maxDiscount: z.number().optional(),
  requiresApproval: z.boolean().default(false),
  approvalThreshold: z.number().optional(),
  
  // Validity
  validFrom: z.date(),
  validTo: z.date().optional(),
  
  // Usage
  usageLimit: z.number().optional(),
  perClientLimit: z.number().optional(),
});

type PricingRuleFormData = z.infer<typeof pricingRuleSchema>;

// ==================== COMPONENT ====================

interface PricingRuleFormProps {
  initialData?: Partial<PricingRuleFormData>;
  onSuccess: () => void;
}

export function PricingRuleForm({ initialData, onSuccess }: PricingRuleFormProps) {
  const form = useForm<PricingRuleFormData>({
    resolver: zodResolver(pricingRuleSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'volume',
      priority: 50,
      conditions: {},
      discountType: 'percentage',
      requiresApproval: false,
      validFrom: new Date(),
      ...initialData,
    },
  });
  
  const { fields: tierFields, append: appendTier, remove: removeTier } = useFieldArray({
    control: form.control,
    name: 'discountTiers',
  });
  
  const discountType = form.watch('discountType');
  const ruleType = form.watch('type');
  const requiresApproval = form.watch('requiresApproval');
  
  const createMutation = useMutation({
    mutationFn: async (data: PricingRuleFormData) => {
      const response = await fetch('/api/v1/sales/pricing/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create rule');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Regulă creată cu succes');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Eroare la crearea regulii');
    },
  });
  
  const onSubmit = (data: PricingRuleFormData) => {
    createMutation.mutate(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="conditions">Condiții</TabsTrigger>
            <TabsTrigger value="discount">Discount</TabsTrigger>
            <TabsTrigger value="validity">Validitate</TabsTrigger>
          </TabsList>
          
          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nume Regulă *</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Discount Volum Mare" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descriere</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descriere detaliată a regulii..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tip Regulă *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectează tipul" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="volume">Discount Volum</SelectItem>
                        <SelectItem value="client_tier">Tier Client</SelectItem>
                        <SelectItem value="promotional">Promoțional</SelectItem>
                        <SelectItem value="bundle">Bundle</SelectItem>
                        <SelectItem value="seasonal">Sezonier</SelectItem>
                        <SelectItem value="loyalty">Loialitate</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Tipul determină logica de aplicare a discount-ului
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioritate (1-100)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Regulile cu prioritate mai mare se aplică primele
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
          
          {/* Conditions Tab */}
          <TabsContent value="conditions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Condiții de Aplicare</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quantity Conditions */}
                {(ruleType === 'volume' || ruleType === 'bundle') && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="conditions.minQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantitate Minimă</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="ex: 10"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="conditions.maxQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantitate Maximă</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="ex: 100"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {/* Client Tier Conditions */}
                {ruleType === 'client_tier' && (
                  <FormField
                    control={form.control}
                    name="conditions.clientTiers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier-uri Client</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={[
                              { value: 'standard', label: 'Standard' },
                              { value: 'silver', label: 'Silver' },
                              { value: 'gold', label: 'Gold' },
                              { value: 'platinum', label: 'Platinum' },
                            ]}
                            selected={field.value || []}
                            onChange={field.onChange}
                            placeholder="Selectează tier-uri"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* Order Value Conditions */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="conditions.orderValueMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valoare Comandă Min (RON)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="ex: 5000"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="conditions.orderValueMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valoare Comandă Max (RON)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="ex: 50000"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Product Categories */}
                <FormField
                  control={form.control}
                  name="conditions.productCategories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categorii Produse (opțional)</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={[
                            { value: 'seminte', label: 'Semințe' },
                            { value: 'fertilizanti', label: 'Fertilizanți' },
                            { value: 'pesticide', label: 'Pesticide' },
                            { value: 'echipamente', label: 'Echipamente' },
                            { value: 'irigatie', label: 'Irigație' },
                          ]}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder="Toate categoriile"
                        />
                      </FormControl>
                      <FormDescription>
                        Lasă gol pentru a aplica la toate produsele
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Region Codes */}
                <FormField
                  control={form.control}
                  name="conditions.regionCodes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regiuni (opțional)</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={[
                            { value: 'B', label: 'București' },
                            { value: 'CJ', label: 'Cluj' },
                            { value: 'TM', label: 'Timiș' },
                            { value: 'IS', label: 'Iași' },
                            { value: 'CT', label: 'Constanța' },
                            // ... alte județe
                          ]}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder="Toate regiunile"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Discount Tab */}
          <TabsContent value="discount" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configurare Discount</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tip Discount *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Procent (%)</SelectItem>
                          <SelectItem value="fixed">Sumă Fixă (RON)</SelectItem>
                          <SelectItem value="tiered">Trepte (pe cantitate)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Percentage/Fixed Discount */}
                {(discountType === 'percentage' || discountType === 'fixed') && (
                  <FormField
                    control={form.control}
                    name="discountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Valoare Discount {discountType === 'percentage' ? '(%)' : '(RON)'}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step={discountType === 'percentage' ? '0.1' : '1'}
                            placeholder={discountType === 'percentage' ? 'ex: 10' : 'ex: 500'}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* Tiered Discount */}
                {discountType === 'tiered' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <FormLabel>Trepte Discount</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendTier({ min: 1, max: 10, value: 5 })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adaugă Treaptă
                      </Button>
                    </div>
                    
                    {tierFields.map((tier, index) => (
                      <div key={tier.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name={`discountTiers.${index}.min`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Cantitate Min</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name={`discountTiers.${index}.max`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Cantitate Max</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name={`discountTiers.${index}.value`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Discount (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-6"
                          onClick={() => removeTier(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    
                    {tierFields.length === 0 && (
                      <div className="text-center py-4 text-gray-500 border rounded-lg">
                        Adaugă cel puțin o treaptă de discount
                      </div>
                    )}
                  </div>
                )}
                
                <Separator />
                
                {/* Max Discount */}
                <FormField
                  control={form.control}
                  name="maxDiscount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Maxim (RON)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="ex: 10000"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Limită superioară pentru discount, indiferent de procentaj
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Approval Settings */}
                <div className="p-4 bg-yellow-50 rounded-lg space-y-4">
                  <FormField
                    control={form.control}
                    name="requiresApproval"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Necesită Aprobare HITL</FormLabel>
                          <FormDescription>
                            Discount-ul va fi trimis pentru aprobare manuală
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {requiresApproval && (
                    <FormField
                      control={form.control}
                      name="approvalThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prag Aprobare (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="ex: 15"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormDescription>
                            Discount peste acest prag necesită aprobare automată
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Validity Tab */}
          <TabsContent value="validity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Perioada de Validitate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="validFrom"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data Început *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP', { locale: ro })
                                ) : (
                                  <span>Selectează data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              locale={ro}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="validTo"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data Sfârșit (opțional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP', { locale: ro })
                                ) : (
                                  <span>Fără dată de expirare</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              locale={ro}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Lasă gol pentru validitate nelimitată
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="usageLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limită Utilizări Totale</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="ex: 1000"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Număr maxim de aplicări ale regulii
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="perClientLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limită per Client</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="ex: 5"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Câte ori poate beneficia un client
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t">
          <Button type="button" variant="outline">
            Anulează
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Se salvează...' : 'Salvează Regulă'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### 6.3 Discount Calculator Preview

Componentă pentru previzualizarea calculului discount în timp real.

```typescript
// components/sales/pricing/DiscountCalculator.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calculator,
  Tag,
  ShoppingCart,
  Percent,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscountCalculatorProps {
  productSku?: string;
  clientId?: string;
}

interface ApplicableRule {
  id: string;
  name: string;
  type: string;
  discount: number;
  discountAmount: number;
  requiresApproval: boolean;
  priority: number;
}

interface CalculationResult {
  basePrice: number;
  quantity: number;
  subtotal: number;
  applicableRules: ApplicableRule[];
  totalDiscount: number;
  totalDiscountPercent: number;
  finalPrice: number;
  requiresApproval: boolean;
  approvalReason?: string;
}

export function DiscountCalculator({ productSku, clientId }: DiscountCalculatorProps) {
  const [selectedSku, setSelectedSku] = useState(productSku || '');
  const [selectedClientId, setSelectedClientId] = useState(clientId || '');
  const [quantity, setQuantity] = useState(1);
  
  // Fetch products for selection
  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const response = await fetch('/api/v1/sales/products?limit=100');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      return data.products;
    },
  });
  
  // Fetch clients for selection
  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const response = await fetch('/api/v1/sales/clients?limit=100');
      if (!response.ok) throw new Error('Failed to fetch clients');
      const data = await response.json();
      return data.clients;
    },
  });
  
  // Calculate discount
  const { data: calculation, isLoading } = useQuery({
    queryKey: ['discount-calculation', selectedSku, selectedClientId, quantity],
    queryFn: async () => {
      if (!selectedSku) return null;
      
      const response = await fetch('/api/v1/sales/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSku: selectedSku,
          clientId: selectedClientId || undefined,
          quantity,
        }),
      });
      if (!response.ok) throw new Error('Failed to calculate discount');
      return response.json() as Promise<CalculationResult>;
    },
    enabled: !!selectedSku && quantity > 0,
  });
  
  const selectedProduct = useMemo(() =>
    products?.find((p: any) => p.sku === selectedSku),
    [products, selectedSku]
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Calculator Discount
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Produs</Label>
            <Select value={selectedSku} onValueChange={setSelectedSku}>
              <SelectTrigger>
                <SelectValue placeholder="Selectează produs" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((product: any) => (
                  <SelectItem key={product.sku} value={product.sku}>
                    {product.name} ({product.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Client (opțional)</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Fără client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Fără client</SelectItem>
                {clients?.map((client: any) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Cantitate</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
        
        <Separator />
        
        {/* Results Section */}
        {calculation && (
          <div className="space-y-4">
            {/* Price Breakdown */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex justify-between text-sm">
                <span>Preț unitar:</span>
                <span>{calculation.basePrice.toLocaleString('ro-RO')} RON</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cantitate:</span>
                <span>{calculation.quantity} buc</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Subtotal:</span>
                <span>{calculation.subtotal.toLocaleString('ro-RO')} RON</span>
              </div>
            </div>
            
            {/* Applied Rules */}
            {calculation.applicableRules.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Reguli Aplicate
                </Label>
                <div className="space-y-2">
                  {calculation.applicableRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="font-medium text-sm">{rule.name}</p>
                          <p className="text-xs text-gray-500">
                            {rule.type} • Prioritate: {rule.priority}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          -{rule.discount}%
                        </p>
                        <p className="text-xs text-gray-500">
                          -{rule.discountAmount.toLocaleString('ro-RO')} RON
                        </p>
                        {rule.requiresApproval && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Necesită aprobare
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {calculation.applicableRules.length === 0 && (
              <div className="flex items-center gap-2 p-4 bg-yellow-50 rounded-lg text-yellow-800">
                <Info className="h-4 w-4" />
                <span className="text-sm">
                  Nu există reguli de discount aplicabile pentru această configurație
                </span>
              </div>
            )}
            
            {/* Final Summary */}
            <div className="p-4 bg-green-50 rounded-lg space-y-3">
              <div className="flex justify-between text-sm">
                <span>Discount Total:</span>
                <span className="font-medium text-green-600">
                  -{calculation.totalDiscount.toLocaleString('ro-RO')} RON
                  ({calculation.totalDiscountPercent.toFixed(1)}%)
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Preț Final:</span>
                <span className="text-green-700">
                  {calculation.finalPrice.toLocaleString('ro-RO')} RON
                </span>
              </div>
            </div>
            
            {/* Approval Warning */}
            {calculation.requiresApproval && (
              <div className="flex items-start gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">
                    Necesită Aprobare HITL
                  </p>
                  <p className="text-sm text-yellow-700">
                    {calculation.approvalReason || 'Discount-ul depășește pragul de aprobare automată'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {isLoading && (
          <div className="text-center py-8 text-gray-500">
            Se calculează...
          </div>
        )}
        
        {!selectedSku && (
          <div className="text-center py-8 text-gray-500">
            Selectează un produs pentru a calcula discount-ul
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 7. Pagini Documente (Documents)

### 7.1 Documents List Page

Pagina centrală pentru gestionarea tuturor documentelor de vânzare: proforme, facturi, e-Facturi.

**Route:** `/sales/documents`

```typescript
// app/sales/documents/page.tsx
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Eye,
  MoreHorizontal,
  Search,
  Filter,
  RefreshCw,
  Send,
  Printer,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  FileCheck,
  Building2,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Mail,
  Plus,
  Copy,
  Trash2,
  History,
  ExternalLink,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { DateRange } from 'react-day-picker';

// ==================== TYPES ====================

type DocumentType = 'proforma' | 'invoice';
type DocumentStatus = 'draft' | 'pending' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
type EFacturaStatus = 'not_submitted' | 'pending' | 'processing' | 'accepted' | 'rejected' | 'error';

interface SalesDocument {
  id: string;
  tenantId: string;
  type: DocumentType;
  documentNumber: string;
  series: string;
  negotiationId: string;
  
  // Client
  clientId: string;
  clientName: string;
  clientCui: string;
  
  // Amounts
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  
  // Status
  status: DocumentStatus;
  
  // e-Factura
  eFacturaStatus?: EFacturaStatus;
  eFacturaUploadId?: string;
  eFacturaDownloadId?: string;
  eFacturaDeadline?: string;
  
  // Dates
  issueDate: string;
  dueDate?: string;
  sentAt?: string;
  viewedAt?: string;
  paidAt?: string;
  
  // Files
  pdfUrl?: string;
  xmlUrl?: string;
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== CONSTANTS ====================

const DOCUMENT_STATUS = {
  draft: { label: 'Ciornă', icon: FileText, color: 'bg-gray-100 text-gray-800' },
  pending: { label: 'În așteptare', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  sent: { label: 'Trimis', icon: Send, color: 'bg-blue-100 text-blue-800' },
  viewed: { label: 'Vizualizat', icon: Eye, color: 'bg-purple-100 text-purple-800' },
  paid: { label: 'Plătit', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  overdue: { label: 'Restant', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Anulat', icon: XCircle, color: 'bg-gray-100 text-gray-500' },
};

const EFACTURA_STATUS = {
  not_submitted: { label: 'Ne-trimis', icon: Clock, color: 'bg-gray-100 text-gray-800' },
  pending: { label: 'În curs', icon: RefreshCw, color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Se procesează', icon: RefreshCw, color: 'bg-blue-100 text-blue-800' },
  accepted: { label: 'Acceptat', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Respins', icon: XCircle, color: 'bg-red-100 text-red-800' },
  error: { label: 'Eroare', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
};

// ==================== API FUNCTIONS ====================

async function fetchDocuments(params: {
  type?: DocumentType;
  status?: string;
  eFacturaStatus?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<{ documents: SalesDocument[]; total: number; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  
  const response = await fetch(`/api/v1/sales/documents?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch documents');
  return response.json();
}

async function fetchDocumentStats(): Promise<{
  totalProformas: number;
  totalInvoices: number;
  pendingEFactura: number;
  overdueInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
}> {
  const response = await fetch('/api/v1/sales/documents/stats');
  if (!response.ok) throw new Error('Failed to fetch document stats');
  return response.json();
}

async function downloadDocument(documentId: string, format: 'pdf' | 'xml'): Promise<void> {
  const response = await fetch(`/api/v1/sales/documents/${documentId}/download?format=${format}`);
  if (!response.ok) throw new Error('Failed to download document');
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `document-${documentId}.${format}`;
  a.click();
  window.URL.revokeObjectURL(url);
}

async function sendDocument(documentId: string): Promise<void> {
  const response = await fetch(`/api/v1/sales/documents/${documentId}/send`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to send document');
}

async function submitToEFactura(documentId: string): Promise<void> {
  const response = await fetch(`/api/v1/sales/documents/${documentId}/efactura/submit`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to submit to e-Factura');
}

async function checkEFacturaStatus(documentId: string): Promise<void> {
  const response = await fetch(`/api/v1/sales/documents/${documentId}/efactura/status`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to check e-Factura status');
}

// ==================== MAIN COMPONENT ====================

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'proforma' | 'invoice'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [eFacturaFilter, setEFacturaFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState<SalesDocument | null>(null);
  
  // Fetch documents
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['documents', activeTab, statusFilter, eFacturaFilter, searchQuery, dateRange, page],
    queryFn: () => fetchDocuments({
      type: activeTab !== 'all' ? activeTab : undefined,
      status: statusFilter,
      eFacturaStatus: eFacturaFilter,
      search: searchQuery,
      dateFrom: dateRange?.from?.toISOString(),
      dateTo: dateRange?.to?.toISOString(),
      page,
      limit: 20,
    }),
  });
  
  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['document-stats'],
    queryFn: fetchDocumentStats,
  });
  
  // Mutations
  const downloadMutation = useMutation({
    mutationFn: ({ documentId, format }: { documentId: string; format: 'pdf' | 'xml' }) =>
      downloadDocument(documentId, format),
    onSuccess: () => {
      toast.success('Document descărcat');
    },
    onError: () => {
      toast.error('Eroare la descărcarea documentului');
    },
  });
  
  const sendMutation = useMutation({
    mutationFn: sendDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document trimis cu succes');
    },
    onError: () => {
      toast.error('Eroare la trimiterea documentului');
    },
  });
  
  const submitEFacturaMutation = useMutation({
    mutationFn: submitToEFactura,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document trimis la e-Factura');
    },
    onError: () => {
      toast.error('Eroare la trimiterea către e-Factura');
    },
  });
  
  const checkStatusMutation = useMutation({
    mutationFn: checkEFacturaStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Status actualizat');
    },
    onError: () => {
      toast.error('Eroare la verificarea statusului');
    },
  });
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documente</h1>
          <p className="text-gray-500">
            Gestionează proforme, facturi și e-Facturi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/sales/documents/proforma/new">
              <Plus className="h-4 w-4 mr-2" />
              Proformă Nouă
            </Link>
          </Button>
          <Button asChild>
            <Link href="/sales/documents/invoice/new">
              <Plus className="h-4 w-4 mr-2" />
              Factură Nouă
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Proforme</p>
                <p className="text-2xl font-bold">{stats?.totalProformas || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Facturi</p>
                <p className="text-2xl font-bold">{stats?.totalInvoices || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FileCheck className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">e-Factura Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats?.pendingEFactura || 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Restante</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats?.overdueInvoices || 0}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Venit Total</p>
                <p className="text-2xl font-bold">
                  {(stats?.totalRevenue || 0).toLocaleString('ro-RO')}
                </p>
                <p className="text-xs text-gray-500">RON</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-full">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">De Încasat</p>
                <p className="text-2xl font-bold">
                  {(stats?.pendingAmount || 0).toLocaleString('ro-RO')}
                </p>
                <p className="text-xs text-gray-500">RON</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <ArrowUpRight className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista Documente</CardTitle>
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Caută după număr, client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              {/* Date Range */}
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Perioada"
              />
              
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter(undefined)}>
                    Toate
                  </DropdownMenuItem>
                  {Object.entries(DOCUMENT_STATUS).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                      <config.icon className="h-4 w-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* e-Factura Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    e-Factura
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setEFacturaFilter(undefined)}>
                    Toate
                  </DropdownMenuItem>
                  {Object.entries(EFACTURA_STATUS).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={() => setEFacturaFilter(key)}>
                      <config.icon className="h-4 w-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Toate</TabsTrigger>
              <TabsTrigger value="proforma">Proforme</TabsTrigger>
              <TabsTrigger value="invoice">Facturi</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Număr</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Sumă</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>e-Factura</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Se încarcă...
                      </TableCell>
                    </TableRow>
                  ) : documentsData?.documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Nu există documente
                      </TableCell>
                    </TableRow>
                  ) : (
                    documentsData?.documents.map((doc) => {
                      const statusConfig = DOCUMENT_STATUS[doc.status];
                      const StatusIcon = statusConfig.icon;
                      const eFacturaConfig = doc.eFacturaStatus ? EFACTURA_STATUS[doc.eFacturaStatus] : null;
                      const EFacturaIcon = eFacturaConfig?.icon;
                      
                      // Calculate if e-Factura deadline is near
                      const daysUntilDeadline = doc.eFacturaDeadline
                        ? differenceInDays(parseISO(doc.eFacturaDeadline), new Date())
                        : null;
                      
                      return (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="font-medium">
                              {doc.series}-{doc.documentNumber}
                            </div>
                            <div className="text-xs text-gray-500">
                              {doc.id.slice(0, 8)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {doc.type === 'proforma' ? 'Proformă' : 'Factură'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{doc.clientName}</div>
                              <div className="text-sm text-gray-500">
                                CUI: {doc.clientCui}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(parseISO(doc.issueDate), 'dd MMM yyyy', { locale: ro })}
                            </div>
                            {doc.dueDate && (
                              <div className={cn(
                                'text-xs',
                                doc.status === 'overdue' ? 'text-red-600' : 'text-gray-500'
                              )}>
                                Scadent: {format(parseISO(doc.dueDate), 'dd MMM', { locale: ro })}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {doc.totalAmount.toLocaleString('ro-RO')} RON
                            </div>
                            <div className="text-xs text-gray-500">
                              TVA: {doc.vatAmount.toLocaleString('ro-RO')} RON
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {doc.type === 'invoice' && eFacturaConfig && EFacturaIcon && (
                              <div className="space-y-1">
                                <Badge className={eFacturaConfig.color}>
                                  <EFacturaIcon className="h-3 w-3 mr-1" />
                                  {eFacturaConfig.label}
                                </Badge>
                                {daysUntilDeadline !== null && daysUntilDeadline <= 2 && daysUntilDeadline >= 0 && (
                                  <div className="text-xs text-red-600 font-medium">
                                    {daysUntilDeadline === 0 ? 'Azi!' : `${daysUntilDeadline} zile`}
                                  </div>
                                )}
                              </div>
                            )}
                            {doc.type === 'proforma' && (
                              <span className="text-xs text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/sales/documents/${doc.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Vizualizare
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => downloadMutation.mutate({
                                    documentId: doc.id,
                                    format: 'pdf'
                                  })}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Descarcă PDF
                                </DropdownMenuItem>
                                {doc.type === 'invoice' && (
                                  <DropdownMenuItem
                                    onClick={() => downloadMutation.mutate({
                                      documentId: doc.id,
                                      format: 'xml'
                                    })}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Descarcă XML
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {doc.status === 'draft' && (
                                  <DropdownMenuItem
                                    onClick={() => sendMutation.mutate(doc.id)}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Trimite Client
                                  </DropdownMenuItem>
                                )}
                                {doc.type === 'invoice' && doc.eFacturaStatus === 'not_submitted' && (
                                  <DropdownMenuItem
                                    onClick={() => submitEFacturaMutation.mutate(doc.id)}
                                  >
                                    <ArrowUpRight className="h-4 w-4 mr-2" />
                                    Trimite e-Factura
                                  </DropdownMenuItem>
                                )}
                                {doc.type === 'invoice' && ['pending', 'processing'].includes(doc.eFacturaStatus || '') && (
                                  <DropdownMenuItem
                                    onClick={() => checkStatusMutation.mutate(doc.id)}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Verifică Status SPV
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplică
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <History className="h-4 w-4 mr-2" />
                                  Istoric
                                </DropdownMenuItem>
                                {doc.type === 'proforma' && doc.status !== 'cancelled' && (
                                  <DropdownMenuItem>
                                    <FileCheck className="h-4 w-4 mr-2" />
                                    Convertește în Factură
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Anulează
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {documentsData && documentsData.total > documentsData.limit && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Afișare {(page - 1) * documentsData.limit + 1} - {Math.min(page * documentsData.limit, documentsData.total)} din {documentsData.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page * documentsData.limit >= documentsData.total}
                      onClick={() => setPage(page + 1)}
                    >
                      Următor
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 7.2 Document Detail Page

Pagina de vizualizare detaliată a unui document cu previzualizare PDF și timeline.

**Route:** `/sales/documents/[id]`

```typescript
// app/sales/documents/[id]/page.tsx
'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Download,
  Send,
  Printer,
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Mail,
  FileCheck,
  ArrowUpRight,
  Copy,
  Edit,
  XCircle,
  Eye,
  ExternalLink,
  Package,
  User,
  MapPin,
  Phone,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

// ... (types from previous section)

// ==================== COMPONENTS ====================

function DocumentTimeline({ events }: { events: any[] }) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="flex items-start gap-4">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            event.type === 'created' && 'bg-blue-100',
            event.type === 'sent' && 'bg-green-100',
            event.type === 'viewed' && 'bg-purple-100',
            event.type === 'paid' && 'bg-emerald-100',
            event.type === 'efactura' && 'bg-orange-100',
            event.type === 'error' && 'bg-red-100',
          )}>
            {event.type === 'created' && <FileText className="h-4 w-4 text-blue-600" />}
            {event.type === 'sent' && <Send className="h-4 w-4 text-green-600" />}
            {event.type === 'viewed' && <Eye className="h-4 w-4 text-purple-600" />}
            {event.type === 'paid' && <CheckCircle className="h-4 w-4 text-emerald-600" />}
            {event.type === 'efactura' && <ArrowUpRight className="h-4 w-4 text-orange-600" />}
            {event.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{event.title}</p>
            <p className="text-sm text-gray-500">{event.description}</p>
            <p className="text-xs text-gray-400 mt-1">
              {format(parseISO(event.timestamp), 'dd MMM yyyy HH:mm', { locale: ro })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PDFViewer({ url }: { url: string }) {
  return (
    <div className="w-full h-[600px] border rounded-lg overflow-hidden bg-gray-100">
      <iframe
        src={`${url}#toolbar=0`}
        className="w-full h-full"
        title="Document Preview"
      />
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.id as string;
  const queryClient = useQueryClient();
  
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  
  // Fetch document
  const { data: document, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/sales/documents/${documentId}`);
      if (!response.ok) throw new Error('Failed to fetch document');
      return response.json();
    },
  });
  
  // Fetch timeline
  const { data: timeline } = useQuery({
    queryKey: ['document-timeline', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/sales/documents/${documentId}/timeline`);
      if (!response.ok) throw new Error('Failed to fetch timeline');
      return response.json();
    },
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (!document) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">Document negăsit</h2>
        <p className="text-gray-500 mt-2">Documentul solicitat nu există sau a fost șters.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/sales/documents">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Înapoi la documente
          </Link>
        </Button>
      </div>
    );
  }
  
  const statusConfig = DOCUMENT_STATUS[document.status as keyof typeof DOCUMENT_STATUS];
  const StatusIcon = statusConfig?.icon || FileText;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/sales/documents">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Înapoi
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {document.series}-{document.documentNumber}
              </h1>
              <Badge variant="outline">
                {document.type === 'proforma' ? 'Proformă' : 'Factură'}
              </Badge>
              <Badge className={statusConfig?.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig?.label}
              </Badge>
            </div>
            <p className="text-gray-500">
              Emis pe {format(parseISO(document.issueDate), 'dd MMMM yyyy', { locale: ro })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Printează
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          {document.type === 'invoice' && (
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              XML
            </Button>
          )}
          {document.status === 'draft' && (
            <>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editează
              </Button>
              <Button onClick={() => setShowSendDialog(true)}>
                <Send className="h-4 w-4 mr-2" />
                Trimite
              </Button>
            </>
          )}
          {document.type === 'proforma' && document.status !== 'cancelled' && (
            <Button onClick={() => setShowConvertDialog(true)}>
              <FileCheck className="h-4 w-4 mr-2" />
              Convertește în Factură
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Document Preview */}
        <div className="col-span-2 space-y-6">
          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">Previzualizare</TabsTrigger>
              <TabsTrigger value="items">Articole</TabsTrigger>
              <TabsTrigger value="history">Istoric</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preview" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {document.pdfUrl ? (
                    <PDFViewer url={document.pdfUrl} />
                  ) : (
                    <div className="h-[600px] flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">PDF în curs de generare...</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="items" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Produs</TableHead>
                        <TableHead className="text-right">Cantitate</TableHead>
                        <TableHead className="text-right">Preț unitar</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">TVA</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {document.items?.map((item: any, index: number) => (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.productName}</div>
                              <div className="text-sm text-gray-500">SKU: {item.productSku}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.unitPrice.toLocaleString('ro-RO')} RON
                          </TableCell>
                          <TableCell className="text-right">
                            {item.discountPercent > 0 ? (
                              <span className="text-green-600">-{item.discountPercent}%</span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.vatRate}%
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.totalAmount.toLocaleString('ro-RO')} RON
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Totals */}
                  <div className="p-4 bg-gray-50 border-t">
                    <div className="w-64 ml-auto space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{document.subtotal.toLocaleString('ro-RO')} RON</span>
                      </div>
                      {document.totalDiscount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount:</span>
                          <span>-{document.totalDiscount.toLocaleString('ro-RO')} RON</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span>TVA:</span>
                        <span>{document.vatAmount.toLocaleString('ro-RO')} RON</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Total:</span>
                        <span>{document.totalAmount.toLocaleString('ro-RO')} RON</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Istoric Document</CardTitle>
                </CardHeader>
                <CardContent>
                  {timeline?.events && <DocumentTimeline events={timeline.events} />}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{document.clientName}</p>
                <p className="text-sm text-gray-500">CUI: {document.clientCui}</p>
                {document.clientRegCom && (
                  <p className="text-sm text-gray-500">Reg. Com.: {document.clientRegCom}</p>
                )}
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span>{document.clientAddress}</span>
                </div>
                {document.clientEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{document.clientEmail}</span>
                  </div>
                )}
                {document.clientPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{document.clientPhone}</span>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/prospecting/contacts/${document.clientId}`}>
                  Vezi Fișa Client
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          {/* Document Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalii Document
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Serie/Număr</p>
                  <p className="font-medium">{document.series}-{document.documentNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500">Data Emiterii</p>
                  <p className="font-medium">
                    {format(parseISO(document.issueDate), 'dd.MM.yyyy', { locale: ro })}
                  </p>
                </div>
                {document.dueDate && (
                  <div>
                    <p className="text-gray-500">Data Scadentă</p>
                    <p className="font-medium">
                      {format(parseISO(document.dueDate), 'dd.MM.yyyy', { locale: ro })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">Monedă</p>
                  <p className="font-medium">{document.currency}</p>
                </div>
              </div>
              
              {document.negotiationId && (
                <>
                  <Separator />
                  <div>
                    <p className="text-gray-500 text-sm">Negociere</p>
                    <Button variant="link" className="h-auto p-0" asChild>
                      <Link href={`/sales/negotiations/${document.negotiationId}`}>
                        Vezi Negocierea →
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* e-Factura Status */}
          {document.type === 'invoice' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5" />
                  e-Factura SPV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {document.eFacturaStatus && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Status</span>
                      <Badge className={EFACTURA_STATUS[document.eFacturaStatus as keyof typeof EFACTURA_STATUS]?.color}>
                        {EFACTURA_STATUS[document.eFacturaStatus as keyof typeof EFACTURA_STATUS]?.label}
                      </Badge>
                    </div>
                    
                    {document.eFacturaUploadId && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Upload ID</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {document.eFacturaUploadId}
                        </code>
                      </div>
                    )}
                    
                    {document.eFacturaDownloadId && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Download ID</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {document.eFacturaDownloadId}
                        </code>
                      </div>
                    )}
                    
                    {document.eFacturaDeadline && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Deadline</span>
                        <span className={cn(
                          'font-medium',
                          new Date(document.eFacturaDeadline) < new Date() && 'text-red-600'
                        )}>
                          {format(parseISO(document.eFacturaDeadline), 'dd.MM.yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                  </>
                )}
                
                {!document.eFacturaStatus || document.eFacturaStatus === 'not_submitted' ? (
                  <Button className="w-full">
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Trimite la ANAF SPV
                  </Button>
                ) : ['pending', 'processing'].includes(document.eFacturaStatus) ? (
                  <Button variant="outline" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verifică Status
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          )}
          
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Sumar Financiar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{document.subtotal.toLocaleString('ro-RO')} RON</span>
                </div>
                {document.totalDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{document.totalDiscount.toLocaleString('ro-RO')} RON</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">TVA ({document.vatRate}%)</span>
                  <span>{document.vatAmount.toLocaleString('ro-RO')} RON</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{document.totalAmount.toLocaleString('ro-RO')} RON</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trimite Document</DialogTitle>
            <DialogDescription>
              Documentul va fi trimis pe email către client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Destinatar</p>
              <p className="font-medium">{document.clientEmail}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Document</p>
              <p className="font-medium">{document.series}-{document.documentNumber}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Anulează
            </Button>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Trimite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Convert to Invoice Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertește în Factură</DialogTitle>
            <DialogDescription>
              Proforma va fi convertită într-o factură fiscală.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Această acțiune este ireversibilă. Proforma va fi marcată ca finalizată.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
              Anulează
            </Button>
            <Button>
              <FileCheck className="h-4 w-4 mr-2" />
              Creează Factură
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## 8. Pagini Conversații AI (AI Conversations)

### 8.1 Conversations List Page

Pagina pentru vizualizarea și monitorizarea tuturor conversațiilor gestionate de AI Agent.

**Route:** `/sales/ai-conversations`

```typescript
// app/sales/ai-conversations/page.tsx
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Search,
  Filter,
  Bot,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Flag,
  MessageCircle,
  Zap,
  Phone,
  Mail,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ==================== TYPES ====================

interface AIConversation {
  id: string;
  tenantId: string;
  negotiationId: string;
  
  // Client
  clientId: string;
  clientName: string;
  clientCompany: string;
  
  // Channel
  channel: 'whatsapp' | 'email';
  channelIdentifier: string;
  
  // Status
  status: 'active' | 'paused' | 'completed' | 'escalated' | 'human_takeover';
  
  // AI Metrics
  aiModel: string;
  totalMessages: number;
  aiMessages: number;
  humanMessages: number;
  avgResponseTime: number;
  
  // Sentiment
  overallSentiment: number;
  sentimentTrend: 'improving' | 'stable' | 'declining';
  
  // Guardrails
  guardrailChecks: number;
  guardrailViolations: number;
  regenerations: number;
  
  // Timestamps
  startedAt: string;
  lastMessageAt: string;
  endedAt?: string;
  
  // Last message preview
  lastMessage: {
    role: 'ai' | 'client';
    content: string;
    timestamp: string;
  };
}

// ==================== CONSTANTS ====================

const CONVERSATION_STATUS = {
  active: { label: 'Activ', icon: MessageSquare, color: 'bg-green-100 text-green-800' },
  paused: { label: 'Pauză', icon: Pause, color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Finalizat', icon: CheckCircle, color: 'bg-blue-100 text-blue-800' },
  escalated: { label: 'Escaladat', icon: AlertTriangle, color: 'bg-orange-100 text-orange-800' },
  human_takeover: { label: 'Preluare Umană', icon: User, color: 'bg-purple-100 text-purple-800' },
};

const CHANNEL_CONFIG = {
  whatsapp: { label: 'WhatsApp', icon: Phone, color: 'text-green-600' },
  email: { label: 'Email', icon: Mail, color: 'text-blue-600' },
};

// ==================== API FUNCTIONS ====================

async function fetchConversations(params: {
  status?: string;
  channel?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  conversations: AIConversation[];
  total: number;
  page: number;
  limit: number;
}> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  
  const response = await fetch(`/api/v1/sales/ai-conversations?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch conversations');
  return response.json();
}

async function fetchConversationStats(): Promise<{
  activeConversations: number;
  todayMessages: number;
  avgSentiment: number;
  escalationRate: number;
  avgResponseTime: number;
  guardrailViolationRate: number;
}> {
  const response = await fetch('/api/v1/sales/ai-conversations/stats');
  if (!response.ok) throw new Error('Failed to fetch conversation stats');
  return response.json();
}

// ==================== COMPONENTS ====================

function SentimentIndicator({ value, trend }: { value: number; trend: string }) {
  const getColor = () => {
    if (value > 0.3) return 'text-green-600';
    if (value < -0.3) return 'text-red-600';
    return 'text-gray-600';
  };
  
  const getIcon = () => {
    if (value > 0.3) return <ThumbsUp className="h-4 w-4" />;
    if (value < -0.3) return <ThumbsDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };
  
  const getTrendIcon = () => {
    if (trend === 'improving') return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="h-3 w-3 text-red-500" />;
    return null;
  };
  
  return (
    <div className="flex items-center gap-1">
      <span className={getColor()}>{getIcon()}</span>
      <span className="text-sm">{(value * 100).toFixed(0)}%</span>
      {getTrendIcon()}
    </div>
  );
}

function ConversationPreview({ conversation }: { conversation: AIConversation }) {
  return (
    <div className="flex items-start gap-2">
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
        conversation.lastMessage.role === 'ai' ? 'bg-purple-100' : 'bg-gray-100'
      )}>
        {conversation.lastMessage.role === 'ai' ? (
          <Bot className="h-3 w-3 text-purple-600" />
        ) : (
          <User className="h-3 w-3 text-gray-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-600 line-clamp-2">
          {conversation.lastMessage.content}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {formatDistanceToNow(parseISO(conversation.lastMessage.timestamp), { 
            addSuffix: true,
            locale: ro 
          })}
        </p>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function AIConversationsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [channelFilter, setChannelFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  
  // Fetch conversations
  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ['ai-conversations', activeTab, statusFilter, channelFilter, searchQuery, page],
    queryFn: () => fetchConversations({
      status: activeTab !== 'all' ? activeTab : statusFilter,
      channel: channelFilter,
      search: searchQuery,
      page,
      limit: 20,
    }),
  });
  
  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['ai-conversations-stats'],
    queryFn: fetchConversationStats,
    refetchInterval: 30000, // Refresh every 30s
  });
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conversații AI</h1>
          <p className="text-gray-500">
            Monitorizează conversațiile gestionate de AI Sales Agent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            AI Agent Activ
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Acum</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.activeConversations || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Mesaje Azi</p>
                <p className="text-2xl font-bold">{stats?.todayMessages || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <MessageCircle className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Sentiment Mediu</p>
                <p className={cn(
                  'text-2xl font-bold',
                  (stats?.avgSentiment || 0) > 0 ? 'text-green-600' : 
                  (stats?.avgSentiment || 0) < 0 ? 'text-red-600' : 'text-gray-600'
                )}>
                  {((stats?.avgSentiment || 0) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                {(stats?.avgSentiment || 0) > 0 ? (
                  <ThumbsUp className="h-5 w-5 text-purple-600" />
                ) : (
                  <ThumbsDown className="h-5 w-5 text-purple-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Timp Răspuns</p>
                <p className="text-2xl font-bold">
                  {(stats?.avgResponseTime || 0).toFixed(1)}s
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Zap className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rată Escalare</p>
                <p className={cn(
                  'text-2xl font-bold',
                  (stats?.escalationRate || 0) > 10 ? 'text-red-600' : 'text-green-600'
                )}>
                  {(stats?.escalationRate || 0).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <ArrowUpRight className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Guardrail Violations</p>
                <p className={cn(
                  'text-2xl font-bold',
                  (stats?.guardrailViolationRate || 0) > 5 ? 'text-red-600' : 'text-green-600'
                )}>
                  {(stats?.guardrailViolationRate || 0).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista Conversații</CardTitle>
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Caută după client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              {/* Channel Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Canal
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setChannelFilter(undefined)}>
                    Toate
                  </DropdownMenuItem>
                  {Object.entries(CHANNEL_CONFIG).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={() => setChannelFilter(key)}>
                      <config.icon className={cn("h-4 w-4 mr-2", config.color)} />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Toate</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="escalated">Escaladate</TabsTrigger>
              <TabsTrigger value="human_takeover">Preluare Umană</TabsTrigger>
              <TabsTrigger value="completed">Finalizate</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mesaje</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Guardrails</TableHead>
                    <TableHead>Ultimul Mesaj</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Se încarcă...
                      </TableCell>
                    </TableRow>
                  ) : conversationsData?.conversations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Nu există conversații
                      </TableCell>
                    </TableRow>
                  ) : (
                    conversationsData?.conversations.map((conversation) => {
                      const statusConfig = CONVERSATION_STATUS[conversation.status];
                      const StatusIcon = statusConfig.icon;
                      const channelConfig = CHANNEL_CONFIG[conversation.channel];
                      const ChannelIcon = channelConfig.icon;
                      
                      return (
                        <TableRow key={conversation.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {conversation.clientName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{conversation.clientName}</div>
                                <div className="text-sm text-gray-500">
                                  {conversation.clientCompany}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={channelConfig.color}>
                              <ChannelIcon className="h-3 w-3 mr-1" />
                              {channelConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4 text-purple-500" />
                                <span>{conversation.aiMessages}</span>
                                <User className="h-4 w-4 text-gray-500" />
                                <span>{conversation.humanMessages}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Total: {conversation.totalMessages}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <SentimentIndicator
                              value={conversation.overallSentiment}
                              trend={conversation.sentimentTrend}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className={cn(
                                conversation.guardrailViolations > 0 ? 'text-red-600' : 'text-green-600'
                              )}>
                                {conversation.guardrailViolations} / {conversation.guardrailChecks}
                              </div>
                              {conversation.regenerations > 0 && (
                                <div className="text-xs text-orange-600">
                                  {conversation.regenerations} regenerări
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <ConversationPreview conversation={conversation} />
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/sales/ai-conversations/${conversation.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Vezi Conversația
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/sales/negotiations/${conversation.negotiationId}`}>
                                    <ArrowUpRight className="h-4 w-4 mr-2" />
                                    Vezi Negocierea
                                  </Link>
                                </DropdownMenuItem>
                                {conversation.status === 'active' && (
                                  <>
                                    <DropdownMenuItem>
                                      <Pause className="h-4 w-4 mr-2" />
                                      Pauză AI
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <User className="h-4 w-4 mr-2" />
                                      Preia Manual
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {conversation.status === 'paused' && (
                                  <DropdownMenuItem>
                                    <Play className="h-4 w-4 mr-2" />
                                    Reia AI
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Flag className="h-4 w-4 mr-2" />
                                  Raportează Problemă
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 8.2 Conversation Detail Page

Pagina de vizualizare detaliată a unei conversații AI cu chat history și metrici.

**Route:** `/sales/ai-conversations/[id]`

```typescript
// app/sales/ai-conversations/[id]/page.tsx
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Bot,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Send,
  Pause,
  Play,
  ArrowLeft,
  RefreshCw,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  Copy,
  Flag,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Info,
  XCircle,
  CheckCircle2,
  RotateCcw,
  Phone,
  Mail,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

// ==================== TYPES ====================

interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'ai' | 'client' | 'system' | 'human_agent';
  content: string;
  timestamp: string;
  
  // AI specific
  aiModel?: string;
  tokensUsed?: number;
  responseTime?: number;
  
  // Guardrails
  guardrailsChecked?: boolean;
  guardrailViolations?: string[];
  wasRegenerated?: boolean;
  regenerationReason?: string;
  originalContent?: string;
  
  // Sentiment
  sentiment?: number;
  detectedIntent?: string;
  
  // Metadata
  metadata?: Record<string, any>;
}

interface ConversationDetail {
  id: string;
  negotiationId: string;
  clientId: string;
  clientName: string;
  clientCompany: string;
  channel: 'whatsapp' | 'email';
  channelIdentifier: string;
  status: string;
  
  // Messages
  messages: ChatMessage[];
  
  // Metrics
  totalMessages: number;
  aiMessages: number;
  humanMessages: number;
  avgResponseTime: number;
  totalTokensUsed: number;
  
  // Sentiment
  overallSentiment: number;
  sentimentHistory: Array<{ timestamp: string; value: number }>;
  
  // Guardrails
  totalGuardrailChecks: number;
  totalViolations: number;
  totalRegenerations: number;
  
  // Timestamps
  startedAt: string;
  lastMessageAt: string;
}

// ==================== COMPONENTS ====================

function MessageBubble({ message, showDetails }: { message: ChatMessage; showDetails: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isAI = message.role === 'ai';
  const isSystem = message.role === 'system';
  const isHumanAgent = message.role === 'human_agent';
  
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-600">
          {message.content}
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn(
      'flex gap-3 mb-4',
      (isAI || isHumanAgent) ? 'flex-row' : 'flex-row-reverse'
    )}>
      <Avatar className={cn(
        'h-8 w-8',
        isAI && 'bg-purple-100',
        isHumanAgent && 'bg-blue-100',
        !isAI && !isHumanAgent && 'bg-gray-100'
      )}>
        <AvatarFallback>
          {isAI ? <Bot className="h-4 w-4 text-purple-600" /> :
           isHumanAgent ? <User className="h-4 w-4 text-blue-600" /> :
           <User className="h-4 w-4 text-gray-600" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={cn(
        'flex flex-col max-w-[70%]',
        (isAI || isHumanAgent) ? 'items-start' : 'items-end'
      )}>
        <div className={cn(
          'px-4 py-3 rounded-2xl',
          isAI && 'bg-purple-50 border border-purple-100',
          isHumanAgent && 'bg-blue-50 border border-blue-100',
          !isAI && !isHumanAgent && 'bg-gray-100'
        )}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          
          {/* Guardrail warnings */}
          {message.wasRegenerated && (
            <div className="mt-2 pt-2 border-t border-purple-200">
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <RotateCcw className="h-3 w-3" />
                Mesaj regenerat
              </div>
              {showDetails && message.originalContent && (
                <div className="mt-1">
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs text-gray-500 flex items-center gap-1"
                  >
                    {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Vezi original
                  </button>
                  {expanded && (
                    <div className="mt-1 p-2 bg-orange-50 rounded text-xs text-gray-600">
                      {message.originalContent}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Guardrail violations */}
          {showDetails && message.guardrailViolations && message.guardrailViolations.length > 0 && (
            <div className="mt-2 pt-2 border-t border-red-200">
              <div className="text-xs text-red-600">
                Încălcări guardrails: {message.guardrailViolations.join(', ')}
              </div>
            </div>
          )}
        </div>
        
        {/* Message metadata */}
        <div className={cn(
          'flex items-center gap-2 mt-1 text-xs text-gray-400',
          (isAI || isHumanAgent) ? 'flex-row' : 'flex-row-reverse'
        )}>
          <span>{format(parseISO(message.timestamp), 'HH:mm')}</span>
          
          {isAI && showDetails && (
            <>
              <span>•</span>
              <span>{message.aiModel}</span>
              {message.responseTime && (
                <>
                  <span>•</span>
                  <span>{message.responseTime.toFixed(1)}s</span>
                </>
              )}
              {message.tokensUsed && (
                <>
                  <span>•</span>
                  <span>{message.tokensUsed} tokens</span>
                </>
              )}
            </>
          )}
          
          {message.sentiment !== undefined && showDetails && (
            <>
              <span>•</span>
              <span className={cn(
                message.sentiment > 0.3 ? 'text-green-500' :
                message.sentiment < -0.3 ? 'text-red-500' : 'text-gray-500'
              )}>
                {message.sentiment > 0.3 ? <ThumbsUp className="h-3 w-3 inline" /> :
                 message.sentiment < -0.3 ? <ThumbsDown className="h-3 w-3 inline" /> :
                 <Minus className="h-3 w-3 inline" />}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SentimentChart({ history }: { history: Array<{ timestamp: string; value: number }> }) {
  // Simple SVG line chart
  const width = 200;
  const height = 60;
  const padding = 10;
  
  if (!history || history.length < 2) {
    return <div className="text-sm text-gray-400">Insuficiente date</div>;
  }
  
  const maxValue = Math.max(...history.map(h => Math.abs(h.value)));
  const scale = (value: number) => 
    height / 2 - (value / maxValue) * (height / 2 - padding);
  
  const points = history.map((h, i) => {
    const x = padding + (i / (history.length - 1)) * (width - 2 * padding);
    const y = scale(h.value);
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Zero line */}
      <line 
        x1={padding} 
        y1={height / 2} 
        x2={width - padding} 
        y2={height / 2} 
        stroke="#e5e7eb" 
        strokeDasharray="4,4"
      />
      {/* Sentiment line */}
      <polyline
        fill="none"
        stroke="#8b5cf6"
        strokeWidth={2}
        points={points}
      />
      {/* Points */}
      {history.map((h, i) => {
        const x = padding + (i / (history.length - 1)) * (width - 2 * padding);
        const y = scale(h.value);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3}
            fill={h.value > 0.3 ? '#22c55e' : h.value < -0.3 ? '#ef4444' : '#8b5cf6'}
          />
        );
      })}
    </svg>
  );
}

// ==================== MAIN COMPONENT ====================

export default function ConversationDetailPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [showDetails, setShowDetails] = useState(true);
  const [manualMessage, setManualMessage] = useState('');
  const [showTakeoverDialog, setShowTakeoverDialog] = useState(false);
  
  // Fetch conversation
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['ai-conversation', conversationId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/sales/ai-conversations/${conversationId}`);
      if (!response.ok) throw new Error('Failed to fetch conversation');
      return response.json() as Promise<ConversationDetail>;
    },
    refetchInterval: 5000, // Poll for new messages
  });
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length]);
  
  // Send manual message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(
        `/api/v1/sales/ai-conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, asHumanAgent: true }),
        }
      );
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversation', conversationId] });
      setManualMessage('');
      toast.success('Mesaj trimis');
    },
    onError: () => {
      toast.error('Eroare la trimiterea mesajului');
    },
  });
  
  // Takeover conversation
  const takeoverMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/v1/sales/ai-conversations/${conversationId}/takeover`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Failed to takeover');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversation', conversationId] });
      setShowTakeoverDialog(false);
      toast.success('Conversație preluată');
    },
    onError: () => {
      toast.error('Eroare la preluarea conversației');
    },
  });
  
  // Resume AI
  const resumeAIMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/v1/sales/ai-conversations/${conversationId}/resume`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Failed to resume');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversation', conversationId] });
      toast.success('AI reactivat');
    },
    onError: () => {
      toast.error('Eroare la reactivarea AI');
    },
  });
  
  if (isLoading || !conversation) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  const isActive = conversation.status === 'active';
  const isHumanTakeover = conversation.status === 'human_takeover';
  
  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/sales/ai-conversations">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Înapoi
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{conversation.clientName}</h1>
              <Badge variant="outline">{conversation.clientCompany}</Badge>
              <Badge className={cn(
                conversation.channel === 'whatsapp' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              )}>
                {conversation.channel === 'whatsapp' ? (
                  <Phone className="h-3 w-3 mr-1" />
                ) : (
                  <Mail className="h-3 w-3 mr-1" />
                )}
                {conversation.channelIdentifier}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              {conversation.totalMessages} mesaje • 
              Început {formatDistanceToNow(parseISO(conversation.startedAt), { addSuffix: true, locale: ro })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showDetails ? 'Ascunde Detalii' : 'Arată Detalii'}
          </Button>
          
          {isActive && (
            <Button
              variant="outline"
              onClick={() => setShowTakeoverDialog(true)}
            >
              <User className="h-4 w-4 mr-2" />
              Preia Manual
            </Button>
          )}
          
          {isHumanTakeover && (
            <Button onClick={() => resumeAIMutation.mutate()}>
              <Bot className="h-4 w-4 mr-2" />
              Reia AI
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 grid grid-cols-4 gap-4 min-h-0">
        {/* Chat Area */}
        <div className="col-span-3 flex flex-col">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="flex-1 flex flex-col min-h-0 p-0">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {conversation.messages.map((message) => (
                  <MessageBubble 
                    key={message.id} 
                    message={message}
                    showDetails={showDetails}
                  />
                ))}
                <div ref={messagesEndRef} />
              </ScrollArea>
              
              {/* Input Area */}
              {(isHumanTakeover || conversation.status === 'paused') && (
                <div className="p-4 border-t">
                  <div className="flex items-center gap-2">
                    <Textarea
                      placeholder="Scrie un mesaj ca agent uman..."
                      value={manualMessage}
                      onChange={(e) => setManualMessage(e.target.value)}
                      className="min-h-[60px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (manualMessage.trim()) {
                            sendMessageMutation.mutate(manualMessage.trim());
                          }
                        }
                      }}
                    />
                    <Button
                      onClick={() => sendMessageMutation.mutate(manualMessage.trim())}
                      disabled={!manualMessage.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {isActive && (
                <div className="p-4 border-t bg-purple-50">
                  <div className="flex items-center justify-center gap-2 text-purple-600">
                    <Bot className="h-5 w-5" />
                    <span className="font-medium">AI Agent activ</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right Panel - Metrics */}
        <div className="space-y-4 overflow-auto">
          {/* AI Status */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Status AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Model</span>
                <span className="font-medium">Claude Sonnet 4</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Timp Răspuns Mediu</span>
                <span className="font-medium">{conversation.avgResponseTime.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tokens Utilizați</span>
                <span className="font-medium">{conversation.totalTokensUsed.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Sentiment */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Sentiment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Overall</span>
                <div className="flex items-center gap-2">
                  {conversation.overallSentiment > 0.3 ? (
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                  ) : conversation.overallSentiment < -0.3 ? (
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-gray-500" />
                  )}
                  <span className={cn(
                    'font-medium',
                    conversation.overallSentiment > 0.3 ? 'text-green-600' :
                    conversation.overallSentiment < -0.3 ? 'text-red-600' : 'text-gray-600'
                  )}>
                    {(conversation.overallSentiment * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="pt-2">
                <SentimentChart history={conversation.sentimentHistory} />
              </div>
            </CardContent>
          </Card>
          
          {/* Guardrails */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Guardrails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Verificări</span>
                <span className="font-medium">{conversation.totalGuardrailChecks}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Încălcări</span>
                <span className={cn(
                  'font-medium',
                  conversation.totalViolations > 0 ? 'text-red-600' : 'text-green-600'
                )}>
                  {conversation.totalViolations}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Regenerări</span>
                <span className={cn(
                  'font-medium',
                  conversation.totalRegenerations > 0 ? 'text-orange-600' : 'text-green-600'
                )}>
                  {conversation.totalRegenerations}
                </span>
              </div>
              
              {/* Success rate bar */}
              <div className="pt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Rată Succes</span>
                  <span>
                    {conversation.totalGuardrailChecks > 0
                      ? ((1 - conversation.totalViolations / conversation.totalGuardrailChecks) * 100).toFixed(1)
                      : 100}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: `${conversation.totalGuardrailChecks > 0
                        ? (1 - conversation.totalViolations / conversation.totalGuardrailChecks) * 100
                        : 100}%`
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Acțiuni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href={`/sales/negotiations/${conversation.negotiationId}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Vezi Negocierea
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href={`/prospecting/contacts/${conversation.clientId}`}>
                  <User className="h-4 w-4 mr-2" />
                  Fișa Client
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Copy className="h-4 w-4 mr-2" />
                Exportă Conversație
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-red-600">
                <Flag className="h-4 w-4 mr-2" />
                Raportează Problemă
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Takeover Dialog */}
      <Dialog open={showTakeoverDialog} onOpenChange={setShowTakeoverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preia Conversația</DialogTitle>
            <DialogDescription>
              AI Agent va fi dezactivat și vei prelua controlul conversației.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Poți reactiva AI Agent oricând din interfață.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTakeoverDialog(false)}>
              Anulează
            </Button>
            <Button onClick={() => takeoverMutation.mutate()}>
              <User className="h-4 w-4 mr-2" />
              Preia Acum
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## 9. HITL Approvals Pages

### 9.1 Approvals Dashboard

**Route:** `/sales/approvals`

Dashboard centralizat pentru toate aprobările HITL din sistemul de vânzări.

```typescript
// app/sales/approvals/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  Search,
  Filter,
  Eye,
  ThumbsUp,
  ThumbsDown,
  History,
  MessageSquare,
  ArrowUpRight,
  Timer,
  TrendingUp,
  ShieldAlert,
  Percent,
  FileText,
  Bot,
  User,
  Building2,
  RefreshCw,
  ChevronRight,
  Zap
} from 'lucide-react';
import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns';
import { ro } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ========================================
// TYPES
// ========================================

type ApprovalType = 
  | 'discount_approval'      // Discount over threshold
  | 'price_override'         // Price below minimum
  | 'ai_response_review'     // AI response flagged
  | 'escalation_review'      // Escalated conversation
  | 'human_takeover'         // Takeover request
  | 'document_approval'      // Document before sending
  | 'credit_extension'       // Credit limit extension
  | 'special_terms';         // Special payment terms

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'auto_approved';

type ApprovalPriority = 'low' | 'medium' | 'high' | 'critical';

interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  
  // Context
  negotiationId: string;
  clientId: string;
  clientName: string;
  clientCompany: string;
  
  // Request details
  title: string;
  description: string;
  requestedValue: number;
  currentValue: number;
  thresholdValue: number;
  
  // Metadata
  requestedBy: 'ai_agent' | 'human_agent';
  requestedByName: string;
  requestedAt: string;
  
  // SLA
  slaDeadline: string;
  slaMinutesRemaining: number;
  
  // Resolution
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  resolutionNotes?: string;
  
  // AI Context (for AI-related approvals)
  aiContext?: {
    originalResponse: string;
    proposedResponse?: string;
    violationReason?: string;
    guardrailRule?: string;
    sentiment?: number;
    confidence?: number;
  };
  
  // Financial Context (for discount/price approvals)
  financialContext?: {
    orderValue: number;
    discountPercent: number;
    discountAmount: number;
    marginImpact: number;
    clientTier: string;
    clientLifetimeValue: number;
  };
}

interface ApprovalStats {
  pending: number;
  pendingCritical: number;
  approvedToday: number;
  rejectedToday: number;
  expiredToday: number;
  avgResolutionTime: number; // minutes
  slaBreachRate: number; // percentage
  approvalRate: number; // percentage
}

// ========================================
// API FUNCTIONS
// ========================================

async function fetchApprovals(params: {
  status?: ApprovalStatus;
  type?: ApprovalType;
  priority?: ApprovalPriority;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  approvals: ApprovalRequest[];
  total: number;
  stats: ApprovalStats;
}> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });
  
  const response = await fetch(`/api/v1/sales/approvals?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch approvals');
  return response.json();
}

async function resolveApproval(data: {
  approvalId: string;
  resolution: 'approved' | 'rejected';
  notes?: string;
  modifiedValue?: number;
}): Promise<ApprovalRequest> {
  const response = await fetch(`/api/v1/sales/approvals/${data.approvalId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to resolve approval');
  return response.json();
}

// ========================================
// HELPER COMPONENTS
// ========================================

function ApprovalTypeBadge({ type }: { type: ApprovalType }) {
  const config = {
    discount_approval: { label: 'Discount', icon: Percent, color: 'bg-purple-100 text-purple-700' },
    price_override: { label: 'Preț', icon: TrendingUp, color: 'bg-blue-100 text-blue-700' },
    ai_response_review: { label: 'AI Review', icon: Bot, color: 'bg-orange-100 text-orange-700' },
    escalation_review: { label: 'Escalare', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700' },
    human_takeover: { label: 'Takeover', icon: User, color: 'bg-red-100 text-red-700' },
    document_approval: { label: 'Document', icon: FileText, color: 'bg-green-100 text-green-700' },
    credit_extension: { label: 'Credit', icon: Building2, color: 'bg-cyan-100 text-cyan-700' },
    special_terms: { label: 'Termeni', icon: FileText, color: 'bg-gray-100 text-gray-700' }
  };
  
  const { label, icon: Icon, color } = config[type];
  
  return (
    <Badge variant="outline" className={cn('gap-1', color)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: ApprovalPriority }) {
  const config = {
    low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
    medium: { label: 'Medium', color: 'bg-blue-100 text-blue-600' },
    high: { label: 'High', color: 'bg-orange-100 text-orange-600' },
    critical: { label: 'Critical', color: 'bg-red-100 text-red-600 animate-pulse' }
  };
  
  const { label, color } = config[priority];
  
  return (
    <Badge variant="outline" className={color}>
      {label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const config = {
    pending: { label: 'În Așteptare', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
    approved: { label: 'Aprobat', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
    rejected: { label: 'Respins', icon: XCircle, color: 'bg-red-100 text-red-700' },
    expired: { label: 'Expirat', icon: Timer, color: 'bg-gray-100 text-gray-700' },
    auto_approved: { label: 'Auto-Aprobat', icon: Zap, color: 'bg-purple-100 text-purple-700' }
  };
  
  const { label, icon: Icon, color } = config[status];
  
  return (
    <Badge variant="outline" className={cn('gap-1', color)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function SLAIndicator({ deadline, minutesRemaining }: { deadline: string; minutesRemaining: number }) {
  const isUrgent = minutesRemaining <= 15;
  const isWarning = minutesRemaining <= 30;
  const isExpired = minutesRemaining <= 0;
  
  return (
    <div className={cn(
      'flex items-center gap-1 text-sm',
      isExpired ? 'text-red-600 font-medium' :
      isUrgent ? 'text-red-500' :
      isWarning ? 'text-orange-500' :
      'text-gray-500'
    )}>
      <Timer className={cn('h-4 w-4', isUrgent && 'animate-pulse')} />
      {isExpired ? (
        <span>SLA Depășit</span>
      ) : (
        <span>{minutesRemaining}m rămas</span>
      )}
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ApprovalType | undefined>();
  const [selectedPriority, setSelectedPriority] = useState<ApprovalPriority | undefined>();
  
  // Selected approval for detail view
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  // Fetch approvals
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['approvals', activeTab, selectedType, selectedPriority, searchTerm],
    queryFn: () => fetchApprovals({
      status: activeTab === 'all' ? undefined : activeTab as ApprovalStatus,
      type: selectedType,
      priority: selectedPriority,
      search: searchTerm || undefined
    }),
    refetchInterval: 10000 // 10s polling for real-time updates
  });
  
  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: resolveApproval,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setShowResolveDialog(false);
      setShowDetailDialog(false);
      setSelectedApproval(null);
      setResolutionNotes('');
    }
  });
  
  const handleApprove = (approval: ApprovalRequest) => {
    resolveMutation.mutate({
      approvalId: approval.id,
      resolution: 'approved',
      notes: resolutionNotes || undefined
    });
  };
  
  const handleReject = (approval: ApprovalRequest) => {
    if (!resolutionNotes.trim()) {
      alert('Te rog să adaugi un motiv pentru respingere.');
      return;
    }
    resolveMutation.mutate({
      approvalId: approval.id,
      resolution: 'rejected',
      notes: resolutionNotes
    });
  };
  
  const stats = data?.stats;
  const approvals = data?.approvals || [];
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aprobări HITL</h1>
          <p className="text-gray-500">
            Gestionează toate cererile de aprobare din sistemul de vânzări
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizează
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">În Așteptare</p>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className={stats?.pendingCritical && stats.pendingCritical > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Critice</p>
                <p className={cn(
                  'text-2xl font-bold',
                  stats?.pendingCritical && stats.pendingCritical > 0 ? 'text-red-600' : ''
                )}>
                  {stats?.pendingCritical || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Aprobate Azi</p>
                <p className="text-2xl font-bold text-green-600">{stats?.approvedToday || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Respinse Azi</p>
                <p className="text-2xl font-bold text-red-600">{stats?.rejectedToday || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Expirate Azi</p>
                <p className="text-2xl font-bold text-gray-600">{stats?.expiredToday || 0}</p>
              </div>
              <Timer className="h-8 w-8 text-gray-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Timp Mediu</p>
                <p className="text-2xl font-bold">{stats?.avgResolutionTime || 0}m</p>
              </div>
              <History className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">SLA Breach</p>
                <p className={cn(
                  'text-2xl font-bold',
                  (stats?.slaBreachRate || 0) > 10 ? 'text-red-600' : 'text-green-600'
                )}>
                  {stats?.slaBreachRate?.toFixed(1) || 0}%
                </p>
              </div>
              <ShieldAlert className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Rată Aprobare</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.approvalRate?.toFixed(1) || 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Caută după client, negociere..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Tip: {selectedType || 'Toate'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSelectedType(undefined)}>
              Toate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedType('discount_approval')}>
              Discount
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedType('price_override')}>
              Preț
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedType('ai_response_review')}>
              AI Review
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedType('escalation_review')}>
              Escalare
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedType('human_takeover')}>
              Takeover
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedType('document_approval')}>
              Document
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Prioritate: {selectedPriority || 'Toate'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSelectedPriority(undefined)}>
              Toate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedPriority('critical')}>
              Critical
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedPriority('high')}>
              High
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedPriority('medium')}>
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedPriority('low')}>
              Low
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Tabs & Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            În Așteptare
            {stats?.pending ? (
              <Badge variant="secondary" className="ml-1">
                {stats.pending}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Aprobate
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="h-4 w-4 mr-1" />
            Respinse
          </TabsTrigger>
          <TabsTrigger value="expired">
            <Timer className="h-4 w-4 mr-1" />
            Expirate
          </TabsTrigger>
          <TabsTrigger value="all">
            Toate
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : approvals.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-500">Nu sunt cereri de aprobare în această categorie.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Prior.</TableHead>
                      <TableHead className="w-[100px]">Tip</TableHead>
                      <TableHead>Cerere</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Valoare</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px]">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvals.map((approval) => (
                      <TableRow 
                        key={approval.id}
                        className={cn(
                          approval.priority === 'critical' && 'bg-red-50',
                          approval.slaMinutesRemaining <= 0 && approval.status === 'pending' && 'bg-orange-50'
                        )}
                      >
                        <TableCell>
                          <PriorityBadge priority={approval.priority} />
                        </TableCell>
                        <TableCell>
                          <ApprovalTypeBadge type={approval.type} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{approval.title}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[250px]">
                              {approval.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{approval.clientName}</p>
                            <p className="text-xs text-gray-500">{approval.clientCompany}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {approval.type === 'discount_approval' && approval.financialContext ? (
                            <div>
                              <p className="font-medium text-sm">
                                {approval.financialContext.discountPercent}%
                              </p>
                              <p className="text-xs text-gray-500">
                                -{approval.financialContext.discountAmount.toLocaleString('ro-RO')} RON
                              </p>
                            </div>
                          ) : approval.type === 'price_override' ? (
                            <div>
                              <p className="font-medium text-sm">
                                {approval.requestedValue.toLocaleString('ro-RO')} RON
                              </p>
                              <p className="text-xs text-gray-500">
                                Min: {approval.thresholdValue.toLocaleString('ro-RO')} RON
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {approval.status === 'pending' ? (
                            <SLAIndicator 
                              deadline={approval.slaDeadline}
                              minutesRemaining={approval.slaMinutesRemaining}
                            />
                          ) : approval.resolvedAt ? (
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(approval.resolvedAt), {
                                addSuffix: true,
                                locale: ro
                              })}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={approval.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {approval.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => {
                                    setSelectedApproval(approval);
                                    handleApprove(approval);
                                  }}
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedApproval(approval);
                                    setShowResolveDialog(true);
                                  }}
                                >
                                  <ThumbsDown className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setSelectedApproval(approval);
                                setShowDetailDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/sales/negotiations/${approval.negotiationId}`}>
                                    <ArrowUpRight className="h-4 w-4 mr-2" />
                                    Vezi Negocierea
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Vezi Conversația
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <History className="h-4 w-4 mr-2" />
                                  Istoric Aprobare
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalii Aprobare
              {selectedApproval && <StatusBadge status={selectedApproval.status} />}
            </DialogTitle>
          </DialogHeader>
          
          {selectedApproval && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tip</p>
                    <ApprovalTypeBadge type={selectedApproval.type} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prioritate</p>
                    <PriorityBadge priority={selectedApproval.priority} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Client</p>
                    <p className="font-medium">{selectedApproval.clientName}</p>
                    <p className="text-sm text-gray-500">{selectedApproval.clientCompany}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Solicitat de</p>
                    <p className="font-medium flex items-center gap-1">
                      {selectedApproval.requestedBy === 'ai_agent' ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      {selectedApproval.requestedByName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(selectedApproval.requestedAt), 'dd MMM yyyy HH:mm', { locale: ro })}
                    </p>
                  </div>
                </div>
                
                {/* Description */}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Cerere</p>
                  <Card className="p-4 bg-gray-50">
                    <p className="font-medium">{selectedApproval.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{selectedApproval.description}</p>
                  </Card>
                </div>
                
                {/* Financial Context */}
                {selectedApproval.financialContext && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Context Financiar</p>
                    <Card className="p-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Valoare Comandă</p>
                          <p className="font-medium">
                            {selectedApproval.financialContext.orderValue.toLocaleString('ro-RO')} RON
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Discount Solicitat</p>
                          <p className="font-medium text-purple-600">
                            {selectedApproval.financialContext.discountPercent}%
                            ({selectedApproval.financialContext.discountAmount.toLocaleString('ro-RO')} RON)
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Impact Marjă</p>
                          <p className={cn(
                            'font-medium',
                            selectedApproval.financialContext.marginImpact < 0 ? 'text-red-600' : 'text-green-600'
                          )}>
                            {selectedApproval.financialContext.marginImpact > 0 ? '+' : ''}
                            {selectedApproval.financialContext.marginImpact.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Tier Client</p>
                          <p className="font-medium">{selectedApproval.financialContext.clientTier}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">LTV Client</p>
                          <p className="font-medium">
                            {selectedApproval.financialContext.clientLifetimeValue.toLocaleString('ro-RO')} RON
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Prag Auto-Aprobare</p>
                          <p className="font-medium">{selectedApproval.thresholdValue}%</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
                
                {/* AI Context */}
                {selectedApproval.aiContext && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Context AI</p>
                    <Card className="p-4 space-y-4">
                      {selectedApproval.aiContext.violationReason && (
                        <div>
                          <p className="text-sm text-gray-500">Motiv Blocare</p>
                          <Badge variant="destructive">
                            {selectedApproval.aiContext.guardrailRule}
                          </Badge>
                          <p className="text-sm mt-1">{selectedApproval.aiContext.violationReason}</p>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Răspuns Original</p>
                        <Card className="p-3 bg-red-50 border-red-200">
                          <p className="text-sm">{selectedApproval.aiContext.originalResponse}</p>
                        </Card>
                      </div>
                      
                      {selectedApproval.aiContext.proposedResponse && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Răspuns Propus (după regenerare)</p>
                          <Card className="p-3 bg-green-50 border-green-200">
                            <p className="text-sm">{selectedApproval.aiContext.proposedResponse}</p>
                          </Card>
                        </div>
                      )}
                      
                      <div className="flex gap-4 text-sm">
                        {selectedApproval.aiContext.sentiment !== undefined && (
                          <div>
                            <span className="text-gray-500">Sentiment:</span>{' '}
                            <span className={cn(
                              'font-medium',
                              selectedApproval.aiContext.sentiment > 0 ? 'text-green-600' :
                              selectedApproval.aiContext.sentiment < 0 ? 'text-red-600' :
                              'text-gray-600'
                            )}>
                              {selectedApproval.aiContext.sentiment.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {selectedApproval.aiContext.confidence !== undefined && (
                          <div>
                            <span className="text-gray-500">Confidence:</span>{' '}
                            <span className="font-medium">
                              {(selectedApproval.aiContext.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                )}
                
                {/* Resolution Info */}
                {selectedApproval.resolvedBy && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Rezoluție</p>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={selectedApproval.status} />
                        <span className="text-sm text-gray-500">de</span>
                        <span className="font-medium">{selectedApproval.resolvedBy}</span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(selectedApproval.resolvedAt!), 'dd MMM yyyy HH:mm', { locale: ro })}
                        </span>
                      </div>
                      {selectedApproval.resolutionNotes && (
                        <p className="text-sm text-gray-600">{selectedApproval.resolutionNotes}</p>
                      )}
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
            {selectedApproval?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResolveDialog(true);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Respinge
                </Button>
                <Button
                  onClick={() => handleApprove(selectedApproval)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Aprobă
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Închide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respinge Cererea</DialogTitle>
            <DialogDescription>
              Te rog să specifici motivul respingerii. Acesta va fi vizibil în istoricul aprobărilor.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedApproval && (
              <Card className="p-4 bg-gray-50">
                <p className="font-medium">{selectedApproval.title}</p>
                <p className="text-sm text-gray-500">{selectedApproval.clientName}</p>
              </Card>
            )}
            
            <div>
              <label className="text-sm font-medium mb-1 block">
                Motiv Respingere <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Descrie motivul pentru care respingi această cerere..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedApproval && handleReject(selectedApproval)}
              disabled={!resolutionNotes.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Confirmă Respingerea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### 9.2 Takeover Queue Page

**Route:** `/sales/approvals/takeover`

Coadă prioritară pentru cereri de preluare manuală a conversațiilor.

```typescript
// app/sales/approvals/takeover/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  User,
  Bot,
  MessageSquare,
  Clock,
  AlertTriangle,
  ArrowRight,
  Eye,
  Phone,
  Mail,
  Building2,
  TrendingDown,
  Timer,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronRight,
  Zap,
  History
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ro } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ========================================
// TYPES
// ========================================

interface TakeoverRequest {
  id: string;
  conversationId: string;
  negotiationId: string;
  
  // Client info
  clientId: string;
  clientName: string;
  clientCompany: string;
  clientTier: string;
  clientPhone?: string;
  clientEmail?: string;
  
  // Trigger info
  triggerReason: 'sentiment_drop' | 'explicit_request' | 'guardrail_failure' | 'escalation' | 'timeout';
  triggerDetails: string;
  
  // Conversation context
  channel: 'whatsapp' | 'email';
  messageCount: number;
  lastMessages: {
    role: 'ai' | 'client' | 'human';
    content: string;
    timestamp: string;
    sentiment?: number;
  }[];
  currentSentiment: number;
  sentimentTrend: 'up' | 'down' | 'stable';
  
  // Status
  status: 'waiting' | 'assigned' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Timing
  requestedAt: string;
  waitTime: number; // minutes
  slaDeadline: string;
  slaMinutesRemaining: number;
  
  // Assignment
  assignedTo?: string;
  assignedAt?: string;
}

interface TakeoverStats {
  waitingCount: number;
  criticalCount: number;
  avgWaitTime: number;
  resolvedToday: number;
  slaBreachRate: number;
}

// ========================================
// API FUNCTIONS
// ========================================

async function fetchTakeoverQueue(): Promise<{
  requests: TakeoverRequest[];
  stats: TakeoverStats;
}> {
  const response = await fetch('/api/v1/sales/approvals/takeover');
  if (!response.ok) throw new Error('Failed to fetch takeover queue');
  return response.json();
}

async function acceptTakeover(requestId: string): Promise<TakeoverRequest> {
  const response = await fetch(`/api/v1/sales/approvals/takeover/${requestId}/accept`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to accept takeover');
  return response.json();
}

// ========================================
// HELPER COMPONENTS
// ========================================

function TriggerReasonBadge({ reason }: { reason: TakeoverRequest['triggerReason'] }) {
  const config = {
    sentiment_drop: { label: 'Sentiment Scăzut', icon: TrendingDown, color: 'bg-red-100 text-red-700' },
    explicit_request: { label: 'Cerere Client', icon: User, color: 'bg-blue-100 text-blue-700' },
    guardrail_failure: { label: 'Guardrail Fail', icon: AlertTriangle, color: 'bg-orange-100 text-orange-700' },
    escalation: { label: 'Escalare', icon: ArrowRight, color: 'bg-yellow-100 text-yellow-700' },
    timeout: { label: 'Timeout', icon: Timer, color: 'bg-gray-100 text-gray-700' }
  };
  
  const { label, icon: Icon, color } = config[reason];
  
  return (
    <Badge variant="outline" className={cn('gap-1', color)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function SentimentIndicator({ value, trend }: { value: number; trend: 'up' | 'down' | 'stable' }) {
  const isNegative = value < -0.3;
  const isPositive = value > 0.3;
  
  return (
    <div className={cn(
      'flex items-center gap-1 text-sm font-medium',
      isNegative ? 'text-red-600' :
      isPositive ? 'text-green-600' :
      'text-gray-600'
    )}>
      <span>{value.toFixed(2)}</span>
      {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
      {trend === 'up' && <TrendingDown className="h-3 w-3 text-green-500 rotate-180" />}
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function TakeoverQueuePage() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<TakeoverRequest | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['takeoverQueue'],
    queryFn: fetchTakeoverQueue,
    refetchInterval: 5000 // 5s polling
  });
  
  const acceptMutation = useMutation({
    mutationFn: acceptTakeover,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['takeoverQueue'] });
      // Redirect to conversation
      window.location.href = `/sales/ai-conversations/${data.conversationId}`;
    }
  });
  
  const stats = data?.stats;
  const requests = data?.requests || [];
  
  // Group by priority
  const criticalRequests = requests.filter(r => r.priority === 'critical');
  const highRequests = requests.filter(r => r.priority === 'high');
  const otherRequests = requests.filter(r => r.priority === 'medium' || r.priority === 'low');
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            Takeover Queue
          </h1>
          <p className="text-gray-500">
            Conversații care necesită intervenție umană imediată
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizează
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className={stats?.criticalCount && stats.criticalCount > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">În Așteptare</p>
                <p className={cn(
                  'text-2xl font-bold',
                  stats?.criticalCount && stats.criticalCount > 0 ? 'text-red-600' : ''
                )}>
                  {stats?.waitingCount || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className={stats?.criticalCount && stats.criticalCount > 0 ? 'border-red-500 animate-pulse' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Critice</p>
                <p className="text-2xl font-bold text-red-600">{stats?.criticalCount || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Timp Mediu Așteptare</p>
                <p className="text-2xl font-bold">{stats?.avgWaitTime || 0}m</p>
              </div>
              <Timer className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Rezolvate Azi</p>
                <p className="text-2xl font-bold text-green-600">{stats?.resolvedToday || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">SLA Breach</p>
                <p className={cn(
                  'text-2xl font-bold',
                  (stats?.slaBreachRate || 0) > 5 ? 'text-red-600' : 'text-green-600'
                )}>
                  {stats?.slaBreachRate?.toFixed(1) || 0}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical */}
        <Card className="border-red-200">
          <CardHeader className="bg-red-50 border-b border-red-200">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critice ({criticalRequests.length})
            </CardTitle>
            <CardDescription className="text-red-600">
              Necesită răspuns în &lt; 5 minute
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {criticalRequests.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  Nicio cerere critică
                </div>
              ) : (
                <div className="divide-y">
                  {criticalRequests.map((request) => (
                    <TakeoverCard
                      key={request.id}
                      request={request}
                      onPreview={() => {
                        setSelectedRequest(request);
                        setShowPreviewDialog(true);
                      }}
                      onAccept={() => acceptMutation.mutate(request.id)}
                      isAccepting={acceptMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* High Priority */}
        <Card className="border-orange-200">
          <CardHeader className="bg-orange-50 border-b border-orange-200">
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Prioritate Mare ({highRequests.length})
            </CardTitle>
            <CardDescription className="text-orange-600">
              Răspuns în &lt; 15 minute
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {highRequests.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  Nicio cerere
                </div>
              ) : (
                <div className="divide-y">
                  {highRequests.map((request) => (
                    <TakeoverCard
                      key={request.id}
                      request={request}
                      onPreview={() => {
                        setSelectedRequest(request);
                        setShowPreviewDialog(true);
                      }}
                      onAccept={() => acceptMutation.mutate(request.id)}
                      isAccepting={acceptMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Other */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Altele ({otherRequests.length})
            </CardTitle>
            <CardDescription>
              Prioritate medie și scăzută
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {otherRequests.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  Nicio cerere
                </div>
              ) : (
                <div className="divide-y">
                  {otherRequests.map((request) => (
                    <TakeoverCard
                      key={request.id}
                      request={request}
                      onPreview={() => {
                        setSelectedRequest(request);
                        setShowPreviewDialog(true);
                      }}
                      onAccept={() => acceptMutation.mutate(request.id)}
                      isAccepting={acceptMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preview Conversație</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              {/* Client Info */}
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {selectedRequest.clientName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedRequest.clientName}</p>
                      <p className="text-sm text-gray-500">{selectedRequest.clientCompany}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{selectedRequest.clientTier}</Badge>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      {selectedRequest.clientPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedRequest.clientPhone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* Trigger Info */}
              <div className="flex items-center gap-4">
                <TriggerReasonBadge reason={selectedRequest.triggerReason} />
                <span className="text-sm text-gray-500">{selectedRequest.triggerDetails}</span>
              </div>
              
              {/* Sentiment */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Sentiment:</span>
                <SentimentIndicator 
                  value={selectedRequest.currentSentiment} 
                  trend={selectedRequest.sentimentTrend}
                />
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm text-gray-500">
                  {selectedRequest.messageCount} mesaje
                </span>
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm text-gray-500">
                  Așteptare: {selectedRequest.waitTime}m
                </span>
              </div>
              
              {/* Messages Preview */}
              <div>
                <p className="text-sm font-medium mb-2">Ultimele Mesaje:</p>
                <ScrollArea className="h-[250px] border rounded-lg p-3">
                  <div className="space-y-3">
                    {selectedRequest.lastMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'flex gap-2',
                          msg.role === 'client' ? 'justify-start' : 'justify-end'
                        )}
                      >
                        <div className={cn(
                          'max-w-[80%] rounded-lg p-3 text-sm',
                          msg.role === 'ai' ? 'bg-purple-100 text-purple-900' :
                          msg.role === 'client' ? 'bg-gray-100 text-gray-900' :
                          'bg-blue-100 text-blue-900'
                        )}>
                          <div className="flex items-center gap-1 mb-1 text-xs opacity-70">
                            {msg.role === 'ai' ? <Bot className="h-3 w-3" /> :
                             msg.role === 'human' ? <User className="h-3 w-3" /> : null}
                            <span>
                              {format(new Date(msg.timestamp), 'HH:mm')}
                            </span>
                            {msg.sentiment !== undefined && (
                              <span className={cn(
                                'ml-2',
                                msg.sentiment < -0.3 ? 'text-red-600' :
                                msg.sentiment > 0.3 ? 'text-green-600' :
                                'text-gray-600'
                              )}>
                                {msg.sentiment.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <p>{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Anulează
            </Button>
            <Button
              onClick={() => selectedRequest && acceptMutation.mutate(selectedRequest.id)}
              disabled={acceptMutation.isPending}
            >
              <User className="h-4 w-4 mr-2" />
              Preia Conversația
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========================================
// TAKEOVER CARD COMPONENT
// ========================================

function TakeoverCard({
  request,
  onPreview,
  onAccept,
  isAccepting
}: {
  request: TakeoverRequest;
  onPreview: () => void;
  onAccept: () => void;
  isAccepting: boolean;
}) {
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {request.clientName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{request.clientName}</p>
            <p className="text-xs text-gray-500">{request.clientCompany}</p>
          </div>
        </div>
        <TriggerReasonBadge reason={request.triggerReason} />
      </div>
      
      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
        {request.lastMessages[request.lastMessages.length - 1]?.content || 'No messages'}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {request.waitTime}m
          </span>
          <SentimentIndicator 
            value={request.currentSentiment}
            trend={request.sentimentTrend}
          />
          <span>{request.messageCount} msg</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={onPreview}
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            className="h-7 px-3"
            onClick={onAccept}
            disabled={isAccepting}
          >
            Preia
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
      
      {/* SLA Warning */}
      {request.slaMinutesRemaining <= 5 && (
        <div className={cn(
          'mt-2 p-2 rounded text-xs',
          request.slaMinutesRemaining <= 0 
            ? 'bg-red-100 text-red-700' 
            : 'bg-orange-100 text-orange-700'
        )}>
          <Timer className="h-3 w-3 inline mr-1" />
          {request.slaMinutesRemaining <= 0 
            ? 'SLA Depășit!' 
            : `${request.slaMinutesRemaining}m până la SLA breach`}
        </div>
      )}
    </div>
  );
}
```

---

## 10. Reports & Analytics Pages

### 10.1 Sales Performance Dashboard

**Route:** `/sales/reports`

Dashboard analitic pentru performanța vânzărilor și AI Agent.

```typescript
// app/sales/reports/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Bot,
  MessageSquare,
  Clock,
  Target,
  Award,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  FileText,
  Zap,
  BarChart3
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ========================================
// TYPES
// ========================================

interface SalesMetrics {
  revenue: {
    total: number;
    change: number;
    trend: 'up' | 'down';
  };
  orders: {
    total: number;
    change: number;
    trend: 'up' | 'down';
  };
  avgOrderValue: {
    total: number;
    change: number;
    trend: 'up' | 'down';
  };
  conversionRate: {
    total: number;
    change: number;
    trend: 'up' | 'down';
  };
}

interface AIMetrics {
  conversationsHandled: number;
  messagesGenerated: number;
  avgResponseTime: number;
  resolutionRate: number;
  escalationRate: number;
  takeoverRate: number;
  avgSentiment: number;
  guardrailViolationRate: number;
}

interface TimeSeriesData {
  date: string;
  revenue: number;
  orders: number;
  aiConversations: number;
  humanConversations: number;
  avgSentiment: number;
}

interface FunnelData {
  stage: string;
  count: number;
  value: number;
  conversionRate: number;
}

interface TopProduct {
  sku: string;
  name: string;
  revenue: number;
  quantity: number;
  margin: number;
}

interface TopClient {
  id: string;
  name: string;
  company: string;
  revenue: number;
  orders: number;
  tier: string;
}

// ========================================
// API FUNCTIONS
// ========================================

async function fetchSalesReport(params: {
  period: string;
  startDate?: string;
  endDate?: string;
}): Promise<{
  salesMetrics: SalesMetrics;
  aiMetrics: AIMetrics;
  timeSeries: TimeSeriesData[];
  funnel: FunnelData[];
  topProducts: TopProduct[];
  topClients: TopClient[];
  channelBreakdown: { channel: string; value: number }[];
  statusBreakdown: { status: string; count: number }[];
}> {
  const searchParams = new URLSearchParams(params as Record<string, string>);
  const response = await fetch(`/api/v1/sales/reports?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch sales report');
  return response.json();
}

// ========================================
// COLORS
// ========================================

const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#06b6d4',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#6b7280'
};

const PIE_COLORS = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

// ========================================
// HELPER COMPONENTS
// ========================================

function MetricCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  format: formatValue = 'number'
}: {
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  format?: 'number' | 'currency' | 'percent';
}) {
  const formattedValue = formatValue === 'currency'
    ? `${value.toLocaleString('ro-RO')} RON`
    : formatValue === 'percent'
    ? `${value.toFixed(1)}%`
    : value.toLocaleString('ro-RO');
  
  const isPositive = trend === 'up';
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{formattedValue}</p>
            <div className={cn(
              'flex items-center gap-1 mt-1 text-sm',
              isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span>{Math.abs(change).toFixed(1)}%</span>
              <span className="text-gray-500">vs. perioada anterioară</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
            <Icon className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function SalesReportsPage() {
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data, isLoading } = useQuery({
    queryKey: ['salesReport', period],
    queryFn: () => fetchSalesReport({ period })
  });
  
  const handleExport = async (type: 'pdf' | 'excel') => {
    const response = await fetch(`/api/v1/sales/reports/export?period=${period}&type=${type}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${period}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
    a.click();
  };
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rapoarte Vânzări</h1>
          <p className="text-gray-500">
            Analiză detaliată a performanței vânzărilor și AI Agent
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Perioadă" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Ultimele 7 zile</SelectItem>
              <SelectItem value="30d">Ultimele 30 zile</SelectItem>
              <SelectItem value="90d">Ultimele 90 zile</SelectItem>
              <SelectItem value="ytd">De la începutul anului</SelectItem>
              <SelectItem value="custom">Personalizat</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      {data?.salesMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Venituri Totale"
            value={data.salesMetrics.revenue.total}
            change={data.salesMetrics.revenue.change}
            trend={data.salesMetrics.revenue.trend}
            icon={DollarSign}
            format="currency"
          />
          <MetricCard
            title="Comenzi"
            value={data.salesMetrics.orders.total}
            change={data.salesMetrics.orders.change}
            trend={data.salesMetrics.orders.trend}
            icon={ShoppingCart}
          />
          <MetricCard
            title="Valoare Medie Comandă"
            value={data.salesMetrics.avgOrderValue.total}
            change={data.salesMetrics.avgOrderValue.change}
            trend={data.salesMetrics.avgOrderValue.trend}
            icon={Target}
            format="currency"
          />
          <MetricCard
            title="Rată Conversie"
            value={data.salesMetrics.conversionRate.total}
            change={data.salesMetrics.conversionRate.change}
            trend={data.salesMetrics.conversionRate.trend}
            icon={Percent}
            format="percent"
          />
        </div>
      )}
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="ai-performance">
            <Bot className="h-4 w-4 mr-1" />
            Performanță AI
          </TabsTrigger>
          <TabsTrigger value="products">
            <ShoppingCart className="h-4 w-4 mr-1" />
            Produse
          </TabsTrigger>
          <TabsTrigger value="clients">
            <Users className="h-4 w-4 mr-1" />
            Clienți
          </TabsTrigger>
          <TabsTrigger value="funnel">
            <Target className="h-4 w-4 mr-1" />
            Funnel
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue & Orders Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Venituri și Comenzi</CardTitle>
                <CardDescription>Evoluție în timp</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={data?.timeSeries || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'dd MMM', { locale: ro })}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: ro })}
                      formatter={(value: number, name: string) => [
                        name === 'revenue' 
                          ? `${value.toLocaleString('ro-RO')} RON`
                          : value,
                        name === 'revenue' ? 'Venituri' : 'Comenzi'
                      ]}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name="Venituri"
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.1}
                      stroke={CHART_COLORS.primary}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      name="Comenzi"
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Channel Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuție Canale</CardTitle>
                <CardDescription>Vânzări per canal de comunicare</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data?.channelBreakdown || []}
                      dataKey="value"
                      nameKey="channel"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ channel, percent }) => `${channel}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {(data?.channelBreakdown || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value.toLocaleString('ro-RO')} RON`, 'Valoare']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* AI vs Human Conversations */}
          <Card>
            <CardHeader>
              <CardTitle>Conversații AI vs. Human</CardTitle>
              <CardDescription>Distribuția zilnică între AI Agent și agenți umani</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data?.timeSeries || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'dd MMM', { locale: ro })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: ro })}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="aiConversations"
                    name="AI Agent"
                    stackId="1"
                    fill={CHART_COLORS.primary}
                    stroke={CHART_COLORS.primary}
                  />
                  <Area
                    type="monotone"
                    dataKey="humanConversations"
                    name="Agent Uman"
                    stackId="1"
                    fill={CHART_COLORS.secondary}
                    stroke={CHART_COLORS.secondary}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* AI Performance Tab */}
        <TabsContent value="ai-performance" className="space-y-6">
          {data?.aiMetrics && (
            <>
              {/* AI KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-purple-500" />
                      <span className="text-sm text-gray-500">Conversații</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {data.aiMetrics.conversationsHandled.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm text-gray-500">Mesaje Generate</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {data.aiMetrics.messagesGenerated.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-gray-500">Timp Răspuns Mediu</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {data.aiMetrics.avgResponseTime.toFixed(1)}s
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-500">Rată Rezoluție</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-green-600">
                      {data.aiMetrics.resolutionRate.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* AI Metrics Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Rată Escalare</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">
                      {data.aiMetrics.escalationRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Conversații transferate pentru review
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Rată Takeover</p>
                    <p className={cn(
                      'text-2xl font-bold mt-1',
                      data.aiMetrics.takeoverRate > 10 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {data.aiMetrics.takeoverRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Conversații preluate de agenți umani
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Sentiment Mediu</p>
                    <p className={cn(
                      'text-2xl font-bold mt-1',
                      data.aiMetrics.avgSentiment > 0.3 ? 'text-green-600' :
                      data.aiMetrics.avgSentiment < -0.3 ? 'text-red-600' :
                      'text-gray-600'
                    )}>
                      {data.aiMetrics.avgSentiment.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Scor -1.0 (negativ) la +1.0 (pozitiv)
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Sentiment Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Evoluție Sentiment</CardTitle>
                  <CardDescription>Sentiment mediu zilnic al conversațiilor</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data?.timeSeries || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(new Date(value), 'dd MMM', { locale: ro })}
                      />
                      <YAxis domain={[-1, 1]} />
                      <Tooltip />
                      <defs>
                        <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS.success} stopOpacity={0.8}/>
                          <stop offset="50%" stopColor={CHART_COLORS.warning} stopOpacity={0.3}/>
                          <stop offset="100%" stopColor={CHART_COLORS.danger} stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="avgSentiment"
                        name="Sentiment"
                        fill="url(#sentimentGradient)"
                        stroke={CHART_COLORS.primary}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Guardrails Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Statistici Guardrails</CardTitle>
                  <CardDescription>Performanța sistemului de validare AI</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-8">
                    <div>
                      <p className="text-sm text-gray-500">Rată Violații</p>
                      <p className={cn(
                        'text-3xl font-bold',
                        data.aiMetrics.guardrailViolationRate > 5 ? 'text-red-600' : 'text-green-600'
                      )}>
                        {data.aiMetrics.guardrailViolationRate.toFixed(2)}%
                      </p>
                    </div>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          data.aiMetrics.guardrailViolationRate > 5 ? 'bg-red-500' : 'bg-green-500'
                        )}
                        style={{ width: `${100 - data.aiMetrics.guardrailViolationRate}%` }}
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Succes Rate</p>
                      <p className="text-3xl font-bold text-green-600">
                        {(100 - data.aiMetrics.guardrailViolationRate).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 11. Pagini Setări (Settings Pages)

### 11.1 AI Configuration Page

**Route:** `/sales/settings/ai`

**Descriere:** Configurare parametri AI Agent, modele, limită tokens, system prompts.

```typescript
// app/sales/settings/ai/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Save, 
  RotateCcw, 
  AlertTriangle,
  Bot,
  Cpu,
  MessageSquare,
  Shield,
  Zap,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface AIConfig {
  id: string;
  tenantId: string;
  
  // Model Configuration
  primaryModel: string;
  fallbackModel: string;
  maxTokensResponse: number;
  maxTokensContext: number;
  temperature: number;
  topP: number;
  
  // System Prompts
  systemPromptNegotiation: string;
  systemPromptSupport: string;
  systemPromptEscalation: string;
  
  // Behavior Settings
  autoRespond: boolean;
  responseDelayMs: number;
  maxConsecutiveMessages: number;
  idleTimeoutMinutes: number;
  
  // Safety Settings
  enableGuardrails: boolean;
  maxRegenerationsPerMessage: number;
  escalateOnRepeatedViolations: boolean;
  violationEscalationThreshold: number;
  
  // Cost Controls
  dailyTokenBudget: number;
  monthlyTokenBudget: number;
  alertAtPercentage: number;
  pauseAtBudgetLimit: boolean;
  
  // Channels
  enabledChannels: ('whatsapp' | 'email')[];
  channelSpecificSettings: Record<string, any>;
  
  updatedAt: string;
  updatedBy: string;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  costPer1kTokens: number;
  capabilities: string[];
}

// Validation Schema
const aiConfigSchema = z.object({
  primaryModel: z.string().min(1, 'Selectează modelul primar'),
  fallbackModel: z.string().min(1, 'Selectează modelul fallback'),
  maxTokensResponse: z.number().min(100).max(8000),
  maxTokensContext: z.number().min(1000).max(128000),
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  
  systemPromptNegotiation: z.string().min(100, 'Prompt-ul trebuie să aibă minim 100 caractere'),
  systemPromptSupport: z.string().min(100),
  systemPromptEscalation: z.string().min(50),
  
  autoRespond: z.boolean(),
  responseDelayMs: z.number().min(0).max(30000),
  maxConsecutiveMessages: z.number().min(1).max(20),
  idleTimeoutMinutes: z.number().min(5).max(1440),
  
  enableGuardrails: z.boolean(),
  maxRegenerationsPerMessage: z.number().min(1).max(5),
  escalateOnRepeatedViolations: z.boolean(),
  violationEscalationThreshold: z.number().min(1).max(10),
  
  dailyTokenBudget: z.number().min(0),
  monthlyTokenBudget: z.number().min(0),
  alertAtPercentage: z.number().min(50).max(100),
  pauseAtBudgetLimit: z.boolean(),
  
  enabledChannels: z.array(z.enum(['whatsapp', 'email'])).min(1)
});

type AIConfigFormData = z.infer<typeof aiConfigSchema>;

// Available Models
const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    maxTokens: 8192,
    costPer1kTokens: 0.003,
    capabilities: ['negotiation', 'analysis', 'multilingual', 'tools']
  },
  {
    id: 'claude-haiku-4-20250514',
    name: 'Claude Haiku 4',
    provider: 'Anthropic',
    maxTokens: 4096,
    costPer1kTokens: 0.00025,
    capabilities: ['fast-response', 'simple-tasks', 'cost-effective']
  },
  {
    id: 'grok-2-1212',
    name: 'Grok 2',
    provider: 'xAI',
    maxTokens: 8192,
    costPer1kTokens: 0.002,
    capabilities: ['analysis', 'sentiment', 'intent']
  }
];

// Default System Prompts
const DEFAULT_PROMPTS = {
  negotiation: `Ești un agent de vânzări profesionist pentru o companie agricolă din România.
Obiectivul tău este să negociezi prețuri și condiții favorabile atât pentru companie cât și pentru client.
Reguli:
- Răspunde întotdeauna în limba română
- Fii politicos dar ferm
- Nu depăși niciodată limitele de discount aprobate
- Dacă nu poți satisface cererea clientului, oferă alternative
- Pentru discount-uri mari, menționează că necesită aprobare`,
  
  support: `Ești un agent de suport pentru o companie agricolă din România.
Ajuți clienții cu întrebări despre produse, comenzi, livrări și facturi.
Reguli:
- Răspunde clar și concis
- Dacă nu știi răspunsul, spune acest lucru și oferă să escaladezi
- Verifică întotdeauna informațiile înainte de a le comunica`,
  
  escalation: `Conversația a fost escaladată către un agent uman.
Rezumă contextul și motivul escaladării pentru agentul care preia.`
};

export default function AIConfigPage() {
  const queryClient = useQueryClient();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Fetch current config
  const { data: config, isLoading } = useQuery<AIConfig>({
    queryKey: ['ai-config'],
    queryFn: async () => {
      const res = await fetch('/api/v1/sales/settings/ai');
      if (!res.ok) throw new Error('Failed to fetch AI config');
      return res.json();
    }
  });
  
  // Form setup
  const form = useForm<AIConfigFormData>({
    resolver: zodResolver(aiConfigSchema),
    values: config ? {
      primaryModel: config.primaryModel,
      fallbackModel: config.fallbackModel,
      maxTokensResponse: config.maxTokensResponse,
      maxTokensContext: config.maxTokensContext,
      temperature: config.temperature,
      topP: config.topP,
      systemPromptNegotiation: config.systemPromptNegotiation,
      systemPromptSupport: config.systemPromptSupport,
      systemPromptEscalation: config.systemPromptEscalation,
      autoRespond: config.autoRespond,
      responseDelayMs: config.responseDelayMs,
      maxConsecutiveMessages: config.maxConsecutiveMessages,
      idleTimeoutMinutes: config.idleTimeoutMinutes,
      enableGuardrails: config.enableGuardrails,
      maxRegenerationsPerMessage: config.maxRegenerationsPerMessage,
      escalateOnRepeatedViolations: config.escalateOnRepeatedViolations,
      violationEscalationThreshold: config.violationEscalationThreshold,
      dailyTokenBudget: config.dailyTokenBudget,
      monthlyTokenBudget: config.monthlyTokenBudget,
      alertAtPercentage: config.alertAtPercentage,
      pauseAtBudgetLimit: config.pauseAtBudgetLimit,
      enabledChannels: config.enabledChannels
    } : undefined
  });
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AIConfigFormData) => {
      const res = await fetch('/api/v1/sales/settings/ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save config');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-config'] });
      setHasUnsavedChanges(false);
      toast.success('Configurație salvată', {
        description: 'Setările AI au fost actualizate cu succes'
      });
    },
    onError: (error) => {
      toast.error('Eroare la salvare', {
        description: error.message
      });
    }
  });
  
  const onSubmit = (data: AIConfigFormData) => {
    saveMutation.mutate(data);
  };
  
  const resetToDefaults = () => {
    form.setValue('systemPromptNegotiation', DEFAULT_PROMPTS.negotiation);
    form.setValue('systemPromptSupport', DEFAULT_PROMPTS.support);
    form.setValue('systemPromptEscalation', DEFAULT_PROMPTS.escalation);
    setHasUnsavedChanges(true);
  };
  
  // Watch for changes
  form.watch(() => {
    setHasUnsavedChanges(true);
  });
  
  if (isLoading) {
    return <div className="p-8">Se încarcă configurația...</div>;
  }
  
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Configurare AI Agent
          </h1>
          <p className="text-gray-500 mt-1">
            Setări pentru modelele AI, system prompts și comportament
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              Modificări nesalvate
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={resetToDefaults}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Prompts
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Se salvează...' : 'Salvează'}
          </Button>
        </div>
      </div>
      
      {/* Warning for production changes */}
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Atenție</AlertTitle>
        <AlertDescription>
          Modificările vor afecta toate conversațiile active. Testează mai întâi în mediul de staging.
        </AlertDescription>
      </Alert>
      
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="models" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="models">
              <Cpu className="h-4 w-4 mr-2" />
              Modele
            </TabsTrigger>
            <TabsTrigger value="prompts">
              <MessageSquare className="h-4 w-4 mr-2" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="behavior">
              <Zap className="h-4 w-4 mr-2" />
              Comportament
            </TabsTrigger>
            <TabsTrigger value="safety">
              <Shield className="h-4 w-4 mr-2" />
              Siguranță
            </TabsTrigger>
            <TabsTrigger value="costs">
              <DollarSign className="h-4 w-4 mr-2" />
              Costuri
            </TabsTrigger>
          </TabsList>
          
          {/* Models Tab */}
          <TabsContent value="models" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Selectare Modele</CardTitle>
                <CardDescription>
                  Configurează modelele AI folosite pentru conversații
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Primary Model */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model Primar</label>
                    <Controller
                      name="primaryModel"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selectează model" />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_MODELS.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex items-center gap-2">
                                  <span>{model.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {model.provider}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.primaryModel && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.primaryModel.message}
                      </p>
                    )}
                    
                    {/* Model Info */}
                    {form.watch('primaryModel') && (
                      <div className="p-3 bg-gray-50 rounded-lg text-sm">
                        {(() => {
                          const model = AVAILABLE_MODELS.find(
                            m => m.id === form.watch('primaryModel')
                          );
                          if (!model) return null;
                          return (
                            <>
                              <p><strong>Max Tokens:</strong> {model.maxTokens.toLocaleString()}</p>
                              <p><strong>Cost:</strong> ${model.costPer1kTokens}/1k tokens</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {model.capabilities.map(cap => (
                                  <Badge key={cap} variant="secondary" className="text-xs">
                                    {cap}
                                  </Badge>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  
                  {/* Fallback Model */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model Fallback</label>
                    <Controller
                      name="fallbackModel"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selectează model fallback" />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_MODELS.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex items-center gap-2">
                                  <span>{model.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {model.provider}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <p className="text-xs text-gray-500">
                      Folosit când modelul primar este indisponibil sau depășește limita de rate
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                {/* Token Limits */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Tokens Răspuns</label>
                    <Controller
                      name="maxTokensResponse"
                      control={form.control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Slider
                            value={[field.value]}
                            onValueChange={([v]) => field.onChange(v)}
                            min={100}
                            max={8000}
                            step={100}
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>100</span>
                            <span className="font-medium">{field.value}</span>
                            <span>8000</span>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Tokens Context</label>
                    <Controller
                      name="maxTokensContext"
                      control={form.control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Slider
                            value={[field.value]}
                            onValueChange={([v]) => field.onChange(v)}
                            min={1000}
                            max={128000}
                            step={1000}
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>1K</span>
                            <span className="font-medium">{(field.value / 1000).toFixed(0)}K</span>
                            <span>128K</span>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
                
                <Separator />
                
                {/* Generation Parameters */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Temperature</label>
                    <Controller
                      name="temperature"
                      control={form.control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Slider
                            value={[field.value]}
                            onValueChange={([v]) => field.onChange(v)}
                            min={0}
                            max={2}
                            step={0.1}
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>0 (deterministic)</span>
                            <span className="font-medium">{field.value.toFixed(1)}</span>
                            <span>2 (creativ)</span>
                          </div>
                        </div>
                      )}
                    />
                    <p className="text-xs text-gray-500">
                      Valoare mică = răspunsuri consistente, valoare mare = răspunsuri variate
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Top P</label>
                    <Controller
                      name="topP"
                      control={form.control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Slider
                            value={[field.value]}
                            onValueChange={([v]) => field.onChange(v)}
                            min={0}
                            max={1}
                            step={0.05}
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>0</span>
                            <span className="font-medium">{field.value.toFixed(2)}</span>
                            <span>1</span>
                          </div>
                        </div>
                      )}
                    />
                    <p className="text-xs text-gray-500">
                      Nucleus sampling - controlează diversitatea răspunsurilor
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Prompts Tab */}
          <TabsContent value="prompts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Prompts</CardTitle>
                <CardDescription>
                  Definește comportamentul AI pentru diferite contexte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Negotiation Prompt */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Prompt Negociere
                    <Badge variant="outline" className="ml-2">Principal</Badge>
                  </label>
                  <Controller
                    name="systemPromptNegotiation"
                    control={form.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        rows={8}
                        placeholder="Definește comportamentul AI în negocieri..."
                        className="font-mono text-sm"
                      />
                    )}
                  />
                  {form.formState.errors.systemPromptNegotiation && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.systemPromptNegotiation.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {form.watch('systemPromptNegotiation')?.length || 0} caractere
                  </p>
                </div>
                
                <Separator />
                
                {/* Support Prompt */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Prompt Suport
                  </label>
                  <Controller
                    name="systemPromptSupport"
                    control={form.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        rows={6}
                        placeholder="Definește comportamentul AI pentru suport..."
                        className="font-mono text-sm"
                      />
                    )}
                  />
                  {form.formState.errors.systemPromptSupport && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.systemPromptSupport.message}
                    </p>
                  )}
                </div>
                
                <Separator />
                
                {/* Escalation Prompt */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Prompt Escaladare
                  </label>
                  <Controller
                    name="systemPromptEscalation"
                    control={form.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Mesaj pentru agentul uman la escaladare..."
                        className="font-mono text-sm"
                      />
                    )}
                  />
                  <p className="text-xs text-gray-500">
                    Acest prompt este trimis agentului uman când preia conversația
                  </p>
                </div>
                
                <Separator />
                
                {/* Prompt Variables */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Variabile Disponibile</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <code className="bg-blue-100 px-2 py-1 rounded">{'{{client_name}}'}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{'{{company_name}}'}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{'{{client_tier}}'}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{'{{product_name}}'}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{'{{current_price}}'}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{'{{max_discount}}'}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{'{{agent_name}}'}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{'{{today_date}}'}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{'{{order_history}}'}</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Behavior Tab */}
          <TabsContent value="behavior" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Comportament Conversații</CardTitle>
                <CardDescription>
                  Setări pentru modul în care AI răspunde și gestionează conversațiile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Auto Respond */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Răspuns Automat</label>
                    <p className="text-sm text-gray-500">
                      AI răspunde automat la mesajele clientului
                    </p>
                  </div>
                  <Controller
                    name="autoRespond"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
                
                <Separator />
                
                {/* Response Delay */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Întârziere Răspuns (ms)</label>
                  <Controller
                    name="responseDelayMs"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[field.value]}
                          onValueChange={([v]) => field.onChange(v)}
                          min={0}
                          max={30000}
                          step={500}
                          className="flex-1"
                        />
                        <span className="w-20 text-right font-mono">
                          {(field.value / 1000).toFixed(1)}s
                        </span>
                      </div>
                    )}
                  />
                  <p className="text-xs text-gray-500">
                    Întârziere pentru a simula timp de "gândire" natural
                  </p>
                </div>
                
                <Separator />
                
                {/* Max Consecutive Messages */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Mesaje Consecutive AI</label>
                  <Controller
                    name="maxConsecutiveMessages"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          min={1}
                          max={20}
                          className="w-24"
                        />
                        <span className="text-sm text-gray-500">mesaje</span>
                      </div>
                    )}
                  />
                  <p className="text-xs text-gray-500">
                    După acest număr fără răspuns de la client, conversația este pusă pe pauză
                  </p>
                </div>
                
                <Separator />
                
                {/* Idle Timeout */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Timeout Inactivitate</label>
                  <Controller
                    name="idleTimeoutMinutes"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          min={5}
                          max={1440}
                          className="w-24"
                        />
                        <span className="text-sm text-gray-500">minute</span>
                      </div>
                    )}
                  />
                  <p className="text-xs text-gray-500">
                    Conversația devine "idle" după acest timp fără mesaje
                  </p>
                </div>
                
                <Separator />
                
                {/* Enabled Channels */}
                <div className="space-y-4">
                  <label className="text-sm font-medium">Canale Active</label>
                  <Controller
                    name="enabledChannels"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.value.includes('whatsapp')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                field.onChange([...field.value, 'whatsapp']);
                              } else {
                                field.onChange(field.value.filter(c => c !== 'whatsapp'));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <Badge className="bg-green-500">WhatsApp</Badge>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.value.includes('email')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                field.onChange([...field.value, 'email']);
                              } else {
                                field.onChange(field.value.filter(c => c !== 'email'));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <Badge className="bg-blue-500">Email</Badge>
                        </label>
                      </div>
                    )}
                  />
                  {form.formState.errors.enabledChannels && (
                    <p className="text-sm text-red-500">
                      Selectează cel puțin un canal
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Safety Tab */}
          <TabsContent value="safety" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Setări Siguranță & Guardrails</CardTitle>
                <CardDescription>
                  Configurează sistemul de validare și protecție AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Guardrails */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Activează Guardrails</label>
                    <p className="text-sm text-gray-500">
                      Validează toate răspunsurile AI înainte de trimitere
                    </p>
                  </div>
                  <Controller
                    name="enableGuardrails"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
                
                {form.watch('enableGuardrails') && (
                  <>
                    <Separator />
                    
                    {/* Max Regenerations */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Max Regenerări per Mesaj</label>
                      <Controller
                        name="maxRegenerationsPerMessage"
                        control={form.control}
                        render={({ field }) => (
                          <div className="flex items-center gap-4">
                            <Slider
                              value={[field.value]}
                              onValueChange={([v]) => field.onChange(v)}
                              min={1}
                              max={5}
                              step={1}
                              className="w-48"
                            />
                            <span className="font-mono">{field.value}</span>
                          </div>
                        )}
                      />
                      <p className="text-xs text-gray-500">
                        Număr maxim de încercări de regenerare când guardrails detectează probleme
                      </p>
                    </div>
                    
                    <Separator />
                    
                    {/* Escalate on Violations */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Escaladare la Violații Repetate</label>
                        <p className="text-sm text-gray-500">
                          Escaladează automat când depășește pragul de violații
                        </p>
                      </div>
                      <Controller
                        name="escalateOnRepeatedViolations"
                        control={form.control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    
                    {form.watch('escalateOnRepeatedViolations') && (
                      <div className="space-y-2 ml-4">
                        <label className="text-sm font-medium">Prag Escaladare</label>
                        <Controller
                          name="violationEscalationThreshold"
                          control={form.control}
                          render={({ field }) => (
                            <div className="flex items-center gap-4">
                              <Input
                                type="number"
                                value={field.value}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                min={1}
                                max={10}
                                className="w-20"
                              />
                              <span className="text-sm text-gray-500">
                                violații consecutive
                              </span>
                            </div>
                          )}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Guardrails Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Status Guardrails</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-500">Validare Preț</p>
                    <p className="text-xl font-bold text-green-600">Activ</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-500">Validare Stoc</p>
                    <p className="text-xl font-bold text-green-600">Activ</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-500">Validare Discount</p>
                    <p className="text-xl font-bold text-green-600">Activ</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-500">Compliance</p>
                    <p className="text-xl font-bold text-green-600">Activ</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Configurare detaliată în <a href="/sales/settings/guardrails" className="text-blue-600 hover:underline">Setări Guardrails</a>
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Costs Tab */}
          <TabsContent value="costs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Control Costuri Token</CardTitle>
                <CardDescription>
                  Setează buget și alerte pentru consumul de tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Daily Budget */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buget Zilnic Tokens</label>
                  <Controller
                    name="dailyTokenBudget"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          min={0}
                          className="w-40"
                        />
                        <span className="text-sm text-gray-500">tokens</span>
                        <span className="text-sm text-gray-400">
                          (~${((field.value / 1000) * 0.003).toFixed(2)} estimat)
                        </span>
                      </div>
                    )}
                  />
                </div>
                
                <Separator />
                
                {/* Monthly Budget */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buget Lunar Tokens</label>
                  <Controller
                    name="monthlyTokenBudget"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          min={0}
                          className="w-40"
                        />
                        <span className="text-sm text-gray-500">tokens</span>
                        <span className="text-sm text-gray-400">
                          (~${((field.value / 1000) * 0.003).toFixed(2)} estimat)
                        </span>
                      </div>
                    )}
                  />
                </div>
                
                <Separator />
                
                {/* Alert Threshold */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Alertă la Procent Consumat</label>
                  <Controller
                    name="alertAtPercentage"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[field.value]}
                          onValueChange={([v]) => field.onChange(v)}
                          min={50}
                          max={100}
                          step={5}
                          className="w-64"
                        />
                        <span className="font-mono">{field.value}%</span>
                      </div>
                    )}
                  />
                  <p className="text-xs text-gray-500">
                    Trimite alertă când se consumă acest procent din buget
                  </p>
                </div>
                
                <Separator />
                
                {/* Pause at Limit */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Pauză la Limita Bugetului</label>
                    <p className="text-sm text-gray-500">
                      Oprește răspunsurile AI automate când bugetul este epuizat
                    </p>
                  </div>
                  <Controller
                    name="pauseAtBudgetLimit"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
                
                {/* Current Usage */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium">Consum Curent</h4>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Astăzi</span>
                      <span>125,430 / {form.watch('dailyTokenBudget')?.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ 
                          width: `${Math.min(100, (125430 / (form.watch('dailyTokenBudget') || 1)) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Această lună</span>
                      <span>2,145,230 / {form.watch('monthlyTokenBudget')?.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ 
                          width: `${Math.min(100, (2145230 / (form.watch('monthlyTokenBudget') || 1)) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
```

---

### 11.2 Guardrails Settings Page

**Route:** `/sales/settings/guardrails`

**Descriere:** Configurare reguli guardrails, praguri, acțiuni.

```typescript
// app/sales/settings/guardrails/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Save, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Types
interface GuardrailRule {
  id: string;
  name: string;
  description: string;
  category: 'price' | 'stock' | 'discount' | 'compliance' | 'content' | 'custom';
  enabled: boolean;
  priority: number;
  conditions: {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'regex';
    value: string;
  }[];
  action: 'block' | 'warn' | 'regenerate' | 'escalate' | 'log';
  actionConfig: {
    maxRegenerations?: number;
    escalateTo?: string;
    notifyChannels?: string[];
    customMessage?: string;
  };
  stats: {
    totalChecks: number;
    violations: number;
    lastViolation: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

// Validation Schema
const guardrailRuleSchema = z.object({
  name: z.string().min(3, 'Numele trebuie să aibă minim 3 caractere'),
  description: z.string().min(10, 'Descrierea trebuie să aibă minim 10 caractere'),
  category: z.enum(['price', 'stock', 'discount', 'compliance', 'content', 'custom']),
  enabled: z.boolean(),
  priority: z.number().min(1).max(100),
  conditions: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'not_contains', 'regex']),
    value: z.string().min(1)
  })).min(1, 'Adaugă cel puțin o condiție'),
  action: z.enum(['block', 'warn', 'regenerate', 'escalate', 'log']),
  actionConfig: z.object({
    maxRegenerations: z.number().optional(),
    escalateTo: z.string().optional(),
    notifyChannels: z.array(z.string()).optional(),
    customMessage: z.string().optional()
  })
});

type GuardrailRuleFormData = z.infer<typeof guardrailRuleSchema>;

// Category Colors
const CATEGORY_COLORS: Record<string, string> = {
  price: 'bg-green-100 text-green-800',
  stock: 'bg-blue-100 text-blue-800',
  discount: 'bg-purple-100 text-purple-800',
  compliance: 'bg-red-100 text-red-800',
  content: 'bg-orange-100 text-orange-800',
  custom: 'bg-gray-100 text-gray-800'
};

// Action Colors
const ACTION_COLORS: Record<string, string> = {
  block: 'bg-red-500',
  warn: 'bg-yellow-500',
  regenerate: 'bg-blue-500',
  escalate: 'bg-orange-500',
  log: 'bg-gray-500'
};

// Available Fields for Conditions
const AVAILABLE_FIELDS = [
  { value: 'response.price', label: 'Preț menționat' },
  { value: 'response.discount_percent', label: 'Discount %' },
  { value: 'response.quantity', label: 'Cantitate' },
  { value: 'response.total_value', label: 'Valoare totală' },
  { value: 'response.contains_promise', label: 'Conține promisiune' },
  { value: 'response.contains_competitor', label: 'Menționează concurență' },
  { value: 'response.sentiment', label: 'Sentiment' },
  { value: 'response.word_count', label: 'Număr cuvinte' },
  { value: 'context.client_tier', label: 'Tier client' },
  { value: 'context.negotiation_stage', label: 'Etapă negociere' },
  { value: 'context.stock_level', label: 'Nivel stoc' },
  { value: 'product.min_price', label: 'Preț minim produs' },
  { value: 'product.max_discount', label: 'Discount maxim produs' }
];

// Operators
const OPERATORS = [
  { value: 'eq', label: '= (egal)' },
  { value: 'neq', label: '≠ (diferit)' },
  { value: 'gt', label: '> (mai mare)' },
  { value: 'gte', label: '≥ (mai mare sau egal)' },
  { value: 'lt', label: '< (mai mic)' },
  { value: 'lte', label: '≤ (mai mic sau egal)' },
  { value: 'contains', label: 'conține' },
  { value: 'not_contains', label: 'nu conține' },
  { value: 'regex', label: 'regex' }
];

export default function GuardrailsSettingsPage() {
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<GuardrailRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Fetch rules
  const { data: rules, isLoading } = useQuery<GuardrailRule[]>({
    queryKey: ['guardrail-rules'],
    queryFn: async () => {
      const res = await fetch('/api/v1/sales/settings/guardrails');
      if (!res.ok) throw new Error('Failed to fetch rules');
      return res.json();
    }
  });
  
  // Form setup
  const form = useForm<GuardrailRuleFormData>({
    resolver: zodResolver(guardrailRuleSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'custom',
      enabled: true,
      priority: 50,
      conditions: [{ field: '', operator: 'eq', value: '' }],
      action: 'warn',
      actionConfig: {}
    }
  });
  
  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = 
    useFieldArray({
      control: form.control,
      name: 'conditions'
    });
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: GuardrailRuleFormData) => {
      const url = editingRule 
        ? `/api/v1/sales/settings/guardrails/${editingRule.id}`
        : '/api/v1/sales/settings/guardrails';
      const method = editingRule ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardrail-rules'] });
      setIsDialogOpen(false);
      setEditingRule(null);
      form.reset();
      toast.success(editingRule ? 'Regulă actualizată' : 'Regulă creată');
    },
    onError: (error) => {
      toast.error('Eroare', { description: error.message });
    }
  });
  
  // Toggle rule mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/v1/sales/settings/guardrails/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (!res.ok) throw new Error('Failed to toggle rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardrail-rules'] });
    }
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/sales/settings/guardrails/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete rule');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardrail-rules'] });
      toast.success('Regulă ștearsă');
    }
  });
  
  const openEditDialog = (rule: GuardrailRule) => {
    setEditingRule(rule);
    form.reset({
      name: rule.name,
      description: rule.description,
      category: rule.category,
      enabled: rule.enabled,
      priority: rule.priority,
      conditions: rule.conditions,
      action: rule.action,
      actionConfig: rule.actionConfig
    });
    setIsDialogOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingRule(null);
    form.reset();
    setIsDialogOpen(true);
  };
  
  const duplicateRule = (rule: GuardrailRule) => {
    setEditingRule(null);
    form.reset({
      name: `${rule.name} (copie)`,
      description: rule.description,
      category: rule.category,
      enabled: false,
      priority: rule.priority,
      conditions: rule.conditions,
      action: rule.action,
      actionConfig: rule.actionConfig
    });
    setIsDialogOpen(true);
  };
  
  if (isLoading) {
    return <div className="p-8">Se încarcă regulile...</div>;
  }
  
  // Group by category
  const rulesByCategory = rules?.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, GuardrailRule[]>) || {};
  
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Configurare Guardrails
          </h1>
          <p className="text-gray-500 mt-1">
            Reguli de validare pentru răspunsurile AI
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Regulă Nouă
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Editare Regulă' : 'Regulă Nouă'}
              </DialogTitle>
              <DialogDescription>
                Definește condițiile și acțiunile pentru validarea răspunsurilor AI
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nume</label>
                  <Input
                    {...form.register('name')}
                    placeholder="Ex: Validare preț minim"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categorie</label>
                  <Controller
                    name="category"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price">Preț</SelectItem>
                          <SelectItem value="stock">Stoc</SelectItem>
                          <SelectItem value="discount">Discount</SelectItem>
                          <SelectItem value="compliance">Compliance</SelectItem>
                          <SelectItem value="content">Conținut</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Descriere</label>
                <Textarea
                  {...form.register('description')}
                  placeholder="Descriere detaliată a regulii..."
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prioritate (1-100)</label>
                  <Input
                    type="number"
                    {...form.register('priority', { valueAsNumber: true })}
                    min={1}
                    max={100}
                  />
                </div>
                
                <div className="flex items-center justify-between pt-6">
                  <label className="text-sm font-medium">Activă</label>
                  <Controller
                    name="enabled"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* Conditions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Condiții (AND)</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendCondition({ field: '', operator: 'eq', value: '' })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adaugă
                  </Button>
                </div>
                
                {conditionFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Controller
                      name={`conditions.${index}.field`}
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Câmp" />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_FIELDS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    
                    <Controller
                      name={`conditions.${index}.operator`}
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    
                    <Input
                      {...form.register(`conditions.${index}.value`)}
                      placeholder="Valoare"
                      className="flex-1"
                    />
                    
                    {conditionFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCondition(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <Separator />
              
              {/* Action */}
              <div className="space-y-4">
                <label className="text-sm font-medium">Acțiune la Violație</label>
                
                <Controller
                  name="action"
                  control={form.control}
                  render={({ field }) => (
                    <div className="grid grid-cols-5 gap-2">
                      {['block', 'warn', 'regenerate', 'escalate', 'log'].map((action) => (
                        <Button
                          key={action}
                          type="button"
                          variant={field.value === action ? 'default' : 'outline'}
                          className={field.value === action ? ACTION_COLORS[action] : ''}
                          onClick={() => field.onChange(action)}
                        >
                          {action === 'block' && <XCircle className="h-4 w-4 mr-1" />}
                          {action === 'warn' && <AlertTriangle className="h-4 w-4 mr-1" />}
                          {action === 'regenerate' && '🔄'}
                          {action === 'escalate' && '📤'}
                          {action === 'log' && '📝'}
                          {action.charAt(0).toUpperCase() + action.slice(1)}
                        </Button>
                      ))}
                    </div>
                  )}
                />
                
                {/* Action Config based on action type */}
                {form.watch('action') === 'regenerate' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Regenerări</label>
                    <Input
                      type="number"
                      {...form.register('actionConfig.maxRegenerations', { valueAsNumber: true })}
                      min={1}
                      max={5}
                      defaultValue={3}
                    />
                  </div>
                )}
                
                {form.watch('action') === 'escalate' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Escaladează către</label>
                    <Select
                      value={form.watch('actionConfig.escalateTo')}
                      onValueChange={(v) => form.setValue('actionConfig.escalateTo', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="sales_manager">Manager Vânzări</SelectItem>
                        <SelectItem value="compliance_team">Echipa Compliance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {(form.watch('action') === 'block' || form.watch('action') === 'warn') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mesaj Custom (opțional)</label>
                    <Textarea
                      {...form.register('actionConfig.customMessage')}
                      placeholder="Mesaj afișat clientului intern..."
                      rows={2}
                    />
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Anulează
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? 'Se salvează...' : 'Salvează'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Total Reguli</p>
            <p className="text-2xl font-bold">{rules?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Reguli Active</p>
            <p className="text-2xl font-bold text-green-600">
              {rules?.filter(r => r.enabled).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Verificări Total</p>
            <p className="text-2xl font-bold">
              {rules?.reduce((sum, r) => sum + r.stats.totalChecks, 0).toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Violații Detectate</p>
            <p className="text-2xl font-bold text-red-600">
              {rules?.reduce((sum, r) => sum + r.stats.violations, 0).toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Rules by Category */}
      {Object.entries(rulesByCategory).map(([category, categoryRules]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className={CATEGORY_COLORS[category]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Badge>
              <span className="text-gray-400 font-normal text-sm">
                ({categoryRules.length} reguli)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Activ</TableHead>
                  <TableHead>Nume</TableHead>
                  <TableHead>Prioritate</TableHead>
                  <TableHead>Acțiune</TableHead>
                  <TableHead>Verificări</TableHead>
                  <TableHead>Violații</TableHead>
                  <TableHead>Rată</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryRules
                  .sort((a, b) => b.priority - a.priority)
                  .map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(enabled) => 
                            toggleMutation.mutate({ id: rule.id, enabled })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs">
                            {rule.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={ACTION_COLORS[rule.action]}>
                          {rule.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{rule.stats.totalChecks.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={rule.stats.violations > 0 ? 'text-red-600 font-medium' : ''}>
                          {rule.stats.violations.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {rule.stats.totalChecks > 0 ? (
                          <span className={cn(
                            'font-medium',
                            (rule.stats.violations / rule.stats.totalChecks) * 100 > 5 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          )}>
                            {((rule.stats.violations / rule.stats.totalChecks) * 100).toFixed(2)}%
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateRule(rule)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Sigur vrei să ștergi această regulă?')) {
                                deleteMutation.mutate(rule.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

### 11.3 Integrations Settings Page

**Route:** `/sales/settings/integrations`

**Descriere:** Configurare integrări externe: Oblio, ANAF, TimelinesAI, Resend, xAI.

```typescript
// app/sales/settings/integrations/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings2, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  ExternalLink,
  Key,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Types
interface Integration {
  id: string;
  name: string;
  type: 'oblio' | 'anaf_spv' | 'timelinesai' | 'resend' | 'xai' | 'anthropic';
  description: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  enabled: boolean;
  config: Record<string, any>;
  credentials: {
    hasApiKey: boolean;
    hasSecret: boolean;
    lastRotated: string | null;
  };
  health: {
    lastCheck: string | null;
    latencyMs: number | null;
    successRate: number | null;
    lastError: string | null;
  };
  usage: {
    requestsToday: number;
    requestsMonth: number;
    quotaLimit: number | null;
  };
}

// Integration Icons/Logos
const INTEGRATION_ICONS: Record<string, React.ReactNode> = {
  oblio: <span className="text-2xl">📄</span>,
  anaf_spv: <span className="text-2xl">🏛️</span>,
  timelinesai: <span className="text-2xl">💬</span>,
  resend: <span className="text-2xl">📧</span>,
  xai: <span className="text-2xl">🤖</span>,
  anthropic: <span className="text-2xl">🧠</span>
};

// Status Colors
const STATUS_CONFIG = {
  connected: { color: 'bg-green-500', label: 'Conectat', icon: CheckCircle },
  disconnected: { color: 'bg-gray-400', label: 'Deconectat', icon: XCircle },
  error: { color: 'bg-red-500', label: 'Eroare', icon: AlertTriangle },
  pending: { color: 'bg-yellow-500', label: 'În așteptare', icon: RefreshCw }
};

export default function IntegrationsSettingsPage() {
  const queryClient = useQueryClient();
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [newSecret, setNewSecret] = useState('');
  
  // Fetch integrations
  const { data: integrations, isLoading } = useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: async () => {
      const res = await fetch('/api/v1/sales/settings/integrations');
      if (!res.ok) throw new Error('Failed to fetch integrations');
      return res.json();
    }
  });
  
  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const res = await fetch(`/api/v1/sales/settings/integrations/${integrationId}/test`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Connection test failed');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      if (data.success) {
        toast.success('Conexiune reușită', {
          description: `Latență: ${data.latencyMs}ms`
        });
      } else {
        toast.error('Conexiune eșuată', {
          description: data.error
        });
      }
    },
    onError: (error) => {
      toast.error('Eroare la testare', { description: error.message });
    }
  });
  
  // Toggle integration mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/v1/sales/settings/integrations/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (!res.ok) throw new Error('Failed to toggle integration');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    }
  });
  
  // Update credentials mutation
  const updateCredentialsMutation = useMutation({
    mutationFn: async ({ id, apiKey, secret }: { id: string; apiKey?: string; secret?: string }) => {
      const res = await fetch(`/api/v1/sales/settings/integrations/${id}/credentials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, secret })
      });
      if (!res.ok) throw new Error('Failed to update credentials');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setNewApiKey('');
      setNewSecret('');
      setSelectedIntegration(null);
      toast.success('Credențiale actualizate');
    },
    onError: (error) => {
      toast.error('Eroare', { description: error.message });
    }
  });
  
  if (isLoading) {
    return <div className="p-8">Se încarcă integrările...</div>;
  }
  
  // Group by category
  const aiIntegrations = integrations?.filter(i => ['xai', 'anthropic'].includes(i.type)) || [];
  const businessIntegrations = integrations?.filter(i => ['oblio', 'anaf_spv'].includes(i.type)) || [];
  const communicationIntegrations = integrations?.filter(i => ['timelinesai', 'resend'].includes(i.type)) || [];
  
  const renderIntegrationCard = (integration: Integration) => {
    const statusConfig = STATUS_CONFIG[integration.status];
    const StatusIcon = statusConfig.icon;
    
    return (
      <Card key={integration.id} className={cn(
        'transition-all',
        !integration.enabled && 'opacity-60'
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {INTEGRATION_ICONS[integration.type]}
              <div>
                <CardTitle className="text-lg">{integration.name}</CardTitle>
                <CardDescription>{integration.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('gap-1', statusConfig.color)}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
              <Switch
                checked={integration.enabled}
                onCheckedChange={(enabled) => 
                  toggleMutation.mutate({ id: integration.id, enabled })
                }
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Health & Usage */}
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-gray-500">Latență</p>
              <p className="font-medium">
                {integration.health.latencyMs 
                  ? `${integration.health.latencyMs}ms` 
                  : '-'}
              </p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-gray-500">Succes Rate</p>
              <p className={cn(
                'font-medium',
                integration.health.successRate && integration.health.successRate < 95 
                  ? 'text-red-600' 
                  : 'text-green-600'
              )}>
                {integration.health.successRate 
                  ? `${integration.health.successRate.toFixed(1)}%` 
                  : '-'}
              </p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-gray-500">Req/Azi</p>
              <p className="font-medium">{integration.usage.requestsToday.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-gray-500">Req/Lună</p>
              <p className="font-medium">
                {integration.usage.requestsMonth.toLocaleString()}
                {integration.usage.quotaLimit && (
                  <span className="text-gray-400">
                    /{(integration.usage.quotaLimit / 1000).toFixed(0)}k
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* Error Alert */}
          {integration.health.lastError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ultima eroare</AlertTitle>
              <AlertDescription className="text-xs font-mono">
                {integration.health.lastError}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Credentials Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Key className="h-4 w-4 text-gray-400" />
                API Key: {integration.credentials.hasApiKey 
                  ? <CheckCircle className="h-4 w-4 text-green-500" />
                  : <XCircle className="h-4 w-4 text-red-500" />}
              </span>
              {integration.credentials.lastRotated && (
                <span className="text-gray-500">
                  Rotit {formatDistanceToNow(new Date(integration.credentials.lastRotated), { 
                    addSuffix: true, 
                    locale: ro 
                  })}
                </span>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => testConnectionMutation.mutate(integration.id)}
              disabled={testConnectionMutation.isPending}
            >
              <Activity className="h-4 w-4 mr-1" />
              Test Conexiune
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIntegration(integration)}
            >
              <Settings2 className="h-4 w-4 mr-1" />
              Configurare
            </Button>
            {integration.type === 'oblio' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://www.oblio.eu', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Portal Oblio
              </Button>
            )}
            {integration.type === 'anaf_spv' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://www.anaf.ro/spv', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Portal ANAF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6" />
          Integrări Externe
        </h1>
        <p className="text-gray-500 mt-1">
          Configurare și monitorizare servicii externe
        </p>
      </div>
      
      {/* Integration Categories */}
      <Tabs defaultValue="ai" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ai">
            🤖 AI & LLM ({aiIntegrations.length})
          </TabsTrigger>
          <TabsTrigger value="business">
            🏢 Business ({businessIntegrations.length})
          </TabsTrigger>
          <TabsTrigger value="communication">
            💬 Comunicare ({communicationIntegrations.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="ai" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {aiIntegrations.map(renderIntegrationCard)}
          </div>
        </TabsContent>
        
        <TabsContent value="business" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {businessIntegrations.map(renderIntegrationCard)}
          </div>
        </TabsContent>
        
        <TabsContent value="communication" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {communicationIntegrations.map(renderIntegrationCard)}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Configuration Dialog */}
      <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIntegration && INTEGRATION_ICONS[selectedIntegration.type]}
              Configurare {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>
              Actualizează credențialele și setările pentru această integrare
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* API Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="flex gap-2">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder={selectedIntegration?.credentials.hasApiKey 
                    ? '••••••••••••••••' 
                    : 'Introdu API Key'}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {/* Secret (for some integrations) */}
            {selectedIntegration?.type === 'oblio' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Secret</label>
                <Input
                  type="password"
                  value={newSecret}
                  onChange={(e) => setNewSecret(e.target.value)}
                  placeholder={selectedIntegration?.credentials.hasSecret 
                    ? '••••••••••••••••' 
                    : 'Introdu Secret'}
                />
              </div>
            )}
            
            {/* Integration-specific config */}
            {selectedIntegration?.type === 'anaf_spv' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <label className="text-sm font-medium">CIF Companie</label>
                  <Input
                    value={selectedIntegration.config.cif || ''}
                    placeholder="RO12345678"
                    disabled
                  />
                  <p className="text-xs text-gray-500">
                    Modifică în setările companiei
                  </p>
                </div>
              </>
            )}
            
            {selectedIntegration?.type === 'timelinesai' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Webhook URL</label>
                  <Input
                    value={`${process.env.NEXT_PUBLIC_API_URL}/webhooks/timelinesai`}
                    readOnly
                  />
                  <p className="text-xs text-gray-500">
                    Configurează acest URL în panoul TimelinesAI
                  </p>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedIntegration(null)}>
              Anulează
            </Button>
            <Button
              onClick={() => {
                if (selectedIntegration) {
                  updateCredentialsMutation.mutate({
                    id: selectedIntegration.id,
                    apiKey: newApiKey || undefined,
                    secret: newSecret || undefined
                  });
                }
              }}
              disabled={updateCredentialsMutation.isPending || (!newApiKey && !newSecret)}
            >
              {updateCredentialsMutation.isPending ? 'Se salvează...' : 'Salvează'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## 12. Guardrails Monitor Page

**Route:** `/sales/guardrails-monitor`

**Descriere:** Dashboard în timp real pentru monitorizare violații guardrails, regenerări, și performanță sistem de validare.

```typescript
// app/sales/guardrails-monitor/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  XCircle,
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  MessageSquare
} from 'lucide-react';
import { format, formatDistanceToNow, subHours } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import Link from 'next/link';

// Types
interface GuardrailCheck {
  id: string;
  conversationId: string;
  messageId: string;
  timestamp: string;
  ruleName: string;
  ruleCategory: string;
  checkResult: 'pass' | 'violation' | 'regenerated';
  originalContent: string | null;
  regeneratedContent: string | null;
  regenerationCount: number;
  latencyMs: number;
  metadata: {
    extractedPrice?: number;
    extractedDiscount?: number;
    violationReason?: string;
  };
  conversation: {
    clientName: string;
    channel: string;
  };
}

interface GuardrailStats {
  period: string;
  totalChecks: number;
  violations: number;
  regenerations: number;
  successRate: number;
  avgLatencyMs: number;
  byCategory: {
    category: string;
    checks: number;
    violations: number;
    rate: number;
  }[];
  byRule: {
    ruleName: string;
    checks: number;
    violations: number;
    rate: number;
  }[];
  timeline: {
    timestamp: string;
    checks: number;
    violations: number;
    regenerations: number;
  }[];
}

// Colors
const CHART_COLORS = {
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6'
};

const CATEGORY_COLORS: Record<string, string> = {
  price: CHART_COLORS.success,
  stock: CHART_COLORS.info,
  discount: CHART_COLORS.purple,
  compliance: CHART_COLORS.danger,
  content: CHART_COLORS.warning
};

export default function GuardrailsMonitorPage() {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Fetch stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<GuardrailStats>({
    queryKey: ['guardrails-stats', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sales/guardrails/stats?period=${timeRange}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: autoRefresh ? 30000 : false
  });
  
  // Fetch recent checks
  const { data: recentChecks, isLoading: checksLoading, refetch: refetchChecks } = useQuery<GuardrailCheck[]>({
    queryKey: ['guardrails-checks', timeRange, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timeRange,
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        limit: '100'
      });
      const res = await fetch(`/api/v1/sales/guardrails/checks?${params}`);
      if (!res.ok) throw new Error('Failed to fetch checks');
      return res.json();
    },
    refetchInterval: autoRefresh ? 10000 : false
  });
  
  // Auto-refresh toggle
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetchStats();
        refetchChecks();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refetchStats, refetchChecks]);
  
  if (statsLoading) {
    return <div className="p-8">Se încarcă monitorizarea...</div>;
  }
  
  // Separate violations and regenerations
  const violations = recentChecks?.filter(c => c.checkResult === 'violation') || [];
  const regenerations = recentChecks?.filter(c => c.checkResult === 'regenerated') || [];
  
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Monitor Guardrails
          </h1>
          <p className="text-gray-500 mt-1">
            Monitorizare în timp real a sistemului de validare AI
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Ultima oră</SelectItem>
              <SelectItem value="6h">6 ore</SelectItem>
              <SelectItem value="24h">24 ore</SelectItem>
              <SelectItem value="7d">7 zile</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', autoRefresh && 'animate-spin')} />
            {autoRefresh ? 'Auto ON' : 'Auto OFF'}
          </Button>
          
          <Link href="/sales/settings/guardrails">
            <Button variant="outline" size="sm">
              Configurare
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Verificări</p>
                <p className="text-2xl font-bold">{stats?.totalChecks.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              în {timeRange === '1h' ? 'ultima oră' : 
                  timeRange === '6h' ? 'ultimele 6 ore' :
                  timeRange === '24h' ? 'ultimele 24 ore' : 'ultimele 7 zile'}
            </p>
          </CardContent>
        </Card>
        
        <Card className={stats && stats.successRate < 95 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rată Succes</p>
                <p className={cn(
                  'text-2xl font-bold',
                  stats && stats.successRate >= 95 ? 'text-green-600' : 'text-red-600'
                )}>
                  {stats?.successRate.toFixed(2)}%
                </p>
              </div>
              {stats && stats.successRate >= 95 
                ? <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
                : <TrendingDown className="h-8 w-8 text-red-500 opacity-50" />
              }
            </div>
          </CardContent>
        </Card>
        
        <Card className={violations.length > 0 ? 'border-red-200' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Violații</p>
                <p className={cn(
                  'text-2xl font-bold',
                  violations.length > 0 ? 'text-red-600' : 'text-green-600'
                )}>
                  {stats?.violations.toLocaleString()}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Regenerări</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats?.regenerations.toLocaleString()}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Latență Medie</p>
                <p className="text-2xl font-bold">
                  {stats?.avgLatencyMs.toFixed(0)}ms
                </p>
              </div>
              <Clock className="h-8 w-8 text-gray-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evoluție în Timp</CardTitle>
            <CardDescription>Verificări, violații și regenerări</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats?.timeline || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'dd MMM HH:mm', { locale: ro })}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="checks"
                  name="Verificări"
                  stackId="1"
                  stroke={CHART_COLORS.info}
                  fill={CHART_COLORS.info}
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="regenerations"
                  name="Regenerări"
                  stackId="2"
                  stroke={CHART_COLORS.warning}
                  fill={CHART_COLORS.warning}
                  fillOpacity={0.5}
                />
                <Area
                  type="monotone"
                  dataKey="violations"
                  name="Violații"
                  stackId="3"
                  stroke={CHART_COLORS.danger}
                  fill={CHART_COLORS.danger}
                  fillOpacity={0.7}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Violații per Categorie</CardTitle>
            <CardDescription>Distribuție pe tipuri de reguli</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={250}>
              <PieChart>
                <Pie
                  data={stats?.byCategory || []}
                  dataKey="violations"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  label={(entry) => entry.category}
                >
                  {stats?.byCategory.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CATEGORY_COLORS[entry.category] || CHART_COLORS.info} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="flex-1 space-y-2">
              {stats?.byCategory.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[cat.category] }}
                    />
                    <span className="text-sm capitalize">{cat.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{cat.violations}</span>
                    <span className="text-gray-400 text-xs ml-1">
                      ({cat.rate.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <Tabs defaultValue="violations" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="violations" className="gap-2">
              <XCircle className="h-4 w-4" />
              Violații ({violations.length})
            </TabsTrigger>
            <TabsTrigger value="regenerations" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Regenerări ({regenerations.length})
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Shield className="h-4 w-4" />
              Reguli Top
            </TabsTrigger>
          </TabsList>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Toate categoriile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate</SelectItem>
              <SelectItem value="price">Preț</SelectItem>
              <SelectItem value="stock">Stoc</SelectItem>
              <SelectItem value="discount">Discount</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
              <SelectItem value="content">Conținut</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Violations Tab */}
        <TabsContent value="violations">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timp</TableHead>
                      <TableHead>Regulă</TableHead>
                      <TableHead>Categorie</TableHead>
                      <TableHead>Conversație</TableHead>
                      <TableHead>Motiv</TableHead>
                      <TableHead>Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violations.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {formatDistanceToNow(new Date(check.timestamp), { 
                              addSuffix: true,
                              locale: ro 
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {check.ruleName}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            style={{ 
                              borderColor: CATEGORY_COLORS[check.ruleCategory],
                              color: CATEGORY_COLORS[check.ruleCategory]
                            }}
                          >
                            {check.ruleCategory}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {check.conversation.channel}
                            </Badge>
                            {check.conversation.clientName}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {check.metadata.violationReason}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Link href={`/sales/ai-conversations/${check.conversationId}`}>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                // Show original content in modal
                              }}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {violations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          Nicio violație în perioada selectată
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Regenerations Tab */}
        <TabsContent value="regenerations">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timp</TableHead>
                      <TableHead>Regulă</TableHead>
                      <TableHead>Încercări</TableHead>
                      <TableHead>Conversație</TableHead>
                      <TableHead>Latență</TableHead>
                      <TableHead>Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regenerations.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDistanceToNow(new Date(check.timestamp), { 
                            addSuffix: true,
                            locale: ro 
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {check.ruleName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={check.regenerationCount >= 3 ? 'destructive' : 'secondary'}>
                            {check.regenerationCount}x
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {check.conversation.clientName}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            check.latencyMs > 2000 ? 'text-red-600' : 
                            check.latencyMs > 1000 ? 'text-yellow-600' : 
                            'text-green-600'
                          )}>
                            {check.latencyMs}ms
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link href={`/sales/ai-conversations/${check.conversationId}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Top Rules Tab */}
        <TabsContent value="rules">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {stats?.byRule
                  .sort((a, b) => b.violations - a.violations)
                  .slice(0, 10)
                  .map((rule, index) => (
                    <div key={rule.ruleName} className="flex items-center gap-4">
                      <span className="w-6 text-gray-400 font-mono">
                        #{index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{rule.ruleName}</span>
                          <span className="text-sm">
                            <span className="text-red-600 font-medium">
                              {rule.violations}
                            </span>
                            <span className="text-gray-400">
                              / {rule.checks}
                            </span>
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              'h-full rounded-full',
                              rule.rate > 10 ? 'bg-red-500' : 
                              rule.rate > 5 ? 'bg-yellow-500' : 
                              'bg-green-500'
                            )}
                            style={{ width: `${Math.min(100, rule.rate * 10)}%` }}
                          />
                        </div>
                      </div>
                      <span className={cn(
                        'text-sm font-medium w-16 text-right',
                        rule.rate > 10 ? 'text-red-600' : 
                        rule.rate > 5 ? 'text-yellow-600' : 
                        'text-green-600'
                      )}>
                        {rule.rate.toFixed(2)}%
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 13. e-Factura Status Page

**Route:** `/sales/e-factura`

**Descriere:** Dashboard pentru monitorizare status e-Factura SPV ANAF, deadline-uri, erori și reconciliere.

```typescript
// app/sales/e-factura/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  XCircle,
  Upload,
  Download,
  RefreshCw,
  Search,
  Calendar,
  ExternalLink,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format, differenceInDays, differenceInHours, addDays } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { DateRangePicker } from '@/components/ui/date-range-picker';

// Types
interface EFacturaDocument {
  id: string;
  documentId: string;
  documentType: 'invoice' | 'proforma';
  documentNumber: string;
  issueDate: string;
  clientName: string;
  clientCui: string;
  totalAmount: number;
  vatAmount: number;
  currency: string;
  
  // e-Factura specific
  spvStatus: 'not_submitted' | 'pending' | 'processing' | 'accepted' | 'rejected' | 'error';
  uploadId: string | null;
  downloadId: string | null;
  submittedAt: string | null;
  processedAt: string | null;
  
  // Deadline tracking
  deadline: string; // 5 days from issue
  hoursUntilDeadline: number;
  isOverdue: boolean;
  
  // Errors
  errorCode: string | null;
  errorMessage: string | null;
  errorDetails: Record<string, any> | null;
  
  // Retry info
  retryCount: number;
  lastRetryAt: string | null;
  canRetry: boolean;
}

interface EFacturaStats {
  total: number;
  notSubmitted: number;
  pending: number;
  processing: number;
  accepted: number;
  rejected: number;
  errors: number;
  
  deadlineWarnings: number; // < 24h
  deadlineCritical: number; // < 6h
  overdue: number;
  
  submittedToday: number;
  acceptedToday: number;
  rejectedToday: number;
}

// Status Configuration
const STATUS_CONFIG = {
  not_submitted: { 
    color: 'bg-gray-100 text-gray-800', 
    icon: Clock,
    label: 'Netrimis' 
  },
  pending: { 
    color: 'bg-blue-100 text-blue-800', 
    icon: Upload,
    label: 'Trimis' 
  },
  processing: { 
    color: 'bg-yellow-100 text-yellow-800', 
    icon: Loader2,
    label: 'În procesare' 
  },
  accepted: { 
    color: 'bg-green-100 text-green-800', 
    icon: CheckCircle,
    label: 'Acceptat' 
  },
  rejected: { 
    color: 'bg-red-100 text-red-800', 
    icon: XCircle,
    label: 'Respins' 
  },
  error: { 
    color: 'bg-orange-100 text-orange-800', 
    icon: AlertTriangle,
    label: 'Eroare' 
  }
};

export default function EFacturaStatusPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<EFacturaDocument | null>(null);
  
  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<EFacturaStats>({
    queryKey: ['efactura-stats'],
    queryFn: async () => {
      const res = await fetch('/api/v1/sales/e-factura/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 60000 // 1 minute
  });
  
  // Fetch documents
  const { data: documents, isLoading: docsLoading, refetch } = useQuery<EFacturaDocument[]>({
    queryKey: ['efactura-documents', statusFilter, dateRange, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateRange?.from) params.append('from', dateRange.from.toISOString());
      if (dateRange?.to) params.append('to', dateRange.to.toISOString());
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(`/api/v1/sales/e-factura/documents?${params}`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    }
  });
  
  // Submit to SPV mutation
  const submitMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(`/api/v1/sales/e-factura/${documentId}/submit`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to submit');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efactura-documents'] });
      queryClient.invalidateQueries({ queryKey: ['efactura-stats'] });
      toast.success('Document trimis către ANAF SPV');
    },
    onError: (error) => {
      toast.error('Eroare la trimitere', { description: error.message });
    }
  });
  
  // Check status mutation
  const checkStatusMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(`/api/v1/sales/e-factura/${documentId}/check`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to check status');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['efactura-documents'] });
      queryClient.invalidateQueries({ queryKey: ['efactura-stats'] });
      toast.success('Status actualizat', {
        description: `Nou status: ${STATUS_CONFIG[data.status as keyof typeof STATUS_CONFIG]?.label}`
      });
    }
  });
  
  // Retry submission mutation
  const retryMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(`/api/v1/sales/e-factura/${documentId}/retry`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to retry');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efactura-documents'] });
      toast.success('Retrimitere inițiată');
    }
  });
  
  // Bulk submit
  const bulkSubmitMutation = useMutation({
    mutationFn: async (documentIds: string[]) => {
      const res = await fetch('/api/v1/sales/e-factura/bulk-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds })
      });
      if (!res.ok) throw new Error('Failed to bulk submit');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['efactura-documents'] });
      queryClient.invalidateQueries({ queryKey: ['efactura-stats'] });
      toast.success('Documente trimise', {
        description: `${data.submitted} din ${data.total} trimise cu succes`
      });
    }
  });
  
  // Get deadline badge
  const getDeadlineBadge = (doc: EFacturaDocument) => {
    if (doc.isOverdue) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Depășit
        </Badge>
      );
    }
    
    if (doc.hoursUntilDeadline < 6) {
      return (
        <Badge className="bg-red-500 gap-1">
          <Clock className="h-3 w-3" />
          {doc.hoursUntilDeadline}h rămase
        </Badge>
      );
    }
    
    if (doc.hoursUntilDeadline < 24) {
      return (
        <Badge className="bg-orange-500 gap-1">
          <Clock className="h-3 w-3" />
          {doc.hoursUntilDeadline}h rămase
        </Badge>
      );
    }
    
    if (doc.hoursUntilDeadline < 48) {
      return (
        <Badge className="bg-yellow-500 text-yellow-900 gap-1">
          <Clock className="h-3 w-3" />
          {Math.floor(doc.hoursUntilDeadline / 24)}z {doc.hoursUntilDeadline % 24}h
        </Badge>
      );
    }
    
    return (
      <span className="text-sm text-gray-500">
        {Math.floor(doc.hoursUntilDeadline / 24)} zile
      </span>
    );
  };
  
  // Documents needing attention
  const urgentDocs = documents?.filter(d => 
    d.spvStatus === 'not_submitted' && d.hoursUntilDeadline < 24
  ) || [];
  
  const errorDocs = documents?.filter(d => 
    d.spvStatus === 'rejected' || d.spvStatus === 'error'
  ) || [];
  
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            e-Factura SPV
          </h1>
          <p className="text-gray-500 mt-1">
            Monitorizare și gestionare facturi electronice ANAF
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizează
          </Button>
          <Button
            onClick={() => window.open('https://www.anaf.ro/spv', '_blank')}
            variant="outline"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Portal ANAF
          </Button>
        </div>
      </div>
      
      {/* Urgent Alerts */}
      {urgentDocs.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenție! Deadline-uri Urgente</AlertTitle>
          <AlertDescription>
            {urgentDocs.length} facturi au deadline în mai puțin de 24 de ore. 
            <Button 
              variant="link" 
              className="p-0 h-auto ml-2"
              onClick={() => {
                const ids = urgentDocs.map(d => d.id);
                bulkSubmitMutation.mutate(ids);
              }}
            >
              Trimite toate acum
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4">
        <Card className={cn(stats?.notSubmitted && stats.notSubmitted > 0 && 'border-yellow-300')}>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">De trimis</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats?.notSubmitted || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">În procesare</p>
            <p className="text-2xl font-bold text-blue-600">
              {(stats?.pending || 0) + (stats?.processing || 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Acceptate</p>
            <p className="text-2xl font-bold text-green-600">
              {stats?.accepted || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className={cn(stats?.rejected && stats.rejected > 0 && 'border-red-300')}>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Respinse</p>
            <p className="text-2xl font-bold text-red-600">
              {stats?.rejected || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className={cn(stats?.overdue && stats.overdue > 0 && 'border-red-500 bg-red-50')}>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Depășite</p>
            <p className="text-2xl font-bold text-red-700">
              {stats?.overdue || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Azi Acceptate</p>
            <p className="text-2xl font-bold">{stats?.acceptedToday || 0}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Deadline Warnings */}
      {(stats?.deadlineWarnings || 0) > 0 && (
        <div className="flex items-center gap-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-orange-600" />
          <div className="flex-1">
            <p className="font-medium text-orange-900">
              {stats?.deadlineCritical || 0} facturi cu deadline în mai puțin de 6 ore
            </p>
            <p className="text-sm text-orange-700">
              {stats?.deadlineWarnings || 0} facturi cu deadline în mai puțin de 24 ore
            </p>
          </div>
          <Button 
            variant="outline" 
            className="border-orange-300 text-orange-700"
            onClick={() => setStatusFilter('not_submitted')}
          >
            Vezi toate
          </Button>
        </div>
      )}
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Caută după număr, client, CUI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">Toate</TabsTrigger>
                <TabsTrigger value="not_submitted">De trimis</TabsTrigger>
                <TabsTrigger value="pending">Trimise</TabsTrigger>
                <TabsTrigger value="accepted">Acceptate</TabsTrigger>
                <TabsTrigger value="rejected">Respinse</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Valoare</TableHead>
                  <TableHead>Status SPV</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>ID-uri ANAF</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents?.map((doc) => {
                  const statusConfig = STATUS_CONFIG[doc.spvStatus];
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <TableRow key={doc.id} className={cn(
                      doc.isOverdue && 'bg-red-50',
                      doc.hoursUntilDeadline < 24 && doc.spvStatus === 'not_submitted' && 'bg-orange-50'
                    )}>
                      <TableCell>
                        <Link 
                          href={`/sales/documents/${doc.documentId}`}
                          className="hover:underline"
                        >
                          <p className="font-medium">{doc.documentNumber}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(doc.issueDate), 'dd MMM yyyy', { locale: ro })}
                          </p>
                        </Link>
                      </TableCell>
                      
                      <TableCell>
                        <p className="font-medium">{doc.clientName}</p>
                        <p className="text-sm text-gray-500">{doc.clientCui}</p>
                      </TableCell>
                      
                      <TableCell>
                        <p className="font-medium">
                          {doc.totalAmount.toLocaleString('ro-RO')} {doc.currency}
                        </p>
                        <p className="text-sm text-gray-500">
                          TVA: {doc.vatAmount.toLocaleString('ro-RO')}
                        </p>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={cn('gap-1', statusConfig.color)}>
                          <StatusIcon className={cn(
                            'h-3 w-3',
                            doc.spvStatus === 'processing' && 'animate-spin'
                          )} />
                          {statusConfig.label}
                        </Badge>
                        {doc.errorMessage && (
                          <p className="text-xs text-red-600 mt-1 max-w-xs truncate">
                            {doc.errorMessage}
                          </p>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {doc.spvStatus === 'not_submitted' || doc.spvStatus === 'rejected' ? (
                          getDeadlineBadge(doc)
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {doc.uploadId && (
                          <p className="text-xs font-mono">
                            Up: {doc.uploadId.substring(0, 12)}...
                          </p>
                        )}
                        {doc.downloadId && (
                          <p className="text-xs font-mono">
                            Dl: {doc.downloadId.substring(0, 12)}...
                          </p>
                        )}
                        {!doc.uploadId && !doc.downloadId && (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {doc.spvStatus === 'not_submitted' && (
                            <Button
                              size="sm"
                              onClick={() => submitMutation.mutate(doc.id)}
                              disabled={submitMutation.isPending}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Trimite
                            </Button>
                          )}
                          
                          {(doc.spvStatus === 'pending' || doc.spvStatus === 'processing') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => checkStatusMutation.mutate(doc.id)}
                              disabled={checkStatusMutation.isPending}
                            >
                              <RefreshCw className={cn(
                                'h-4 w-4 mr-1',
                                checkStatusMutation.isPending && 'animate-spin'
                              )} />
                              Verifică
                            </Button>
                          )}
                          
                          {(doc.spvStatus === 'rejected' || doc.spvStatus === 'error') && doc.canRetry && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retryMutation.mutate(doc.id)}
                              disabled={retryMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Retrimite
                            </Button>
                          )}
                          
                          {doc.spvStatus === 'accepted' && doc.downloadId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                window.open(
                                  `/api/v1/sales/e-factura/${doc.id}/download`, 
                                  '_blank'
                                );
                              }}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              XML
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedDoc(doc)}
                          >
                            Detalii
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Detail Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalii e-Factura</DialogTitle>
            <DialogDescription>
              {selectedDoc?.documentNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDoc && (
            <div className="space-y-4">
              {/* Document Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Client</p>
                  <p className="font-medium">{selectedDoc.clientName}</p>
                </div>
                <div>
                  <p className="text-gray-500">CUI</p>
                  <p className="font-medium">{selectedDoc.clientCui}</p>
                </div>
                <div>
                  <p className="text-gray-500">Data emitere</p>
                  <p className="font-medium">
                    {format(new Date(selectedDoc.issueDate), 'dd MMMM yyyy', { locale: ro })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Deadline</p>
                  <p className="font-medium">
                    {format(new Date(selectedDoc.deadline), 'dd MMMM yyyy HH:mm', { locale: ro })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Valoare</p>
                  <p className="font-medium">
                    {selectedDoc.totalAmount.toLocaleString('ro-RO')} {selectedDoc.currency}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">TVA</p>
                  <p className="font-medium">
                    {selectedDoc.vatAmount.toLocaleString('ro-RO')} {selectedDoc.currency}
                  </p>
                </div>
              </div>
              
              {/* SPV Info */}
              <div className="border-t pt-4 space-y-2">
                <h4 className="font-medium">Status SPV</h4>
                <Badge className={cn(
                  'gap-1',
                  STATUS_CONFIG[selectedDoc.spvStatus].color
                )}>
                  {STATUS_CONFIG[selectedDoc.spvStatus].label}
                </Badge>
                
                {selectedDoc.uploadId && (
                  <div>
                    <p className="text-sm text-gray-500">Upload ID</p>
                    <p className="font-mono text-sm">{selectedDoc.uploadId}</p>
                  </div>
                )}
                
                {selectedDoc.downloadId && (
                  <div>
                    <p className="text-sm text-gray-500">Download ID</p>
                    <p className="font-mono text-sm">{selectedDoc.downloadId}</p>
                  </div>
                )}
                
                {selectedDoc.submittedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Trimis la</p>
                    <p className="text-sm">
                      {format(new Date(selectedDoc.submittedAt), 'dd MMM yyyy HH:mm:ss', { locale: ro })}
                    </p>
                  </div>
                )}
                
                {selectedDoc.processedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Procesat la</p>
                    <p className="text-sm">
                      {format(new Date(selectedDoc.processedAt), 'dd MMM yyyy HH:mm:ss', { locale: ro })}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Error Details */}
              {selectedDoc.errorMessage && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Eroare: {selectedDoc.errorCode}</AlertTitle>
                  <AlertDescription>{selectedDoc.errorMessage}</AlertDescription>
                </Alert>
              )}
              
              {/* Retry Info */}
              {selectedDoc.retryCount > 0 && (
                <div className="text-sm text-gray-500">
                  Încercări anterioare: {selectedDoc.retryCount}
                  {selectedDoc.lastRetryAt && (
                    <span> (ultima: {format(new Date(selectedDoc.lastRetryAt), 'dd MMM HH:mm')})</span>
                  )}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDoc(null)}>
              Închide
            </Button>
            <Link href={`/sales/documents/${selectedDoc?.documentId}`}>
              <Button>
                Vezi Document
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## 14. Routing Configuration Page

**Route:** `/sales/settings/routing`

**Descriere:** Configurare reguli de rutare pentru canale de comunicare, fallback-uri și priorități.

```typescript
// app/sales/settings/routing/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Route, 
  Plus, 
  Trash2, 
  Save,
  GripVertical,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  Users,
  ArrowRight,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Types
interface RoutingRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  
  // Conditions
  conditions: {
    type: 'channel' | 'client_tier' | 'time_of_day' | 'message_type' | 'region' | 'product_category';
    operator: 'eq' | 'neq' | 'in' | 'not_in' | 'between';
    value: string | string[];
  }[];
  
  // Actions
  primaryChannel: 'whatsapp' | 'email' | 'phone';
  fallbackChannel: 'whatsapp' | 'email' | 'phone' | null;
  assignToAgent: string | null; // specific agent or null for auto
  responseTimeTarget: number; // minutes
  escalateAfter: number; // minutes without response
  
  // Scheduling
  activeHours: {
    start: string; // HH:mm
    end: string;
    daysOfWeek: number[]; // 0-6
  } | null;
  
  stats: {
    messagesRouted: number;
    avgResponseTime: number;
    escalations: number;
  };
}

interface RoutingConfig {
  defaultChannel: 'whatsapp' | 'email';
  defaultFallbackChannel: 'email' | 'whatsapp';
  defaultResponseTarget: number;
  defaultEscalateAfter: number;
  rules: RoutingRule[];
  
  // Business Hours
  businessHours: {
    start: string;
    end: string;
    timezone: string;
    workDays: number[];
  };
  
  // Out of Hours
  outOfHoursAction: 'queue' | 'auto_respond' | 'redirect_email';
  outOfHoursMessage: string;
}

// Validation Schema
const routingRuleSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  enabled: z.boolean(),
  conditions: z.array(z.object({
    type: z.enum(['channel', 'client_tier', 'time_of_day', 'message_type', 'region', 'product_category']),
    operator: z.enum(['eq', 'neq', 'in', 'not_in', 'between']),
    value: z.union([z.string(), z.array(z.string())])
  })),
  primaryChannel: z.enum(['whatsapp', 'email', 'phone']),
  fallbackChannel: z.enum(['whatsapp', 'email', 'phone']).nullable(),
  assignToAgent: z.string().nullable(),
  responseTimeTarget: z.number().min(1).max(1440),
  escalateAfter: z.number().min(5).max(1440),
  activeHours: z.object({
    start: z.string(),
    end: z.string(),
    daysOfWeek: z.array(z.number())
  }).nullable()
});

type RoutingRuleFormData = z.infer<typeof routingRuleSchema>;

// Channel Icons
const CHANNEL_ICONS = {
  whatsapp: <MessageSquare className="h-4 w-4 text-green-600" />,
  email: <Mail className="h-4 w-4 text-blue-600" />,
  phone: <Phone className="h-4 w-4 text-purple-600" />
};

// Condition Type Labels
const CONDITION_LABELS: Record<string, string> = {
  channel: 'Canal sursă',
  client_tier: 'Tier client',
  time_of_day: 'Ora din zi',
  message_type: 'Tip mesaj',
  region: 'Regiune',
  product_category: 'Categorie produse'
};

// Sortable Row Component
function SortableRow({ rule, onEdit, onToggle, onDelete }: { 
  rule: RoutingRule; 
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: rule.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  
  return (
    <TableRow ref={setNodeRef} style={style} className={cn(!rule.enabled && 'opacity-50')}>
      <TableCell>
        <button {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{rule.priority}</Badge>
      </TableCell>
      <TableCell>
        <Switch
          checked={rule.enabled}
          onCheckedChange={onToggle}
        />
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{rule.name}</p>
          <p className="text-sm text-gray-500 max-w-xs truncate">
            {rule.description}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {rule.conditions.slice(0, 2).map((cond, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {CONDITION_LABELS[cond.type]}
            </Badge>
          ))}
          {rule.conditions.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{rule.conditions.length - 2}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {CHANNEL_ICONS[rule.primaryChannel]}
          <span className="capitalize">{rule.primaryChannel}</span>
          {rule.fallbackChannel && (
            <>
              <ArrowRight className="h-3 w-3 text-gray-400" />
              {CHANNEL_ICONS[rule.fallbackChannel]}
            </>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-gray-400" />
          {rule.responseTimeTarget}m
        </div>
      </TableCell>
      <TableCell className="text-right">
        <span className="text-sm text-gray-500">
          {rule.stats.messagesRouted.toLocaleString()} mesaje
        </span>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function RoutingConfigPage() {
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  
  // Fetch config
  const { data: config, isLoading } = useQuery<RoutingConfig>({
    queryKey: ['routing-config'],
    queryFn: async () => {
      const res = await fetch('/api/v1/sales/settings/routing');
      if (!res.ok) throw new Error('Failed to fetch config');
      return res.json();
    }
  });
  
  // Form setup
  const form = useForm<RoutingRuleFormData>({
    resolver: zodResolver(routingRuleSchema),
    defaultValues: {
      name: '',
      description: '',
      enabled: true,
      conditions: [],
      primaryChannel: 'whatsapp',
      fallbackChannel: 'email',
      assignToAgent: null,
      responseTimeTarget: 15,
      escalateAfter: 60,
      activeHours: null
    }
  });
  
  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = 
    useFieldArray({
      control: form.control,
      name: 'conditions'
    });
  
  // Save rule mutation
  const saveMutation = useMutation({
    mutationFn: async (data: RoutingRuleFormData) => {
      const url = editingRule 
        ? `/api/v1/sales/settings/routing/rules/${editingRule.id}`
        : '/api/v1/sales/settings/routing/rules';
      const method = editingRule ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-config'] });
      setIsDialogOpen(false);
      setEditingRule(null);
      form.reset();
      toast.success(editingRule ? 'Regulă actualizată' : 'Regulă creată');
    }
  });
  
  // Toggle rule mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/v1/sales/settings/routing/rules/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (!res.ok) throw new Error('Failed to toggle');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-config'] });
    }
  });
  
  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/sales/settings/routing/rules/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-config'] });
      toast.success('Regulă ștearsă');
    }
  });
  
  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (ruleIds: string[]) => {
      const res = await fetch('/api/v1/sales/settings/routing/rules/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleIds })
      });
      if (!res.ok) throw new Error('Failed to reorder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-config'] });
    }
  });
  
  // Update defaults mutation
  const updateDefaultsMutation = useMutation({
    mutationFn: async (defaults: Partial<RoutingConfig>) => {
      const res = await fetch('/api/v1/sales/settings/routing/defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaults)
      });
      if (!res.ok) throw new Error('Failed to update defaults');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-config'] });
      toast.success('Setări implicite actualizate');
    }
  });
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && config?.rules) {
      const oldIndex = config.rules.findIndex(r => r.id === active.id);
      const newIndex = config.rules.findIndex(r => r.id === over.id);
      const newOrder = arrayMove(config.rules, oldIndex, newIndex);
      reorderMutation.mutate(newOrder.map(r => r.id));
    }
  };
  
  const openEditDialog = (rule: RoutingRule) => {
    setEditingRule(rule);
    form.reset({
      name: rule.name,
      description: rule.description,
      enabled: rule.enabled,
      conditions: rule.conditions,
      primaryChannel: rule.primaryChannel,
      fallbackChannel: rule.fallbackChannel,
      assignToAgent: rule.assignToAgent,
      responseTimeTarget: rule.responseTimeTarget,
      escalateAfter: rule.escalateAfter,
      activeHours: rule.activeHours
    });
    setIsDialogOpen(true);
  };
  
  if (isLoading) {
    return <div className="p-8">Se încarcă configurația...</div>;
  }
  
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Route className="h-6 w-6" />
            Configurare Rutare
          </h1>
          <p className="text-gray-500 mt-1">
            Reguli de rutare pentru canale de comunicare
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingRule(null); form.reset(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Regulă Nouă
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Editare Regulă' : 'Regulă Nouă de Rutare'}
              </DialogTitle>
              <DialogDescription>
                Definește condițiile și acțiunile pentru rutarea mesajelor
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
              {/* Basic Info */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nume</label>
                <Input
                  {...form.register('name')}
                  placeholder="Ex: Clienți Premium pe WhatsApp"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Descriere</label>
                <Input
                  {...form.register('description')}
                  placeholder="Descriere opțională..."
                />
              </div>
              
              <Separator />
              
              {/* Conditions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Condiții (toate trebuie îndeplinite)</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendCondition({ type: 'client_tier', operator: 'eq', value: '' })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adaugă
                  </Button>
                </div>
                
                {conditionFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Controller
                      name={`conditions.${index}.type`}
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client_tier">Tier client</SelectItem>
                            <SelectItem value="channel">Canal sursă</SelectItem>
                            <SelectItem value="time_of_day">Ora din zi</SelectItem>
                            <SelectItem value="message_type">Tip mesaj</SelectItem>
                            <SelectItem value="region">Regiune</SelectItem>
                            <SelectItem value="product_category">Categorie</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    
                    <Controller
                      name={`conditions.${index}.operator`}
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="eq">=</SelectItem>
                            <SelectItem value="neq">≠</SelectItem>
                            <SelectItem value="in">în</SelectItem>
                            <SelectItem value="not_in">nu în</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    
                    <Input
                      {...form.register(`conditions.${index}.value`)}
                      placeholder="Valoare"
                      className="flex-1"
                    />
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                
                {conditionFields.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    Fără condiții - regula se aplică tuturor mesajelor
                  </p>
                )}
              </div>
              
              <Separator />
              
              {/* Channels */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Canal Primar</label>
                  <Controller
                    name="primaryChannel"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-green-600" />
                              WhatsApp
                            </div>
                          </SelectItem>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-blue-600" />
                              Email
                            </div>
                          </SelectItem>
                          <SelectItem value="phone">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-purple-600" />
                              Telefon
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Canal Fallback</label>
                  <Controller
                    name="fallbackChannel"
                    control={form.control}
                    render={({ field }) => (
                      <Select 
                        value={field.value || 'none'} 
                        onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Fără fallback</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="phone">Telefon</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              
              {/* Timing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Timp țintă răspuns (min)</label>
                  <Controller
                    name="responseTimeTarget"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[field.value]}
                          onValueChange={([v]) => field.onChange(v)}
                          min={1}
                          max={120}
                          step={5}
                          className="flex-1"
                        />
                        <span className="w-12 text-right font-mono">{field.value}m</span>
                      </div>
                    )}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Escaladare după (min)</label>
                  <Controller
                    name="escalateAfter"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[field.value]}
                          onValueChange={([v]) => field.onChange(v)}
                          min={5}
                          max={480}
                          step={15}
                          className="flex-1"
                        />
                        <span className="w-12 text-right font-mono">{field.value}m</span>
                      </div>
                    )}
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* Enable */}
              <div className="flex items-center justify-between">
                <label className="font-medium">Regulă activă</label>
                <Controller
                  name="enabled"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Anulează
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? 'Se salvează...' : 'Salvează'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Setări Implicite</CardTitle>
          <CardDescription>
            Configurație pentru mesaje care nu corespund niciunei reguli
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Canal Implicit</label>
              <Select 
                value={config?.defaultChannel} 
                onValueChange={(v) => updateDefaultsMutation.mutate({ defaultChannel: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Fallback Implicit</label>
              <Select 
                value={config?.defaultFallbackChannel} 
                onValueChange={(v) => updateDefaultsMutation.mutate({ defaultFallbackChannel: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Timp Răspuns (min)</label>
              <Input
                type="number"
                value={config?.defaultResponseTarget}
                onChange={(e) => updateDefaultsMutation.mutate({ 
                  defaultResponseTarget: parseInt(e.target.value) 
                })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Escaladare (min)</label>
              <Input
                type="number"
                value={config?.defaultEscalateAfter}
                onChange={(e) => updateDefaultsMutation.mutate({ 
                  defaultEscalateAfter: parseInt(e.target.value) 
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Program Lucru</CardTitle>
          <CardDescription>
            Configurare ore de lucru și acțiuni în afara programului
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Început</label>
              <Input
                type="time"
                value={config?.businessHours?.start}
                onChange={(e) => updateDefaultsMutation.mutate({
                  businessHours: { ...config?.businessHours!, start: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sfârșit</label>
              <Input
                type="time"
                value={config?.businessHours?.end}
                onChange={(e) => updateDefaultsMutation.mutate({
                  businessHours: { ...config?.businessHours!, end: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">În afara programului</label>
              <Select 
                value={config?.outOfHoursAction}
                onValueChange={(v) => updateDefaultsMutation.mutate({ outOfHoursAction: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="queue">Adaugă în coadă</SelectItem>
                  <SelectItem value="auto_respond">Răspuns automat</SelectItem>
                  <SelectItem value="redirect_email">Redirecționează email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Zile lucru</label>
              <div className="flex gap-1">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                  <Button
                    key={i}
                    variant={config?.businessHours?.workDays?.includes(i) ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => {
                      const current = config?.businessHours?.workDays || [];
                      const updated = current.includes(i)
                        ? current.filter(d => d !== i)
                        : [...current, i].sort();
                      updateDefaultsMutation.mutate({
                        businessHours: { ...config?.businessHours!, workDays: updated }
                      });
                    }}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reguli de Rutare</CardTitle>
          <CardDescription>
            Trage pentru a reordona. Regulile sunt evaluate în ordinea priorității.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-16">Prio</TableHead>
                  <TableHead className="w-16">Activ</TableHead>
                  <TableHead>Regulă</TableHead>
                  <TableHead>Condiții</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Timp</TableHead>
                  <TableHead>Utilizare</TableHead>
                  <TableHead className="w-24">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={config?.rules.map(r => r.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  {config?.rules.map((rule) => (
                    <SortableRow
                      key={rule.id}
                      rule={rule}
                      onEdit={() => openEditDialog(rule)}
                      onToggle={() => toggleMutation.mutate({ id: rule.id, enabled: !rule.enabled })}
                      onDelete={() => {
                        if (confirm('Sigur vrei să ștergi această regulă?')) {
                          deleteMutation.mutate(rule.id);
                        }
                      }}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
          
          {(!config?.rules || config.rules.length === 0) && (
            <div className="p-8 text-center text-gray-500">
              <Route className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nicio regulă de rutare definită</p>
              <p className="text-sm">Se folosesc setările implicite</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---
