# Etapa 3 - UI Charts, Dashboards & Navigation Components

## AI Sales Agent Module - Complete Visual Analytics & Navigation System

**Document Version**: 1.0.0  
**Data**: Ianuarie 2026  
**Autor**: Echipa Cerniq  
**Status**: COMPLET

---

## Table of Contents

1. [Overview și Arhitectură](#1-overview-și-arhitectură)
2. [Chart Library Setup](#2-chart-library-setup)
3. [Base Chart Components](#3-base-chart-components)
4. [Sales Analytics Charts](#4-sales-analytics-charts)
5. [Conversation Analytics Charts](#5-conversation-analytics-charts)
6. [AI Performance Charts](#6-ai-performance-charts)
7. [Financial Charts](#7-financial-charts)
8. [Real-Time Monitoring Charts](#8-real-time-monitoring-charts)
9. [Dashboard Layouts](#9-dashboard-layouts)
10. [Navigation Components](#10-navigation-components)
11. [Breadcrumb System](#11-breadcrumb-system)
12. [Sidebar Navigation](#12-sidebar-navigation)
13. [Command Palette](#13-command-palette)
14. [Mobile Navigation](#14-mobile-navigation)
15. [Summary](#15-summary)

---

## 1. Overview și Arhitectură

### 1.1 Design Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHARTS & NAVIGATION SYSTEM                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    CHART LAYER                           │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │ Recharts│  │ Victory │  │ D3.js   │  │Tremor   │    │   │
│  │  │  Base   │  │ Native  │  │ Custom  │  │ KPIs    │    │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   DATA LAYER                             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │TanStack │  │WebSocket│  │ Cache   │  │Transform│    │   │
│  │  │ Query   │  │Real-time│  │Strategy │  │Pipeline │    │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                NAVIGATION LAYER                          │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │ Sidebar │  │ Breadcr.│  │ Command │  │ Mobile  │    │   │
│  │  │  Menu   │  │  Trail  │  │ Palette │  │  Nav    │    │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Component | Library | Version | Purpose |
|-----------|---------|---------|---------|
| Charts | Recharts | 2.15.x | Primary charting library |
| KPI Cards | Tremor | 3.18.x | Dashboard metrics |
| Custom Viz | D3.js | 7.9.x | Complex visualizations |
| Maps | Leaflet | 1.9.x | Geographic data |
| Date Ranges | date-fns | 4.1.x | Date utilities |
| Navigation | Next.js App Router | 15.x | Routing & navigation |

---

## 2. Chart Library Setup

### 2.1 Recharts Configuration

```typescript
// lib/charts/config.ts
'use client';

import { 
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  success: 'hsl(142.1 76.2% 36.3%)',
  warning: 'hsl(38 92% 50%)',
  danger: 'hsl(0 84.2% 60.2%)',
  info: 'hsl(217.2 91.2% 59.8%)',
  muted: 'hsl(var(--muted))',
  
  // Series colors
  series: [
    'hsl(217.2 91.2% 59.8%)',   // Blue
    'hsl(142.1 76.2% 36.3%)',   // Green
    'hsl(38 92% 50%)',          // Orange
    'hsl(262.1 83.3% 57.8%)',   // Purple
    'hsl(0 84.2% 60.2%)',       // Red
    'hsl(173 80% 40%)',         // Teal
    'hsl(45 93% 47%)',          // Yellow
    'hsl(330 81% 60%)',         // Pink
  ],
} as const;

export const CHART_CONFIG = {
  margin: { top: 20, right: 30, left: 20, bottom: 20 },
  gridStroke: 'hsl(var(--border))',
  axisStroke: 'hsl(var(--muted-foreground))',
  fontSize: 12,
  fontFamily: 'Inter, system-ui, sans-serif',
  animationDuration: 300,
} as const;

export const formatters = {
  currency: (value: number) => 
    new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value),
    
  percentage: (value: number) => 
    new Intl.NumberFormat('ro-RO', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100),
    
  number: (value: number) => 
    new Intl.NumberFormat('ro-RO').format(value),
    
  compact: (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  },
  
  date: (value: string | Date) => 
    new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(value)),
    
  dateTime: (value: string | Date) => 
    new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value)),
};
```

### 2.2 Chart Theme Provider

```typescript
// providers/chart-theme-provider.tsx
'use client';

import { createContext, useContext, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { CHART_COLORS, CHART_CONFIG } from '@/lib/charts/config';

interface ChartTheme {
  colors: typeof CHART_COLORS;
  config: typeof CHART_CONFIG;
  isDark: boolean;
}

const ChartThemeContext = createContext<ChartTheme | null>(null);

export function ChartThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const value = useMemo(() => ({
    colors: CHART_COLORS,
    config: {
      ...CHART_CONFIG,
      gridStroke: isDark ? 'hsl(215 20.2% 25.1%)' : 'hsl(214.3 31.8% 91.4%)',
      axisStroke: isDark ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)',
    },
    isDark,
  }), [isDark]);
  
  return (
    <ChartThemeContext.Provider value={value}>
      {children}
    </ChartThemeContext.Provider>
  );
}

export function useChartTheme() {
  const context = useContext(ChartThemeContext);
  if (!context) {
    throw new Error('useChartTheme must be used within ChartThemeProvider');
  }
  return context;
}
```

---

## 3. Base Chart Components

### 3.1 Chart Container

```typescript
// components/charts/chart-container.tsx
'use client';

import { ReactNode, forwardRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Download, MoreHorizontal, Maximize2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  height?: number | string;
  loading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  onExport?: (format: 'png' | 'svg' | 'csv') => void;
  onExpand?: () => void;
  actions?: ReactNode;
}

export const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
  function ChartContainer({
    title,
    description,
    children,
    className,
    height = 300,
    loading,
    error,
    onRefresh,
    onExport,
    onExpand,
    actions,
  }, ref) {
    return (
      <Card ref={ref} className={cn('overflow-hidden', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {actions}
            
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                <span className="sr-only">Reîmprospătează</span>
              </Button>
            )}
            
            {(onExport || onExpand) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Mai multe opțiuni</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onExpand && (
                    <DropdownMenuItem onClick={onExpand}>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Mărește
                    </DropdownMenuItem>
                  )}
                  {onExport && (
                    <>
                      <DropdownMenuItem onClick={() => onExport('png')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export PNG
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport('svg')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export SVG
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport('csv')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div 
            style={{ height: typeof height === 'number' ? `${height}px` : height }}
            className="relative"
          >
            {loading ? (
              <ChartSkeleton />
            ) : error ? (
              <ChartError error={error} onRetry={onRefresh} />
            ) : (
              children
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

function ChartSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-full h-full animate-pulse bg-muted rounded-md" />
    </div>
  );
}

function ChartError({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <p className="text-sm">Eroare la încărcarea datelor</p>
      <p className="text-xs">{error.message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Reîncearcă
        </Button>
      )}
    </div>
  );
}
```

### 3.2 Responsive Chart Wrapper

```typescript
// components/charts/responsive-chart.tsx
'use client';

import { ResponsiveContainer } from 'recharts';
import { ReactNode } from 'react';

interface ResponsiveChartProps {
  children: ReactNode;
  aspect?: number;
  minHeight?: number;
  maxHeight?: number;
}

export function ResponsiveChart({
  children,
  aspect,
  minHeight = 200,
  maxHeight = 600,
}: ResponsiveChartProps) {
  return (
    <ResponsiveContainer 
      width="100%" 
      height="100%"
      aspect={aspect}
      minHeight={minHeight}
      maxHeight={maxHeight}
    >
      {children}
    </ResponsiveContainer>
  );
}
```

### 3.3 Custom Tooltip

```typescript
// components/charts/custom-tooltip.tsx
'use client';

import { cn } from '@/lib/utils';

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
  dataKey: string;
  payload: Record<string, unknown>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  formatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string) => string;
  className?: string;
}

export function CustomTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  className,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  
  return (
    <div 
      className={cn(
        'bg-popover text-popover-foreground rounded-lg border shadow-lg p-3',
        className
      )}
    >
      <p className="font-medium text-sm mb-2">
        {labelFormatter ? labelFormatter(label || '') : label}
      </p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">
              {formatter 
                ? formatter(entry.value, entry.name) 
                : entry.value.toLocaleString('ro-RO')
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3.4 Chart Legend

```typescript
// components/charts/custom-legend.tsx
'use client';

import { cn } from '@/lib/utils';

interface LegendPayload {
  value: string;
  color: string;
  dataKey: string;
}

interface CustomLegendProps {
  payload?: LegendPayload[];
  className?: string;
  layout?: 'horizontal' | 'vertical';
  align?: 'left' | 'center' | 'right';
}

export function CustomLegend({
  payload,
  className,
  layout = 'horizontal',
  align = 'center',
}: CustomLegendProps) {
  if (!payload?.length) return null;
  
  return (
    <div 
      className={cn(
        'flex gap-4 text-sm',
        layout === 'vertical' ? 'flex-col' : 'flex-wrap',
        align === 'center' && 'justify-center',
        align === 'right' && 'justify-end',
        className
      )}
    >
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## 4. Sales Analytics Charts

### 4.1 Sales Funnel Chart

```typescript
// components/charts/sales/sales-funnel-chart.tsx
'use client';

import { useMemo } from 'react';
import { 
  FunnelChart, 
  Funnel, 
  LabelList, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { ChartContainer } from '../chart-container';
import { CustomTooltip } from '../custom-tooltip';
import { useChartTheme } from '@/providers/chart-theme-provider';
import { formatters } from '@/lib/charts/config';

interface FunnelStage {
  name: string;
  value: number;
  conversionRate?: number;
  color?: string;
}

interface SalesFunnelChartProps {
  data: FunnelStage[];
  title?: string;
  description?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export function SalesFunnelChart({
  data,
  title = 'Sales Funnel',
  description = 'Vizualizarea etapelor vânzării',
  loading,
  onRefresh,
}: SalesFunnelChartProps) {
  const { colors } = useChartTheme();
  
  const chartData = useMemo(() => {
    return data.map((stage, index) => ({
      ...stage,
      fill: stage.color || colors.series[index % colors.series.length],
      conversionRate: index > 0 
        ? ((stage.value / data[index - 1].value) * 100).toFixed(1)
        : '100',
    }));
  }, [data, colors]);
  
  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      onRefresh={onRefresh}
      height={400}
    >
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip
            content={({ active, payload }) => (
              <CustomTooltip
                active={active}
                payload={payload as any}
                formatter={(value) => formatters.number(value)}
              />
            )}
          />
          <Funnel
            dataKey="value"
            data={chartData}
            isAnimationActive
            animationDuration={300}
          >
            <LabelList
              position="right"
              fill="currentColor"
              stroke="none"
              dataKey="name"
              className="text-sm"
            />
            <LabelList
              position="center"
              fill="white"
              stroke="none"
              dataKey="value"
              formatter={(value: number) => formatters.compact(value)}
              className="text-sm font-medium"
            />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

### 4.2 Revenue Trend Chart

```typescript
// components/charts/sales/revenue-trend-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from 'recharts';
import { ChartContainer } from '../chart-container';
import { CustomTooltip } from '../custom-tooltip';
import { CustomLegend } from '../custom-legend';
import { useChartTheme } from '@/providers/chart-theme-provider';
import { formatters, CHART_CONFIG } from '@/lib/charts/config';

interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
  target?: number;
  previousPeriod?: number;
}

interface RevenueTrendChartProps {
  data: RevenueDataPoint[];
  title?: string;
  description?: string;
  showTarget?: boolean;
  showPreviousPeriod?: boolean;
  loading?: boolean;
  onRefresh?: () => void;
}

export function RevenueTrendChart({
  data,
  title = 'Evoluție Venituri',
  description = 'Venituri și comenzi în timp',
  showTarget = true,
  showPreviousPeriod = false,
  loading,
  onRefresh,
}: RevenueTrendChartProps) {
  const { colors, config } = useChartTheme();
  
  const processedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      formattedDate: formatters.date(point.date),
    }));
  }, [data]);
  
  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      onRefresh={onRefresh}
      height={400}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={processedData} margin={config.margin}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={config.gridStroke} 
            vertical={false}
          />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatters.compact(value)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatters.compact(value)}
          />
          
          <Tooltip
            content={({ active, payload, label }) => (
              <CustomTooltip
                active={active}
                payload={payload as any}
                label={label}
                formatter={(value, name) => {
                  if (name.includes('Venituri') || name.includes('Target')) {
                    return formatters.currency(value);
                  }
                  return formatters.number(value);
                }}
              />
            )}
          />
          
          <Legend content={<CustomLegend />} />
          
          {/* Revenue Area */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            name="Venituri"
            stroke={colors.primary}
            fill={colors.primary}
            fillOpacity={0.2}
            strokeWidth={2}
          />
          
          {/* Orders Bars */}
          <Bar
            yAxisId="right"
            dataKey="orders"
            name="Comenzi"
            fill={colors.series[1]}
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          
          {/* Target Line */}
          {showTarget && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="target"
              name="Target"
              stroke={colors.warning}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
          
          {/* Previous Period Line */}
          {showPreviousPeriod && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="previousPeriod"
              name="Perioada Anterioară"
              stroke={colors.muted}
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

### 4.3 Sales by Category Chart

```typescript
// components/charts/sales/sales-by-category-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartContainer } from '../chart-container';
import { CustomTooltip } from '../custom-tooltip';
import { useChartTheme } from '@/providers/chart-theme-provider';
import { formatters } from '@/lib/charts/config';

interface CategoryData {
  name: string;
  value: number;
  percentage?: number;
}

interface SalesByCategoryChartProps {
  data: CategoryData[];
  title?: string;
  description?: string;
  variant?: 'pie' | 'donut';
  loading?: boolean;
  onRefresh?: () => void;
}

export function SalesByCategoryChart({
  data,
  title = 'Vânzări pe Categorii',
  description = 'Distribuția veniturilor pe categorii de produse',
  variant = 'donut',
  loading,
  onRefresh,
}: SalesByCategoryChartProps) {
  const { colors } = useChartTheme();
  
  const total = useMemo(() => 
    data.reduce((sum, item) => sum + item.value, 0), 
    [data]
  );
  
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      percentage: ((item.value / total) * 100).toFixed(1),
      fill: colors.series[index % colors.series.length],
    }));
  }, [data, total, colors]);
  
  const renderLabel = ({ name, percentage }: any) => 
    `${name}: ${percentage}%`;
  
  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      onRefresh={onRefresh}
      height={350}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={variant === 'donut' ? '60%' : 0}
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            label={renderLabel}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          
          <Tooltip
            content={({ active, payload }) => (
              <CustomTooltip
                active={active}
                payload={payload as any}
                formatter={(value) => formatters.currency(value)}
              />
            )}
          />
          
          <Legend 
            layout="vertical" 
            align="right" 
            verticalAlign="middle"
            formatter={(value, entry) => {
              const item = chartData.find(d => d.name === value);
              return `${value} (${item?.percentage}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center label for donut */}
      {variant === 'donut' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-bold">{formatters.compact(total)}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </div>
      )}
    </ChartContainer>
  );
}
```

### 4.4 Win Rate Chart

```typescript
// components/charts/sales/win-rate-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { ChartContainer } from '../chart-container';
import { CustomTooltip } from '../custom-tooltip';
import { useChartTheme } from '@/providers/chart-theme-provider';
import { formatters, CHART_CONFIG } from '@/lib/charts/config';

interface WinRateData {
  period: string;
  won: number;
  lost: number;
  pending: number;
  winRate: number;
}

interface WinRateChartProps {
  data: WinRateData[];
  title?: string;
  description?: string;
  targetWinRate?: number;
  loading?: boolean;
  onRefresh?: () => void;
}

export function WinRateChart({
  data,
  title = 'Win Rate',
  description = 'Rata de succes a negocierilor',
  targetWinRate = 30,
  loading,
  onRefresh,
}: WinRateChartProps) {
  const { colors, config } = useChartTheme();
  
  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      onRefresh={onRefresh}
      height={350}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={config.margin}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={config.gridStroke}
            vertical={false}
          />
          <XAxis
            dataKey="period"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          
          <Tooltip
            content={({ active, payload, label }) => (
              <CustomTooltip
                active={active}
                payload={payload as any}
                label={label}
                formatter={(value, name) => {
                  if (name === 'Win Rate') return `${value}%`;
                  return formatters.number(value);
                }}
              />
            )}
          />
          
          <Legend />
          
          <ReferenceLine 
            y={targetWinRate} 
            stroke={colors.warning} 
            strokeDasharray="5 5"
            label={{ 
              value: `Target: ${targetWinRate}%`, 
              fill: colors.warning,
              fontSize: 12,
            }}
          />
          
          <Bar 
            dataKey="winRate" 
            name="Win Rate" 
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={entry.winRate >= targetWinRate ? colors.success : colors.danger}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

---

## 5. Conversation Analytics Charts

### 5.1 Conversation Volume Chart

```typescript
// components/charts/conversations/conversation-volume-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from '../chart-container';
import { CustomTooltip } from '../custom-tooltip';
import { useChartTheme } from '@/providers/chart-theme-provider';
import { formatters, CHART_CONFIG } from '@/lib/charts/config';

interface VolumeDataPoint {
  timestamp: string;
  email: number;
  whatsapp: number;
  phone: number;
  chat: number;
  total: number;
}

interface ConversationVolumeChartProps {
  data: VolumeDataPoint[];
  title?: string;
  description?: string;
  stacked?: boolean;
  loading?: boolean;
  onRefresh?: () => void;
}

export function ConversationVolumeChart({
  data,
  title = 'Volum Conversații',
  description = 'Numărul de conversații pe canal',
  stacked = true,
  loading,
  onRefresh,
}: ConversationVolumeChartProps) {
  const { colors, config } = useChartTheme();
  
  const channelColors = useMemo(() => ({
    email: colors.series[0],
    whatsapp: '#25D366',
    phone: colors.series[2],
    chat: colors.series[3],
  }), [colors]);
  
  const processedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      formattedTime: formatters.dateTime(point.timestamp),
    }));
  }, [data]);
  
  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      onRefresh={onRefresh}
      height={350}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={processedData} margin={config.margin}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={config.gridStroke}
            vertical={false}
          />
          <XAxis
            dataKey="formattedTime"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
          />
          
          <Tooltip
            content={({ active, payload, label }) => (
              <CustomTooltip
                active={active}
                payload={payload as any}
                label={label}
                formatter={(value) => formatters.number(value)}
              />
            )}
          />
          
          <Legend />
          
          <Area
            type="monotone"
            dataKey="email"
            name="Email"
            stackId={stacked ? '1' : undefined}
            stroke={channelColors.email}
            fill={channelColors.email}
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="whatsapp"
            name="WhatsApp"
            stackId={stacked ? '1' : undefined}
            stroke={channelColors.whatsapp}
            fill={channelColors.whatsapp}
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="phone"
            name="Telefon"
            stackId={stacked ? '1' : undefined}
            stroke={channelColors.phone}
            fill={channelColors.phone}
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="chat"
            name="Chat"
            stackId={stacked ? '1' : undefined}
            stroke={channelColors.chat}
            fill={channelColors.chat}
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

### 5.2 Response Time Chart

```typescript
// components/charts/conversations/response-time-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChartContainer } from '../chart-container';
import { CustomTooltip } from '../custom-tooltip';
import { useChartTheme } from '@/providers/chart-theme-provider';
import { CHART_CONFIG } from '@/lib/charts/config';

interface ResponseTimeData {
  hour: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  conversationCount: number;
}

interface ResponseTimeChartProps {
  data: ResponseTimeData[];
  title?: string;
  description?: string;
  slaTarget?: number; // in seconds
  loading?: boolean;
  onRefresh?: () => void;
}

export function ResponseTimeChart({
  data,
  title = 'Timp de Răspuns',
  description = 'Timpul mediu de răspuns per oră',
  slaTarget = 300, // 5 minutes
  loading,
  onRefresh,
}: ResponseTimeChartProps) {
  const { colors, config } = useChartTheme();
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };
  
  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      onRefresh={onRefresh}
      height={350}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={config.margin}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={config.gridStroke}
            vertical={false}
          />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatTime}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
          />
          
          <Tooltip
            content={({ active, payload, label }) => (
              <CustomTooltip
                active={active}
                payload={payload as any}
                label={`Ora ${label}`}
                formatter={(value, name) => {
                  if (name.includes('Timp')) return formatTime(value);
                  return value.toString();
                }}
              />
            )}
          />
          
          <Legend />
          
          <ReferenceLine 
            yAxisId="left"
            y={slaTarget} 
            stroke={colors.warning} 
            strokeDasharray="5 5"
            label={{ 
              value: `SLA: ${formatTime(slaTarget)}`, 
              fill: colors.warning,
              fontSize: 12,
            }}
          />
          
          <Bar
            yAxisId="right"
            dataKey="conversationCount"
            name="Conversații"
            fill={colors.muted}
            radius={[4, 4, 0, 0]}
            barSize={15}
            opacity={0.5}
          />
          
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="avgResponseTime"
            name="Timp Mediu"
            stroke={colors.primary}
            strokeWidth={2}
            dot={{ fill: colors.primary, r: 4 }}
          />
          
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="p95ResponseTime"
            name="Timp P95"
            stroke={colors.danger}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

### 5.3 Sentiment Distribution Chart

```typescript
// components/charts/conversations/sentiment-distribution-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  RadialBarChart,
  RadialBar,
  Legend,
  ResponsiveContainer,
  Tooltip,
  PolarAngleAxis,
} from 'recharts';
import { ChartContainer } from '../chart-container';
import { useChartTheme } from '@/providers/chart-theme-provider';

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

interface SentimentDistributionChartProps {
  data: SentimentData;
  title?: string;
  description?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export function SentimentDistributionChart({
  data,
  title = 'Distribuție Sentiment',
  description = 'Analiza sentimentului conversațiilor',
  loading,
  onRefresh,
}: SentimentDistributionChartProps) {
  const { colors } = useChartTheme();
  
  const chartData = useMemo(() => [
    {
      name: 'Pozitiv',
      value: (data.positive / data.total) * 100,
      count: data.positive,
      fill: colors.success,
    },
    {
      name: 'Neutru',
      value: (data.neutral / data.total) * 100,
      count: data.neutral,
      fill: colors.warning,
    },
    {
      name: 'Negativ',
      value: (data.negative / data.total) * 100,
      count: data.negative,
      fill: colors.danger,
    },
  ], [data, colors]);
  
  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      onRefresh={onRefresh}
      height={300}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="30%"
          outerRadius="90%"
          barSize={20}
          data={chartData}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background
            dataKey="value"
            cornerRadius={10}
            label={{
              fill: '#fff',
              position: 'insideStart',
              formatter: (value: number) => `${value.toFixed(0)}%`,
            }}
          />
          <Legend
            iconSize={12}
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            formatter={(value, entry) => {
              const item = chartData.find(d => d.name === value);
              return `${value}: ${item?.count} (${item?.value.toFixed(1)}%)`;
            }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

---

## 6. AI Performance Charts

### 6.1 AI Agent Activity Chart

```typescript
// components/charts/ai/ai-agent-activity-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from '../chart-container';
import { CustomTooltip } from '../custom-tooltip';
import { useChartTheme } from '@/providers/chart-theme-provider';
import { formatters, CHART_CONFIG } from '@/lib/charts/config';

interface AIActivityData {
  date: string;
  messagesGenerated: number;
  tokensUsed: number;
  avgLatency: number;
  successRate: number;
}

interface AIAgentActivityChartProps {
  data: AIActivityData[];
  title?: string;
  description?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export function AIAgentActivityChart({
  data,
  title = 'Activitate AI Agent',
  description = 'Mesaje generate și performanță',
  loading,
  onRefresh,
}: AIAgentActivityChartProps) {
  const { colors, config } = useChartTheme();
  
  const processedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      formattedDate: formatters.date(point.date),
      tokensK: point.tokensUsed / 1000,
    }));
  }, [data]);
  
  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      onRefresh={onRefresh}
      height={400}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={processedData} margin={config.margin}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={config.gridStroke}
            vertical={false}
          />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          
          <Tooltip
            content={({ active, payload, label }) => (
              <CustomTooltip
                active={active}
                payload={payload as any}
                label={label}
                formatter={(value, name) => {
                  if (name.includes('Rate')) return `${value}%`;
                  if (name.includes('Tokens')) return `${value}K`;
                  if (name.includes('Latency')) return `${value}ms`;
                  return formatters.number(value);
                }}
              />
            )}
          />
          
          <Legend />
          
          <Bar
            yAxisId="left"
            dataKey="messagesGenerated"
            name="Mesaje Generate"
            fill={colors.primary}
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          
          <Bar
            yAxisId="left"
            dataKey="tokensK"
            name="Tokens (K)"
            fill={colors.series[1]}
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="successRate"
            name="Success Rate"
            stroke={colors.success}
            strokeWidth={2}
            dot={{ fill: colors.success, r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

### 6.2 Token Usage Chart

```typescript
// components/charts/ai/token-usage-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChartContainer } from '../chart-container';
import { CustomTooltip } from '../custom-tooltip';
import { useChartTheme } from '@/providers/chart-theme-provider';
import { formatters, CHART_CONFIG } from '@/lib/charts/config';

interface TokenUsageData {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

interface TokenUsageChartProps {
  data: TokenUsageData[];
  title?: string;
  description?: string;
  dailyLimit?: number;
  loading?: boolean;
  onRefresh?: () => void;
}

export function TokenUsageChart({
  data,
  title = 'Utilizare Tokens',
  description = 'Consumul de tokens în timp',
  dailyLimit,
  loading,
  onRefresh,
}: TokenUsageChartProps) {
  const { colors, config } = useChartTheme();
  
  const processedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      formattedDate: formatters.date(point.date),
      inputK: point.inputTokens / 1000,
      outputK: point.outputTokens / 1000,
      totalK: point.totalTokens / 1000,
    }));
  }, [data]);
  
  const limitK = dailyLimit ? dailyLimit / 1000 : undefined;
  
  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      onRefresh={onRefresh}
      height={350}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={processedData} margin={config.margin}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={config.gridStroke}
            vertical={false}
          />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}K`}
          />
          
          <Tooltip
            content={({ active, payload, label }) => (
              <CustomTooltip
                active={active}
                payload={payload as any}
                label={label}
                formatter={(value, name) => {
                  if (name.includes('Cost')) return formatters.currency(value);
                  return `${value.toFixed(1)}K tokens`;
                }}
              />
            )}
          />
          
          <Legend />
          
          {limitK && (
            <ReferenceLine 
              y={limitK} 
              stroke={colors.danger} 
              strokeDasharray="5 5"
              label={{ 
                value: `Limită: ${limitK}K`, 
                fill: colors.danger,
                fontSize: 12,
              }}
            />
          )}
          
          <Area
            type="monotone"
            dataKey="inputK"
            name="Input Tokens"
            stackId="1"
            stroke={colors.primary}
            fill={colors.primary}
            fillOpacity={0.6}
          />
          
          <Area
            type="monotone"
            dataKey="outputK"
            name="Output Tokens"
            stackId="1"
            stroke={colors.series[1]}
            fill={colors.series[1]}
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

### 6.3 Model Comparison Chart

```typescript
// components/charts/ai/model-comparison-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ChartContainer } from '../chart-container';
import { useChartTheme } from '@/providers/chart-theme-provider';

interface ModelMetrics {
  metric: string;
  'Claude Sonnet': number;
  'Claude Haiku': number;
  'GPT-4o': number;
  fullMark: number;
}

interface ModelComparisonChartProps {
  data: ModelMetrics[];
  title?: string;
  description?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export function ModelComparisonChart({
  data,
  title = 'Comparație Modele AI',
  description = 'Performanța modelelor pe diferite metrici',
  loading,
  onRefresh,
}: ModelComparisonChartProps) {
  const { colors } = useChartTheme();
  
  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      onRefresh={onRefresh}
      height={400}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke={colors.muted} />
          <PolarAngleAxis 
            dataKey="metric" 
            tick={{ fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={{ fontSize: 10 }}
          />
          
          <Radar
            name="Claude Sonnet"
            dataKey="Claude Sonnet"
            stroke={colors.series[0]}
            fill={colors.series[0]}
            fillOpacity={0.3}
          />
          
          <Radar
            name="Claude Haiku"
            dataKey="Claude Haiku"
            stroke={colors.series[1]}
            fill={colors.series[1]}
            fillOpacity={0.3}
          />
          
          <Radar
            name="GPT-4o"
            dataKey="GPT-4o"
            stroke={colors.series[2]}
            fill={colors.series[2]}
            fillOpacity={0.3}
          />
          
          <Legend />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

---

## 7. Financial Charts

### 7.1 Invoice Status Chart

```typescript
// components/charts/financial/invoice-status-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChartContainer } from '../chart-container';
import { CustomTooltip } from '../custom-tooltip';
import { useChartTheme } from '@/providers/chart-theme-provider';
import { formatters, CHART_CONFIG } from '@/lib/charts/config';

interface InvoiceStatusData {
  status: string;
  count: number;
  amount: number;
  color: string;
}

interface InvoiceStatusChartProps {
  data: InvoiceStatusData[];
  title?: string;
  description?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export function InvoiceStatusChart({
  data,
  title = 'Status Facturi',
  description = 'Distribuția facturilor pe status',
  loading,
  onRefresh,
}: InvoiceStatusChartProps) {
  const { config } = useChartTheme();
  
  const statusColors: Record<string, string> = {
    paid: 'hsl(142.1 76.2% 36.3%)',
    pending: 'hsl(38 92% 50%)',
    overdue: 'hsl(0 84.2% 60.2%)',
    cancelled: 'hsl(215 20.2% 65.1%)',
    draft: 'hsl(217.2 91.2% 59.8%)',
  };
  
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      fill: statusColors[item.status.toLowerCase()] || item.color,
    }));
  }, [data]);
  
  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      onRefresh={onRefresh}
      height={350}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={config.margin} layout="vertical">
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={config.gridStroke}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatters.compact(v)}
          />
          <YAxis
            type="category"
            dataKey="status"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          
          <Tooltip
            content={({ active, payload }) => (
              <CustomTooltip
                active={active}
                payload={payload as any}
                formatter={(value, name) => {
                  if (name === 'Valoare') return formatters.currency(value);
                  return formatters.number(value);
                }}
              />
            )}
          />
          
          <Legend />
          
          <Bar 
            dataKey="count" 
            name="Număr Facturi"
            radius={[0, 4, 4, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

### 7.2 Cash Flow Chart

```typescript
// components/charts/financial/cash-flow-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChartContainer } from '../chart-container';
import { CustomTooltip } from '../custom-tooltip';
import { useChartTheme } from '@/providers/chart-theme-provider';
import { formatters, CHART_CONFIG } from '@/lib/charts/config';

interface CashFlowData {
  month: string;
  income: number;
  expenses: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
  title?: string;
  description?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export function CashFlowChart({
  data,
  title = 'Cash Flow',
  description = 'Fluxul de numerar lunar',
  loading,
  onRefresh,
}: CashFlowChartProps) {
  const { colors, config } = useChartTheme();
  
  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      onRefresh={onRefresh}
      height={400}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={config.margin}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={config.gridStroke}
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: config.fontSize }}
            stroke={config.axisStroke}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatters.compact(v)}
          />
          
          <Tooltip
            content={({ active, payload, label }) => (
              <CustomTooltip
                active={active}
                payload={payload as any}
                label={label}
                formatter={(value) => formatters.currency(value)}
              />
            )}
          />
          
          <Legend />
          
          <ReferenceLine y={0} stroke={config.axisStroke} />
          
          <Bar
            dataKey="income"
            name="Încasări"
            fill={colors.success}
            radius={[4, 4, 0, 0]}
            barSize={15}
          />
          
          <Bar
            dataKey="expenses"
            name="Cheltuieli"
            fill={colors.danger}
            radius={[4, 4, 0, 0]}
            barSize={15}
          />
          
          <Line
            type="monotone"
            dataKey="cumulativeCashFlow"
            name="Cash Flow Cumulat"
            stroke={colors.primary}
            strokeWidth={2}
            dot={{ fill: colors.primary, r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

### 7.3 Revenue by Product Chart

```typescript
// components/charts/financial/revenue-by-product-chart.tsx
'use client';

import { useMemo, useState } from 'react';
import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ChartContainer } from '../chart-container';
import { useChartTheme } from '@/providers/chart-theme-provider';
import { formatters } from '@/lib/charts/config';

interface ProductRevenue {
  name: string;
  revenue: number;
  children?: ProductRevenue[];
}

interface RevenueByProductChartProps {
  data: ProductRevenue[];
  title?: string;
  description?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

// Custom treemap content
const CustomizedContent = (props: any) => {
  const { x, y, width, height, name, revenue, depth, colors } = props;
  
  if (width < 50 || height < 30) return null;
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: colors.series[depth % colors.series.length],
          stroke: '#fff',
          strokeWidth: 2,
          strokeOpacity: 1,
        }}
      />
      {width > 80 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            fill="#fff"
            fontSize={12}
            fontWeight="500"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#fff"
            fontSize={10}
          >
            {formatters.compact(revenue)}
          </text>
        </>
      )}
    </g>
  );
};

export function RevenueByProductChart({
  data,
  title = 'Venituri pe Produs',
  description = 'Distribuția veniturilor pe produse',
  loading,
  onRefresh,
}: RevenueByProductChartProps) {
  const { colors } = useChartTheme();
  
  const treemapData = useMemo(() => {
    return data.map(item => ({
      ...item,
      size: item.revenue,
    }));
  }, [data]);
  
  return (
    <ChartContainer
      title={title}
      description={description}
      loading={loading}
      onRefresh={onRefresh}
      height={400}
    >
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treemapData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#fff"
          fill={colors.primary}
          content={<CustomizedContent colors={colors} />}
        >
          <Tooltip
            formatter={(value: number) => formatters.currency(value)}
            labelFormatter={(name) => `Produs: ${name}`}
          />
        </Treemap>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```
