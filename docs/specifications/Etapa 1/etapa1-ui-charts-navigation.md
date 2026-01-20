# CERNIQ.APP — ETAPA 1: UI CHARTS & NAVIGATION
## Data Visualization & Navigation Components
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. CHART COMPONENTS

## 1.1 Funnel Chart (Pipeline Visualization)

```tsx
// packages/ui/src/components/charts/funnel-chart.tsx

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface FunnelStage {
  name: string;
  value: number;
  color?: string;
  href?: string;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  height?: number;
  showLabels?: boolean;
  showPercentage?: boolean;
  className?: string;
}

export function FunnelChart({
  stages,
  height = 300,
  showLabels = true,
  showPercentage = true,
  className,
}: FunnelChartProps) {
  const maxValue = Math.max(...stages.map(s => s.value));
  
  const stagesWithMetrics = useMemo(() => {
    return stages.map((stage, index) => {
      const prevValue = index > 0 ? stages[index - 1].value : stage.value;
      const conversionRate = prevValue > 0 ? (stage.value / prevValue) * 100 : 0;
      const widthPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
      
      return {
        ...stage,
        conversionRate,
        widthPercent,
      };
    });
  }, [stages, maxValue]);

  const stageHeight = height / stages.length;

  return (
    <div className={cn('relative', className)} style={{ height }}>
      {stagesWithMetrics.map((stage, index) => (
        <div
          key={stage.name}
          className="absolute left-1/2 -translate-x-1/2 transition-all duration-300"
          style={{
            top: index * stageHeight,
            height: stageHeight - 4,
            width: `${stage.widthPercent}%`,
            minWidth: '60px',
          }}
        >
          <div
            className={cn(
              'h-full rounded-md flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity',
              stage.href && 'hover:ring-2 ring-primary'
            )}
            style={{
              backgroundColor: stage.color || getDefaultColor(index),
            }}
            onClick={() => stage.href && (window.location.href = stage.href)}
          >
            {showLabels && (
              <div className="text-white text-center px-2">
                <div className="font-semibold text-sm truncate">{stage.name}</div>
                <div className="text-xs opacity-90">
                  {stage.value.toLocaleString()}
                  {showPercentage && index > 0 && (
                    <span className="ml-1">({stage.conversionRate.toFixed(1)}%)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function getDefaultColor(index: number): string {
  const colors = [
    'hsl(var(--chart-1))', // Bronze
    'hsl(var(--chart-2))', // Silver
    'hsl(var(--chart-3))', // Gold
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];
  return colors[index % colors.length];
}
```

## 1.2 Gauge Chart (Score Visualization)

```tsx
// packages/ui/src/components/charts/gauge-chart.tsx

import { cn } from '@/lib/utils';

interface GaugeChartProps {
  value: number;
  max?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  thresholds?: {
    low: number;
    medium: number;
  };
  className?: string;
}

export function GaugeChart({
  value,
  max = 100,
  label,
  size = 'md',
  showValue = true,
  thresholds = { low: 40, medium: 70 },
  className,
}: GaugeChartProps) {
  const percentage = Math.min(100, (value / max) * 100);
  const rotation = (percentage / 100) * 180 - 90; // -90 to 90 degrees

  const sizes = {
    sm: { width: 100, strokeWidth: 8, fontSize: 'text-lg' },
    md: { width: 150, strokeWidth: 10, fontSize: 'text-2xl' },
    lg: { width: 200, strokeWidth: 12, fontSize: 'text-3xl' },
  };

  const { width, strokeWidth, fontSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Half circle

  const getColor = () => {
    if (value >= thresholds.medium) return 'text-green-500';
    if (value >= thresholds.low) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStrokeColor = () => {
    if (value >= thresholds.medium) return 'stroke-green-500';
    if (value >= thresholds.low) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width, height: width / 2 + 20 }}>
        <svg
          width={width}
          height={width / 2 + 20}
          viewBox={`0 0 ${width} ${width / 2 + 20}`}
        >
          {/* Background arc */}
          <path
            d={describeArc(width / 2, width / 2, radius, -90, 90)}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
            strokeLinecap="round"
          />
          
          {/* Value arc */}
          <path
            d={describeArc(width / 2, width / 2, radius, -90, rotation)}
            fill="none"
            strokeWidth={strokeWidth}
            className={getStrokeColor()}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>

        {/* Center value */}
        {showValue && (
          <div 
            className="absolute inset-0 flex items-end justify-center pb-2"
            style={{ top: width / 4 }}
          >
            <span className={cn(fontSize, 'font-bold', getColor())}>
              {Math.round(value)}
            </span>
          </div>
        )}
      </div>

      {label && (
        <span className="text-sm text-muted-foreground mt-1">{label}</span>
      )}
    </div>
  );
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}
```

## 1.3 Progress Ring

```tsx
// packages/ui/src/components/charts/progress-ring.tsx

import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  className?: string;
}

export function ProgressRing({
  value,
  max = 100,
  size = 60,
  strokeWidth = 4,
  label,
  showPercentage = true,
  color,
  className,
}: ProgressRingProps) {
  const percentage = Math.min(100, (value / max) * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (color) return color;
    if (percentage >= 70) return 'stroke-green-500';
    if (percentage >= 40) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={getColor()}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span className="text-xs font-semibold">
            {Math.round(percentage)}%
          </span>
        )}
        {label && (
          <span className="text-[10px] text-muted-foreground">{label}</span>
        )}
      </div>
    </div>
  );
}
```

## 1.4 Bar Chart (Using Recharts)

```tsx
// packages/ui/src/components/charts/bar-chart.tsx

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

interface BarChartData {
  name: string;
  [key: string]: string | number;
}

interface BarChartProps {
  data: BarChartData[];
  dataKeys: Array<{
    key: string;
    color: string;
    label?: string;
  }>;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  className?: string;
}

export function BarChart({
  data,
  dataKeys,
  xAxisKey = 'name',
  height = 300,
  showGrid = true,
  showLegend = true,
  stacked = false,
  className,
}: BarChartProps) {
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          {showLegend && <Legend />}
          {dataKeys.map((dk) => (
            <Bar
              key={dk.key}
              dataKey={dk.key}
              name={dk.label || dk.key}
              fill={dk.color}
              stackId={stacked ? 'stack' : undefined}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

## 1.5 Line Chart (Trend Visualization)

```tsx
// packages/ui/src/components/charts/line-chart.tsx

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface LineChartData {
  name: string;
  [key: string]: string | number;
}

interface LineChartProps {
  data: LineChartData[];
  lines: Array<{
    key: string;
    color: string;
    label?: string;
    dashed?: boolean;
  }>;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showDots?: boolean;
  className?: string;
}

export function LineChart({
  data,
  lines,
  xAxisKey = 'name',
  height = 300,
  showGrid = true,
  showLegend = true,
  showDots = true,
  className,
}: LineChartProps) {
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          {showLegend && <Legend />}
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label || line.key}
              stroke={line.color}
              strokeWidth={2}
              strokeDasharray={line.dashed ? '5 5' : undefined}
              dot={showDots}
              activeDot={{ r: 6 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

## 1.6 Pie/Donut Chart

```tsx
// packages/ui/src/components/charts/donut-chart.tsx

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface DonutChartData {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function DonutChart({
  data,
  height = 250,
  innerRadius = 60,
  outerRadius = 80,
  showLegend = true,
  showLabels = false,
  centerLabel,
  centerValue,
  className,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            label={showLabels ? ({ name, percent }) => 
              `${name} (${(percent * 100).toFixed(0)}%)` : undefined}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [
              `${value.toLocaleString()} (${((value / total) * 100).toFixed(1)}%)`,
            ]}
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center content */}
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue !== undefined && (
            <span className="text-2xl font-bold">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-sm text-muted-foreground">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

---

# 2. NAVIGATION COMPONENTS

## 2.1 Sidebar Navigation

```tsx
// packages/ui/src/components/navigation/sidebar.tsx

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  LayoutDashboard,
  Upload,
  Layers,
  Database,
  Crown,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Import',
    href: '/imports',
    icon: Upload,
  },
  {
    title: 'Bronze',
    href: '/bronze',
    icon: Layers,
    children: [
      { title: 'Contacte', href: '/bronze/contacts', icon: Layers },
      { title: 'Batches', href: '/bronze/batches', icon: Database },
    ],
  },
  {
    title: 'Silver',
    href: '/silver',
    icon: Database,
    children: [
      { title: 'Companii', href: '/silver/companies', icon: Database },
      { title: 'Enrichment', href: '/silver/enrichment', icon: Database },
    ],
  },
  {
    title: 'Gold',
    href: '/gold',
    icon: Crown,
    children: [
      { title: 'Companii', href: '/gold/companies', icon: Crown },
      { title: 'Leads', href: '/gold/leads', icon: Crown },
    ],
  },
  {
    title: 'Aprobări',
    href: '/approvals',
    icon: CheckSquare,
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col border-r bg-background transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-4">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">C</span>
              </div>
              <span className="font-semibold">Cerniq.app</span>
            </Link>
          )}
          {collapsed && (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
              <span className="text-primary-foreground font-bold">C</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <NavItemComponent
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname.startsWith(item.href)}
              />
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/settings">
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <Settings className="h-4 w-4" />
                  {!collapsed && <span className="ml-3">Setări</span>}
                </Button>
              </Link>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Setări</TooltipContent>}
          </Tooltip>
          
          {/* Collapse toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'w-full justify-start mt-2',
              collapsed && 'justify-center px-2'
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-3">Restrânge</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

function NavItemComponent({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const [expanded, setExpanded] = useState(isActive);
  const hasChildren = item.children && item.children.length > 0;

  const content = (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      className={cn(
        'w-full justify-start',
        collapsed && 'justify-center px-2'
      )}
      onClick={() => hasChildren && setExpanded(!expanded)}
      asChild={!hasChildren}
    >
      {hasChildren ? (
        <div className="flex items-center w-full">
          <item.icon className="h-4 w-4" />
          {!collapsed && (
            <>
              <span className="ml-3 flex-1">{item.title}</span>
              {item.badge !== undefined && (
                <span className="ml-auto bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </>
          )}
        </div>
      ) : (
        <Link to={item.href} className="flex items-center w-full">
          <item.icon className="h-4 w-4" />
          {!collapsed && (
            <>
              <span className="ml-3 flex-1">{item.title}</span>
              {item.badge !== undefined && (
                <span className="ml-auto bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </>
          )}
        </Link>
      )}
    </Button>
  );

  return (
    <li>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      ) : (
        content
      )}

      {/* Children */}
      {hasChildren && expanded && !collapsed && (
        <ul className="ml-6 mt-1 space-y-1">
          {item.children!.map((child) => (
            <li key={child.href}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                asChild
              >
                <Link to={child.href}>
                  <child.icon className="h-3 w-3" />
                  <span className="ml-3">{child.title}</span>
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
```

## 2.2 Breadcrumbs

```tsx
// packages/ui/src/components/navigation/breadcrumbs.tsx

import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumbs({
  items,
  showHome = true,
  className,
}: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
    >
      <ol className="flex items-center gap-1">
        {showHome && (
          <>
            <li>
              <Link
                to="/"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">Acasă</span>
              </Link>
            </li>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </>
        )}
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={item.label} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

## 2.3 Page Header

```tsx
// packages/ui/src/components/navigation/page-header.tsx

import { ReactNode } from 'react';
import { Breadcrumbs } from './breadcrumbs';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} />
      )}
      
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
```

## 2.4 Tabs Navigation

```tsx
// packages/ui/src/components/navigation/tabs-nav.tsx

import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TabItem {
  label: string;
  href: string;
  count?: number;
  icon?: React.ElementType;
}

interface TabsNavProps {
  tabs: TabItem[];
  className?: string;
}

export function TabsNav({ tabs, className }: TabsNavProps) {
  const location = useLocation();

  return (
    <nav className={cn('border-b', className)}>
      <div className="flex gap-4">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {tab.icon && <tab.icon className="h-4 w-4" />}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'ml-1 px-2 py-0.5 text-xs rounded-full',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

## 2.5 Command Palette

```tsx
// packages/ui/src/components/navigation/command-palette.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Upload,
  Database,
  Crown,
  CheckSquare,
  Search,
  Settings,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Caută pagini, acțiuni..." />
      <CommandList>
        <CommandEmpty>Nu s-au găsit rezultate.</CommandEmpty>
        
        <CommandGroup heading="Navigare">
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/imports'))}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Import Date</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/silver/companies'))}>
            <Database className="mr-2 h-4 w-4" />
            <span>Companii Silver</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/gold/companies'))}>
            <Crown className="mr-2 h-4 w-4" />
            <span>Companii Gold</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/approvals'))}>
            <CheckSquare className="mr-2 h-4 w-4" />
            <span>Aprobări</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Acțiuni">
          <CommandItem onSelect={() => runCommand(() => navigate('/imports/new'))}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Import nou</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/bronze/manual'))}>
            <Database className="mr-2 h-4 w-4" />
            <span>Adaugă contact manual</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Setări">
          <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Setări aplicație</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// Keyboard shortcut hook
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return { open, setOpen };
}
```

---

# 3. DASHBOARD WIDGETS

## 3.1 Stats Grid

```tsx
// apps/web/src/components/dashboard/stats-grid.tsx

import { Card, CardContent } from '@cerniq/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCard {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ElementType;
  href?: string;
}

interface StatsGridProps {
  stats: StatCard[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ stats, columns = 4, className }: StatsGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-4',
        className
      )}
    >
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className={cn(
            stat.href && 'cursor-pointer hover:border-primary/50 transition-colors'
          )}
          onClick={() => stat.href && (window.location.href = stat.href)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </p>
              {stat.icon && (
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {typeof stat.value === 'number'
                  ? stat.value.toLocaleString()
                  : stat.value}
              </span>
              
              {stat.change !== undefined && (
                <span
                  className={cn(
                    'flex items-center text-xs font-medium',
                    stat.change > 0 && 'text-green-600',
                    stat.change < 0 && 'text-red-600',
                    stat.change === 0 && 'text-muted-foreground'
                  )}
                >
                  {stat.change > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : stat.change < 0 ? (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  ) : (
                    <Minus className="h-3 w-3 mr-0.5" />
                  )}
                  {Math.abs(stat.change)}%
                </span>
              )}
            </div>
            
            {stat.changeLabel && (
              <p className="text-xs text-muted-foreground mt-1">
                {stat.changeLabel}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## 3.2 Activity Feed

```tsx
// apps/web/src/components/dashboard/activity-feed.tsx

import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Badge } from '@cerniq/ui/badge';
import {
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Crown,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  status?: 'success' | 'error' | 'warning' | 'info';
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
}

const activityIcons: Record<string, React.ElementType> = {
  import_completed: Upload,
  import_failed: Upload,
  promotion_completed: Crown,
  enrichment_completed: Database,
  approval_required: AlertTriangle,
  approval_completed: CheckCircle,
};

const statusColors: Record<string, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

export function ActivityFeed({ activities, maxItems = 10 }: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <div className="space-y-4">
      {displayActivities.map((activity) => {
        const Icon = activityIcons[activity.type] || Database;
        const iconColor = statusColors[activity.status || 'info'];

        return (
          <div key={activity.id} className="flex gap-3">
            <div className={cn('mt-0.5', iconColor)}>
              <Icon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{activity.title}</p>
              {activity.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {activity.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(activity.timestamp), {
                  addSuffix: true,
                  locale: ro,
                })}
              </p>
            </div>
            
            {activity.status && (
              <Badge
                variant={
                  activity.status === 'success' ? 'success' :
                  activity.status === 'error' ? 'destructive' :
                  activity.status === 'warning' ? 'warning' : 'secondary'
                }
              >
                {activity.status}
              </Badge>
            )}
          </div>
        );
      })}

      {activities.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nicio activitate recentă
        </p>
      )}
    </div>
  );
}
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2
