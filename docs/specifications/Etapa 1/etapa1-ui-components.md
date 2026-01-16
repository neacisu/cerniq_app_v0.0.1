# CERNIQ.APP — ETAPA 1: UI COMPONENTS
## Componente Reutilizabile React
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. DESIGN SYSTEM BASE

## 1.1 Color Palette (Tailwind v4)

```css
/* src/styles/theme.css */
@theme {
  /* Primary - Blue */
  --color-primary-50: oklch(0.97 0.01 250);
  --color-primary-100: oklch(0.93 0.03 250);
  --color-primary-500: oklch(0.55 0.2 250);
  --color-primary-600: oklch(0.48 0.22 250);
  --color-primary-700: oklch(0.40 0.2 250);
  
  /* Success - Green */
  --color-success-50: oklch(0.97 0.02 145);
  --color-success-500: oklch(0.55 0.18 145);
  --color-success-600: oklch(0.48 0.18 145);
  
  /* Warning - Orange */
  --color-warning-50: oklch(0.97 0.03 70);
  --color-warning-500: oklch(0.70 0.18 55);
  --color-warning-600: oklch(0.60 0.18 50);
  
  /* Danger - Red */
  --color-danger-50: oklch(0.97 0.02 25);
  --color-danger-500: oklch(0.55 0.2 25);
  --color-danger-600: oklch(0.48 0.22 25);
  
  /* Bronze Layer */
  --color-bronze-100: oklch(0.90 0.05 60);
  --color-bronze-500: oklch(0.60 0.12 55);
  
  /* Silver Layer */
  --color-silver-100: oklch(0.95 0.01 250);
  --color-silver-500: oklch(0.65 0.02 250);
  
  /* Gold Layer */
  --color-gold-100: oklch(0.95 0.06 85);
  --color-gold-500: oklch(0.75 0.15 85);
}
```

## 1.2 Typography Scale

```css
@theme {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
}
```

---

# 2. BASE COMPONENTS

## 2.1 Button Component

```tsx
// src/components/ui/button.tsx

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md 
   text-sm font-medium transition-colors focus-visible:outline-none 
   focus-visible:ring-2 focus-visible:ring-offset-2 
   disabled:pointer-events-none disabled:opacity-50`,
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
        destructive: 'bg-danger-600 text-white hover:bg-danger-700 focus-visible:ring-danger-500',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50 focus-visible:ring-primary-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500',
        ghost: 'hover:bg-gray-100 focus-visible:ring-gray-500',
        link: 'text-primary-600 underline-offset-4 hover:underline',
        success: 'bg-success-600 text-white hover:bg-success-700 focus-visible:ring-success-500',
        warning: 'bg-warning-600 text-white hover:bg-warning-700 focus-visible:ring-warning-500',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

## 2.2 Badge Component

```tsx
// src/components/ui/badge.tsx

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary-100 text-primary-800',
        secondary: 'bg-gray-100 text-gray-800',
        success: 'bg-success-100 text-success-800',
        warning: 'bg-warning-100 text-warning-800',
        destructive: 'bg-danger-100 text-danger-800',
        outline: 'border border-gray-300 text-gray-700',
        
        // Layer badges
        bronze: 'bg-bronze-100 text-bronze-800 border border-bronze-300',
        silver: 'bg-silver-100 text-silver-800 border border-silver-300',
        gold: 'bg-gold-100 text-gold-800 border border-gold-300',
        
        // Status badges
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-gray-100 text-gray-600',
        pending: 'bg-yellow-100 text-yellow-800',
        processing: 'bg-blue-100 text-blue-800',
        failed: 'bg-red-100 text-red-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

## 2.3 Card Component

```tsx
// src/components/ui/card.tsx

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-gray-200 bg-white shadow-sm',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-gray-500', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

---

# 3. DATA DISPLAY COMPONENTS

## 3.1 KPI Card

```tsx
// src/components/dashboard/kpi-card.tsx

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'bronze' | 'silver' | 'gold';
  href?: string;
  loading?: boolean;
}

const colorClasses = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
  bronze: 'bg-bronze-100 text-bronze-600',
  silver: 'bg-silver-100 text-silver-600',
  gold: 'bg-gold-100 text-gold-600',
};

export function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = 'primary',
  href,
  loading,
}: KPICardProps) {
  const Wrapper = href ? 'a' : 'div';
  
  return (
    <Card className={cn(
      'transition-all',
      href && 'hover:shadow-md cursor-pointer'
    )}>
      <Wrapper href={href}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">{title}</p>
              {loading ? (
                <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
              ) : (
                <p className="text-3xl font-bold text-gray-900">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
              )}
              {change !== undefined && (
                <div className="flex items-center gap-1">
                  {change >= 0 ? (
                    <TrendingUpIcon className="w-4 h-4 text-success-500" />
                  ) : (
                    <TrendingDownIcon className="w-4 h-4 text-danger-500" />
                  )}
                  <span className={cn(
                    'text-sm font-medium',
                    change >= 0 ? 'text-success-600' : 'text-danger-600'
                  )}>
                    {change >= 0 ? '+' : ''}{change}
                  </span>
                  {changeLabel && (
                    <span className="text-sm text-gray-500">{changeLabel}</span>
                  )}
                </div>
              )}
            </div>
            {icon && (
              <div className={cn(
                'p-3 rounded-lg',
                colorClasses[color]
              )}>
                {icon}
              </div>
            )}
          </div>
        </CardContent>
      </Wrapper>
    </Card>
  );
}
```

## 3.2 Quality Score Badge

```tsx
// src/components/data/quality-score-badge.tsx

import { cn } from '@/lib/utils';

interface QualityScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function QualityScoreBadge({ score, showLabel = true, size = 'md' }: QualityScoreBadgeProps) {
  const getColorClass = (score: number) => {
    if (score >= 70) return 'bg-success-100 text-success-800 border-success-300';
    if (score >= 40) return 'bg-warning-100 text-warning-800 border-warning-300';
    return 'bg-danger-100 text-danger-800 border-danger-300';
  };
  
  const getLabel = (score: number) => {
    if (score >= 70) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-medium',
      getColorClass(score),
      sizeClasses[size]
    )}>
      <span className="font-bold">{score}</span>
      {showLabel && <span className="text-xs opacity-75">/ {getLabel(score)}</span>}
    </span>
  );
}
```

## 3.3 Enrichment Status Badge

```tsx
// src/components/data/enrichment-status-badge.tsx

import { Badge } from '@/components/ui/badge';
import { CheckCircleIcon, ClockIcon, AlertCircleIcon, XCircleIcon, LoaderIcon } from 'lucide-react';

type EnrichmentStatus = 'pending' | 'in_progress' | 'partial' | 'complete' | 'failed';

interface EnrichmentStatusBadgeProps {
  status: EnrichmentStatus;
}

const statusConfig: Record<EnrichmentStatus, {
  label: string;
  variant: 'pending' | 'processing' | 'warning' | 'success' | 'destructive';
  icon: React.ReactNode;
}> = {
  pending: {
    label: 'Pending',
    variant: 'pending',
    icon: <ClockIcon className="w-3 h-3" />,
  },
  in_progress: {
    label: 'Processing',
    variant: 'processing',
    icon: <LoaderIcon className="w-3 h-3 animate-spin" />,
  },
  partial: {
    label: 'Partial',
    variant: 'warning',
    icon: <AlertCircleIcon className="w-3 h-3" />,
  },
  complete: {
    label: 'Complete',
    variant: 'success',
    icon: <CheckCircleIcon className="w-3 h-3" />,
  },
  failed: {
    label: 'Failed',
    variant: 'destructive',
    icon: <XCircleIcon className="w-3 h-3" />,
  },
};

export function EnrichmentStatusBadge({ status }: EnrichmentStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}
```

## 3.4 Layer Badge

```tsx
// src/components/data/layer-badge.tsx

import { Badge } from '@/components/ui/badge';

type Layer = 'bronze' | 'silver' | 'gold';

interface LayerBadgeProps {
  layer: Layer;
}

export function LayerBadge({ layer }: LayerBadgeProps) {
  return (
    <Badge variant={layer} className="uppercase tracking-wider text-xs">
      {layer}
    </Badge>
  );
}
```

## 3.5 SLA Countdown

```tsx
// src/components/approvals/sla-countdown.tsx

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface SLACountdownProps {
  dueAt: string | Date;
  onExpire?: () => void;
}

export function SLACountdown({ dueAt, onExpire }: SLACountdownProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(dueAt));
  
  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(dueAt);
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft.total <= 0 && onExpire) {
        onExpire();
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [dueAt, onExpire]);
  
  const urgency = getUrgency(timeLeft.total);
  
  return (
    <div className={cn(
      'text-sm font-medium',
      urgency === 'critical' && 'text-danger-600',
      urgency === 'warning' && 'text-warning-600',
      urgency === 'normal' && 'text-gray-600'
    )}>
      {timeLeft.total <= 0 ? (
        <span className="text-danger-600 font-bold">EXPIRED</span>
      ) : (
        <span>
          {timeLeft.hours > 0 && `${timeLeft.hours}h `}
          {timeLeft.minutes}m {timeLeft.seconds}s
        </span>
      )}
    </div>
  );
}

function calculateTimeLeft(dueAt: string | Date) {
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  const total = due - now;
  
  return {
    total,
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / 1000 / 60) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

function getUrgency(totalMs: number): 'critical' | 'warning' | 'normal' {
  const hours = totalMs / (1000 * 60 * 60);
  if (hours <= 1) return 'critical';
  if (hours <= 4) return 'warning';
  return 'normal';
}
```

---

# 4. FORM COMPONENTS

## 4.1 Search Input

```tsx
// src/components/ui/search-input.tsx

import { forwardRef, useState } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, onClear, ...props }, ref) => {
    const [localValue, setLocalValue] = useState(value || '');
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
      onChange?.(e);
    };
    
    const handleClear = () => {
      setLocalValue('');
      onClear?.();
    };
    
    return (
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={ref}
          type="text"
          value={localValue}
          onChange={handleChange}
          className={cn(
            'flex h-10 w-full rounded-md border border-gray-300 bg-white',
            'pl-10 pr-10 py-2 text-sm',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';
```

## 4.2 Select with Search

```tsx
// src/components/ui/searchable-select.tsx

import { useState, useMemo } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

---

# 5. FEEDBACK COMPONENTS

## 5.1 Empty State

```tsx
// src/components/ui/empty-state.tsx

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {icon && (
        <div className="mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-500 max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}
```

## 5.2 Loading Skeleton

```tsx
// src/components/ui/skeleton.tsx

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: number | string;
  height?: number | string;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200',
        variant === 'text' && 'rounded',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-md',
        className
      )}
      style={{ width, height }}
      {...props}
    />
  );
}

// Pre-built skeleton patterns
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height={20} />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton height={24} width="60%" />
      <Skeleton height={16} />
      <Skeleton height={16} width="80%" />
    </div>
  );
}
```

## 5.3 Toast Notifications

```tsx
// src/components/ui/toast.tsx

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { XIcon, CheckCircleIcon, AlertCircleIcon, InfoIcon, AlertTriangleIcon } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircleIcon className="w-5 h-5 text-success-500" />,
  error: <AlertCircleIcon className="w-5 h-5 text-danger-500" />,
  warning: <AlertTriangleIcon className="w-5 h-5 text-warning-500" />,
  info: <InfoIcon className="w-5 h-5 text-primary-500" />,
};

const toastStyles: Record<ToastType, string> = {
  success: 'border-success-200 bg-success-50',
  error: 'border-danger-200 bg-danger-50',
  warning: 'border-warning-200 bg-warning-50',
  info: 'border-primary-200 bg-primary-50',
};

export function Toast({ id, type, title, description, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);
  
  return (
    <div
      className={cn(
        'flex items-start gap-3 w-80 p-4 rounded-lg border shadow-lg',
        'animate-in slide-in-from-right-full',
        toastStyles[type]
      )}
    >
      {toastIcons[type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="text-gray-400 hover:text-gray-600"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: { toasts: ToastProps[]; onClose: (id: string) => void }) {
  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>,
    document.body
  );
}
```

---

**Document generat:** 15 Ianuarie 2026
**Total componente:** 20+
