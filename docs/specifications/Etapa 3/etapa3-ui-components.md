# Etapa 3 - UI Components Library

## Componente Reutilizabile pentru AI Sales Agent

**Document Version:** 1.0.0
**Last Updated:** 2026-01-18
**Author:** Cerniq Development Team
**Status:** Complete

---

## Cuprins

1. [Overview](#1-overview)
2. [Design System Foundation](#2-design-system-foundation)
3. [Layout Components](#3-layout-components)
4. [Navigation Components](#4-navigation-components)
5. [Data Display Components](#5-data-display-components)
6. [Form Components](#6-form-components)
7. [Feedback Components](#7-feedback-components)
8. [Chart Components](#8-chart-components)
9. [AI-Specific Components](#9-ai-specific-components)
10. [HITL Components](#10-hitl-components)
11. [Document Components](#11-document-components)
12. [Integration Components](#12-integration-components)
13. [Utility Components](#13-utility-components)
14. [Component Testing](#14-component-testing)
15. [Storybook Documentation](#15-storybook-documentation)

---

## 1. Overview

### 1.1 Component Architecture

```text
src/
├── components/
│   ├── ui/                      # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── layout/                  # Layout components
│   │   ├── SalesLayout.tsx
│   │   ├── PageHeader.tsx
│   │   └── Sidebar.tsx
│   ├── navigation/              # Navigation components
│   │   ├── MainNav.tsx
│   │   ├── Breadcrumbs.tsx
│   │   └── TabNav.tsx
│   ├── data-display/            # Tables, lists, cards
│   │   ├── DataTable.tsx
│   │   ├── StatCard.tsx
│   │   └── Timeline.tsx
│   ├── forms/                   # Form components
│   │   ├── FormField.tsx
│   │   ├── SearchInput.tsx
│   │   └── ConditionBuilder.tsx
│   ├── feedback/                # Alerts, toasts, modals
│   │   ├── LoadingSpinner.tsx
│   │   ├── EmptyState.tsx
│   │   └── ErrorBoundary.tsx
│   ├── charts/                  # Visualization components
│   │   ├── AreaChartCard.tsx
│   │   ├── PieChartCard.tsx
│   │   └── FunnelChart.tsx
│   ├── ai/                      # AI-specific components
│   │   ├── ChatMessage.tsx
│   │   ├── SentimentIndicator.tsx
│   │   └── GuardrailsBadge.tsx
│   ├── hitl/                    # HITL approval components
│   │   ├── ApprovalCard.tsx
│   │   ├── EscalationAlert.tsx
│   │   └── TakeoverPanel.tsx
│   ├── documents/               # Document components
│   │   ├── PDFViewer.tsx
│   │   ├── DocumentCard.tsx
│   │   └── EFacturaStatus.tsx
│   └── integrations/            # External service components
│       ├── OblioStatus.tsx
│       ├── ANAFStatus.tsx
│       └── ChannelIcon.tsx
└── hooks/                       # Custom hooks
    ├── useDebounce.ts
    ├── useLocalStorage.ts
    └── usePagination.ts
```

### 1.2 Component Design Principles

1. **Single Responsibility** - Fiecare componentă face un singur lucru
2. **Composability** - Componente mici care se compun în componente mai mari
3. **Type Safety** - TypeScript strict pentru toate props
4. **Accessibility** - ARIA labels și keyboard navigation
5. **Testability** - Unit tests pentru fiecare componentă
6. **Documentation** - Storybook stories pentru fiecare componentă

### 1.3 Technology Stack

```typescript
// packages/frontend/package.json dependencies
{
  "dependencies": {
    "react": "^19.2.3",
    "@tanstack/react-query": "^5.62.16",
    "@tanstack/react-table": "^8.20.6",
    "react-hook-form": "^7.54.2",
    "zod": "^3.24.1",
    "@hookform/resolvers": "^3.9.0",
    "recharts": "^2.15.0",
    "react-pdf": "^9.2.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.469.0",
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.7.0",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0"
  }
}
```

---

## 2. Design System Foundation

### 2.1 Color Palette

```typescript
// src/lib/design-tokens.ts

export const colors = {
  // Primary - Blue
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Secondary - Slate
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  
  // Semantic Colors
  success: {
    light: '#dcfce7',
    main: '#22c55e',
    dark: '#15803d',
  },
  warning: {
    light: '#fef3c7',
    main: '#f59e0b',
    dark: '#b45309',
  },
  error: {
    light: '#fee2e2',
    main: '#ef4444',
    dark: '#b91c1c',
  },
  info: {
    light: '#dbeafe',
    main: '#3b82f6',
    dark: '#1d4ed8',
  },
  
  // Channel Colors
  channels: {
    whatsapp: '#25D366',
    email: '#EA4335',
    phone: '#4285F4',
    web: '#9333EA',
  },
  
  // Status Colors
  status: {
    draft: '#94a3b8',
    pending: '#f59e0b',
    active: '#22c55e',
    completed: '#3b82f6',
    cancelled: '#ef4444',
    escalated: '#a855f7',
  },
  
  // Negotiation Stage Colors
  negotiationStages: {
    initial_contact: '#60a5fa',
    qualification: '#a78bfa',
    needs_analysis: '#f472b6',
    proposal: '#facc15',
    negotiation: '#fb923c',
    closing: '#4ade80',
    won: '#22c55e',
    lost: '#ef4444',
    stalled: '#94a3b8',
  },
  
  // Tier Colors
  tiers: {
    bronze: '#cd7f32',
    silver: '#c0c0c0',
    gold: '#ffd700',
    platinum: '#e5e4e2',
  },
} as const;

export type ColorKey = keyof typeof colors;
```

### 2.2 Typography

```typescript
// src/lib/typography.ts

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;
```

### 2.3 Spacing & Layout

```typescript
// src/lib/spacing.ts

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
} as const;

export const layout = {
  sidebar: {
    collapsed: '64px',
    expanded: '256px',
  },
  header: {
    height: '64px',
  },
  content: {
    maxWidth: '1536px',
    padding: '24px',
  },
  card: {
    padding: '24px',
    borderRadius: '8px',
  },
} as const;
```

### 2.4 Shadows & Borders

```typescript
// src/lib/effects.ts

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

export const borders = {
  radius: {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
  width: {
    DEFAULT: '1px',
    0: '0px',
    2: '2px',
    4: '4px',
    8: '8px',
  },
} as const;
```

### 2.5 Animation

```typescript
// src/lib/animations.ts

export const animations = {
  durations: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  easings: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    slideIn: {
      from: { transform: 'translateY(-10px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
    shimmer: {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },
  },
} as const;
```

---

## 3. Layout Components

### 3.1 SalesLayout

```typescript
// src/components/layout/SalesLayout.tsx

import { useState, createContext, useContext, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toaster } from '@/components/ui/toaster';

interface LayoutContextValue {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within SalesLayout');
  }
  return context;
}

interface SalesLayoutProps {
  children?: ReactNode;
}

export function SalesLayout({ children }: SalesLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);
  
  return (
    <LayoutContext.Provider value={{ sidebarCollapsed, toggleSidebar, setSidebarCollapsed }}>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} />
        
        {/* Main Content */}
        <div
          className={cn(
            'transition-all duration-300',
            sidebarCollapsed ? 'ml-16' : 'ml-64'
          )}
        >
          {/* Header */}
          <Header />
          
          {/* Page Content */}
          <main className="p-6">
            {children || <Outlet />}
          </main>
        </div>
        
        {/* Global Toaster */}
        <Toaster />
      </div>
    </LayoutContext.Provider>
  );
}
```

### 3.2 PageHeader

```typescript
// src/components/layout/PageHeader.tsx

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumbs, BreadcrumbItem } from '../navigation/Breadcrumbs';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  tabs?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  tabs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} className="mb-4" />
      )}
      
      {/* Title Row */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
      
      {/* Tabs */}
      {tabs && (
        <div className="mt-4 border-b">
          {tabs}
        </div>
      )}
    </div>
  );
}
```

### 3.3 PageContent

```typescript
// src/components/layout/PageContent.tsx

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContentProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function PageContent({
  children,
  className,
  maxWidth = 'full',
  padding = 'none',
}: PageContentProps) {
  return (
    <div
      className={cn(
        'mx-auto',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
```

### 3.4 SplitPane

```typescript
// src/components/layout/SplitPane.tsx

import { ReactNode, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  className?: string;
}

export function SplitPane({
  left,
  right,
  defaultLeftWidth = 400,
  minLeftWidth = 200,
  maxLeftWidth = 600,
  className,
}: SplitPaneProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const startX = e.clientX;
    const startWidth = leftWidth;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.min(
        Math.max(startWidth + delta, minLeftWidth),
        maxLeftWidth
      );
      setLeftWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [leftWidth, minLeftWidth, maxLeftWidth]);
  
  return (
    <div className={cn('flex h-full', className)}>
      {/* Left Panel */}
      <div
        className="flex-shrink-0 overflow-auto"
        style={{ width: leftWidth }}
      >
        {left}
      </div>
      
      {/* Resizer */}
      <div
        className={cn(
          'w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex items-center justify-center',
          'transition-colors duration-150',
          isDragging && 'bg-blue-500'
        )}
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      
      {/* Right Panel */}
      <div className="flex-1 overflow-auto">
        {right}
      </div>
    </div>
  );
}
```

### 3.5 GridLayout

```typescript
// src/components/layout/GridLayout.tsx

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type GridCols = 1 | 2 | 3 | 4 | 5 | 6 | 12;
type Gap = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface GridLayoutProps {
  children: ReactNode;
  cols?: GridCols;
  colsSm?: GridCols;
  colsMd?: GridCols;
  colsLg?: GridCols;
  colsXl?: GridCols;
  gap?: Gap;
  className?: string;
}

const colsClasses: Record<GridCols, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
};

const responsiveColsClasses = {
  sm: {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-5',
    6: 'sm:grid-cols-6',
    12: 'sm:grid-cols-12',
  },
  md: {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
    12: 'md:grid-cols-12',
  },
  lg: {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
    12: 'lg:grid-cols-12',
  },
  xl: {
    1: 'xl:grid-cols-1',
    2: 'xl:grid-cols-2',
    3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4',
    5: 'xl:grid-cols-5',
    6: 'xl:grid-cols-6',
    12: 'xl:grid-cols-12',
  },
};

const gapClasses: Record<Gap, string> = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

export function GridLayout({
  children,
  cols = 1,
  colsSm,
  colsMd,
  colsLg,
  colsXl,
  gap = 'md',
  className,
}: GridLayoutProps) {
  return (
    <div
      className={cn(
        'grid',
        colsClasses[cols],
        colsSm && responsiveColsClasses.sm[colsSm],
        colsMd && responsiveColsClasses.md[colsMd],
        colsLg && responsiveColsClasses.lg[colsLg],
        colsXl && responsiveColsClasses.xl[colsXl],
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

// GridItem pentru span control
interface GridItemProps {
  children: ReactNode;
  span?: number;
  spanSm?: number;
  spanMd?: number;
  spanLg?: number;
  className?: string;
}

export function GridItem({
  children,
  span,
  spanSm,
  spanMd,
  spanLg,
  className,
}: GridItemProps) {
  const spanClass = span ? `col-span-${span}` : '';
  const spanSmClass = spanSm ? `sm:col-span-${spanSm}` : '';
  const spanMdClass = spanMd ? `md:col-span-${spanMd}` : '';
  const spanLgClass = spanLg ? `lg:col-span-${spanLg}` : '';
  
  return (
    <div className={cn(spanClass, spanSmClass, spanMdClass, spanLgClass, className)}>
      {children}
    </div>
  );
}
```

---

## 4. Navigation Components

### 4.1 Sidebar

```typescript
// src/components/navigation/Sidebar.tsx

import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  Tags,
  FileText,
  Bot,
  CheckSquare,
  BarChart3,
  Settings,
  Shield,
  Receipt,
  Route,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLayout } from '../layout/SalesLayout';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/sales/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Negocieri',
    href: '/sales/negotiations',
    icon: MessageSquare,
    badge: 12,
  },
  {
    label: 'Produse',
    href: '/sales/products',
    icon: Package,
  },
  {
    label: 'Prețuri',
    href: '/sales/pricing',
    icon: Tags,
  },
  {
    label: 'Documente',
    href: '/sales/documents',
    icon: FileText,
  },
  {
    label: 'Conversații AI',
    href: '/sales/ai-conversations',
    icon: Bot,
  },
  {
    label: 'Aprobări HITL',
    href: '/sales/approvals',
    icon: CheckSquare,
    badge: 5,
  },
  {
    label: 'Rapoarte',
    href: '/sales/reports',
    icon: BarChart3,
  },
  {
    label: 'Guardrails',
    href: '/sales/guardrails-monitor',
    icon: Shield,
  },
  {
    label: 'e-Factura',
    href: '/sales/e-factura',
    icon: Receipt,
  },
  {
    label: 'Setări',
    href: '/sales/settings',
    icon: Settings,
    children: [
      { label: 'AI Configuration', href: '/sales/settings/ai', icon: Bot },
      { label: 'Guardrails', href: '/sales/settings/guardrails', icon: Shield },
      { label: 'Routing', href: '/sales/settings/routing', icon: Route },
      { label: 'Integrări', href: '/sales/settings/integrations', icon: Settings },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation();
  const { toggleSidebar } = useLayout();
  
  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };
  
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200',
        'transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!collapsed && (
          <Link to="/sales/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold">C</span>
            </div>
            <span className="font-semibold text-gray-900">Cerniq Sales</span>
          </Link>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(collapsed && 'mx-auto')}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            isActive={isActive(item.href)}
          />
        ))}
      </nav>
    </aside>
  );
}

interface NavLinkProps {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}

function NavLink({ item, collapsed, isActive }: NavLinkProps) {
  const Icon = item.icon;
  
  return (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg',
        'text-sm font-medium transition-colors',
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
```

### 4.2 Breadcrumbs

```typescript
// src/components/navigation/Breadcrumbs.tsx

import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
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
  const allItems = showHome
    ? [{ label: 'Dashboard', href: '/sales/dashboard' }, ...items]
    : items;
  
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center space-x-2">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          
          return (
            <li key={item.label} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
              )}
              
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {index === 0 && showHome ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    item.label
                  )}
                </Link>
              ) : (
                <span
                  className={cn(
                    'text-sm',
                    isLast ? 'font-medium text-gray-900' : 'text-gray-500'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

### 4.3 TabNav

```typescript
// src/components/navigation/TabNav.tsx

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface TabItem {
  label: string;
  href?: string;
  value?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
  disabled?: boolean;
}

interface TabNavProps {
  tabs: TabItem[];
  variant?: 'underline' | 'pills' | 'buttons';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  // For controlled tabs
  value?: string;
  onChange?: (value: string) => void;
}

export function TabNav({
  tabs,
  variant = 'underline',
  size = 'md',
  className,
  value,
  onChange,
}: TabNavProps) {
  const location = useLocation();
  
  const isActive = (tab: TabItem) => {
    if (value !== undefined && tab.value) {
      return value === tab.value;
    }
    if (tab.href) {
      return location.pathname === tab.href;
    }
    return false;
  };
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2.5',
  };
  
  const variantClasses = {
    underline: {
      container: 'border-b border-gray-200',
      tab: (active: boolean) => cn(
        sizeClasses[size],
        'relative font-medium transition-colors -mb-px',
        active
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-500 hover:text-gray-700'
      ),
    },
    pills: {
      container: 'flex gap-1 p-1 bg-gray-100 rounded-lg',
      tab: (active: boolean) => cn(
        sizeClasses[size],
        'rounded-md font-medium transition-all',
        active
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      ),
    },
    buttons: {
      container: 'flex gap-2',
      tab: (active: boolean) => cn(
        sizeClasses[size],
        'rounded-lg font-medium border transition-all',
        active
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
      ),
    },
  };
  
  const styles = variantClasses[variant];
  
  return (
    <nav className={cn('flex', styles.container, className)}>
      {tabs.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        
        const content = (
          <>
            {Icon && <Icon className="h-4 w-4 mr-1.5" />}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'ml-2 px-1.5 py-0.5 text-xs rounded-full',
                  active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                )}
              >
                {tab.badge}
              </span>
            )}
          </>
        );
        
        if (tab.href) {
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'flex items-center',
                styles.tab(active),
                tab.disabled && 'opacity-50 pointer-events-none'
              )}
            >
              {content}
            </Link>
          );
        }
        
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange?.(tab.value!)}
            disabled={tab.disabled}
            className={cn(
              'flex items-center',
              styles.tab(active),
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}
```

### 4.4 Pagination

```typescript
// src/components/navigation/Pagination.tsx

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  showTotal?: boolean;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSize = true,
  showTotal = true,
  className,
}: PaginationProps) {
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);
  
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;
  
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showPages = 5;
    
    if (totalPages <= showPages + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (page > 3) {
        pages.push('ellipsis');
      }
      
      // Show pages around current
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (page < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  return (
    <div className={cn('flex items-center justify-between', className)}>
      {/* Left side - Page size & Total */}
      <div className="flex items-center gap-4">
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Arată</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">pe pagină</span>
          </div>
        )}
        
        {showTotal && totalItems > 0 && (
          <span className="text-sm text-gray-500">
            {startItem}-{endItem} din {totalItems.toLocaleString('ro-RO')}
          </span>
        )}
      </div>
      
      {/* Right side - Page controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canGoPrev}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        
        {/* Previous Page */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canGoPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* Page Numbers */}
        {getPageNumbers().map((pageNum, index) => (
          pageNum === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <Button
              key={pageNum}
              variant={pageNum === page ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </Button>
          )
        ))}
        
        {/* Next Page */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canGoNext}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {/* Last Page */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canGoNext}
          onClick={() => onPageChange(totalPages)}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

---

## 5. Data Display Components

### 5.1 DataTable Component

Componentă generică pentru tabele de date cu sortare, paginație, filtrare și selecție.

```typescript
// src/components/data-display/DataTable.tsx
import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings2,
  Search,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchColumn?: string;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  columnVisibility?: boolean;
  stickyHeader?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  searchable = false,
  searchPlaceholder = 'Caută...',
  searchColumn,
  selectable = false,
  onSelectionChange,
  pagination = true,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  columnVisibility: showColumnVisibility = false,
  stickyHeader = false,
  striped = false,
  hoverable = true,
  compact = false,
  emptyMessage = 'Nu există date de afișat',
  onRowClick,
  rowClassName,
}: DataTableProps<TData, TValue>) {
  // State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Add selection column if selectable
  const tableColumns = useMemo(() => {
    if (!selectable) return columns;
    
    const selectColumn: ColumnDef<TData, TValue> = {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selectează tot"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Selectează rând"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    };
    
    return [selectColumn, ...columns];
  }, [columns, selectable]);

  // Table instance
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    enableRowSelection: selectable,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  // Notify parent of selection changes
  useMemo(() => {
    if (selectable && onSelectionChange) {
      const selectedRows = table
        .getSelectedRowModel()
        .rows.map((row) => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, selectable, onSelectionChange, table]);

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        {searchable && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchColumn 
                ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''
                : globalFilter
              }
              onChange={(e) => {
                if (searchColumn) {
                  table.getColumn(searchColumn)?.setFilterValue(e.target.value);
                } else {
                  setGlobalFilter(e.target.value);
                }
              }}
              className="pl-9"
            />
          </div>
        )}

        {/* Column visibility */}
        {showColumnVisibility && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <Settings2 className="mr-2 h-4 w-4" />
                Coloane
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table */}
      <div className={cn(
        "rounded-md border",
        stickyHeader && "max-h-[600px] overflow-auto"
      )}>
        <Table>
          <TableHeader className={cn(stickyHeader && "sticky top-0 bg-background z-10")}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    className={cn(
                      compact && "py-2",
                      header.column.getCanSort() && "cursor-pointer select-none"
                    )}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <>
                            {header.column.getIsSorted() === 'asc' ? (
                              <ArrowUp className="h-4 w-4" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ArrowDown className="h-4 w-4" />
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell 
                  colSpan={tableColumns.length} 
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Se încarcă...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    hoverable && "hover:bg-muted/50 cursor-pointer",
                    striped && index % 2 === 1 && "bg-muted/30",
                    rowClassName?.(row.original)
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      className={cn(compact && "py-2")}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={tableColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-2">
          <div className="flex-1 text-sm text-muted-foreground">
            {selectable && (
              <span>
                {table.getFilteredSelectedRowModel().rows.length} din{' '}
                {table.getFilteredRowModel().rows.length} rând(uri) selectat(e)
              </span>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rânduri pe pagină</span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="h-8 w-16 rounded border bg-background text-sm"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span>
                Pagina {table.getState().pagination.pageIndex + 1} din{' '}
                {table.getPageCount()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 5.2 StatCard Component

Card pentru afișarea statisticilor și KPI-urilor.

```typescript
// src/components/data-display/StatCard.tsx
import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  loading?: boolean;
  className?: string;
  valueClassName?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const variantStyles = {
  default: '',
  success: 'border-green-200 bg-green-50/50',
  warning: 'border-yellow-200 bg-yellow-50/50',
  danger: 'border-red-200 bg-red-50/50',
  info: 'border-blue-200 bg-blue-50/50',
};

const trendColors = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-gray-500',
};

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  loading = false,
  className,
  valueClassName,
  variant = 'default',
}: StatCardProps) {
  const getTrendType = () => {
    if (!trend) return 'neutral';
    if (trend.value > 0) return 'positive';
    if (trend.value < 0) return 'negative';
    return 'neutral';
  };

  const TrendIcon = {
    positive: TrendingUp,
    negative: TrendingDown,
    neutral: Minus,
  }[getTrendType()];

  if (loading) {
    return (
      <Card className={cn(variantStyles[variant], className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-20 animate-pulse rounded bg-muted mb-1" />
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-4 w-4 text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueClassName)}>
          {value}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trendColors[getTrendType()]
            )}>
              <TrendIcon className="h-3 w-3" />
              <span>
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-muted-foreground">
                  {trend.label}
                </span>
              )}
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Variante predefinite
export function RevenueCard({ value, trend }: { value: number; trend?: number }) {
  return (
    <StatCard
      title="Venituri"
      value={`${value.toLocaleString('ro-RO')} RON`}
      icon={<span>💰</span>}
      trend={trend ? { value: trend, label: 'vs luna trecută' } : undefined}
      variant={trend && trend > 0 ? 'success' : 'default'}
    />
  );
}

export function OrdersCard({ value, trend }: { value: number; trend?: number }) {
  return (
    <StatCard
      title="Comenzi"
      value={value.toLocaleString('ro-RO')}
      icon={<span>📦</span>}
      trend={trend ? { value: trend, label: 'vs luna trecută' } : undefined}
    />
  );
}

export function ConversionCard({ value }: { value: number }) {
  return (
    <StatCard
      title="Rată conversie"
      value={`${value.toFixed(1)}%`}
      icon={<span>📈</span>}
      variant={value >= 20 ? 'success' : value >= 10 ? 'warning' : 'danger'}
    />
  );
}
```

### 5.3 Timeline Component

Timeline pentru afișarea istoricului activităților.

```typescript
// src/components/data-display/Timeline.tsx
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date | string;
  icon?: ReactNode;
  status?: 'success' | 'warning' | 'error' | 'info' | 'default';
  metadata?: Record<string, string | number>;
}

export interface TimelineProps {
  items: TimelineItem[];
  loading?: boolean;
  showRelativeTime?: boolean;
  maxItems?: number;
  onItemClick?: (item: TimelineItem) => void;
  className?: string;
}

const statusColors = {
  success: 'bg-green-500 border-green-200',
  warning: 'bg-yellow-500 border-yellow-200',
  error: 'bg-red-500 border-red-200',
  info: 'bg-blue-500 border-blue-200',
  default: 'bg-gray-400 border-gray-200',
};

export function Timeline({
  items,
  loading = false,
  showRelativeTime = true,
  maxItems,
  onItemClick,
  className,
}: TimelineProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-muted animate-pulse mt-1.5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-muted animate-pulse" />
              <div className="h-3 w-32 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <p>Nu există activitate recentă</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Vertical line */}
      <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border" />
      
      {/* Items */}
      <div className="space-y-6">
        {displayItems.map((item, index) => {
          const timestamp = typeof item.timestamp === 'string' 
            ? new Date(item.timestamp) 
            : item.timestamp;
          
          return (
            <div 
              key={item.id}
              className={cn(
                "relative flex gap-4 pl-6",
                onItemClick && "cursor-pointer hover:bg-muted/50 -ml-2 pl-8 py-2 rounded-lg transition-colors"
              )}
              onClick={() => onItemClick?.(item)}
            >
              {/* Dot */}
              <div className={cn(
                "absolute left-0 top-1.5 h-3 w-3 rounded-full border-2",
                statusColors[item.status || 'default'],
                onItemClick && "left-2"
              )}>
                {item.icon && (
                  <div className="absolute -left-1 -top-1 h-5 w-5 flex items-center justify-center text-xs">
                    {item.icon}
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight">
                    {item.title}
                  </p>
                  <time className="text-xs text-muted-foreground whitespace-nowrap">
                    {showRelativeTime 
                      ? formatDistanceToNow(timestamp, { addSuffix: true, locale: ro })
                      : timestamp.toLocaleString('ro-RO')
                    }
                  </time>
                </div>
                
                {item.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
                
                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(item.metadata).map(([key, value]) => (
                      <span 
                        key={key}
                        className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"
                      >
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="ml-1 font-medium">{value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Show more indicator */}
      {maxItems && items.length > maxItems && (
        <div className="mt-4 text-center">
          <span className="text-sm text-muted-foreground">
            + {items.length - maxItems} mai multe activități
          </span>
        </div>
      )}
    </div>
  );
}
```

### 5.4 StatusBadge Component

Badge pentru afișarea statusurilor cu culori și iconuri.

```typescript
// src/components/data-display/StatusBadge.tsx
import { Badge, BadgeProps } from '@/components/ui/badge';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  PauseCircle,
  PlayCircle,
  MinusCircle,
  HelpCircle,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

// Status configurations
const statusConfigs: Record<string, {
  label: string;
  icon: ReactNode;
  variant: BadgeProps['variant'];
  className: string;
}> = {
  // General statuses
  active: {
    label: 'Activ',
    icon: <CheckCircle className="h-3 w-3" />,
    variant: 'default',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  inactive: {
    label: 'Inactiv',
    icon: <MinusCircle className="h-3 w-3" />,
    variant: 'outline',
    className: 'text-gray-600',
  },
  pending: {
    label: 'În așteptare',
    icon: <Clock className="h-3 w-3" />,
    variant: 'outline',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  processing: {
    label: 'În procesare',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    variant: 'outline',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  completed: {
    label: 'Finalizat',
    icon: <CheckCircle className="h-3 w-3" />,
    variant: 'default',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  failed: {
    label: 'Eșuat',
    icon: <XCircle className="h-3 w-3" />,
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  error: {
    label: 'Eroare',
    icon: <AlertCircle className="h-3 w-3" />,
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  warning: {
    label: 'Atenție',
    icon: <AlertCircle className="h-3 w-3" />,
    variant: 'outline',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  paused: {
    label: 'Pauză',
    icon: <PauseCircle className="h-3 w-3" />,
    variant: 'outline',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  running: {
    label: 'În execuție',
    icon: <PlayCircle className="h-3 w-3" />,
    variant: 'default',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  blocked: {
    label: 'Blocat',
    icon: <Ban className="h-3 w-3" />,
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  unknown: {
    label: 'Necunoscut',
    icon: <HelpCircle className="h-3 w-3" />,
    variant: 'outline',
    className: 'text-gray-500',
  },
  
  // Negotiation statuses
  negotiation_new: {
    label: 'Nou',
    icon: <Clock className="h-3 w-3" />,
    variant: 'outline',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  negotiation_in_progress: {
    label: 'În negociere',
    icon: <Loader2 className="h-3 w-3" />,
    variant: 'default',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  negotiation_pending_approval: {
    label: 'Așteaptă aprobare',
    icon: <Clock className="h-3 w-3" />,
    variant: 'outline',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  negotiation_won: {
    label: 'Câștigat',
    icon: <CheckCircle className="h-3 w-3" />,
    variant: 'default',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  negotiation_lost: {
    label: 'Pierdut',
    icon: <XCircle className="h-3 w-3" />,
    variant: 'outline',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  
  // e-Factura statuses
  efactura_not_submitted: {
    label: 'De trimis',
    icon: <Clock className="h-3 w-3" />,
    variant: 'outline',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  efactura_pending: {
    label: 'Trimisă',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    variant: 'outline',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  efactura_processing: {
    label: 'În procesare',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    variant: 'outline',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  efactura_accepted: {
    label: 'Acceptată',
    icon: <CheckCircle className="h-3 w-3" />,
    variant: 'default',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  efactura_rejected: {
    label: 'Respinsă',
    icon: <XCircle className="h-3 w-3" />,
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  
  // AI/Agent statuses
  ai_active: {
    label: 'AI Activ',
    icon: <span className="text-xs">🤖</span>,
    variant: 'default',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  ai_paused: {
    label: 'AI Pauză',
    icon: <PauseCircle className="h-3 w-3" />,
    variant: 'outline',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  human_takeover: {
    label: 'Operator',
    icon: <span className="text-xs">👤</span>,
    variant: 'outline',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
};

export interface StatusBadgeProps {
  status: string;
  customLabel?: string;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function StatusBadge({
  status,
  customLabel,
  showIcon = true,
  size = 'default',
  className,
}: StatusBadgeProps) {
  const config = statusConfigs[status] || statusConfigs.unknown;
  
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0',
    default: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && config.icon}
      {customLabel || config.label}
    </Badge>
  );
}

// Export status config for reuse
export { statusConfigs };
```

### 5.5 ProgressBar Component

Bară de progres cu suport pentru multiple variante și animații.

```typescript
// src/components/data-display/ProgressBar.tsx
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  valueFormat?: (value: number, max: number) => string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  striped?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-4',
};

const variantClasses = {
  default: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  valueFormat,
  size = 'md',
  variant = 'default',
  striped = false,
  animated = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  // Auto-detect variant based on percentage
  const autoVariant = (() => {
    if (variant !== 'default') return variant;
    if (percentage >= 90) return 'danger';
    if (percentage >= 70) return 'warning';
    return 'default';
  })();

  const displayValue = valueFormat 
    ? valueFormat(value, max) 
    : `${value}/${max}`;

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex justify-between mb-1">
          {label && (
            <span className="text-sm font-medium text-muted-foreground">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm font-medium">
              {displayValue}
            </span>
          )}
        </div>
      )}
      <div className={cn(
        "w-full rounded-full bg-muted overflow-hidden",
        sizeClasses[size]
      )}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            variantClasses[autoVariant],
            striped && "bg-stripes",
            animated && striped && "animate-stripes"
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}

// Styles for striped animation (add to globals.css)
// .bg-stripes {
//   background-image: linear-gradient(
//     45deg,
//     rgba(255, 255, 255, 0.15) 25%,
//     transparent 25%,
//     transparent 50%,
//     rgba(255, 255, 255, 0.15) 50%,
//     rgba(255, 255, 255, 0.15) 75%,
//     transparent 75%,
//     transparent
//   );
//   background-size: 1rem 1rem;
// }
// 
// @keyframes stripes {
//   from { background-position: 0 0; }
//   to { background-position: 1rem 0; }
// }
// 
// .animate-stripes {
//   animation: stripes 1s linear infinite;
// }
```

### 5.6 Avatar Component

Avatar pentru utilizatori și companii cu fallback și status indicator.

```typescript
// src/components/data-display/Avatar.tsx
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  status?: 'online' | 'offline' | 'busy' | 'away';
  showStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

const statusSizeClasses = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
};

function getInitials(name?: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({
  src,
  alt = '',
  name,
  size = 'md',
  shape = 'circle',
  status,
  showStatus = false,
  className,
}: AvatarProps) {
  const initials = getInitials(name);
  const bgColor = name ? stringToColor(name) : 'bg-gray-200';

  return (
    <div className={cn("relative inline-block", className)}>
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={cn(
            "object-cover",
            sizeClasses[size],
            shape === 'circle' ? 'rounded-full' : 'rounded-md'
          )}
          onError={(e) => {
            // Hide broken image and show fallback
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center font-medium text-white",
            sizeClasses[size],
            shape === 'circle' ? 'rounded-full' : 'rounded-md',
            initials ? bgColor : 'bg-muted'
          )}
        >
          {initials || <User className="h-1/2 w-1/2 text-muted-foreground" />}
        </div>
      )}
      
      {showStatus && status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-background",
            statusSizeClasses[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

// Avatar Group for multiple avatars
export interface AvatarGroupProps {
  avatars: Array<{
    src?: string;
    name?: string;
    alt?: string;
  }>;
  max?: number;
  size?: AvatarProps['size'];
  className?: string;
}

export function AvatarGroup({
  avatars,
  max = 5,
  size = 'md',
  className,
}: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          {...avatar}
          size={size}
          className="ring-2 ring-background"
        />
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium ring-2 ring-background",
            sizeClasses[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
```

### 5.7 EmptyState Component

Placeholder pentru secțiuni fără date.

```typescript
// src/components/data-display/EmptyState.tsx
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  FileQuestion,
  Search,
  Inbox,
  FolderOpen,
  AlertCircle,
  Database,
} from 'lucide-react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: {
    container: 'py-6',
    icon: 'h-8 w-8',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'py-10',
    icon: 'h-12 w-12',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'h-16 w-16',
    title: 'text-xl',
    description: 'text-base',
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className,
}: EmptyStateProps) {
  const sizes = sizeClasses[size];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      sizes.container,
      className
    )}>
      <div className={cn(
        "rounded-full bg-muted p-4 mb-4",
        size === 'sm' && 'p-3 mb-3'
      )}>
        <div className={cn("text-muted-foreground", sizes.icon)}>
          {icon || <Inbox className="h-full w-full" />}
        </div>
      </div>
      
      <h3 className={cn("font-semibold", sizes.title)}>
        {title}
      </h3>
      
      {description && (
        <p className={cn(
          "mt-2 text-muted-foreground max-w-sm",
          sizes.description
        )}>
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="mt-6 flex gap-3">
          {action && (
            <Button
              variant={action.variant || 'default'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Preset empty states
export function NoResultsFound({ 
  searchTerm,
  onClear,
}: { 
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={<Search className="h-full w-full" />}
      title="Niciun rezultat găsit"
      description={searchTerm 
        ? `Nu am găsit rezultate pentru "${searchTerm}". Încearcă alți termeni de căutare.`
        : 'Nu există rezultate care să corespundă filtrelor aplicate.'
      }
      action={onClear ? { label: 'Resetează căutarea', onClick: onClear, variant: 'outline' } : undefined}
    />
  );
}

export function NoDataYet({ 
  resourceName,
  onAdd,
}: { 
  resourceName: string;
  onAdd?: () => void;
}) {
  return (
    <EmptyState
      icon={<FolderOpen className="h-full w-full" />}
      title={`Nu există ${resourceName}`}
      description={`Nu ai adăugat încă niciun ${resourceName}. Adaugă primul pentru a începe.`}
      action={onAdd ? { label: `Adaugă ${resourceName}`, onClick: onAdd } : undefined}
    />
  );
}

export function LoadingError({ 
  onRetry,
}: { 
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-full w-full text-red-500" />}
      title="Eroare la încărcare"
      description="A apărut o eroare la încărcarea datelor. Te rugăm să încerci din nou."
      action={onRetry ? { label: 'Reîncearcă', onClick: onRetry } : undefined}
    />
  );
}

export function NoConnection() {
  return (
    <EmptyState
      icon={<Database className="h-full w-full text-orange-500" />}
      title="Conexiune întreruptă"
      description="Nu te poți conecta la server. Verifică conexiunea la internet și încearcă din nou."
    />
  );
}
```

---

## 6. Form Components

### 6.1 FormField Component

Wrapper pentru câmpuri de formular cu label, error și helper text.

```typescript
// src/components/forms/FormField.tsx
import { ReactNode, forwardRef } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AlertCircle, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface FormFieldProps {
  id?: string;
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  tooltip?: string;
  children: ReactNode;
  className?: string;
  horizontal?: boolean;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({
    id,
    label,
    required,
    error,
    helperText,
    tooltip,
    children,
    className,
    horizontal = false,
  }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          "space-y-2",
          horizontal && "flex items-start gap-4",
          className
        )}
      >
        {label && (
          <div className={cn(
            "flex items-center gap-1",
            horizontal && "min-w-[200px] pt-2"
          )}>
            <Label 
              htmlFor={id} 
              className={cn(error && "text-destructive")}
            >
              {label}
              {required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
        
        <div className={cn("flex-1", horizontal && "space-y-1")}>
          {children}
          
          {(error || helperText) && (
            <div className="mt-1.5">
              {error && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </p>
              )}
              {helperText && !error && (
                <p className="text-sm text-muted-foreground">
                  {helperText}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

FormField.displayName = 'FormField';
```

### 6.2 SearchInput Component

Input pentru căutare cu debounce și clear button.

```typescript
// src/components/forms/SearchInput.tsx
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

export interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  loading?: boolean;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
}

export function SearchInput({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = 'Caută...',
  debounceMs = 300,
  loading = false,
  autoFocus = false,
  className,
  inputClassName,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Use controlled or internal value
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  
  // Debounce the search
  const debouncedValue = useDebounce(value, debounceMs);

  // Trigger search on debounced value change
  useEffect(() => {
    if (onSearch && debouncedValue !== undefined) {
      onSearch(debouncedValue);
    }
  }, [debouncedValue, onSearch]);

  // Handle input change
  const handleChange = (newValue: string) => {
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  // Clear the input
  const handleClear = () => {
    handleChange('');
    inputRef.current?.focus();
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
    }
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn("pl-9 pr-9", inputClassName)}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {value && !loading && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Șterge căutare</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// Hook for debouncing
// src/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### 6.3 DateRangePicker Component

Selector pentru interval de date.

```typescript
// src/components/forms/DateRangePicker.tsx
import { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  presets?: boolean;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

const presetRanges = [
  { label: 'Astăzi', getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: 'Ieri', getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  { label: 'Ultimele 7 zile', getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: 'Ultimele 30 zile', getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: 'Luna aceasta', getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: 'Luna trecută', getValue: () => ({ 
    from: startOfMonth(subMonths(new Date(), 1)), 
    to: endOfMonth(subMonths(new Date(), 1)) 
  })},
  { label: 'Ultimele 3 luni', getValue: () => ({ from: subDays(new Date(), 89), to: new Date() }) },
  { label: 'Ultimele 12 luni', getValue: () => ({ from: subDays(new Date(), 364), to: new Date() }) },
];

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Selectează perioada',
  presets = true,
  className,
  align = 'start',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const handlePresetSelect = (presetLabel: string) => {
    const preset = presetRanges.find(p => p.label === presetLabel);
    if (preset) {
      onChange?.(preset.getValue());
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, 'd MMM yyyy', { locale: ro })} -{' '}
                {format(value.to, 'd MMM yyyy', { locale: ro })}
              </>
            ) : (
              format(value.from, 'd MMM yyyy', { locale: ro })
            )
          ) : (
            placeholder
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <div className="flex">
          {presets && (
            <div className="border-r p-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-2 pb-2">
                Presetări
              </p>
              {presetRanges.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left font-normal"
                  onClick={() => handlePresetSelect(preset.label)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value?.from}
              selected={value}
              onSelect={onChange}
              numberOfMonths={2}
              locale={ro}
            />
            <div className="flex justify-end gap-2 pt-3 border-t mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange?.(undefined);
                  setOpen(false);
                }}
              >
                Resetează
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Aplică
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### 6.4 SelectMultiple Component

Select cu opțiune de selecție multiplă.

```typescript
// src/components/forms/SelectMultiple.tsx
import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectMultipleProps {
  options: SelectOption[];
  value?: string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  maxDisplayedItems?: number;
  disabled?: boolean;
  className?: string;
}

export function SelectMultiple({
  options,
  value = [],
  onChange,
  placeholder = 'Selectează...',
  searchPlaceholder = 'Caută...',
  emptyMessage = 'Niciun rezultat găsit.',
  maxDisplayedItems = 3,
  disabled = false,
  className,
}: SelectMultipleProps) {
  const [open, setOpen] = useState(false);

  // Group options if they have group property
  const groupedOptions = useMemo(() => {
    const groups: Record<string, SelectOption[]> = {};
    const ungrouped: SelectOption[] = [];
    
    options.forEach((option) => {
      if (option.group) {
        if (!groups[option.group]) {
          groups[option.group] = [];
        }
        groups[option.group].push(option);
      } else {
        ungrouped.push(option);
      }
    });
    
    return { groups, ungrouped };
  }, [options]);

  const handleSelect = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange?.(newValue);
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(value.filter((v) => v !== optionValue));
  };

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v)?.label || v)
    .slice(0, maxDisplayedItems);

  const remainingCount = value.length - maxDisplayedItems;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between min-h-10 h-auto",
            value.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <div className="flex flex-wrap gap-1">
            {value.length === 0 && placeholder}
            {selectedLabels.map((label, index) => (
              <Badge
                key={value[index]}
                variant="secondary"
                className="rounded-sm px-1 font-normal"
              >
                {label}
                <button
                  type="button"
                  className="ml-1 rounded-full outline-none hover:bg-muted"
                  onClick={(e) => handleRemove(value[index], e)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {remainingCount > 0 && (
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                +{remainingCount}
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            
            {/* Ungrouped options */}
            {groupedOptions.ungrouped.length > 0 && (
              <CommandGroup>
                {groupedOptions.ungrouped.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(option.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {/* Grouped options */}
            {Object.entries(groupedOptions.groups).map(([group, opts]) => (
              <CommandGroup key={group} heading={group}>
                {opts.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(option.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### 6.5 ConditionBuilder Component

Builder pentru condiții complexe (folosit în Guardrails și Routing).

```typescript
// src/components/forms/ConditionBuilder.tsx
import { useFieldArray, Control, UseFormRegister } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface ConditionField {
  value: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  options?: { value: string; label: string }[];
}

export interface ConditionOperator {
  value: string;
  label: string;
  types: ('string' | 'number' | 'boolean' | 'select')[];
}

export interface Condition {
  field: string;
  operator: string;
  value: string;
}

export interface ConditionBuilderProps {
  name: string;
  control: Control<any>;
  register: UseFormRegister<any>;
  fields: ConditionField[];
  operators?: ConditionOperator[];
  logicOperator?: 'AND' | 'OR';
  maxConditions?: number;
  className?: string;
}

const defaultOperators: ConditionOperator[] = [
  { value: 'eq', label: 'Este egal cu', types: ['string', 'number', 'boolean', 'select'] },
  { value: 'neq', label: 'Nu este egal cu', types: ['string', 'number', 'boolean', 'select'] },
  { value: 'gt', label: 'Este mai mare decât', types: ['number'] },
  { value: 'gte', label: 'Este mai mare sau egal cu', types: ['number'] },
  { value: 'lt', label: 'Este mai mic decât', types: ['number'] },
  { value: 'lte', label: 'Este mai mic sau egal cu', types: ['number'] },
  { value: 'contains', label: 'Conține', types: ['string'] },
  { value: 'not_contains', label: 'Nu conține', types: ['string'] },
  { value: 'starts_with', label: 'Începe cu', types: ['string'] },
  { value: 'ends_with', label: 'Se termină cu', types: ['string'] },
  { value: 'in', label: 'Este în lista', types: ['string', 'number', 'select'] },
  { value: 'not_in', label: 'Nu este în lista', types: ['string', 'number', 'select'] },
  { value: 'regex', label: 'Potrivește regex', types: ['string'] },
];

export function ConditionBuilder({
  name,
  control,
  register,
  fields: conditionFields,
  operators = defaultOperators,
  logicOperator = 'AND',
  maxConditions = 10,
  className,
}: ConditionBuilderProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const getFieldType = (fieldValue: string) => {
    return conditionFields.find((f) => f.value === fieldValue)?.type || 'string';
  };

  const getAvailableOperators = (fieldValue: string) => {
    const fieldType = getFieldType(fieldValue);
    return operators.filter((op) => op.types.includes(fieldType));
  };

  const getFieldOptions = (fieldValue: string) => {
    return conditionFields.find((f) => f.value === fieldValue)?.options;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nu există condiții. Adaugă prima condiție.
        </p>
      )}
      
      {fields.map((field, index) => {
        const selectedField = conditionFields.find(
          (f) => f.value === (field as any).field
        );
        const fieldType = selectedField?.type || 'string';
        const availableOperators = getAvailableOperators((field as any).field);
        const fieldOptions = getFieldOptions((field as any).field);

        return (
          <div key={field.id} className="flex items-start gap-2">
            {index > 0 && (
              <span className="text-xs font-medium text-muted-foreground pt-2 w-10">
                {logicOperator}
              </span>
            )}
            
            <div className={cn(
              "flex-1 grid gap-2",
              index === 0 ? "grid-cols-[1fr,1fr,1fr,auto]" : "grid-cols-[1fr,1fr,1fr,auto]"
            )}>
              {/* Field select */}
              <Select
                value={(field as any).field}
                onValueChange={(value) => {
                  // Update field and reset operator/value
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Câmp" />
                </SelectTrigger>
                <SelectContent>
                  {conditionFields.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operator select */}
              <Select
                value={(field as any).operator}
                onValueChange={(value) => {}}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  {availableOperators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value input */}
              {fieldType === 'select' && fieldOptions ? (
                <Select
                  value={(field as any).value}
                  onValueChange={(value) => {}}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Valoare" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : fieldType === 'boolean' ? (
                <Select
                  value={(field as any).value}
                  onValueChange={(value) => {}}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Valoare" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Da</SelectItem>
                    <SelectItem value="false">Nu</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  {...register(`${name}.${index}.value`)}
                  type={fieldType === 'number' ? 'number' : 'text'}
                  placeholder="Valoare"
                />
              )}

              {/* Remove button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}

      {fields.length < maxConditions && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ field: '', operator: 'eq', value: '' })}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adaugă condiție
        </Button>
      )}
    </div>
  );
}
```

### 6.6 PriceInput Component

Input pentru prețuri cu formatare și suport pentru monede.

```typescript
// src/components/forms/PriceInput.tsx
import { forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PriceInputProps {
  value?: number;
  onChange?: (value: number | undefined) => void;
  currency?: string;
  locale?: string;
  min?: number;
  max?: number;
  step?: number;
  decimalPlaces?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const PriceInput = forwardRef<HTMLInputElement, PriceInputProps>(
  ({
    value,
    onChange,
    currency = 'RON',
    locale = 'ro-RO',
    min,
    max,
    step = 0.01,
    decimalPlaces = 2,
    placeholder = '0.00',
    disabled = false,
    className,
  }, ref) => {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Format number for display
    const formatNumber = (num: number): string => {
      return num.toLocaleString(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      });
    };

    // Parse display value to number
    const parseNumber = (str: string): number | undefined => {
      const cleaned = str
        .replace(/[^\d,.-]/g, '')
        .replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : num;
    };

    // Update display when value changes externally
    useEffect(() => {
      if (!isFocused && value !== undefined) {
        setDisplayValue(formatNumber(value));
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      setDisplayValue(input);
      
      const parsed = parseNumber(input);
      if (parsed !== undefined) {
        let constrained = parsed;
        if (min !== undefined) constrained = Math.max(constrained, min);
        if (max !== undefined) constrained = Math.min(constrained, max);
        onChange?.(constrained);
      } else if (input === '') {
        onChange?.(undefined);
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
      if (value !== undefined) {
        setDisplayValue(value.toString());
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      if (value !== undefined) {
        setDisplayValue(formatNumber(value));
      } else {
        setDisplayValue('');
      }
    };

    return (
      <div className={cn("relative", className)}>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-14 text-right"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {currency}
        </span>
      </div>
    );
  }
);

PriceInput.displayName = 'PriceInput';
```

### 6.7 PercentInput Component

Input pentru procente cu slider opțional.

```typescript
// src/components/forms/PercentInput.tsx
import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export interface PercentInputProps {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showSlider?: boolean;
  disabled?: boolean;
  className?: string;
}

export const PercentInput = forwardRef<HTMLInputElement, PercentInputProps>(
  ({
    value = 0,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    showSlider = false,
    disabled = false,
    className,
  }, ref) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = parseFloat(e.target.value) || 0;
      newValue = Math.max(min, Math.min(max, newValue));
      onChange?.(newValue);
    };

    const handleSliderChange = (values: number[]) => {
      onChange?.(values[0]);
    };

    return (
      <div className={cn("space-y-2", className)}>
        <div className="relative">
          <Input
            ref={ref}
            type="number"
            value={value}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="pr-8 text-right"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            %
          </span>
        </div>
        
        {showSlider && (
          <Slider
            value={[value]}
            onValueChange={handleSliderChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="py-2"
          />
        )}
      </div>
    );
  }
);

PercentInput.displayName = 'PercentInput';
```

### 6.8 FileUpload Component

Component pentru încărcare fișiere cu drag & drop.

```typescript
// src/components/forms/FileUpload.tsx
import { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
}

export interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  files?: UploadedFile[];
  onUpload?: (files: File[]) => void;
  onRemove?: (fileId: string) => void;
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  if (type.includes('pdf') || type.includes('document')) return FileText;
  return File;
};

export function FileUpload({
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5,
  multiple = true,
  disabled = false,
  files = [],
  onUpload,
  onRemove,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (fileList: FileList | File[]): File[] => {
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    const remainingSlots = maxFiles - files.length;
    const filesToProcess = Array.from(fileList).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (maxSize && file.size > maxSize) {
        errors.push(`${file.name}: Fișier prea mare (max ${formatFileSize(maxSize)})`);
        return;
      }
      
      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim());
        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          if (type.endsWith('/*')) {
            return file.type.startsWith(type.replace('/*', '/'));
          }
          return file.type === type;
        });
        
        if (!isAccepted) {
          errors.push(`${file.name}: Tip de fișier neacceptat`);
          return;
        }
      }
      
      validFiles.push(file);
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
      setTimeout(() => setError(null), 5000);
    }

    return validFiles;
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    const validFiles = validateFiles(droppedFiles);
    
    if (validFiles.length > 0) {
      onUpload?.(validFiles);
    }
  }, [disabled, onUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const validFiles = validateFiles(e.target.files);
      if (validFiles.length > 0) {
        onUpload?.(validFiles);
      }
    }
    // Reset input
    e.target.value = '';
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
          "flex flex-col items-center justify-center gap-2 text-center",
          isDragging && "border-primary bg-primary/5",
          !isDragging && "border-muted-foreground/25 hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />
        
        <Upload className={cn(
          "h-10 w-10",
          isDragging ? "text-primary" : "text-muted-foreground"
        )} />
        
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {isDragging ? 'Eliberează pentru a încărca' : 'Trage fișiere aici sau click pentru a selecta'}
          </p>
          <p className="text-xs text-muted-foreground">
            {accept && `Tipuri acceptate: ${accept}`}
            {maxSize && ` • Max ${formatFileSize(maxSize)}`}
            {maxFiles > 1 && ` • Max ${maxFiles} fișiere`}
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.type);
            
            return (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  file.status === 'error' && "border-destructive/50 bg-destructive/5"
                )}
              >
                <FileIcon className="h-8 w-8 text-muted-foreground shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                    {file.error && (
                      <span className="text-destructive ml-2">{file.error}</span>
                    )}
                  </p>
                  
                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="h-1 mt-2" />
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove?.(file.id)}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## 7. Feedback Components

### 7.1 LoadingSpinner Component

Indicator de încărcare cu multiple variante.

```typescript
// src/components/feedback/LoadingSpinner.tsx
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'muted';
  label?: string;
  centered?: boolean;
  fullScreen?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const variantClasses = {
  default: 'text-foreground',
  primary: 'text-primary',
  secondary: 'text-secondary',
  muted: 'text-muted-foreground',
};

export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  label,
  centered = false,
  fullScreen = false,
  className,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn(
      "flex flex-col items-center gap-3",
      centered && "justify-center",
      fullScreen && "fixed inset-0 bg-background/80 backdrop-blur-sm z-50",
      className
    )}>
      <Loader2 
        className={cn(
          "animate-spin",
          sizeClasses[size],
          variantClasses[variant]
        )} 
      />
      {label && (
        <span className="text-sm text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );

  if (centered || fullScreen) {
    return (
      <div className={cn(
        "flex items-center justify-center",
        fullScreen ? "fixed inset-0" : "w-full h-full min-h-[200px]"
      )}>
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Skeleton variants for loading states
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-muted", className)} />
  );
}

export function LoadingCard() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <LoadingSkeleton className="h-4 w-3/4" />
      <LoadingSkeleton className="h-4 w-1/2" />
      <LoadingSkeleton className="h-8 w-full" />
    </div>
  );
}

export function LoadingTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border">
      <div className="border-b p-4">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4 border-b last:border-b-0">
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <LoadingSkeleton key={colIndex} className="h-4 flex-1" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 7.2 Toast Component

Sistem de notificări toast.

```typescript
// src/components/feedback/ToastProvider.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Convenience hooks
export function useSuccessToast() {
  const { addToast } = useToast();
  return useCallback((title: string, description?: string) => {
    addToast({ type: 'success', title, description });
  }, [addToast]);
}

export function useErrorToast() {
  const { addToast } = useToast();
  return useCallback((title: string, description?: string) => {
    addToast({ type: 'error', title, description, duration: 6000 });
  }, [addToast]);
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const newToast = { ...toast, id };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration || 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-96">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = icons[toast.type];
            
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.95 }}
                className={cn(
                  "relative flex items-start gap-3 rounded-lg border p-4 shadow-lg",
                  styles[toast.type]
                )}
              >
                <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-1 text-sm opacity-90">{toast.description}</p>
                  )}
                  {toast.action && (
                    <button
                      onClick={toast.action.onClick}
                      className="mt-2 text-sm font-medium underline hover:no-underline"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>
                
                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
```

### 7.3 ConfirmDialog Component

Dialog de confirmare pentru acțiuni destructive.

```typescript
// src/components/feedback/ConfirmDialog.tsx
import { ReactNode, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2, AlertTriangle, Trash2, LogOut, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive' | 'warning';
  icon?: ReactNode;
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
}

const variantConfig = {
  default: {
    icon: <AlertTriangle className="h-6 w-6 text-primary" />,
    buttonVariant: 'default' as ButtonProps['variant'],
  },
  destructive: {
    icon: <Trash2 className="h-6 w-6 text-destructive" />,
    buttonVariant: 'destructive' as ButtonProps['variant'],
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
    buttonVariant: 'default' as ButtonProps['variant'],
  },
};

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirmă',
  cancelLabel = 'Anulează',
  variant = 'default',
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const config = variantConfig[variant];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (error) {
      // Error handling is done by the caller
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-4">
            {icon || config.icon}
            <div>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Preset dialogs
export function DeleteConfirmDialog({
  trigger,
  itemName,
  onConfirm,
}: {
  trigger: ReactNode;
  itemName: string;
  onConfirm: () => Promise<void> | void;
}) {
  return (
    <ConfirmDialog
      trigger={trigger}
      title={`Șterge ${itemName}`}
      description={`Ești sigur că vrei să ștergi acest ${itemName}? Această acțiune nu poate fi anulată.`}
      confirmLabel="Șterge"
      variant="destructive"
      onConfirm={onConfirm}
    />
  );
}

export function LogoutConfirmDialog({
  trigger,
  onConfirm,
}: {
  trigger: ReactNode;
  onConfirm: () => Promise<void> | void;
}) {
  return (
    <ConfirmDialog
      trigger={trigger}
      title="Deconectare"
      description="Ești sigur că vrei să te deconectezi din aplicație?"
      confirmLabel="Deconectează-te"
      icon={<LogOut className="h-6 w-6 text-muted-foreground" />}
      onConfirm={onConfirm}
    />
  );
}
```

### 7.4 ErrorBoundary Component

Error boundary pentru capturarea erorilor în componente.

```typescript
// src/components/feedback/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log to error tracking service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle>Ceva nu a funcționat</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                A apărut o eroare neașteptată. Te rugăm să încerci din nou sau să revii la pagina principală.
              </p>
              
              {this.props.showDetails && this.state.error && (
                <details className="mt-4">
                  <summary className="text-sm font-medium cursor-pointer">
                    Detalii tehnice
                  </summary>
                  <pre className="mt-2 p-3 rounded bg-muted text-xs overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button onClick={this.handleRetry} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Încearcă din nou
              </Button>
              <Button onClick={this.handleGoHome} variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Pagina principală
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use with hooks
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
```

### 7.5 AlertBanner Component

Banner pentru alerte și notificări importante.

```typescript
// src/components/feedback/AlertBanner.tsx
import { ReactNode, useState } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AlertBannerProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
    external?: boolean;
  };
  icon?: ReactNode;
  className?: string;
}

const typeStyles = {
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: <Info className="h-5 w-5" />,
  },
  success: {
    container: 'bg-green-50 border-green-200 text-green-800',
    icon: <CheckCircle className="h-5 w-5" />,
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: <AlertCircle className="h-5 w-5" />,
  },
};

export function AlertBanner({
  type = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  action,
  icon,
  className,
}: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const styles = typeStyles[type];

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-lg border p-4",
        styles.container,
        className
      )}
      role="alert"
    >
      <div className="shrink-0 mt-0.5">
        {icon || styles.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-medium mb-1">{title}</h4>
        )}
        <div className="text-sm opacity-90">
          {children}
        </div>
        
        {action && (
          <Button
            variant="link"
            size="sm"
            onClick={action.onClick}
            className="h-auto p-0 mt-2 font-medium"
          >
            {action.label}
            {action.external && <ExternalLink className="ml-1 h-3 w-3" />}
          </Button>
        )}
      </div>

      {dismissible && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-6 w-6 opacity-70 hover:opacity-100"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Închide</span>
        </Button>
      )}
    </div>
  );
}

// Preset banners
export function MaintenanceBanner({ scheduledTime }: { scheduledTime: string }) {
  return (
    <AlertBanner type="warning" title="Întreținere programată">
      Sistemul va fi indisponibil pentru întreținere pe {scheduledTime}.
      Te rugăm să salvezi toate modificările înainte de această oră.
    </AlertBanner>
  );
}

export function TrialExpiringBanner({ daysLeft, onUpgrade }: { daysLeft: number; onUpgrade: () => void }) {
  return (
    <AlertBanner
      type="info"
      title="Perioada de probă se încheie curând"
      action={{ label: 'Upgrade acum', onClick: onUpgrade }}
      dismissible
    >
      Mai ai {daysLeft} {daysLeft === 1 ? 'zi' : 'zile'} din perioada de probă gratuită.
    </AlertBanner>
  );
}
```

### 7.6 Tooltip Component (Extended)

Tooltip extins cu suport pentru conținut complex.

```typescript
// src/components/feedback/TooltipExtended.tsx
import { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface TooltipExtendedProps {
  children: ReactNode;
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  className?: string;
  contentClassName?: string;
  asChild?: boolean;
}

export function TooltipExtended({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration = 200,
  className,
  contentClassName,
  asChild = true,
}: TooltipExtendedProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild={asChild} className={className}>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align={align} className={contentClassName}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Info tooltip with icon
export function InfoTooltip({
  content,
  iconClassName,
}: {
  content: ReactNode;
  iconClassName?: string;
}) {
  return (
    <TooltipExtended
      content={<div className="max-w-xs">{content}</div>}
      side="top"
    >
      <span className={cn("text-muted-foreground cursor-help", iconClassName)}>
        ⓘ
      </span>
    </TooltipExtended>
  );
}

// Truncated text with full tooltip
export function TruncatedWithTooltip({
  text,
  maxLength = 50,
  className,
}: {
  text: string;
  maxLength?: number;
  className?: string;
}) {
  if (text.length <= maxLength) {
    return <span className={className}>{text}</span>;
  }

  return (
    <TooltipExtended content={text}>
      <span className={cn("truncate cursor-default", className)}>
        {text.slice(0, maxLength)}...
      </span>
    </TooltipExtended>
  );
}
```

---

## 8. Chart Components

### 8.1 AreaChartCard Component

Card cu area chart pentru trend-uri.

```typescript
// src/components/charts/AreaChartCard.tsx
import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface AreaChartDataPoint {
  date: string | Date;
  [key: string]: any;
}

export interface AreaChartSeries {
  key: string;
  name: string;
  color: string;
  gradient?: boolean;
}

export interface AreaChartCardProps {
  title: string;
  description?: string;
  data: AreaChartDataPoint[];
  series: AreaChartSeries[];
  height?: number;
  stacked?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  valueFormatter,
}: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-sm font-medium mb-2">
        {format(new Date(label), 'd MMMM yyyy', { locale: ro })}
      </p>
      <div className="space-y-1">
        {payload.map((item: any) => (
          <div key={item.dataKey} className="flex items-center gap-2 text-sm">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.name}:</span>
            <span className="font-medium">
              {valueFormatter ? valueFormatter(item.value) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function AreaChartCard({
  title,
  description,
  data,
  series,
  height = 300,
  stacked = false,
  showGrid = true,
  showLegend = true,
  valueFormatter,
  className,
}: AreaChartCardProps) {
  const formattedData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      date: typeof item.date === 'string' ? item.date : item.date.toISOString(),
    }));
  }, [data]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={formattedData}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            )}
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'd MMM', { locale: ro })}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={valueFormatter}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
            {showLegend && <Legend />}
            
            {/* Gradients */}
            <defs>
              {series.filter(s => s.gradient !== false).map((s) => (
                <linearGradient key={`gradient-${s.key}`} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            
            {/* Areas */}
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                fill={s.gradient !== false ? `url(#gradient-${s.key})` : s.color}
                fillOpacity={s.gradient !== false ? 1 : 0.3}
                strokeWidth={2}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### 8.2 PieChartCard Component

Card cu pie chart pentru distribuții.

```typescript
// src/components/charts/PieChartCard.tsx
import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface PieChartDataPoint {
  name: string;
  value: number;
  color: string;
}

export interface PieChartCardProps {
  title: string;
  description?: string;
  data: PieChartDataPoint[];
  height?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  valueFormatter?: (value: number) => string;
  className?: string;
}

const CustomTooltip = ({ active, payload, valueFormatter }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0];
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <div className="flex items-center gap-2">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: data.payload.color }}
        />
        <span className="font-medium">{data.name}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {valueFormatter ? valueFormatter(data.value) : data.value}
      </p>
    </div>
  );
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function PieChartCard({
  title,
  description,
  data,
  height = 300,
  showLegend = true,
  showLabels = false,
  innerRadius = 60,
  outerRadius = 100,
  valueFormatter,
  className,
}: PieChartCardProps) {
  const total = useMemo(() => data.reduce((acc, item) => acc + item.value, 0), [data]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              label={showLabels ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : undefined}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
            {showLegend && <Legend content={<CustomLegend />} />}
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center label for donut */}
        {innerRadius > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {valueFormatter ? valueFormatter(total) : total}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 8.3 BarChartCard Component

Card cu bar chart pentru comparații.

```typescript
// src/components/charts/BarChartCard.tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export interface BarChartDataPoint {
  name: string;
  [key: string]: any;
}

export interface BarChartSeries {
  key: string;
  name: string;
  color: string;
}

export interface BarChartCardProps {
  title: string;
  description?: string;
  data: BarChartDataPoint[];
  series: BarChartSeries[];
  height?: number;
  layout?: 'horizontal' | 'vertical';
  stacked?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

const CustomTooltip = ({ active, payload, label, valueFormatter }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((item: any) => (
          <div key={item.dataKey} className="flex items-center gap-2 text-sm">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.name}:</span>
            <span className="font-medium">
              {valueFormatter ? valueFormatter(item.value) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function BarChartCard({
  title,
  description,
  data,
  series,
  height = 300,
  layout = 'horizontal',
  stacked = false,
  showGrid = true,
  showLegend = true,
  valueFormatter,
  className,
}: BarChartCardProps) {
  const isVertical = layout === 'vertical';

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout={isVertical ? 'vertical' : 'horizontal'}
          >
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            )}
            
            {isVertical ? (
              <>
                <XAxis type="number" tickFormatter={valueFormatter} tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={valueFormatter} tick={{ fontSize: 12 }} />
              </>
            )}
            
            <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
            {showLegend && series.length > 1 && <Legend />}
            
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### 8.4 LineChartCard Component

Card cu line chart pentru evoluții.

```typescript
// src/components/charts/LineChartCard.tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

export interface LineChartSeries {
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
}

export interface LineChartCardProps {
  title: string;
  description?: string;
  data: Array<{ date: string | Date; [key: string]: any }>;
  series: LineChartSeries[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showDots?: boolean;
  referenceLine?: { value: number; label: string; color?: string };
  valueFormatter?: (value: number) => string;
  className?: string;
}

export function LineChartCard({
  title,
  description,
  data,
  series,
  height = 300,
  showGrid = true,
  showLegend = true,
  showDots = false,
  referenceLine,
  valueFormatter,
  className,
}: LineChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            )}
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'd MMM', { locale: ro })}
              tick={{ fontSize: 12 }}
            />
            <YAxis tickFormatter={valueFormatter} tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(value) => format(new Date(value), 'd MMMM yyyy', { locale: ro })}
              formatter={(value: number) => valueFormatter ? valueFormatter(value) : value}
            />
            {showLegend && <Legend />}
            
            {referenceLine && (
              <ReferenceLine
                y={referenceLine.value}
                label={referenceLine.label}
                stroke={referenceLine.color || '#888'}
                strokeDasharray="5 5"
              />
            )}
            
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? '5 5' : undefined}
                dot={showDots}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### 8.5 MetricSparkline Component

Mini chart inline pentru metrics.

```typescript
// src/components/charts/MetricSparkline.tsx
import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricSparklineProps {
  data: number[];
  trend?: number;
  width?: number;
  height?: number;
  color?: string;
  showTrendIcon?: boolean;
  className?: string;
}

export function MetricSparkline({
  data,
  trend,
  width = 80,
  height = 30,
  color,
  showTrendIcon = true,
  className,
}: MetricSparklineProps) {
  const chartData = useMemo(() => {
    return data.map((value, index) => ({ value, index }));
  }, [data]);

  const trendType = useMemo(() => {
    if (trend === undefined) return 'neutral';
    if (trend > 0) return 'up';
    if (trend < 0) return 'down';
    return 'neutral';
  }, [trend]);

  const chartColor = color || {
    up: '#22c55e',
    down: '#ef4444',
    neutral: '#6b7280',
  }[trendType];

  const TrendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  }[trendType];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div style={{ width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`sparkline-gradient-${chartColor}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              fill={`url(#sparkline-gradient-${chartColor})`}
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {showTrendIcon && trend !== undefined && (
        <div className={cn(
          "flex items-center gap-0.5 text-xs font-medium",
          trendType === 'up' && "text-green-600",
          trendType === 'down' && "text-red-600",
          trendType === 'neutral' && "text-gray-500"
        )}>
          <TrendIcon className="h-3 w-3" />
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
  );
}
```

---

## 9. AI-Specific Components

### 9.1 ChatMessage Component

Componentă pentru afișarea mesajelor în conversații AI.

```typescript
// src/components/ai/ChatMessage.tsx
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Bot, User, AlertCircle, RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { Avatar } from '@/components/data-display/Avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChatMessageProps {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date | string;
  senderName?: string;
  senderAvatar?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'error';
  guardrailsResult?: {
    passed: boolean;
    violations?: string[];
    regenerations?: number;
  };
  sentiment?: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
  };
  intent?: string;
  metadata?: Record<string, any>;
  onRetry?: () => void;
  className?: string;
}

const sentimentColors = {
  positive: 'bg-green-100 text-green-800',
  neutral: 'bg-gray-100 text-gray-800',
  negative: 'bg-red-100 text-red-800',
};

export function ChatMessage({
  id,
  content,
  role,
  timestamp,
  senderName,
  senderAvatar,
  status,
  guardrailsResult,
  sentiment,
  intent,
  metadata,
  onRetry,
  className,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';
  
  const formattedTime = useMemo(() => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatDistanceToNow(date, { addSuffix: true, locale: ro });
  }, [timestamp]);

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-muted/50 rounded-lg px-4 py-2 text-sm text-muted-foreground">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-3",
      isUser ? "flex-row-reverse" : "flex-row",
      className
    )}>
      {/* Avatar */}
      <div className="shrink-0">
        {isUser ? (
          <Avatar
            src={senderAvatar}
            name={senderName || 'User'}
            size="sm"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Message content */}
      <div className={cn(
        "flex flex-col max-w-[70%]",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center gap-2 mb-1",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          <span className="text-sm font-medium">
            {isUser ? (senderName || 'Tu') : 'AI Agent'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formattedTime}
          </span>
        </div>

        {/* Bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-2",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-muted rounded-tl-sm"
        )}>
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>

        {/* Footer - Status & Metadata */}
        <div className={cn(
          "flex flex-wrap items-center gap-2 mt-1",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          {/* Status */}
          {status && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {status === 'sending' && <Clock className="h-3 w-3 animate-pulse" />}
              {status === 'sent' && <CheckCircle className="h-3 w-3" />}
              {status === 'delivered' && <CheckCircle className="h-3 w-3 text-primary" />}
              {status === 'error' && (
                <>
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  <span className="text-destructive">Eroare</span>
                  {onRetry && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={onRetry}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reîncearcă
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Sentiment badge */}
          {sentiment && !isUser && (
            <Badge 
              variant="outline" 
              className={cn("text-xs", sentimentColors[sentiment.label])}
            >
              {sentiment.label === 'positive' && '😊'}
              {sentiment.label === 'neutral' && '😐'}
              {sentiment.label === 'negative' && '😟'}
              {sentiment.score.toFixed(2)}
            </Badge>
          )}

          {/* Intent */}
          {intent && !isUser && (
            <Badge variant="outline" className="text-xs">
              🎯 {intent}
            </Badge>
          )}

          {/* Guardrails warning */}
          {guardrailsResult && !guardrailsResult.passed && (
            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
              ⚠️ Regenerat {guardrailsResult.regenerations}x
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 9.2 SentimentIndicator Component

Indicator vizual pentru sentiment.

```typescript
// src/components/ai/SentimentIndicator.tsx
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface SentimentIndicatorProps {
  score: number; // -1 to 1
  label?: 'positive' | 'neutral' | 'negative';
  showLabel?: boolean;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 text-xs',
  md: 'h-6 w-6 text-sm',
  lg: 'h-8 w-8 text-base',
};

export function SentimentIndicator({
  score,
  label: providedLabel,
  showLabel = false,
  showScore = false,
  size = 'md',
  className,
}: SentimentIndicatorProps) {
  // Derive label from score if not provided
  const label = providedLabel || (
    score > 0.2 ? 'positive' : 
    score < -0.2 ? 'negative' : 
    'neutral'
  );

  const emoji = {
    positive: '😊',
    neutral: '😐',
    negative: '😟',
  }[label];

  const color = {
    positive: 'text-green-600 bg-green-100',
    neutral: 'text-gray-600 bg-gray-100',
    negative: 'text-red-600 bg-red-100',
  }[label];

  const labelText = {
    positive: 'Pozitiv',
    neutral: 'Neutru',
    negative: 'Negativ',
  }[label];

  const normalizedScore = ((score + 1) / 2) * 100; // Convert -1..1 to 0..100

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1.5", className)}>
            <div className={cn(
              "rounded-full flex items-center justify-center",
              sizeClasses[size],
              color
            )}>
              {emoji}
            </div>
            
            {showLabel && (
              <span className="text-sm font-medium">{labelText}</span>
            )}
            
            {showScore && (
              <span className="text-sm text-muted-foreground">
                ({(score * 100).toFixed(0)}%)
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">Sentiment: {labelText}</p>
            <p className="text-sm text-muted-foreground">
              Scor: {score.toFixed(2)} ({normalizedScore.toFixed(0)}%)
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Sentiment evolution mini chart
export function SentimentTrend({
  scores,
  className,
}: {
  scores: number[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-end gap-0.5 h-6", className)}>
      {scores.map((score, index) => {
        const height = ((score + 1) / 2) * 100; // Convert -1..1 to 0..100%
        const color = score > 0.2 ? 'bg-green-500' : score < -0.2 ? 'bg-red-500' : 'bg-gray-400';
        
        return (
          <div
            key={index}
            className={cn("w-1 rounded-t", color)}
            style={{ height: `${Math.max(height, 10)}%` }}
          />
        );
      })}
    </div>
  );
}
```

### 9.3 GuardrailsBadge Component

Badge pentru status guardrails.

```typescript
// src/components/ai/GuardrailsBadge.tsx
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface GuardrailsResult {
  status: 'passed' | 'warned' | 'blocked' | 'regenerated';
  category?: string;
  ruleName?: string;
  violations?: string[];
  regenerations?: number;
  latencyMs?: number;
}

export interface GuardrailsBadgeProps {
  result: GuardrailsResult;
  showDetails?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig = {
  passed: {
    icon: ShieldCheck,
    color: 'bg-green-100 text-green-800 border-green-200',
    label: 'Validat',
  },
  warned: {
    icon: ShieldAlert,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    label: 'Atenționare',
  },
  blocked: {
    icon: ShieldX,
    color: 'bg-red-100 text-red-800 border-red-200',
    label: 'Blocat',
  },
  regenerated: {
    icon: RefreshCw,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    label: 'Regenerat',
  },
};

export function GuardrailsBadge({
  result,
  showDetails = false,
  size = 'sm',
  className,
}: GuardrailsBadgeProps) {
  const config = statusConfig[result.status];
  const Icon = config.icon;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        config.color,
        size === 'sm' && "text-xs px-1.5 py-0",
        className
      )}
    >
      <Icon className={cn(size === 'sm' ? "h-3 w-3" : "h-4 w-4")} />
      <span>{config.label}</span>
      {result.regenerations && result.regenerations > 0 && (
        <span className="font-bold">({result.regenerations}x)</span>
      )}
    </Badge>
  );

  if (!showDetails) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{config.label}</span>
              {result.latencyMs && (
                <span className="text-xs text-muted-foreground">
                  {result.latencyMs}ms
                </span>
              )}
            </div>
            
            {result.category && (
              <p className="text-sm">
                <span className="text-muted-foreground">Categorie:</span> {result.category}
              </p>
            )}
            
            {result.ruleName && (
              <p className="text-sm">
                <span className="text-muted-foreground">Regulă:</span> {result.ruleName}
              </p>
            )}
            
            {result.violations && result.violations.length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Încălcări:</span>
                <ul className="mt-1 list-disc list-inside">
                  {result.violations.map((v, i) => (
                    <li key={i} className="text-xs">{v}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### 9.4 AIStatusIndicator Component

Indicator pentru statusul AI agent-ului.

```typescript
// src/components/ai/AIStatusIndicator.tsx
import { Badge } from '@/components/ui/badge';
import { Bot, User, Pause, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AIStatus = 
  | 'active'           // AI handles conversation
  | 'paused'           // AI paused temporarily
  | 'human_takeover'   // Human operator took over
  | 'error'            // AI error state
  | 'processing';      // AI processing response

export interface AIStatusIndicatorProps {
  status: AIStatus;
  operatorName?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const statusConfig = {
  active: {
    icon: Bot,
    label: 'AI Activ',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
  },
  paused: {
    icon: Pause,
    label: 'AI Pauză',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    dot: 'bg-gray-500',
  },
  human_takeover: {
    icon: User,
    label: 'Operator',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
  error: {
    icon: AlertCircle,
    label: 'Eroare',
    color: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
  processing: {
    icon: Loader2,
    label: 'Procesare',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
  },
};

const sizeClasses = {
  sm: { badge: 'text-xs px-1.5 py-0', icon: 'h-3 w-3', dot: 'h-1.5 w-1.5' },
  md: { badge: 'text-sm px-2 py-0.5', icon: 'h-4 w-4', dot: 'h-2 w-2' },
  lg: { badge: 'text-base px-3 py-1', icon: 'h-5 w-5', dot: 'h-2.5 w-2.5' },
};

export function AIStatusIndicator({
  status,
  operatorName,
  size = 'md',
  showLabel = true,
  className,
}: AIStatusIndicatorProps) {
  const config = statusConfig[status];
  const sizes = sizeClasses[size];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        config.color,
        sizes.badge,
        className
      )}
    >
      {/* Pulsing dot for active states */}
      {(status === 'active' || status === 'processing') && (
        <span className="relative flex">
          <span className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
            config.dot
          )} />
          <span className={cn("relative inline-flex rounded-full", config.dot, sizes.dot)} />
        </span>
      )}
      
      <Icon className={cn(
        sizes.icon,
        status === 'processing' && "animate-spin"
      )} />
      
      {showLabel && (
        <span>
          {status === 'human_takeover' && operatorName 
            ? operatorName 
            : config.label
          }
        </span>
      )}
    </Badge>
  );
}
```

---

## 10. HITL Components

### 10.1 ApprovalCard Component

Card pentru afișarea unei cereri de aprobare.

```typescript
// src/components/hitl/ApprovalCard.tsx
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  MessageSquare,
  DollarSign,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/data-display/Avatar';
import { cn } from '@/lib/utils';

export interface ApprovalRequest {
  id: string;
  type: 'discount' | 'price' | 'credit' | 'custom';
  title: string;
  description: string;
  requestedBy: {
    name: string;
    avatar?: string;
  };
  requestedAt: Date | string;
  slaDeadline: Date | string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata: {
    negotiationId?: string;
    clientName?: string;
    productName?: string;
    requestedValue?: number;
    currentValue?: number;
    percentChange?: number;
  };
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';
}

export interface ApprovalCardProps {
  request: ApprovalRequest;
  onApprove?: () => void;
  onReject?: () => void;
  onViewDetails?: () => void;
  loading?: boolean;
  className?: string;
}

const priorityConfig = {
  low: { color: 'bg-gray-100 text-gray-800', label: 'Scăzut' },
  medium: { color: 'bg-blue-100 text-blue-800', label: 'Mediu' },
  high: { color: 'bg-orange-100 text-orange-800', label: 'Ridicat' },
  urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' },
};

const typeConfig = {
  discount: { icon: Percent, label: 'Discount' },
  price: { icon: DollarSign, label: 'Preț' },
  credit: { icon: DollarSign, label: 'Credit' },
  custom: { icon: MessageSquare, label: 'Altele' },
};

export function ApprovalCard({
  request,
  onApprove,
  onReject,
  onViewDetails,
  loading = false,
  className,
}: ApprovalCardProps) {
  const priority = priorityConfig[request.priority];
  const type = typeConfig[request.type];
  const TypeIcon = type.icon;
  
  const deadline = typeof request.slaDeadline === 'string' 
    ? new Date(request.slaDeadline) 
    : request.slaDeadline;
  const hoursUntilDeadline = differenceInHours(deadline, new Date());
  const isUrgent = hoursUntilDeadline < 2;
  const isOverdue = hoursUntilDeadline < 0;

  const isPending = request.status === 'pending';

  return (
    <Card className={cn(
      "transition-shadow hover:shadow-md",
      isOverdue && isPending && "border-red-300 bg-red-50/50",
      isUrgent && !isOverdue && isPending && "border-orange-300 bg-orange-50/50",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "rounded-full p-2",
              request.type === 'discount' && "bg-purple-100",
              request.type === 'price' && "bg-blue-100",
              request.type === 'credit' && "bg-green-100",
              request.type === 'custom' && "bg-gray-100"
            )}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium">{request.title}</h3>
              <p className="text-sm text-muted-foreground">{type.label}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={priority.color}>{priority.label}</Badge>
            {isPending && (
              <Badge 
                variant="outline"
                className={cn(
                  isOverdue && "border-red-500 text-red-600",
                  isUrgent && !isOverdue && "border-orange-500 text-orange-600"
                )}
              >
                <Clock className="h-3 w-3 mr-1" />
                {isOverdue 
                  ? 'Depășit'
                  : formatDistanceToNow(deadline, { locale: ro })
                }
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground mb-3">
          {request.description}
        </p>
        
        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {request.metadata.clientName && (
            <div>
              <span className="text-muted-foreground">Client:</span>{' '}
              <span className="font-medium">{request.metadata.clientName}</span>
            </div>
          )}
          {request.metadata.productName && (
            <div>
              <span className="text-muted-foreground">Produs:</span>{' '}
              <span className="font-medium">{request.metadata.productName}</span>
            </div>
          )}
          {request.metadata.requestedValue !== undefined && (
            <div>
              <span className="text-muted-foreground">Solicitat:</span>{' '}
              <span className="font-medium text-primary">
                {request.type === 'discount' 
                  ? `${request.metadata.requestedValue}%`
                  : `${request.metadata.requestedValue.toLocaleString('ro-RO')} RON`
                }
              </span>
            </div>
          )}
          {request.metadata.currentValue !== undefined && (
            <div>
              <span className="text-muted-foreground">Curent:</span>{' '}
              <span className="font-medium">
                {request.type === 'discount'
                  ? `${request.metadata.currentValue}%`
                  : `${request.metadata.currentValue.toLocaleString('ro-RO')} RON`
                }
              </span>
            </div>
          )}
        </div>

        {/* Requester */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <Avatar 
            src={request.requestedBy.avatar} 
            name={request.requestedBy.name}
            size="xs"
          />
          <span className="text-sm text-muted-foreground">
            Solicitat de {request.requestedBy.name}{' '}
            {formatDistanceToNow(
              typeof request.requestedAt === 'string' 
                ? new Date(request.requestedAt) 
                : request.requestedAt,
              { addSuffix: true, locale: ro }
            )}
          </span>
        </div>
      </CardContent>

      {isPending && (
        <CardFooter className="gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={onApprove}
            disabled={loading}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Aprobă
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onReject}
            disabled={loading}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Respinge
          </Button>
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetails}
              disabled={loading}
            >
              Detalii
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
```

### 10.2 EscalationAlert Component

Alertă pentru escalări urgente.

```typescript
// src/components/hitl/EscalationAlert.tsx
import { AlertTriangle, Clock, User, ArrowRight, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface Escalation {
  id: string;
  conversationId: string;
  reason: string;
  triggeredAt: Date | string;
  escalatedFrom?: string;
  escalatedTo?: string;
  clientName: string;
  urgency: 'normal' | 'high' | 'critical';
  context?: string;
}

export interface EscalationAlertProps {
  escalation: Escalation;
  onTakeover?: () => void;
  onView?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const urgencyConfig = {
  normal: {
    variant: 'default' as const,
    badge: 'bg-blue-100 text-blue-800',
    icon: 'text-blue-600',
  },
  high: {
    variant: 'default' as const,
    badge: 'bg-orange-100 text-orange-800',
    icon: 'text-orange-600',
  },
  critical: {
    variant: 'destructive' as const,
    badge: 'bg-red-100 text-red-800',
    icon: 'text-red-600',
  },
};

export function EscalationAlert({
  escalation,
  onTakeover,
  onView,
  onDismiss,
  className,
}: EscalationAlertProps) {
  const config = urgencyConfig[escalation.urgency];
  const triggeredAt = typeof escalation.triggeredAt === 'string'
    ? new Date(escalation.triggeredAt)
    : escalation.triggeredAt;

  return (
    <Alert 
      variant={config.variant}
      className={cn("relative", className)}
    >
      <AlertTriangle className={cn("h-4 w-4", config.icon)} />
      <AlertTitle className="flex items-center justify-between">
        <span>Escalare: {escalation.clientName}</span>
        <div className="flex items-center gap-2">
          <Badge className={config.badge}>
            {escalation.urgency === 'critical' ? 'Critic' :
             escalation.urgency === 'high' ? 'Urgent' : 'Normal'}
          </Badge>
          <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(triggeredAt, { addSuffix: true, locale: ro })}
          </span>
        </div>
      </AlertTitle>
      <AlertDescription>
        <p className="mb-2">{escalation.reason}</p>
        
        {escalation.context && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            "{escalation.context}"
          </p>
        )}

        {(escalation.escalatedFrom || escalation.escalatedTo) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            {escalation.escalatedFrom && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {escalation.escalatedFrom}
              </span>
            )}
            {escalation.escalatedFrom && escalation.escalatedTo && (
              <ArrowRight className="h-3 w-3" />
            )}
            {escalation.escalatedTo && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {escalation.escalatedTo}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {onTakeover && (
            <Button size="sm" onClick={onTakeover}>
              <User className="h-4 w-4 mr-1" />
              Preia conversația
            </Button>
          )}
          {onView && (
            <Button size="sm" variant="outline" onClick={onView}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Vezi conversația
            </Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Închide
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

### 10.3 TakeoverPanel Component

Panou pentru preluarea conversațiilor.

```typescript
// src/components/hitl/TakeoverPanel.tsx
import { useState } from 'react';
import { Bot, User, Play, Pause, Send, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AIStatusIndicator, AIStatus } from '@/components/ai/AIStatusIndicator';
import { cn } from '@/lib/utils';

export interface TakeoverPanelProps {
  conversationId: string;
  currentStatus: AIStatus;
  onTakeover: () => Promise<void>;
  onResume: () => Promise<void>;
  onSendMessage: (message: string) => Promise<void>;
  onToggleSuggestions: (enabled: boolean) => void;
  suggestionsEnabled?: boolean;
  suggestedResponse?: string;
  className?: string;
}

export function TakeoverPanel({
  conversationId,
  currentStatus,
  onTakeover,
  onResume,
  onSendMessage,
  onToggleSuggestions,
  suggestionsEnabled = true,
  suggestedResponse,
  className,
}: TakeoverPanelProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isHumanMode = currentStatus === 'human_takeover';

  const handleTakeover = async () => {
    setLoading(true);
    try {
      await onTakeover();
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      await onResume();
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      await onSendMessage(message);
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  const handleUseSuggestion = () => {
    if (suggestedResponse) {
      setMessage(suggestedResponse);
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Control conversație
          </CardTitle>
          <AIStatusIndicator status={currentStatus} size="sm" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Takeover/Resume buttons */}
        <div className="flex gap-2">
          {!isHumanMode ? (
            <Button 
              className="flex-1" 
              onClick={handleTakeover}
              disabled={loading}
            >
              <User className="h-4 w-4 mr-2" />
              Preia manual
            </Button>
          ) : (
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={handleResume}
              disabled={loading}
            >
              <Bot className="h-4 w-4 mr-2" />
              Redă AI-ului
            </Button>
          )}
        </div>

        {/* Message input (only in human mode) */}
        {isHumanMode && (
          <div className="space-y-3">
            {/* AI suggestions toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="suggestions" className="text-sm">
                Sugestii AI
              </Label>
              <Switch
                id="suggestions"
                checked={suggestionsEnabled}
                onCheckedChange={onToggleSuggestions}
              />
            </div>

            {/* Suggested response */}
            {suggestionsEnabled && suggestedResponse && (
              <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    <Bot className="h-3 w-3 mr-1" />
                    Sugestie AI
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleUseSuggestion}
                  >
                    Folosește
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {suggestedResponse}
                </p>
              </div>
            )}

            {/* Message textarea */}
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Scrie un mesaj..."
              rows={3}
              className="resize-none"
            />

            <Button 
              className="w-full"
              onClick={handleSend}
              disabled={!message.trim() || loading}
            >
              <Send className="h-4 w-4 mr-2" />
              Trimite mesaj
            </Button>
          </div>
        )}

        {/* Status info */}
        <div className="text-xs text-muted-foreground text-center">
          {isHumanMode 
            ? 'Conversația este în modul manual. AI-ul nu va răspunde automat.'
            : 'AI-ul gestionează această conversație. Poți prelua manual oricând.'
          }
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 11. Document Components

Componente pentru vizualizare și gestionare documente: facturi, proforma, avize, PDF-uri.

### 11.1 PDFViewer Component

Vizualizator PDF integrat cu zoom, download și printare.

```typescript
// components/documents/PDFViewer.tsx
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { 
  Download, 
  Printer, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight,
  RotateCw,
  Maximize2,
  Loader2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
  filename?: string;
  className?: string;
  initialPage?: number;
  initialScale?: number;
  showToolbar?: boolean;
  showSidebar?: boolean;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
  onPageChange?: (page: number) => void;
}

interface PDFDocumentProxy {
  numPages: number;
}

export function PDFViewer({
  url,
  filename = 'document.pdf',
  className,
  initialPage = 1,
  initialScale = 1.0,
  showToolbar = true,
  showSidebar = false,
  onLoadSuccess,
  onLoadError,
  onPageChange
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(initialScale);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle document load
  const handleLoadSuccess = useCallback(({ numPages }: PDFDocumentProxy) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
    onLoadSuccess?.(numPages);
  }, [onLoadSuccess]);

  const handleLoadError = useCallback((err: Error) => {
    setError(err);
    setLoading(false);
    onLoadError?.(err);
  }, [onLoadError]);

  // Navigation
  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, numPages));
    setCurrentPage(validPage);
    onPageChange?.(validPage);
  }, [numPages, onPageChange]);

  const previousPage = () => goToPage(currentPage - 1);
  const nextPage = () => goToPage(currentPage + 1);

  // Zoom controls
  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const resetZoom = () => setScale(1.0);

  // Rotation
  const rotate = () => setRotation(r => (r + 90) % 360);

  // Download
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // Print
  const handlePrint = () => {
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') previousPage();
      if (e.key === 'ArrowRight') nextPage();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages]);

  return (
    <Card className={cn("flex flex-col h-full", className)} ref={containerRef}>
      {/* Toolbar */}
      {showToolbar && (
        <CardHeader className="flex-shrink-0 border-b p-2">
          <div className="flex items-center justify-between gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={previousPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={numPages}
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                  className="w-14 h-8 text-center"
                />
                <span className="text-sm text-muted-foreground">
                  / {numPages}
                </span>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={nextPage}
                disabled={currentPage >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <div className="w-24">
                <Slider
                  value={[scale * 100]}
                  min={50}
                  max={300}
                  step={25}
                  onValueChange={([v]) => setScale(v / 100)}
                />
              </div>
              
              <Button variant="ghost" size="icon" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <span className="text-sm text-muted-foreground w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={rotate}>
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      {/* PDF Content */}
      <CardContent className="flex-1 overflow-auto p-4 bg-muted/30">
        <div className="flex justify-center">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Se încarcă documentul...
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="mt-2 text-sm text-destructive">
                Eroare la încărcarea documentului
              </p>
              <p className="text-xs text-muted-foreground">
                {error.message}
              </p>
            </div>
          )}

          <Document
            file={url}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={handleLoadError}
            loading={null}
            error={null}
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              rotate={rotation}
              className="shadow-lg"
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      </CardContent>
    </Card>
  );
}

// Thumbnail sidebar component
interface PDFThumbnailsProps {
  url: string;
  numPages: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
}

export function PDFThumbnails({ 
  url, 
  numPages, 
  currentPage, 
  onPageSelect 
}: PDFThumbnailsProps) {
  return (
    <div className="w-32 border-r overflow-auto p-2 space-y-2">
      <Document file={url}>
        {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
          <button
            key={pageNum}
            onClick={() => onPageSelect(pageNum)}
            className={cn(
              "w-full p-1 rounded border transition-colors",
              currentPage === pageNum 
                ? "border-primary bg-primary/10" 
                : "border-transparent hover:border-muted-foreground/30"
            )}
          >
            <Page
              pageNumber={pageNum}
              scale={0.2}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
            <span className="text-xs text-muted-foreground">
              {pageNum}
            </span>
          </button>
        ))}
      </Document>
    </div>
  );
}
```

### 11.2 DocumentCard Component

Card pentru afișarea documentelor cu preview și acțiuni.

```typescript
// components/documents/DocumentCard.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  FilePlus2, 
  FileCheck2, 
  FileX2,
  Download, 
  Eye, 
  Trash2, 
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export type DocumentType = 
  | 'proforma' 
  | 'factura' 
  | 'aviz' 
  | 'contract' 
  | 'oferta' 
  | 'comanda'
  | 'chitanta'
  | 'other';

export type DocumentStatus = 
  | 'draft' 
  | 'pending' 
  | 'sent' 
  | 'viewed' 
  | 'signed' 
  | 'cancelled'
  | 'paid'
  | 'overdue';

interface DocumentCardProps {
  id: string;
  type: DocumentType;
  number: string;
  title?: string;
  status: DocumentStatus;
  amount?: number;
  currency?: string;
  clientName?: string;
  createdAt: Date;
  dueDate?: Date;
  pdfUrl?: string;
  efacturaStatus?: 'not_submitted' | 'pending' | 'accepted' | 'rejected';
  onView?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onSend?: () => void;
  onResend?: () => void;
  className?: string;
}

// Document type configurations
const documentTypeConfig: Record<DocumentType, {
  label: string;
  icon: React.ElementType;
  color: string;
}> = {
  proforma: { 
    label: 'Proforma', 
    icon: FilePlus2, 
    color: 'text-blue-600 bg-blue-50' 
  },
  factura: { 
    label: 'Factură', 
    icon: FileCheck2, 
    color: 'text-green-600 bg-green-50' 
  },
  aviz: { 
    label: 'Aviz', 
    icon: FileText, 
    color: 'text-purple-600 bg-purple-50' 
  },
  contract: { 
    label: 'Contract', 
    icon: FileCheck2, 
    color: 'text-indigo-600 bg-indigo-50' 
  },
  oferta: { 
    label: 'Ofertă', 
    icon: FilePlus2, 
    color: 'text-orange-600 bg-orange-50' 
  },
  comanda: { 
    label: 'Comandă', 
    icon: FileText, 
    color: 'text-cyan-600 bg-cyan-50' 
  },
  chitanta: { 
    label: 'Chitanță', 
    icon: FileCheck2, 
    color: 'text-emerald-600 bg-emerald-50' 
  },
  other: { 
    label: 'Document', 
    icon: FileText, 
    color: 'text-gray-600 bg-gray-50' 
  }
};

// Document status configurations
const statusConfig: Record<DocumentStatus, {
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  draft: { 
    label: 'Draft', 
    icon: FileText, 
    variant: 'outline',
    className: 'text-gray-600'
  },
  pending: { 
    label: 'În așteptare', 
    icon: Clock, 
    variant: 'secondary',
    className: 'text-yellow-600'
  },
  sent: { 
    label: 'Trimis', 
    icon: Send, 
    variant: 'default',
    className: 'text-blue-600'
  },
  viewed: { 
    label: 'Vizualizat', 
    icon: Eye, 
    variant: 'default',
    className: 'text-purple-600'
  },
  signed: { 
    label: 'Semnat', 
    icon: CheckCircle, 
    variant: 'default',
    className: 'text-green-600'
  },
  cancelled: { 
    label: 'Anulat', 
    icon: FileX2, 
    variant: 'destructive',
    className: 'text-red-600'
  },
  paid: { 
    label: 'Plătit', 
    icon: CheckCircle, 
    variant: 'default',
    className: 'text-emerald-600'
  },
  overdue: { 
    label: 'Depășit', 
    icon: AlertCircle, 
    variant: 'destructive',
    className: 'text-red-600'
  }
};

export function DocumentCard({
  id,
  type,
  number,
  title,
  status,
  amount,
  currency = 'RON',
  clientName,
  createdAt,
  dueDate,
  pdfUrl,
  efacturaStatus,
  onView,
  onDownload,
  onDelete,
  onSend,
  onResend,
  className
}: DocumentCardProps) {
  const typeConf = documentTypeConfig[type];
  const statusConf = statusConfig[status];
  const TypeIcon = typeConf.icon;
  const StatusIcon = statusConf.icon;

  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'paid';

  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow",
      isOverdue && "border-red-200",
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          {/* Document type icon and number */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              typeConf.color
            )}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">
                {typeConf.label} #{number}
              </h3>
              {title && (
                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {title}
                </p>
              )}
            </div>
          </div>

          {/* Status badge */}
          <Badge variant={statusConf.variant} className={statusConf.className}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConf.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        {/* Client and amount */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {clientName && (
            <div>
              <span className="text-muted-foreground">Client:</span>
              <p className="font-medium truncate">{clientName}</p>
            </div>
          )}
          {amount !== undefined && (
            <div className="text-right">
              <span className="text-muted-foreground">Valoare:</span>
              <p className="font-semibold text-lg">
                {amount.toLocaleString('ro-RO', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} {currency}
              </p>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>
            Creat: {formatDistanceToNow(createdAt, { addSuffix: true, locale: ro })}
          </span>
          {dueDate && (
            <span className={cn(isOverdue && "text-red-600 font-medium")}>
              Scadent: {format(dueDate, 'dd.MM.yyyy')}
            </span>
          )}
        </div>

        {/* e-Factura status */}
        {type === 'factura' && efacturaStatus && (
          <EFacturaStatusBadge status={efacturaStatus} className="mt-2" />
        )}
      </CardContent>

      <CardFooter className="pt-2 border-t">
        <div className="flex items-center justify-between w-full">
          {/* Primary actions */}
          <div className="flex gap-1">
            {onView && (
              <Button variant="ghost" size="sm" onClick={onView}>
                <Eye className="h-4 w-4 mr-1" />
                Vezi
              </Button>
            )}
            {onDownload && pdfUrl && (
              <Button variant="ghost" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-1" />
                Descarcă
              </Button>
            )}
          </div>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {status === 'draft' && onSend && (
                <DropdownMenuItem onClick={onSend}>
                  <Send className="h-4 w-4 mr-2" />
                  Trimite
                </DropdownMenuItem>
              )}
              {(status === 'sent' || status === 'viewed') && onResend && (
                <DropdownMenuItem onClick={onResend}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retrimite
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Șterge
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
}

// Compact variant for lists
interface DocumentListItemProps extends Omit<DocumentCardProps, 'className'> {
  selected?: boolean;
  onSelect?: () => void;
}

export function DocumentListItem({
  type,
  number,
  status,
  amount,
  currency = 'RON',
  clientName,
  createdAt,
  selected,
  onSelect,
  onView,
  onDownload
}: DocumentListItemProps) {
  const typeConf = documentTypeConfig[type];
  const statusConf = statusConfig[status];
  const TypeIcon = typeConf.icon;

  return (
    <div 
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg border transition-colors cursor-pointer",
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      )}
      onClick={onSelect}
    >
      <div className={cn("p-2 rounded", typeConf.color)}>
        <TypeIcon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {typeConf.label} #{number}
          </span>
          <Badge variant={statusConf.variant} className="text-xs">
            {statusConf.label}
          </Badge>
        </div>
        {clientName && (
          <p className="text-sm text-muted-foreground truncate">
            {clientName}
          </p>
        )}
      </div>

      {amount !== undefined && (
        <div className="text-right">
          <span className="font-semibold">
            {amount.toLocaleString('ro-RO')} {currency}
          </span>
        </div>
      )}

      <div className="flex gap-1">
        {onView && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { e.stopPropagation(); onView(); }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        {onDownload && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 11.3 EFacturaStatusBadge Component

Badge pentru statusul e-Factura cu detalii SPV.

```typescript
// components/documents/EFacturaStatusBadge.tsx
'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Upload, 
  FileWarning,
  Loader2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

export type EFacturaStatus = 
  | 'not_submitted' 
  | 'pending' 
  | 'processing' 
  | 'accepted' 
  | 'accepted_with_warnings'
  | 'rejected'
  | 'error';

interface EFacturaStatusBadgeProps {
  status: EFacturaStatus;
  indexIncarcare?: string;
  indexDescarcare?: string;
  submittedAt?: Date;
  processedAt?: Date;
  errorMessage?: string;
  warnings?: string[];
  className?: string;
  showDetails?: boolean;
  onRetry?: () => void;
  onViewOnSPV?: () => void;
}

// Status configurations
const statusConfig: Record<EFacturaStatus, {
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color: string;
  bgColor: string;
}> = {
  not_submitted: {
    label: 'Netrimis',
    icon: Upload,
    variant: 'outline',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50'
  },
  pending: {
    label: 'În așteptare',
    icon: Clock,
    variant: 'secondary',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  processing: {
    label: 'Procesare ANAF',
    icon: Loader2,
    variant: 'secondary',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  accepted: {
    label: 'Acceptat',
    icon: CheckCircle,
    variant: 'default',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  accepted_with_warnings: {
    label: 'Acceptat cu avertismente',
    icon: FileWarning,
    variant: 'default',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50'
  },
  rejected: {
    label: 'Respins',
    icon: XCircle,
    variant: 'destructive',
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  error: {
    label: 'Eroare',
    icon: XCircle,
    variant: 'destructive',
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  }
};

export function EFacturaStatusBadge({
  status,
  indexIncarcare,
  indexDescarcare,
  submittedAt,
  processedAt,
  errorMessage,
  warnings,
  className,
  showDetails = true,
  onRetry,
  onViewOnSPV
}: EFacturaStatusBadgeProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const isAnimated = status === 'processing';

  const badge = (
    <Badge 
      variant={config.variant}
      className={cn(
        config.color,
        config.bgColor,
        "gap-1",
        className
      )}
    >
      <StatusIcon className={cn(
        "h-3 w-3",
        isAnimated && "animate-spin"
      )} />
      {config.label}
    </Badge>
  );

  if (!showDetails) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">{config.label}</p>
            
            {/* Index încărcare */}
            {indexIncarcare && (
              <div className="text-xs">
                <span className="text-muted-foreground">Index încărcare:</span>
                <span className="ml-1 font-mono">{indexIncarcare}</span>
              </div>
            )}

            {/* Index descărcare */}
            {indexDescarcare && (
              <div className="text-xs">
                <span className="text-muted-foreground">Index descărcare:</span>
                <span className="ml-1 font-mono">{indexDescarcare}</span>
              </div>
            )}

            {/* Timestamps */}
            {submittedAt && (
              <div className="text-xs">
                <span className="text-muted-foreground">Trimis:</span>
                <span className="ml-1">
                  {format(submittedAt, 'dd.MM.yyyy HH:mm', { locale: ro })}
                </span>
              </div>
            )}

            {processedAt && (
              <div className="text-xs">
                <span className="text-muted-foreground">Procesat:</span>
                <span className="ml-1">
                  {format(processedAt, 'dd.MM.yyyy HH:mm', { locale: ro })}
                </span>
              </div>
            )}

            {/* Error message */}
            {errorMessage && (
              <div className="text-xs text-destructive">
                <span className="font-medium">Eroare:</span>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            )}

            {/* Warnings */}
            {warnings && warnings.length > 0 && (
              <div className="text-xs text-amber-600">
                <span className="font-medium">Avertismente:</span>
                <ul className="mt-0.5 list-disc list-inside">
                  {warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Detailed status card for e-Factura
interface EFacturaStatusCardProps extends EFacturaStatusBadgeProps {
  invoiceNumber: string;
  invoiceAmount: number;
  currency?: string;
}

export function EFacturaStatusCard({
  status,
  indexIncarcare,
  indexDescarcare,
  submittedAt,
  processedAt,
  errorMessage,
  warnings,
  invoiceNumber,
  invoiceAmount,
  currency = 'RON',
  onRetry,
  onViewOnSPV
}: EFacturaStatusCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const canRetry = status === 'rejected' || status === 'error';
  const canViewOnSPV = status === 'accepted' || status === 'accepted_with_warnings';

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      config.bgColor
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full",
            config.color,
            config.bgColor
          )}>
            <StatusIcon className={cn(
              "h-5 w-5",
              status === 'processing' && "animate-spin"
            )} />
          </div>
          <div>
            <h4 className="font-medium">e-Factura #{invoiceNumber}</h4>
            <p className="text-sm text-muted-foreground">
              {invoiceAmount.toLocaleString('ro-RO')} {currency}
            </p>
          </div>
        </div>

        <Badge variant={config.variant} className={config.color}>
          {config.label}
        </Badge>
      </div>

      {/* Details grid */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        {indexIncarcare && (
          <div>
            <span className="text-muted-foreground text-xs">Index încărcare</span>
            <p className="font-mono text-sm">{indexIncarcare}</p>
          </div>
        )}
        {indexDescarcare && (
          <div>
            <span className="text-muted-foreground text-xs">Index descărcare</span>
            <p className="font-mono text-sm">{indexDescarcare}</p>
          </div>
        )}
        {submittedAt && (
          <div>
            <span className="text-muted-foreground text-xs">Data trimitere</span>
            <p>{format(submittedAt, 'dd.MM.yyyy HH:mm')}</p>
          </div>
        )}
        {processedAt && (
          <div>
            <span className="text-muted-foreground text-xs">Data procesare</span>
            <p>{format(processedAt, 'dd.MM.yyyy HH:mm')}</p>
          </div>
        )}
      </div>

      {/* Error/Warnings */}
      {errorMessage && (
        <div className="mt-3 p-2 rounded bg-destructive/10 text-destructive text-sm">
          <span className="font-medium">Eroare: </span>
          {errorMessage}
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="mt-3 p-2 rounded bg-amber-100 text-amber-800 text-sm">
          <span className="font-medium">Avertismente:</span>
          <ul className="mt-1 list-disc list-inside">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Actions */}
      {(canRetry || canViewOnSPV) && (
        <div className="mt-4 flex gap-2">
          {canRetry && onRetry && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRetry}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retrimite
            </Button>
          )}
          {canViewOnSPV && onViewOnSPV && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onViewOnSPV}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Vezi în SPV
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Simple inline status for tables
interface EFacturaInlineStatusProps {
  status: EFacturaStatus;
  className?: string;
}

export function EFacturaInlineStatus({ status, className }: EFacturaInlineStatusProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", config.color, className)}>
      <StatusIcon className={cn(
        "h-3.5 w-3.5",
        status === 'processing' && "animate-spin"
      )} />
      {config.label}
    </span>
  );
}
```

### 11.4 DocumentPreview Component

Preview modal pentru documente cu zoom și navigare.

```typescript
// components/documents/DocumentPreview.tsx
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Printer, 
  Mail, 
  Copy,
  ExternalLink,
  X,
  FileText,
  History,
  MessageSquare
} from 'lucide-react';
import { PDFViewer } from './PDFViewer';
import { EFacturaStatusBadge, EFacturaStatus } from './EFacturaStatusBadge';
import { DocumentType, DocumentStatus, documentTypeConfig, statusConfig } from './DocumentCard';
import { Timeline } from '@/components/ui/Timeline';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface DocumentHistoryItem {
  id: string;
  action: string;
  description?: string;
  timestamp: Date;
  user?: string;
  status?: 'success' | 'info' | 'warning' | 'error';
}

interface DocumentPreviewProps {
  open: boolean;
  onClose: () => void;
  document: {
    id: string;
    type: DocumentType;
    number: string;
    title?: string;
    status: DocumentStatus;
    amount: number;
    currency?: string;
    clientName: string;
    clientCui?: string;
    clientAddress?: string;
    createdAt: Date;
    dueDate?: Date;
    pdfUrl: string;
    efacturaStatus?: EFacturaStatus;
    efacturaDetails?: {
      indexIncarcare?: string;
      indexDescarcare?: string;
      submittedAt?: Date;
      processedAt?: Date;
      errorMessage?: string;
    };
    notes?: string;
    history?: DocumentHistoryItem[];
  };
  onDownload?: () => void;
  onPrint?: () => void;
  onSendEmail?: () => void;
  onDuplicate?: () => void;
  onSubmitToEFactura?: () => void;
}

export function DocumentPreview({
  open,
  onClose,
  document: doc,
  onDownload,
  onPrint,
  onSendEmail,
  onDuplicate,
  onSubmitToEFactura
}: DocumentPreviewProps) {
  const [activeTab, setActiveTab] = useState('preview');
  const typeConf = documentTypeConfig[doc.type];
  const statusConf = statusConfig[doc.status];
  const TypeIcon = typeConf.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", typeConf.color)}>
                <TypeIcon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  {typeConf.label} #{doc.number}
                </DialogTitle>
                {doc.title && (
                  <p className="text-sm text-muted-foreground">{doc.title}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={statusConf.variant} className={statusConf.className}>
                {statusConf.label}
              </Badge>
              {doc.efacturaStatus && (
                <EFacturaStatusBadge status={doc.efacturaStatus} />
              )}
            </div>
          </div>

          {/* Actions toolbar */}
          <div className="flex items-center gap-2 mt-4">
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-1" />
                Descarcă
              </Button>
            )}
            {onPrint && (
              <Button variant="outline" size="sm" onClick={onPrint}>
                <Printer className="h-4 w-4 mr-1" />
                Printează
              </Button>
            )}
            {onSendEmail && (
              <Button variant="outline" size="sm" onClick={onSendEmail}>
                <Mail className="h-4 w-4 mr-1" />
                Trimite email
              </Button>
            )}
            {onDuplicate && (
              <Button variant="outline" size="sm" onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-1" />
                Duplică
              </Button>
            )}
            {doc.type === 'factura' && doc.efacturaStatus === 'not_submitted' && onSubmitToEFactura && (
              <Button size="sm" onClick={onSubmitToEFactura}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Trimite la e-Factura
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content with tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="px-6 border-b rounded-none justify-start">
            <TabsTrigger value="preview" className="gap-1">
              <FileText className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              Detalii
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <History className="h-4 w-4" />
              Istoric
            </TabsTrigger>
          </TabsList>

          {/* Preview tab */}
          <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
            <PDFViewer 
              url={doc.pdfUrl}
              filename={`${typeConf.label}_${doc.number}.pdf`}
              showToolbar={true}
              className="h-full rounded-none border-0"
            />
          </TabsContent>

          {/* Details tab */}
          <TabsContent value="details" className="flex-1 m-0 overflow-auto p-6">
            <div className="grid grid-cols-2 gap-6 max-w-3xl">
              {/* Document info */}
              <div className="space-y-4">
                <h3 className="font-semibold border-b pb-2">Informații document</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tip:</span>
                    <p className="font-medium">{typeConf.label}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Număr:</span>
                    <p className="font-medium">{doc.number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data:</span>
                    <p className="font-medium">
                      {format(doc.createdAt, 'dd.MM.yyyy', { locale: ro })}
                    </p>
                  </div>
                  {doc.dueDate && (
                    <div>
                      <span className="text-muted-foreground">Scadență:</span>
                      <p className="font-medium">
                        {format(doc.dueDate, 'dd.MM.yyyy', { locale: ro })}
                      </p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Valoare:</span>
                    <p className="text-xl font-bold">
                      {doc.amount.toLocaleString('ro-RO', {
                        minimumFractionDigits: 2
                      })} {doc.currency || 'RON'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Client info */}
              <div className="space-y-4">
                <h3 className="font-semibold border-b pb-2">Client</h3>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Denumire:</span>
                    <p className="font-medium">{doc.clientName}</p>
                  </div>
                  {doc.clientCui && (
                    <div>
                      <span className="text-muted-foreground">CUI:</span>
                      <p className="font-medium">{doc.clientCui}</p>
                    </div>
                  )}
                  {doc.clientAddress && (
                    <div>
                      <span className="text-muted-foreground">Adresă:</span>
                      <p className="font-medium">{doc.clientAddress}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* e-Factura info */}
              {doc.type === 'factura' && doc.efacturaDetails && (
                <div className="col-span-2 space-y-4">
                  <h3 className="font-semibold border-b pb-2">e-Factura ANAF</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="mt-1">
                        <EFacturaStatusBadge 
                          status={doc.efacturaStatus!}
                          {...doc.efacturaDetails}
                        />
                      </div>
                    </div>
                    {doc.efacturaDetails.indexIncarcare && (
                      <div>
                        <span className="text-muted-foreground">Index încărcare:</span>
                        <p className="font-mono">{doc.efacturaDetails.indexIncarcare}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {doc.notes && (
                <div className="col-span-2 space-y-2">
                  <h3 className="font-semibold border-b pb-2">Note</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {doc.notes}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* History tab */}
          <TabsContent value="history" className="flex-1 m-0 overflow-auto p-6">
            {doc.history && doc.history.length > 0 ? (
              <Timeline
                items={doc.history.map(h => ({
                  id: h.id,
                  title: h.action,
                  description: h.description,
                  timestamp: h.timestamp,
                  status: h.status || 'default',
                  metadata: h.user ? { user: h.user } : undefined
                }))}
                showRelativeTime
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nu există istoric pentru acest document</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

### 11.5 DocumentUpload Component

Upload pentru documente cu validare și progress.

```typescript
// components/documents/DocumentUpload.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedDocument {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
}

interface DocumentUploadProps {
  accept?: Record<string, string[]>;
  maxSize?: number; // bytes
  maxFiles?: number;
  multiple?: boolean;
  onUpload: (files: File[]) => Promise<void>;
  onRemove?: (id: string) => void;
  className?: string;
}

const defaultAccept = {
  'application/pdf': ['.pdf'],
  'image/*': ['.png', '.jpg', '.jpeg'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return ImageIcon;
  return FileText;
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DocumentUpload({
  accept = defaultAccept,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 10,
  multiple = true,
  onUpload,
  onRemove,
  className
}: DocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Add files to state
    const newDocs: UploadedDocument[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${file.name}`,
      file,
      progress: 0,
      status: 'pending'
    }));

    setDocuments(prev => [...prev, ...newDocs]);
    setUploading(true);

    // Upload files
    try {
      // Simulate progress updates
      for (const doc of newDocs) {
        setDocuments(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'uploading' } : d
        ));

        // Simulate upload progress
        for (let i = 0; i <= 100; i += 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setDocuments(prev => prev.map(d =>
            d.id === doc.id ? { ...d, progress: i } : d
          ));
        }
      }

      // Call actual upload
      await onUpload(acceptedFiles);

      // Mark as completed
      setDocuments(prev => prev.map(d =>
        newDocs.some(nd => nd.id === d.id) 
          ? { ...d, status: 'completed', progress: 100 }
          : d
      ));
    } catch (error) {
      // Mark as error
      setDocuments(prev => prev.map(d =>
        newDocs.some(nd => nd.id === d.id)
          ? { ...d, status: 'error', error: 'Eroare la încărcare' }
          : d
      ));
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    multiple,
    disabled: uploading
  });

  const handleRemove = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    onRemove?.(id);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          uploading && "opacity-50 cursor-not-allowed",
          !isDragActive && !uploading && "hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        {isDragActive ? (
          <p className="text-primary font-medium">Eliberați fișierele aici...</p>
        ) : (
          <>
            <p className="font-medium">
              Trageți fișierele aici sau click pentru a selecta
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Maxim {maxFiles} fișiere, până la {formatSize(maxSize)} fiecare
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              PDF, imagini, Word, Excel
            </p>
          </>
        )}
      </div>

      {/* File rejections */}
      {fileRejections.length > 0 && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Fișiere respinse:</span>
          </div>
          <ul className="mt-1 list-disc list-inside">
            {fileRejections.map(({ file, errors }) => (
              <li key={file.name}>
                {file.name}: {errors.map(e => e.message).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Uploaded files list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map(doc => {
            const FileIcon = getFileIcon(doc.file.type);
            
            return (
              <Card key={doc.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-muted">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{doc.file.name}</p>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatSize(doc.file.size)}
                        </span>
                      </div>

                      {doc.status === 'uploading' && (
                        <Progress 
                          value={doc.progress} 
                          className="h-1 mt-2" 
                        />
                      )}

                      {doc.status === 'error' && (
                        <p className="text-xs text-destructive mt-1">
                          {doc.error}
                        </p>
                      )}
                    </div>

                    {/* Status icon */}
                    {doc.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {doc.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}

                    {/* Remove button */}
                    {doc.status !== 'uploading' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(doc.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## 12. Integration Components

Componente pentru integrarea cu sisteme externe: Oblio, ANAF, canale de comunicare.

### 12.1 OblioStatusBadge Component

Badge pentru statusul integrării Oblio.

```typescript
// components/integrations/OblioStatusBadge.tsx
'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Link,
  Unlink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

export type OblioSyncStatus = 
  | 'synced' 
  | 'pending' 
  | 'syncing' 
  | 'error' 
  | 'not_linked';

interface OblioStatusBadgeProps {
  status: OblioSyncStatus;
  lastSyncAt?: Date;
  errorMessage?: string;
  oblioId?: string;
  onSync?: () => void;
  className?: string;
}

const statusConfig: Record<OblioSyncStatus, {
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color: string;
}> = {
  synced: {
    label: 'Sincronizat',
    icon: CheckCircle,
    variant: 'default',
    color: 'text-green-600 bg-green-50'
  },
  pending: {
    label: 'În așteptare',
    icon: Clock,
    variant: 'secondary',
    color: 'text-yellow-600 bg-yellow-50'
  },
  syncing: {
    label: 'Se sincronizează',
    icon: RefreshCw,
    variant: 'secondary',
    color: 'text-blue-600 bg-blue-50'
  },
  error: {
    label: 'Eroare',
    icon: XCircle,
    variant: 'destructive',
    color: 'text-red-600 bg-red-50'
  },
  not_linked: {
    label: 'Neconectat',
    icon: Unlink,
    variant: 'outline',
    color: 'text-gray-600'
  }
};

export function OblioStatusBadge({
  status,
  lastSyncAt,
  errorMessage,
  oblioId,
  onSync,
  className
}: OblioStatusBadgeProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const isAnimated = status === 'syncing';

  const badge = (
    <Badge 
      variant={config.variant}
      className={cn(
        config.color,
        "gap-1 cursor-default",
        onSync && "cursor-pointer",
        className
      )}
      onClick={onSync}
    >
      <StatusIcon className={cn(
        "h-3 w-3",
        isAnimated && "animate-spin"
      )} />
      Oblio: {config.label}
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p className="font-medium">{config.label}</p>
            {oblioId && (
              <p>
                <span className="text-muted-foreground">ID Oblio: </span>
                <span className="font-mono">{oblioId}</span>
              </p>
            )}
            {lastSyncAt && (
              <p>
                <span className="text-muted-foreground">Ultima sincronizare: </span>
                {formatDistanceToNow(lastSyncAt, { addSuffix: true, locale: ro })}
              </p>
            )}
            {errorMessage && (
              <p className="text-destructive">{errorMessage}</p>
            )}
            {onSync && status !== 'syncing' && (
              <p className="text-muted-foreground italic">
                Click pentru sincronizare
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Integration status card
interface OblioIntegrationCardProps {
  connected: boolean;
  companyName?: string;
  apiKeyValid?: boolean;
  lastSyncAt?: Date;
  totalDocsSynced?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
}

export function OblioIntegrationCard({
  connected,
  companyName,
  apiKeyValid = true,
  lastSyncAt,
  totalDocsSynced,
  onConnect,
  onDisconnect,
  onSync
}: OblioIntegrationCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Oblio logo placeholder */}
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold",
              connected ? "bg-blue-600" : "bg-gray-400"
            )}>
              O
            </div>
            <div>
              <h3 className="font-semibold">Oblio</h3>
              <p className="text-sm text-muted-foreground">
                {connected ? companyName || 'Conectat' : 'Neconectat'}
              </p>
            </div>
          </div>

          <Badge variant={connected ? 'default' : 'outline'}>
            {connected ? (
              <>
                <Link className="h-3 w-3 mr-1" />
                Conectat
              </>
            ) : (
              <>
                <Unlink className="h-3 w-3 mr-1" />
                Deconectat
              </>
            )}
          </Badge>
        </div>

        {connected && (
          <>
            {!apiKeyValid && (
              <div className="mt-3 p-2 rounded bg-amber-50 text-amber-700 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Cheia API necesită reautorizare
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Ultima sincronizare</span>
                <p className="font-medium">
                  {lastSyncAt 
                    ? formatDistanceToNow(lastSyncAt, { addSuffix: true, locale: ro })
                    : '-'
                  }
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Documente sincronizate</span>
                <p className="font-medium">{totalDocsSynced?.toLocaleString() || 0}</p>
              </div>
            </div>
          </>
        )}

        <div className="mt-4 flex gap-2">
          {connected ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onSync}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Sincronizează
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDisconnect}
                className="text-destructive"
              >
                Deconectează
              </Button>
            </>
          ) : (
            <Button onClick={onConnect} className="flex-1">
              <Link className="h-4 w-4 mr-1" />
              Conectează Oblio
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 12.3 ANAFStatusBadge Component

Badge pentru statusul verificării ANAF (CIF, TVA, SPV).

```typescript
// components/integrations/ANAFStatusBadge.tsx
'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Building2,
  FileCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { ro } from 'date-fns/locale';

export type ANAFVerificationStatus = 
  | 'verified' 
  | 'invalid' 
  | 'pending' 
  | 'expired'
  | 'not_checked';

export type ANAFVATStatus = 
  | 'payer' 
  | 'non_payer' 
  | 'split_vat'
  | 'unknown';

interface ANAFStatusBadgeProps {
  verificationStatus: ANAFVerificationStatus;
  vatStatus?: ANAFVATStatus;
  cui: string;
  companyName?: string;
  verifiedAt?: Date;
  expiresAt?: Date;
  splitVatFrom?: Date;
  className?: string;
}

const verificationConfig: Record<ANAFVerificationStatus, {
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  verified: {
    label: 'Verificat',
    icon: CheckCircle,
    variant: 'default'
  },
  invalid: {
    label: 'Invalid',
    icon: XCircle,
    variant: 'destructive'
  },
  pending: {
    label: 'În verificare',
    icon: Clock,
    variant: 'secondary'
  },
  expired: {
    label: 'Expirat',
    icon: AlertTriangle,
    variant: 'outline'
  },
  not_checked: {
    label: 'Neverificat',
    icon: Building2,
    variant: 'outline'
  }
};

const vatConfig: Record<ANAFVATStatus, {
  label: string;
  color: string;
}> = {
  payer: {
    label: 'Plătitor TVA',
    color: 'bg-green-100 text-green-800'
  },
  non_payer: {
    label: 'Neplătitor TVA',
    color: 'bg-gray-100 text-gray-800'
  },
  split_vat: {
    label: 'TVA la Încasare',
    color: 'bg-amber-100 text-amber-800'
  },
  unknown: {
    label: 'TVA Necunoscut',
    color: 'bg-gray-100 text-gray-600'
  }
};

export function ANAFStatusBadge({
  verificationStatus,
  vatStatus = 'unknown',
  cui,
  companyName,
  verifiedAt,
  expiresAt,
  splitVatFrom,
  className
}: ANAFStatusBadgeProps) {
  const config = verificationConfig[verificationStatus];
  const vatInfo = vatConfig[vatStatus];
  const StatusIcon = config.icon;

  const isExpired = expiresAt && expiresAt < new Date();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("inline-flex items-center gap-2", className)}>
            <Badge variant={config.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
            
            {verificationStatus === 'verified' && vatStatus !== 'unknown' && (
              <Badge variant="outline" className={cn("text-xs", vatInfo.color)}>
                {vatInfo.label}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2 text-sm">
            <div className="font-semibold">CIF: {cui}</div>
            {companyName && (
              <div className="text-muted-foreground">{companyName}</div>
            )}
            
            {verifiedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verificat:</span>
                <span>{formatDistanceToNow(verifiedAt, { addSuffix: true, locale: ro })}</span>
              </div>
            )}
            
            {expiresAt && (
              <div className={cn(
                "flex justify-between",
                isExpired && "text-red-600"
              )}>
                <span className="text-muted-foreground">Expiră:</span>
                <span>{format(expiresAt, 'dd MMM yyyy', { locale: ro })}</span>
              </div>
            )}
            
            {splitVatFrom && vatStatus === 'split_vat' && (
              <div className="flex justify-between text-amber-600">
                <span>TVA la încasare din:</span>
                <span>{format(splitVatFrom, 'dd MMM yyyy', { locale: ro })}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

### 12.4 EFacturaStatusBadge Component

Badge pentru statusul e-Factura SPV.

```typescript
// components/integrations/EFacturaStatusBadge.tsx
'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Send,
  FileWarning,
  Upload,
  Download,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInHours, differenceInDays } from 'date-fns';
import { ro } from 'date-fns/locale';

export type EFacturaStatus = 
  | 'not_required'
  | 'not_submitted'
  | 'pending_upload'
  | 'uploaded'
  | 'processing'
  | 'accepted'
  | 'accepted_with_warnings'
  | 'rejected'
  | 'error'
  | 'overdue';

interface EFacturaStatusBadgeProps {
  status: EFacturaStatus;
  indexUpload?: string;
  indexDescarcare?: string;
  uploadedAt?: Date;
  responseAt?: Date;
  deadline?: Date;
  errors?: string[];
  warnings?: string[];
  onRetry?: () => void;
  onDownloadResponse?: () => void;
  showDeadline?: boolean;
  className?: string;
}

const statusConfig: Record<EFacturaStatus, {
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color: string;
}> = {
  not_required: {
    label: 'Nu necesită',
    icon: CheckCircle,
    variant: 'outline',
    color: 'text-gray-500'
  },
  not_submitted: {
    label: 'Netrimis',
    icon: Upload,
    variant: 'outline',
    color: 'text-gray-600'
  },
  pending_upload: {
    label: 'În coadă',
    icon: Clock,
    variant: 'secondary',
    color: 'text-blue-600'
  },
  uploaded: {
    label: 'Încărcat',
    icon: Send,
    variant: 'secondary',
    color: 'text-blue-600'
  },
  processing: {
    label: 'Se procesează',
    icon: RefreshCw,
    variant: 'secondary',
    color: 'text-blue-600 animate-spin'
  },
  accepted: {
    label: 'Acceptat',
    icon: CheckCircle,
    variant: 'default',
    color: 'text-green-600'
  },
  accepted_with_warnings: {
    label: 'Acceptat cu avertismente',
    icon: AlertTriangle,
    variant: 'default',
    color: 'text-amber-600'
  },
  rejected: {
    label: 'Respins',
    icon: XCircle,
    variant: 'destructive',
    color: 'text-red-600'
  },
  error: {
    label: 'Eroare',
    icon: FileWarning,
    variant: 'destructive',
    color: 'text-red-600'
  },
  overdue: {
    label: 'Depășit',
    icon: AlertTriangle,
    variant: 'destructive',
    color: 'text-red-600'
  }
};

export function EFacturaStatusBadge({
  status,
  indexUpload,
  indexDescarcare,
  uploadedAt,
  responseAt,
  deadline,
  errors,
  warnings,
  onRetry,
  onDownloadResponse,
  showDeadline = true,
  className
}: EFacturaStatusBadgeProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Calculate deadline urgency
  let deadlineUrgency: 'ok' | 'warning' | 'critical' | 'overdue' = 'ok';
  let hoursRemaining = 0;
  
  if (deadline && status === 'not_submitted') {
    hoursRemaining = differenceInHours(deadline, new Date());
    const daysRemaining = differenceInDays(deadline, new Date());
    
    if (hoursRemaining <= 0) {
      deadlineUrgency = 'overdue';
    } else if (daysRemaining <= 1) {
      deadlineUrgency = 'critical';
    } else if (daysRemaining <= 2) {
      deadlineUrgency = 'warning';
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("inline-flex items-center gap-2", className)}>
            <Badge 
              variant={config.variant}
              className={cn("gap-1", config.color)}
            >
              <StatusIcon className={cn(
                "h-3 w-3",
                status === 'processing' && "animate-spin"
              )} />
              {config.label}
            </Badge>
            
            {showDeadline && deadline && deadlineUrgency !== 'ok' && (
              <Badge 
                variant={deadlineUrgency === 'overdue' ? 'destructive' : 'outline'}
                className={cn(
                  "text-xs",
                  deadlineUrgency === 'critical' && "border-red-500 text-red-600",
                  deadlineUrgency === 'warning' && "border-amber-500 text-amber-600"
                )}
              >
                {deadlineUrgency === 'overdue' 
                  ? 'DEPĂȘIT' 
                  : `${hoursRemaining}h rămase`}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2 text-sm">
            <div className="font-semibold flex items-center gap-2">
              <StatusIcon className="h-4 w-4" />
              {config.label}
            </div>
            
            {indexUpload && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Index upload:</span>
                <code className="text-xs bg-muted px-1 rounded">{indexUpload}</code>
              </div>
            )}
            
            {indexDescarcare && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Index descărcare:</span>
                <code className="text-xs bg-muted px-1 rounded">{indexDescarcare}</code>
              </div>
            )}
            
            {uploadedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Încărcat:</span>
                <span>{formatDistanceToNow(uploadedAt, { addSuffix: true, locale: ro })}</span>
              </div>
            )}
            
            {responseAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Răspuns:</span>
                <span>{formatDistanceToNow(responseAt, { addSuffix: true, locale: ro })}</span>
              </div>
            )}
            
            {errors && errors.length > 0 && (
              <div className="pt-2 border-t">
                <div className="font-medium text-red-600 mb-1">Erori:</div>
                <ul className="list-disc list-inside text-xs text-red-600">
                  {errors.slice(0, 3).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {errors.length > 3 && (
                    <li className="text-muted-foreground">
                      +{errors.length - 3} alte erori
                    </li>
                  )}
                </ul>
              </div>
            )}
            
            {warnings && warnings.length > 0 && (
              <div className="pt-2 border-t">
                <div className="font-medium text-amber-600 mb-1">Avertismente:</div>
                <ul className="list-disc list-inside text-xs text-amber-600">
                  {warnings.slice(0, 3).map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {(onRetry || onDownloadResponse) && (
              <div className="pt-2 border-t flex gap-2">
                {onRetry && ['rejected', 'error'].includes(status) && (
                  <button 
                    onClick={onRetry}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reîncearcă
                  </button>
                )}
                {onDownloadResponse && indexDescarcare && (
                  <button 
                    onClick={onDownloadResponse}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Descarcă răspuns
                  </button>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

### 12.5 ChannelIcon Component

Icon pentru canalul de comunicare (WhatsApp, Email, etc.).

```typescript
// components/integrations/ChannelIcon.tsx
'use client';

import React from 'react';
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  Globe,
  MessageCircle,
  Video,
  Linkedin
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ChannelType = 
  | 'whatsapp'
  | 'email'
  | 'phone'
  | 'sms'
  | 'web'
  | 'chat'
  | 'video'
  | 'linkedin';

interface ChannelIconProps {
  channel: ChannelType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  withLabel?: boolean;
  withColor?: boolean;
  className?: string;
}

const channelConfig: Record<ChannelType, {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
}> = {
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  phone: {
    icon: Phone,
    label: 'Telefon',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  sms: {
    icon: MessageSquare,
    label: 'SMS',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100'
  },
  web: {
    icon: Globe,
    label: 'Web',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  chat: {
    icon: MessageSquare,
    label: 'Chat',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100'
  },
  video: {
    icon: Video,
    label: 'Video',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100'
  },
  linkedin: {
    icon: Linkedin,
    label: 'LinkedIn',
    color: 'text-sky-700',
    bgColor: 'bg-sky-100'
  }
};

const sizeConfig = {
  xs: { icon: 'h-3 w-3', container: 'p-1', text: 'text-xs' },
  sm: { icon: 'h-4 w-4', container: 'p-1.5', text: 'text-sm' },
  md: { icon: 'h-5 w-5', container: 'p-2', text: 'text-sm' },
  lg: { icon: 'h-6 w-6', container: 'p-2.5', text: 'text-base' }
};

export function ChannelIcon({
  channel,
  size = 'md',
  withLabel = false,
  withColor = true,
  className
}: ChannelIconProps) {
  const config = channelConfig[channel];
  const sizeClass = sizeConfig[size];
  const Icon = config.icon;

  if (withLabel) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5",
        className
      )}>
        <div className={cn(
          "rounded-full",
          sizeClass.container,
          withColor && config.bgColor
        )}>
          <Icon className={cn(
            sizeClass.icon,
            withColor ? config.color : 'text-current'
          )} />
        </div>
        <span className={cn(
          sizeClass.text,
          withColor ? config.color : 'text-current'
        )}>
          {config.label}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-full inline-flex items-center justify-center",
      sizeClass.container,
      withColor && config.bgColor,
      className
    )}>
      <Icon className={cn(
        sizeClass.icon,
        withColor ? config.color : 'text-current'
      )} />
    </div>
  );
}

// Preset pentru canale multiple
interface ChannelIconsProps {
  channels: ChannelType[];
  size?: 'xs' | 'sm' | 'md';
  max?: number;
  className?: string;
}

export function ChannelIcons({
  channels,
  size = 'sm',
  max = 3,
  className
}: ChannelIconsProps) {
  const displayed = channels.slice(0, max);
  const remaining = channels.length - max;

  return (
    <div className={cn("inline-flex items-center -space-x-1", className)}>
      {displayed.map((channel, index) => (
        <div 
          key={channel}
          className="ring-2 ring-white rounded-full"
          style={{ zIndex: displayed.length - index }}
        >
          <ChannelIcon channel={channel} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div className={cn(
          "rounded-full bg-gray-200 text-gray-600 flex items-center justify-center ring-2 ring-white",
          size === 'xs' ? 'h-5 w-5 text-xs' : size === 'sm' ? 'h-6 w-6 text-xs' : 'h-7 w-7 text-sm'
        )}>
          +{remaining}
        </div>
      )}
    </div>
  );
}
```

---

### 12.6 IntegrationStatusCard Component

Card pentru statusul general al unei integrări.

```typescript
// components/integrations/IntegrationStatusCard.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Settings,
  ExternalLink,
  Clock,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'syncing' | 'partial';

interface IntegrationStatusCardProps {
  name: string;
  description?: string;
  logo?: React.ReactNode;
  status: IntegrationStatus;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  stats?: {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
  }[];
  healthScore?: number;
  errorMessage?: string;
  actions?: {
    onSync?: () => void;
    onConfigure?: () => void;
    onDisconnect?: () => void;
    onConnect?: () => void;
    onViewDocs?: () => void;
  };
  syncInProgress?: boolean;
  className?: string;
}

const statusConfig: Record<IntegrationStatus, {
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color: string;
}> = {
  connected: {
    label: 'Conectat',
    icon: CheckCircle,
    variant: 'default',
    color: 'text-green-600 bg-green-50 border-green-200'
  },
  disconnected: {
    label: 'Deconectat',
    icon: XCircle,
    variant: 'outline',
    color: 'text-gray-600 bg-gray-50 border-gray-200'
  },
  error: {
    label: 'Eroare',
    icon: AlertTriangle,
    variant: 'destructive',
    color: 'text-red-600 bg-red-50 border-red-200'
  },
  syncing: {
    label: 'Se sincronizează',
    icon: RefreshCw,
    variant: 'secondary',
    color: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  partial: {
    label: 'Parțial',
    icon: AlertTriangle,
    variant: 'secondary',
    color: 'text-amber-600 bg-amber-50 border-amber-200'
  }
};

export function IntegrationStatusCard({
  name,
  description,
  logo,
  status,
  lastSyncAt,
  nextSyncAt,
  stats,
  healthScore,
  errorMessage,
  actions,
  syncInProgress,
  className
}: IntegrationStatusCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className={cn("overflow-hidden", config.color, className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {logo && (
              <div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center">
                {logo}
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          
          <Badge variant={config.variant} className="gap-1">
            <StatusIcon className={cn(
              "h-3 w-3",
              (status === 'syncing' || syncInProgress) && "animate-spin"
            )} />
            {syncInProgress ? 'Se sincronizează...' : config.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Health Score */}
        {healthScore !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Health Score
              </span>
              <span className="font-medium">{healthScore}%</span>
            </div>
            <Progress value={healthScore} className="h-2" />
          </div>
        )}
        
        {/* Error Message */}
        {errorMessage && status === 'error' && (
          <div className="p-3 rounded-md bg-red-100 border border-red-200 text-red-800 text-sm">
            {errorMessage}
          </div>
        )}
        
        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white/50 rounded-md p-2">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
        
        {/* Sync Info */}
        <div className="flex justify-between text-sm text-muted-foreground">
          {lastSyncAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Ultima: {formatDistanceToNow(lastSyncAt, { addSuffix: true, locale: ro })}
            </span>
          )}
          {nextSyncAt && (
            <span>
              Următoarea: {formatDistanceToNow(nextSyncAt, { addSuffix: true, locale: ro })}
            </span>
          )}
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {status === 'connected' || status === 'partial' || status === 'error' ? (
              <>
                {actions.onSync && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={actions.onSync}
                    disabled={syncInProgress}
                    className="flex-1"
                  >
                    <RefreshCw className={cn(
                      "h-4 w-4 mr-1",
                      syncInProgress && "animate-spin"
                    )} />
                    Sincronizează
                  </Button>
                )}
                {actions.onConfigure && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={actions.onConfigure}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
                {actions.onDisconnect && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={actions.onDisconnect}
                    className="text-destructive hover:text-destructive"
                  >
                    Deconectează
                  </Button>
                )}
              </>
            ) : (
              <>
                {actions.onConnect && (
                  <Button 
                    size="sm" 
                    onClick={actions.onConnect}
                    className="flex-1"
                  >
                    Conectează
                  </Button>
                )}
                {actions.onViewDocs && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={actions.onViewDocs}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Documentație
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### 12.7 WebhookStatusIndicator Component

Indicator pentru statusul webhook-urilor.

```typescript
// components/integrations/WebhookStatusIndicator.tsx
'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Webhook, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

export type WebhookStatus = 'active' | 'failing' | 'disabled' | 'pending';

interface WebhookStatusIndicatorProps {
  status: WebhookStatus;
  url: string;
  lastDeliveredAt?: Date;
  lastFailedAt?: Date;
  successRate?: number;
  failureCount?: number;
  secret?: boolean;
  className?: string;
}

const statusConfig: Record<WebhookStatus, {
  label: string;
  icon: React.ElementType;
  dotColor: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  active: {
    label: 'Activ',
    icon: CheckCircle,
    dotColor: 'bg-green-500',
    variant: 'default'
  },
  failing: {
    label: 'Eșecuri',
    icon: AlertTriangle,
    dotColor: 'bg-red-500 animate-pulse',
    variant: 'destructive'
  },
  disabled: {
    label: 'Dezactivat',
    icon: XCircle,
    dotColor: 'bg-gray-400',
    variant: 'outline'
  },
  pending: {
    label: 'În așteptare',
    icon: Clock,
    dotColor: 'bg-yellow-500',
    variant: 'secondary'
  }
};

export function WebhookStatusIndicator({
  status,
  url,
  lastDeliveredAt,
  lastFailedAt,
  successRate,
  failureCount,
  secret,
  className
}: WebhookStatusIndicatorProps) {
  const config = statusConfig[status];

  // Mask URL for display
  const maskedUrl = url.replace(/^(https?:\/\/[^\/]+).*$/, '$1/...');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background",
            className
          )}>
            <Webhook className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono truncate max-w-[200px]">{maskedUrl}</span>
            <span className={cn("h-2 w-2 rounded-full", config.dotColor)} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={config.variant} className="gap-1">
                <config.icon className="h-3 w-3" />
                {config.label}
              </Badge>
              {secret && (
                <Badge variant="outline" className="text-xs">
                  🔒 Signed
                </Badge>
              )}
            </div>
            
            <div className="font-mono text-xs break-all text-muted-foreground">
              {url}
            </div>
            
            {successRate !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rată succes:</span>
                <span className={cn(
                  "font-medium",
                  successRate >= 95 && "text-green-600",
                  successRate >= 80 && successRate < 95 && "text-amber-600",
                  successRate < 80 && "text-red-600"
                )}>
                  {successRate.toFixed(1)}%
                </span>
              </div>
            )}
            
            {failureCount !== undefined && failureCount > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Eșecuri consecutive:</span>
                <span className="font-medium">{failureCount}</span>
              </div>
            )}
            
            {lastDeliveredAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ultima livrare:</span>
                <span>{formatDistanceToNow(lastDeliveredAt, { addSuffix: true, locale: ro })}</span>
              </div>
            )}
            
            {lastFailedAt && (
              <div className="flex justify-between text-red-600">
                <span>Ultima eroare:</span>
                <span>{formatDistanceToNow(lastFailedAt, { addSuffix: true, locale: ro })}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

## 13. Utility Components & Hooks

Componente și hooks utilitare pentru funcționalități comune.

### 13.1 CopyToClipboard Component

Buton pentru copiere text în clipboard.

```typescript
// components/utils/CopyToClipboard.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyToClipboardProps {
  text: string;
  displayText?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
  showText?: boolean;
  successDuration?: number;
  onCopy?: (text: string) => void;
  className?: string;
}

export function CopyToClipboard({
  text,
  displayText,
  size = 'icon',
  variant = 'ghost',
  showText = false,
  successDuration = 2000,
  onCopy,
  className
}: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.(text);
      
      setTimeout(() => {
        setCopied(false);
      }, successDuration);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleCopy}
            className={cn(
              copied && "text-green-600",
              className
            )}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {showText && (
              <span className="ml-1">
                {copied ? 'Copiat!' : displayText || 'Copiază'}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {copied ? 'Copiat!' : 'Copiază în clipboard'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Varianta inline pentru text
interface InlineCopyProps {
  text: string;
  displayText?: string;
  truncate?: boolean;
  maxLength?: number;
  className?: string;
}

export function InlineCopy({
  text,
  displayText,
  truncate = true,
  maxLength = 30,
  className
}: InlineCopyProps) {
  const display = displayText || text;
  const shouldTruncate = truncate && display.length > maxLength;
  const truncatedText = shouldTruncate 
    ? `${display.slice(0, maxLength)}...` 
    : display;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-mono text-sm",
      className
    )}>
      <span title={shouldTruncate ? display : undefined}>
        {truncatedText}
      </span>
      <CopyToClipboard 
        text={text} 
        size="icon" 
        variant="ghost"
        className="h-5 w-5 p-0 hover:bg-transparent"
      />
    </span>
  );
}
```

---

### 13.2 ConfirmAction Component

Wrapper pentru acțiuni care necesită confirmare.

```typescript
// components/utils/ConfirmAction.tsx
'use client';

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface ConfirmActionProps {
  children: (handleClick: () => void) => React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
}

export function ConfirmAction({
  children,
  title,
  description,
  confirmLabel = 'Confirmă',
  cancelLabel = 'Anulează',
  variant = 'default',
  onConfirm,
  onCancel,
  disabled
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    setOpen(false);
  };

  return (
    <>
      {children(() => !disabled && setOpen(true))}
      
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel} disabled={loading}>
              {cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              className={cn(
                variant === 'destructive' && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {loading ? 'Se procesează...' : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

### 13.3 KeyboardShortcut Component

Afișare și gestionare scurtături tastatură.

```typescript
// components/utils/KeyboardShortcut.tsx
'use client';

import React, { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Key {
  key: string;
  label?: string;
}

interface KeyboardShortcutProps {
  keys: (string | Key)[];
  onTrigger?: () => void;
  disabled?: boolean;
  className?: string;
}

const keyLabels: Record<string, string> = {
  'mod': '⌘',  // Will be replaced with Ctrl on non-Mac
  'ctrl': 'Ctrl',
  'alt': 'Alt',
  'shift': '⇧',
  'enter': '↵',
  'escape': 'Esc',
  'backspace': '⌫',
  'delete': 'Del',
  'arrowup': '↑',
  'arrowdown': '↓',
  'arrowleft': '←',
  'arrowright': '→',
  'tab': 'Tab',
  'space': 'Space',
};

export function KeyboardShortcut({
  keys,
  onTrigger,
  disabled,
  className
}: KeyboardShortcutProps) {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const normalizedKeys = keys.map(k => {
    if (typeof k === 'string') {
      const lower = k.toLowerCase();
      if (lower === 'mod') {
        return { key: isMac ? 'meta' : 'ctrl', label: isMac ? '⌘' : 'Ctrl' };
      }
      return { key: lower, label: keyLabels[lower] || k.toUpperCase() };
    }
    return k;
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled || !onTrigger) return;

    const pressedKeys = normalizedKeys.every(k => {
      const key = k.key.toLowerCase();
      if (key === 'ctrl' || key === 'control') return e.ctrlKey;
      if (key === 'meta' || key === 'cmd') return e.metaKey;
      if (key === 'alt') return e.altKey;
      if (key === 'shift') return e.shiftKey;
      return e.key.toLowerCase() === key;
    });

    if (pressedKeys) {
      e.preventDefault();
      onTrigger();
    }
  }, [normalizedKeys, onTrigger, disabled]);

  useEffect(() => {
    if (onTrigger) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, onTrigger]);

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {normalizedKeys.map((k, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 text-xs font-mono font-medium bg-muted border rounded"
        >
          {k.label || k.key.toUpperCase()}
        </kbd>
      ))}
    </span>
  );
}

// Hook pentru scurtături
export function useKeyboardShortcut(
  keys: string[],
  callback: () => void,
  options?: {
    disabled?: boolean;
    preventDefault?: boolean;
  }
) {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (options?.disabled) return;

    const pressedKeys = keys.every(k => {
      const key = k.toLowerCase();
      if (key === 'mod') return isMac ? e.metaKey : e.ctrlKey;
      if (key === 'ctrl') return e.ctrlKey;
      if (key === 'meta') return e.metaKey;
      if (key === 'alt') return e.altKey;
      if (key === 'shift') return e.shiftKey;
      return e.key.toLowerCase() === key;
    });

    if (pressedKeys) {
      if (options?.preventDefault !== false) {
        e.preventDefault();
      }
      callback();
    }
  }, [keys, callback, options?.disabled, options?.preventDefault, isMac]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
```

---

### 13.4 useDebounce Hook

Hook pentru debounce de valori.

```typescript
// hooks/useDebounce.ts
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook pentru debounce de valori
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook pentru debounce de funcții (callback)
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook cu debounce și loading state
 */
export function useDebounceWithLoading<T>(
  value: T,
  delay: number
): { debouncedValue: T; isDebouncing: boolean } {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    setIsDebouncing(true);
    
    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return { debouncedValue, isDebouncing };
}
```

---

### 13.5 useLocalStorage Hook

Hook pentru persistență în localStorage.

```typescript
// hooks/useLocalStorage.ts
import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = T | ((prevValue: T) => T);

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void, () => void] {
  // Get initial value from localStorage or use provided initial value
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Return setValue function
  const setValue = useCallback((value: SetValue<T>) => {
    if (typeof window === 'undefined') {
      console.warn(`Tried setting localStorage key "${key}" on server`);
      return;
    }

    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // Dispatch event for other components
      window.dispatchEvent(new Event('local-storage'));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Remove value
  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
      window.dispatchEvent(new Event('local-storage'));
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', () => setStoredValue(readValue()));

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', () => setStoredValue(readValue()));
    };
  }, [key, readValue]);

  return [storedValue, setValue, removeValue];
}
```

---

### 13.6 useAsync Hook

Hook pentru operații asincrone cu state management.

```typescript
// hooks/useAsync.ts
import { useState, useCallback, useEffect } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

interface UseAsyncReturn<T, Args extends any[]> extends AsyncState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
}

export function useAsync<T, Args extends any[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  immediate: boolean = false
): UseAsyncReturn<T, Args> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const execute = useCallback(async (...args: Args): Promise<T | null> => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      isError: false,
      error: null,
    }));

    try {
      const data = await asyncFunction(...args);
      setState({
        data,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      });
      return data;
    } catch (error) {
      setState({
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        isLoading: false,
        isError: true,
        isSuccess: false,
      });
      return null;
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
    });
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as Args));
    }
  }, []);

  return { ...state, execute, reset };
}

/**
 * Hook specific pentru fetch
 */
export function useFetch<T>(
  url: string,
  options?: RequestInit,
  immediate: boolean = true
) {
  const fetchData = useCallback(async (): Promise<T> => {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }, [url, options]);

  return useAsync<T>(fetchData, immediate);
}
```

---

### 13.7 useInterval Hook

Hook pentru interval recurent.

```typescript
// hooks/useInterval.ts
import { useEffect, useRef } from 'react';

export function useInterval(
  callback: () => void,
  delay: number | null,
  immediate: boolean = false
) {
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate && delay !== null) {
      savedCallback.current();
    }
  }, [immediate, delay]);

  // Set up the interval
  useEffect(() => {
    if (delay === null) return;

    const tick = () => savedCallback.current();
    const id = setInterval(tick, delay);
    
    return () => clearInterval(id);
  }, [delay]);
}

/**
 * Hook pentru polling cu suport pentru pauză
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  interval: number,
  options?: {
    enabled?: boolean;
    immediate?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  }
) {
  const { enabled = true, immediate = true, onSuccess, onError } = options || {};
  const isFetching = useRef(false);

  useInterval(
    async () => {
      if (isFetching.current) return;
      
      isFetching.current = true;
      try {
        const data = await fetchFn();
        onSuccess?.(data);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      } finally {
        isFetching.current = false;
      }
    },
    enabled ? interval : null,
    immediate
  );
}
```

---

### 13.8 useClickOutside Hook

Hook pentru detectare click în afara elementului.

```typescript
// hooks/useClickOutside.ts
import { useEffect, useRef, RefObject } from 'react';

type Handler = (event: MouseEvent | TouchEvent) => void;

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: Handler,
  mouseEvent: 'mousedown' | 'mouseup' = 'mousedown'
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      
      // Do nothing if clicking ref's element or descendent elements
      if (!el || el.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    document.addEventListener(mouseEvent, listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener(mouseEvent, listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler, mouseEvent]);

  return ref;
}

/**
 * Varianta cu refs multiple
 */
export function useClickOutsideMultiple(
  refs: RefObject<HTMLElement>[],
  handler: Handler,
  mouseEvent: 'mousedown' | 'mouseup' = 'mousedown'
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const isInside = refs.some(ref => {
        const el = ref.current;
        return el && el.contains(event.target as Node);
      });

      if (!isInside) {
        handler(event);
      }
    };

    document.addEventListener(mouseEvent, listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener(mouseEvent, listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [refs, handler, mouseEvent]);
}
```

---

### 13.9 Utility Functions

Funcții helper comune pentru componente.

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number as currency
 */
export function formatCurrency(
  value: number,
  currency: string = 'RON',
  locale: string = 'ro-RO'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format number with thousands separator
 */
export function formatNumber(
  value: number,
  locale: string = 'ro-RO',
  decimals: number = 0
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(
  value: number,
  decimals: number = 1,
  locale: string = 'ro-RO'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Generate random ID
 */
export function generateId(prefix: string = ''): string {
  const random = Math.random().toString(36).substring(2, 11);
  return prefix ? `${prefix}_${random}` : random;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: Record<string, any>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Get initials from name
 */
export function getInitials(name: string, max: number = 2): string {
  return name
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .slice(0, max)
    .join('')
    .toUpperCase();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate CUI format (Romanian)
 */
export function isValidCUI(cui: string): boolean {
  const cuiRegex = /^(RO)?[0-9]{2,10}$/;
  return cuiRegex.test(cui.replace(/\s/g, ''));
}

/**
 * Format CUI
 */
export function formatCUI(cui: string): string {
  const clean = cui.replace(/\s/g, '').toUpperCase();
  if (clean.startsWith('RO')) {
    return clean;
  }
  return `RO${clean}`;
}

/**
 * Validate Romanian phone number
 */
export function isValidRomanianPhone(phone: string): boolean {
  const phoneRegex = /^(\+40|0040|0)?[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/[\s\-\.]/g, ''));
}

/**
 * Format phone number
 */
export function formatPhone(phone: string): string {
  const clean = phone.replace(/[\s\-\.]/g, '');
  if (clean.startsWith('+40')) return clean;
  if (clean.startsWith('0040')) return '+40' + clean.slice(4);
  if (clean.startsWith('0')) return '+40' + clean.slice(1);
  return '+40' + clean;
}

/**
 * Pluralize Romanian words
 */
export function pluralize(count: number, singular: string, plural: string, fewForm?: string): string {
  if (count === 1) return `${count} ${singular}`;
  if (count === 0 || (count >= 2 && count <= 19)) return `${count} ${fewForm || plural}`;
  return `${count} ${plural}`;
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
```

---

## 14. Component Testing

Strategii și exemple de teste pentru componente Etapa 3.

### 14.1 Testing Setup

Configurare Vitest + Testing Library pentru componente React.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/components/**/*.tsx'],
      exclude: ['**/*.stories.tsx', '**/*.test.tsx'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});
```

---

### 14.2 Test Utilities

Utilitare pentru testing.

```typescript
// tests/utils/test-utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock data generators
export const mockNegotiation = (overrides?: Partial<Negotiation>) => ({
  id: 'neg_123',
  leadId: 'lead_456',
  tenantId: 'tenant_789',
  state: 'DISCOVERY' as const,
  channel: 'whatsapp' as const,
  assignedToHuman: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const mockProduct = (overrides?: Partial<Product>) => ({
  id: 'prod_123',
  sku: 'SKU-001',
  title: 'Test Product',
  description: 'Test description',
  priceNet: 100,
  currency: 'RON',
  vatRate: 19,
  inStock: true,
  stockQuantity: 50,
  ...overrides,
});

export const mockApprovalRequest = (overrides?: Partial<ApprovalRequest>) => ({
  id: 'apr_123',
  type: 'discount' as const,
  title: 'Discount 25%',
  description: 'Discount request for client XYZ',
  requestedBy: {
    name: 'AI Agent',
    avatar: undefined,
  },
  requestedAt: new Date(),
  slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
  priority: 'high' as const,
  status: 'pending' as const,
  metadata: {
    clientName: 'Test Client',
    productName: 'Test Product',
    requestedValue: 25,
    currentValue: 10,
    percentChange: 150,
  },
  ...overrides,
});

// Custom render with providers
interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withTooltip?: boolean;
}

function customRender(
  ui: ReactElement,
  options?: ExtendedRenderOptions
) {
  const { withTooltip = true, ...renderOptions } = options || {};

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (withTooltip) {
      return <TooltipProvider>{children}</TooltipProvider>;
    }
    return <>{children}</>;
  };

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

export * from '@testing-library/react';
export { customRender as render };
```

---

### 14.3 Component Tests Examples

#### StatusBadge Tests

```typescript
// components/data-display/__tests__/StatusBadge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/utils/test-utils';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders with correct label for active status', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Activ')).toBeInTheDocument();
  });

  it('renders custom label when provided', () => {
    render(<StatusBadge status="active" customLabel="Online" />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('shows icon when showIcon is true', () => {
    render(<StatusBadge status="active" showIcon />);
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('applies correct variant for error status', () => {
    const { container } = render(<StatusBadge status="error" />);
    expect(container.firstChild).toHaveClass('bg-destructive');
  });

  it('handles negotiation states', () => {
    render(<StatusBadge status="won" />);
    expect(screen.getByText('Câștigat')).toBeInTheDocument();
  });

  it('handles e-factura states', () => {
    render(<StatusBadge status="accepted" />);
    expect(screen.getByText('Acceptat')).toBeInTheDocument();
  });

  it('renders in different sizes', () => {
    const { container: small } = render(<StatusBadge status="active" size="sm" />);
    const { container: large } = render(<StatusBadge status="active" size="lg" />);
    
    expect(small.firstChild).toHaveClass('text-xs');
    expect(large.firstChild).toHaveClass('text-base');
  });
});
```

#### ApprovalCard Tests

```typescript
// components/hitl/__tests__/ApprovalCard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/tests/utils/test-utils';
import { ApprovalCard } from '../ApprovalCard';
import { mockApprovalRequest } from '@/tests/utils/test-utils';

describe('ApprovalCard', () => {
  const mockOnApprove = vi.fn();
  const mockOnReject = vi.fn();
  const mockOnViewDetails = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders approval request details', () => {
    const request = mockApprovalRequest();
    render(
      <ApprovalCard
        request={request}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('Discount 25%')).toBeInTheDocument();
    expect(screen.getByText('Test Client')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('shows action buttons for pending status', () => {
    const request = mockApprovalRequest({ status: 'pending' });
    render(
      <ApprovalCard
        request={request}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByRole('button', { name: /aprobă/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /respinge/i })).toBeInTheDocument();
  });

  it('hides action buttons for non-pending status', () => {
    const request = mockApprovalRequest({ status: 'approved' });
    render(
      <ApprovalCard
        request={request}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.queryByRole('button', { name: /aprobă/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /respinge/i })).not.toBeInTheDocument();
  });

  it('calls onApprove when approve button is clicked', async () => {
    const request = mockApprovalRequest();
    const { user } = render(
      <ApprovalCard
        request={request}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onViewDetails={mockOnViewDetails}
      />
    );

    await user.click(screen.getByRole('button', { name: /aprobă/i }));
    
    expect(mockOnApprove).toHaveBeenCalledWith(request.id);
  });

  it('shows urgent styling when SLA is < 2 hours', () => {
    const urgentDeadline = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    const request = mockApprovalRequest({ slaDeadline: urgentDeadline });
    
    const { container } = render(
      <ApprovalCard
        request={request}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(container.firstChild).toHaveClass('border-orange-500');
  });

  it('shows overdue styling when SLA is passed', () => {
    const overdueDeadline = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
    const request = mockApprovalRequest({ slaDeadline: overdueDeadline });
    
    const { container } = render(
      <ApprovalCard
        request={request}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(container.firstChild).toHaveClass('border-red-500');
  });

  it('displays priority badge with correct color', () => {
    const request = mockApprovalRequest({ priority: 'urgent' });
    render(
      <ApprovalCard
        request={request}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onViewDetails={mockOnViewDetails}
      />
    );

    const priorityBadge = screen.getByText('Urgent');
    expect(priorityBadge).toHaveClass('bg-red-100');
  });
});
```

#### ChatMessage Tests

```typescript
// components/ai/__tests__/ChatMessage.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/tests/utils/test-utils';
import { ChatMessage } from '../ChatMessage';

describe('ChatMessage', () => {
  const defaultProps = {
    id: 'msg_123',
    content: 'Test message content',
    role: 'user' as const,
    timestamp: new Date(),
  };

  it('renders user message with correct alignment', () => {
    const { container } = render(<ChatMessage {...defaultProps} />);
    expect(container.firstChild).toHaveClass('justify-end');
  });

  it('renders assistant message with bot icon', () => {
    render(<ChatMessage {...defaultProps} role="assistant" />);
    expect(screen.getByTestId('bot-icon')).toBeInTheDocument();
  });

  it('renders system message centered', () => {
    const { container } = render(<ChatMessage {...defaultProps} role="system" />);
    expect(container.firstChild).toHaveClass('justify-center');
  });

  it('shows sentiment indicator when provided', () => {
    render(
      <ChatMessage
        {...defaultProps}
        sentiment={{ score: 0.8, label: 'positive' }}
      />
    );
    expect(screen.getByText('😊')).toBeInTheDocument();
  });

  it('shows guardrails warning when regenerations > 0', () => {
    render(
      <ChatMessage
        {...defaultProps}
        guardrailsResult={{ passed: true, regenerations: 2, violations: [] }}
      />
    );
    expect(screen.getByText(/Regenerat 2x/)).toBeInTheDocument();
  });

  it('shows error status with retry button', async () => {
    const onRetry = vi.fn();
    const { user } = render(
      <ChatMessage
        {...defaultProps}
        status="error"
        onRetry={onRetry}
      />
    );

    await user.click(screen.getByRole('button', { name: /reîncearcă/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('formats timestamp correctly', () => {
    const timestamp = new Date('2026-01-18T14:30:00');
    render(<ChatMessage {...defaultProps} timestamp={timestamp} />);
    expect(screen.getByText(/14:30/)).toBeInTheDocument();
  });
});
```

---

### 14.4 Integration Tests

Teste de integrare pentru fluxuri complete.

```typescript
// tests/integration/NegotiationFlow.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@/tests/utils/test-utils';
import { NegotiationDetailPage } from '@/pages/negotiations/NegotiationDetailPage';
import { server } from '@/tests/mocks/server';
import { rest } from 'msw';

// Mock API handlers
const handlers = [
  rest.get('/api/v1/negotiations/:id', (req, res, ctx) => {
    return res(ctx.json({
      id: req.params.id,
      state: 'NEGOTIATION',
      leadId: 'lead_123',
      items: [
        { sku: 'SKU-001', quantity: 10, unitPrice: 100, discount: 0 }
      ],
      totalValue: 1000,
    }));
  }),
  
  rest.get('/api/v1/negotiations/:id/messages', (req, res, ctx) => {
    return res(ctx.json({
      messages: [
        { id: '1', role: 'user', content: 'Bună ziua', timestamp: new Date().toISOString() },
        { id: '2', role: 'assistant', content: 'Bună! Cum vă pot ajuta?', timestamp: new Date().toISOString() },
      ]
    }));
  }),
];

describe('NegotiationFlow Integration', () => {
  beforeEach(() => {
    server.use(...handlers);
  });

  it('loads and displays negotiation details', async () => {
    render(<NegotiationDetailPage negotiationId="neg_123" />);

    await waitFor(() => {
      expect(screen.getByText('NEGOTIATION')).toBeInTheDocument();
    });

    expect(screen.getByText('SKU-001')).toBeInTheDocument();
    expect(screen.getByText('1.000 RON')).toBeInTheDocument();
  });

  it('displays conversation history', async () => {
    render(<NegotiationDetailPage negotiationId="neg_123" />);

    await waitFor(() => {
      expect(screen.getByText('Bună ziua')).toBeInTheDocument();
      expect(screen.getByText('Bună! Cum vă pot ajuta?')).toBeInTheDocument();
    });
  });

  it('allows human takeover', async () => {
    const takeoverHandler = rest.post('/api/v1/negotiations/:id/takeover', (req, res, ctx) => {
      return res(ctx.json({ success: true, assignedTo: 'user_123' }));
    });
    server.use(takeoverHandler);

    const { user } = render(<NegotiationDetailPage negotiationId="neg_123" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /preluare/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /preluare/i }));

    await waitFor(() => {
      expect(screen.getByText(/preluat/i)).toBeInTheDocument();
    });
  });

  it('handles state transitions', async () => {
    const transitionHandler = rest.post('/api/v1/negotiations/:id/state', (req, res, ctx) => {
      return res(ctx.json({ 
        previousState: 'NEGOTIATION', 
        newState: 'CLOSING',
        transitionValid: true 
      }));
    });
    server.use(transitionHandler);

    const { user } = render(<NegotiationDetailPage negotiationId="neg_123" />);

    await waitFor(() => {
      expect(screen.getByText('NEGOTIATION')).toBeInTheDocument();
    });

    // Find and click the "Advance to Closing" action
    await user.click(screen.getByRole('button', { name: /closing/i }));

    await waitFor(() => {
      expect(screen.getByText('CLOSING')).toBeInTheDocument();
    });
  });
});
```

---

### 14.5 Accessibility Tests

Teste pentru accesibilitate.

```typescript
// tests/a11y/components.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@/tests/utils/test-utils';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ApprovalCard } from '@/components/hitl/ApprovalCard';
import { ChatMessage } from '@/components/ai/ChatMessage';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { mockApprovalRequest } from '@/tests/utils/test-utils';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('ApprovalCard has no accessibility violations', async () => {
    const { container } = render(
      <ApprovalCard
        request={mockApprovalRequest()}
        onApprove={() => {}}
        onReject={() => {}}
        onViewDetails={() => {}}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ChatMessage has no accessibility violations', async () => {
    const { container } = render(
      <ChatMessage
        id="msg_1"
        content="Test message"
        role="user"
        timestamp={new Date()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('StatusBadge has no accessibility violations', async () => {
    const { container } = render(
      <StatusBadge status="active" showIcon />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Form components have proper labels', async () => {
    const { container } = render(
      <form>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" />
        
        <label htmlFor="message">Message</label>
        <textarea id="message" />
        
        <button type="submit">Submit</button>
      </form>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

---

## 15. Storybook Documentation

Documentare componente cu Storybook pentru development și design review.

### 15.1 Storybook Configuration

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-onboarding',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          '@': '/src',
        },
      },
    };
  },
};

export default config;
```

```typescript
// .storybook/preview.tsx
import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0f172a' },
        { name: 'gray', value: '#f8fafc' },
      ],
    },
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
};

export default preview;
```

---

### 15.2 Component Stories

#### StatusBadge Stories

```typescript
// components/data-display/StatusBadge.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge, statusConfigs } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Components/Data Display/StatusBadge',
  component: StatusBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Badge pentru afișarea statusurilor diverse: generale, negocieri, e-factura, AI.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: Object.keys(statusConfigs),
      description: 'Status predefinit',
    },
    size: {
      control: 'radio',
      options: ['sm', 'default', 'lg'],
    },
    showIcon: {
      control: 'boolean',
    },
    customLabel: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    status: 'active',
    showIcon: true,
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 max-w-xl">
      {Object.keys(statusConfigs).map(status => (
        <StatusBadge 
          key={status} 
          status={status as any} 
          showIcon 
        />
      ))}
    </div>
  ),
};

export const NegotiationStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {['new', 'in_progress', 'pending_approval', 'won', 'lost'].map(status => (
        <StatusBadge 
          key={status} 
          status={status as any} 
          showIcon 
        />
      ))}
    </div>
  ),
};

export const EFacturaStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {['not_submitted', 'pending', 'processing', 'accepted', 'rejected'].map(status => (
        <StatusBadge 
          key={status} 
          status={status as any} 
          showIcon 
        />
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <StatusBadge status="active" showIcon size="sm" />
      <StatusBadge status="active" showIcon size="default" />
      <StatusBadge status="active" showIcon size="lg" />
    </div>
  ),
};

export const CustomLabel: Story = {
  args: {
    status: 'processing',
    showIcon: true,
    customLabel: 'Se verifică...',
  },
};
```

#### ApprovalCard Stories

```typescript
// components/hitl/ApprovalCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ApprovalCard } from './ApprovalCard';
import { action } from '@storybook/addon-actions';

const meta: Meta<typeof ApprovalCard> = {
  title: 'Components/HITL/ApprovalCard',
  component: ApprovalCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Card pentru afișarea și gestionarea cererilor de aprobare HITL.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    request: {
      control: 'object',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const baseRequest = {
  id: 'apr_123',
  type: 'discount' as const,
  title: 'Discount 25% pentru Client ABC',
  description: 'Cerere discount pentru comanda de 50 unități produs XYZ',
  requestedBy: {
    name: 'AI Agent',
    avatar: undefined,
  },
  requestedAt: new Date(),
  slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
  priority: 'high' as const,
  status: 'pending' as const,
  metadata: {
    negotiationId: 'neg_456',
    clientName: 'SC Client ABC SRL',
    productName: 'Fertilizant Premium NPK',
    requestedValue: 25,
    currentValue: 10,
    percentChange: 150,
  },
};

export const Default: Story = {
  args: {
    request: baseRequest,
    onApprove: action('onApprove'),
    onReject: action('onReject'),
    onViewDetails: action('onViewDetails'),
  },
};

export const UrgentDeadline: Story = {
  args: {
    request: {
      ...baseRequest,
      slaDeadline: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
      priority: 'urgent',
    },
    onApprove: action('onApprove'),
    onReject: action('onReject'),
    onViewDetails: action('onViewDetails'),
  },
};

export const OverdueDeadline: Story = {
  args: {
    request: {
      ...baseRequest,
      slaDeadline: new Date(Date.now() - 1 * 60 * 60 * 1000), // -1 hour
      priority: 'urgent',
    },
    onApprove: action('onApprove'),
    onReject: action('onReject'),
    onViewDetails: action('onViewDetails'),
  },
};

export const Approved: Story = {
  args: {
    request: {
      ...baseRequest,
      status: 'approved',
    },
    onApprove: action('onApprove'),
    onReject: action('onReject'),
    onViewDetails: action('onViewDetails'),
  },
};

export const Rejected: Story = {
  args: {
    request: {
      ...baseRequest,
      status: 'rejected',
    },
    onApprove: action('onApprove'),
    onReject: action('onReject'),
    onViewDetails: action('onViewDetails'),
  },
};

export const AllPriorities: Story = {
  render: () => (
    <div className="space-y-4">
      {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
        <ApprovalCard
          key={priority}
          request={{
            ...baseRequest,
            id: `apr_${priority}`,
            priority,
            title: `Request Priority: ${priority}`,
          }}
          onApprove={action('onApprove')}
          onReject={action('onReject')}
          onViewDetails={action('onViewDetails')}
        />
      ))}
    </div>
  ),
};

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4">
      {(['discount', 'price', 'credit', 'custom'] as const).map(type => (
        <ApprovalCard
          key={type}
          request={{
            ...baseRequest,
            id: `apr_${type}`,
            type,
            title: `Request Type: ${type}`,
          }}
          onApprove={action('onApprove')}
          onReject={action('onReject')}
          onViewDetails={action('onViewDetails')}
        />
      ))}
    </div>
  ),
};
```

#### ChatMessage Stories

```typescript
// components/ai/ChatMessage.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ChatMessage } from './ChatMessage';
import { action } from '@storybook/addon-actions';

const meta: Meta<typeof ChatMessage> = {
  title: 'Components/AI/ChatMessage',
  component: ChatMessage,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'gray' },
    docs: {
      description: {
        component: 'Componenta pentru afișarea mesajelor în conversațiile AI.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const UserMessage: Story = {
  args: {
    id: 'msg_1',
    content: 'Bună ziua! Aș dori să aflu mai multe despre produsele dumneavoastră pentru agricultură.',
    role: 'user',
    timestamp: new Date(),
    senderName: 'Ion Popescu',
  },
};

export const AssistantMessage: Story = {
  args: {
    id: 'msg_2',
    content: 'Bună ziua! Cu plăcere vă ajut. Avem o gamă variată de produse pentru agricultură, inclusiv fertilizanți, semințe și echipamente. Ce tip de produse vă interesează în mod special?',
    role: 'assistant',
    timestamp: new Date(),
  },
};

export const SystemMessage: Story = {
  args: {
    id: 'msg_3',
    content: 'Conversația a fost preluată de un operator uman.',
    role: 'system',
    timestamp: new Date(),
  },
};

export const WithSentiment: Story = {
  args: {
    id: 'msg_4',
    content: 'Mulțumesc foarte mult! Exact asta căutam.',
    role: 'user',
    timestamp: new Date(),
    sentiment: { score: 0.85, label: 'positive' },
  },
};

export const WithIntent: Story = {
  args: {
    id: 'msg_5',
    content: 'Cât costă 100kg de fertilizant NPK?',
    role: 'user',
    timestamp: new Date(),
    intent: 'PRICE_INQUIRY',
  },
};

export const WithGuardrails: Story = {
  args: {
    id: 'msg_6',
    content: 'Fertilizantul NPK Premium costă 250 RON pentru 50kg. Putem oferi un discount de 10% pentru comenzi peste 500kg.',
    role: 'assistant',
    timestamp: new Date(),
    guardrailsResult: {
      passed: true,
      violations: [],
      regenerations: 2,
    },
  },
};

export const ErrorStatus: Story = {
  args: {
    id: 'msg_7',
    content: 'Mesaj eșuat...',
    role: 'assistant',
    timestamp: new Date(),
    status: 'error',
    onRetry: action('onRetry'),
  },
};

export const SendingStatus: Story = {
  args: {
    id: 'msg_8',
    content: 'Se trimite acest mesaj...',
    role: 'user',
    timestamp: new Date(),
    status: 'sending',
  },
};

export const FullConversation: Story = {
  render: () => (
    <div className="space-y-4">
      <ChatMessage
        id="1"
        content="Bună ziua!"
        role="user"
        timestamp={new Date(Date.now() - 5 * 60 * 1000)}
        senderName="Ion Popescu"
      />
      <ChatMessage
        id="2"
        content="Bună ziua! Cu ce vă pot ajuta astăzi?"
        role="assistant"
        timestamp={new Date(Date.now() - 4 * 60 * 1000)}
      />
      <ChatMessage
        id="3"
        content="Caut fertilizanți pentru grâu. Ce îmi recomandați?"
        role="user"
        timestamp={new Date(Date.now() - 3 * 60 * 1000)}
        senderName="Ion Popescu"
        intent="PRODUCT_INQUIRY"
      />
      <ChatMessage
        id="4"
        content="Pentru grâu vă recomand Fertilizantul NPK 15-15-15. Este ideal pentru această cultură și avem în stoc 5000kg disponibili imediat."
        role="assistant"
        timestamp={new Date(Date.now() - 2 * 60 * 1000)}
        guardrailsResult={{ passed: true, violations: [], regenerations: 0 }}
      />
      <ChatMessage
        id="5"
        content="Perfect! La ce preț?"
        role="user"
        timestamp={new Date(Date.now() - 1 * 60 * 1000)}
        senderName="Ion Popescu"
        sentiment={{ score: 0.7, label: 'positive' }}
      />
    </div>
  ),
};
```

#### EFacturaStatusBadge Stories

```typescript
// components/integrations/EFacturaStatusBadge.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { EFacturaStatusBadge } from './EFacturaStatusBadge';
import { action } from '@storybook/addon-actions';

const meta: Meta<typeof EFacturaStatusBadge> = {
  title: 'Components/Integrations/EFacturaStatusBadge',
  component: EFacturaStatusBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Badge pentru afișarea statusului e-Factura SPV.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const NotSubmitted: Story = {
  args: {
    status: 'not_submitted',
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  },
};

export const UrgentDeadline: Story = {
  args: {
    status: 'not_submitted',
    deadline: new Date(Date.now() + 36 * 60 * 60 * 1000), // 36 hours
    showDeadline: true,
  },
};

export const CriticalDeadline: Story = {
  args: {
    status: 'not_submitted',
    deadline: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
    showDeadline: true,
  },
};

export const Overdue: Story = {
  args: {
    status: 'overdue',
    deadline: new Date(Date.now() - 24 * 60 * 60 * 1000),
    showDeadline: true,
  },
};

export const Uploaded: Story = {
  args: {
    status: 'uploaded',
    indexUpload: '12345678901234567890',
    uploadedAt: new Date(Date.now() - 30 * 60 * 1000),
  },
};

export const Processing: Story = {
  args: {
    status: 'processing',
    indexUpload: '12345678901234567890',
    uploadedAt: new Date(Date.now() - 60 * 60 * 1000),
  },
};

export const Accepted: Story = {
  args: {
    status: 'accepted',
    indexUpload: '12345678901234567890',
    indexDescarcare: '09876543210987654321',
    uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    responseAt: new Date(Date.now() - 30 * 60 * 1000),
    onDownloadResponse: action('onDownloadResponse'),
  },
};

export const AcceptedWithWarnings: Story = {
  args: {
    status: 'accepted_with_warnings',
    indexUpload: '12345678901234567890',
    indexDescarcare: '09876543210987654321',
    warnings: [
      'Avertisment 1: CIF parțial validat',
      'Avertisment 2: Adresa incompletă',
    ],
    onDownloadResponse: action('onDownloadResponse'),
  },
};

export const Rejected: Story = {
  args: {
    status: 'rejected',
    indexUpload: '12345678901234567890',
    errors: [
      'Eroare 1: CIF invalid',
      'Eroare 2: Total incorect',
      'Eroare 3: TVA lipsă',
    ],
    onRetry: action('onRetry'),
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {[
        'not_required',
        'not_submitted',
        'pending_upload',
        'uploaded',
        'processing',
        'accepted',
        'accepted_with_warnings',
        'rejected',
        'error',
        'overdue',
      ].map(status => (
        <EFacturaStatusBadge
          key={status}
          status={status as any}
          indexUpload="12345678901234567890"
        />
      ))}
    </div>
  ),
};
```

---

### 15.3 Documentation Pages

Pagini MDX pentru documentare detaliată.

```mdx
{/* components/Introduction.mdx */}
import { Meta } from '@storybook/blocks';

<Meta title="Introduction" />

# Cerniq UI Component Library - Etapa 3

Bine ați venit în biblioteca de componente UI pentru Etapa 3 - AI Sales Agent.

## Categorii de Componente

### 🎨 Design System Foundation
- Culori, tipografie, spacing
- Variante și teme

### 📊 Data Display
- StatusBadge, DataTable, StatCard
- Timeline, ProgressBar, Avatar

### 📝 Form Components
- FormField, SearchInput, DateRangePicker
- SelectMultiple, ConditionBuilder

### 💬 AI Components
- ChatMessage, SentimentIndicator
- GuardrailsBadge, AIStatusIndicator

### ✅ HITL Components
- ApprovalCard, EscalationAlert
- TakeoverPanel

### 🔌 Integration Components
- OblioStatusBadge, ANAFStatusBadge
- EFacturaStatusBadge, ChannelIcon

### 📈 Chart Components
- AreaChartCard, PieChartCard
- BarChartCard, LineChartCard

## Utilizare

```tsx
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { ApprovalCard } from '@/components/hitl/ApprovalCard';
import { ChatMessage } from '@/components/ai/ChatMessage';

// Exemplu
<StatusBadge status="active" showIcon />
```

## Convenții

1. **Toate componentele folosesc TypeScript** cu tipuri explicite
2. **Shadcn/ui** ca bază pentru componente primitive
3. **Tailwind CSS v4** pentru styling
4. **Lucide React** pentru iconuri
5. **date-fns cu locale ro** pentru formatare date
6. **Recharts** pentru grafice

## Testare

- **Vitest** pentru unit tests
- **Testing Library** pentru component tests
- **Axe** pentru accessibility tests
- **Storybook** pentru visual tests

```

---

### 15.4 Running Storybook

Comenzi pentru rulare și build Storybook.

```bash
# Development
npm run storybook

# Build static
npm run build-storybook

# Test Storybook
npm run test-storybook
```

```json
// package.json scripts
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build -o storybook-static",
    "test-storybook": "test-storybook",
    "chromatic": "npx chromatic --project-token=$CHROMATIC_PROJECT_TOKEN"
  }
}
```

---

## 16. Export Index

Index pentru export centralizat al tuturor componentelor.

```typescript
// components/index.ts

// Layout Components
export { SalesLayout } from './layout/SalesLayout';
export { PageHeader } from './layout/PageHeader';
export { Section } from './layout/Section';
export { SplitView } from './layout/SplitView';
export { ResponsiveGrid } from './layout/ResponsiveGrid';

// Navigation Components
export { Sidebar } from './navigation/Sidebar';
export { Breadcrumbs } from './navigation/Breadcrumbs';
export { TabNavigation } from './navigation/TabNavigation';
export { StepIndicator } from './navigation/StepIndicator';
export { QuickActions } from './navigation/QuickActions';
export { CommandPalette } from './navigation/CommandPalette';

// Data Display Components
export { DataTable } from './data-display/DataTable';
export { StatCard } from './data-display/StatCard';
export { Timeline } from './data-display/Timeline';
export { StatusBadge } from './data-display/StatusBadge';
export { ProgressBar } from './data-display/ProgressBar';
export { Avatar, AvatarGroup } from './data-display/Avatar';
export { EmptyState } from './data-display/EmptyState';

// Form Components
export { FormField } from './forms/FormField';
export { SearchInput } from './forms/SearchInput';
export { DateRangePicker } from './forms/DateRangePicker';
export { SelectMultiple } from './forms/SelectMultiple';
export { ConditionBuilder } from './forms/ConditionBuilder';
export { PriceInput } from './forms/PriceInput';
export { PercentInput } from './forms/PercentInput';
export { FileUpload } from './forms/FileUpload';

// Feedback Components
export { LoadingSpinner, LoadingSkeleton, LoadingCard, LoadingTable } from './feedback/LoadingSpinner';
export { Toast, ToastProvider, useToast, useSuccessToast, useErrorToast } from './feedback/Toast';
export { ConfirmDialog, DeleteConfirmDialog, LogoutConfirmDialog } from './feedback/ConfirmDialog';
export { ErrorBoundary, withErrorBoundary } from './feedback/ErrorBoundary';
export { AlertBanner, MaintenanceBanner, TrialExpiringBanner } from './feedback/AlertBanner';
export { TooltipExtended, InfoTooltip, TruncatedWithTooltip } from './feedback/TooltipExtended';

// Chart Components
export { AreaChartCard } from './charts/AreaChartCard';
export { PieChartCard } from './charts/PieChartCard';
export { BarChartCard } from './charts/BarChartCard';
export { LineChartCard } from './charts/LineChartCard';
export { MetricSparkline } from './charts/MetricSparkline';

// AI Components
export { ChatMessage } from './ai/ChatMessage';
export { SentimentIndicator, SentimentTrend } from './ai/SentimentIndicator';
export { GuardrailsBadge } from './ai/GuardrailsBadge';
export { AIStatusIndicator } from './ai/AIStatusIndicator';

// HITL Components
export { ApprovalCard } from './hitl/ApprovalCard';
export { EscalationAlert } from './hitl/EscalationAlert';
export { TakeoverPanel } from './hitl/TakeoverPanel';

// Document Components
export { PDFViewer } from './documents/PDFViewer';
export { DocumentCard } from './documents/DocumentCard';
export { DocumentStatusBadge } from './documents/DocumentStatusBadge';

// Integration Components
export { OblioStatusBadge } from './integrations/OblioStatusBadge';
export { OblioIntegrationCard } from './integrations/OblioIntegrationCard';
export { ANAFStatusBadge } from './integrations/ANAFStatusBadge';
export { EFacturaStatusBadge } from './integrations/EFacturaStatusBadge';
export { ChannelIcon, ChannelIcons } from './integrations/ChannelIcon';
export { IntegrationStatusCard } from './integrations/IntegrationStatusCard';
export { WebhookStatusIndicator } from './integrations/WebhookStatusIndicator';

// Utility Components
export { CopyToClipboard, InlineCopy } from './utils/CopyToClipboard';
export { ConfirmAction } from './utils/ConfirmAction';
export { KeyboardShortcut, useKeyboardShortcut } from './utils/KeyboardShortcut';

// Hooks
export { useDebounce, useDebouncedCallback, useDebounceWithLoading } from '@/hooks/useDebounce';
export { useLocalStorage } from '@/hooks/useLocalStorage';
export { useAsync, useFetch } from '@/hooks/useAsync';
export { useInterval, usePolling } from '@/hooks/useInterval';
export { useClickOutside, useClickOutsideMultiple } from '@/hooks/useClickOutside';

// Types
export type { OblioSyncStatus } from './integrations/OblioStatusBadge';
export type { ANAFVerificationStatus, ANAFVATStatus } from './integrations/ANAFStatusBadge';
export type { EFacturaStatus } from './integrations/EFacturaStatusBadge';
export type { ChannelType } from './integrations/ChannelIcon';
export type { IntegrationStatus } from './integrations/IntegrationStatusCard';
export type { WebhookStatus } from './integrations/WebhookStatusIndicator';
export type { AIStatus } from './ai/AIStatusIndicator';
export type { ApprovalRequest } from './hitl/ApprovalCard';
export type { Escalation } from './hitl/EscalationAlert';
```

---

**Document Version:** 1.0.0  
**Last Updated:** Ianuarie 2026  
**Total Componente:** 65+  
**Total Hooks:** 8  
**Categorii:** 12  
**Linii Cod:** ~10,000+

---

## Referințe

- [Shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Recharts](https://recharts.org)
- [Lucide Icons](https://lucide.dev)
- [date-fns](https://date-fns.org)
- [TanStack Table](https://tanstack.com/table)
- [React Hook Form](https://react-hook-form.com)
- [Framer Motion](https://www.framer.com/motion/)
- [Storybook](https://storybook.js.org)
- [Vitest](https://vitest.dev)
- [Testing Library](https://testing-library.com)
