# CERNIQ.APP — ETAPA 2: UI COMPONENTS LIBRARY

## Complete Component Specifications for Cold Outreach Interface

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. COMPONENT HIERARCHY

```text
components/
├── outreach/
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   ├── QuotaUsageGrid.tsx
│   │   ├── ChannelPerformanceChart.tsx
│   │   ├── LeadFunnelChart.tsx
│   │   └── RecentActivityFeed.tsx
│   ├── leads/
│   │   ├── LeadsDataTable.tsx
│   │   ├── LeadCard.tsx
│   │   ├── LeadFilters.tsx
│   │   ├── LeadActions.tsx
│   │   └── LeadStateHistory.tsx
│   ├── conversation/
│   │   ├── ConversationTimeline.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   └── MessageStatusIcon.tsx
│   ├── phones/
│   │   ├── PhoneCard.tsx
│   │   ├── PhoneStatusBadge.tsx
│   │   └── QuotaProgress.tsx
│   ├── sequences/
│   │   ├── SequenceCard.tsx
│   │   ├── SequenceBuilder.tsx
│   │   ├── StepEditor.tsx
│   │   └── SequenceMetrics.tsx
│   ├── templates/
│   │   ├── TemplateEditor.tsx
│   │   ├── SpintaxHighlighter.tsx
│   │   ├── VariableInserter.tsx
│   │   └── TemplatePreview.tsx
│   ├── review/
│   │   ├── ReviewCard.tsx
│   │   ├── ReviewActions.tsx
│   │   ├── SLACountdown.tsx
│   │   └── TakeoverDialog.tsx
│   └── shared/
│       ├── StageBadge.tsx
│       ├── ChannelIcon.tsx
│       ├── SentimentIndicator.tsx
│       └── PriorityBadge.tsx
```

---

## 2. SHARED COMPONENTS

### 2.1 StageBadge

```tsx
// components/outreach/shared/StageBadge.tsx

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const stageConfig: Record<string, { label: string; color: string; icon?: string }> = {
  COLD: { 
    label: 'Cold', 
    color: 'bg-slate-500 hover:bg-slate-600',
  },
  CONTACTED_WA: { 
    label: 'Contactat WA', 
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  CONTACTED_EMAIL: { 
    label: 'Contactat Email', 
    color: 'bg-indigo-500 hover:bg-indigo-600',
  },
  WARM_REPLY: { 
    label: 'Răspuns Primit', 
    color: 'bg-green-500 hover:bg-green-600',
  },
  NEGOTIATION: { 
    label: 'În Negociere', 
    color: 'bg-amber-500 hover:bg-amber-600',
  },
  CONVERTED: { 
    label: 'Convertit', 
    color: 'bg-emerald-600 hover:bg-emerald-700',
  },
  DEAD: { 
    label: 'Pierdut', 
    color: 'bg-red-500 hover:bg-red-600',
  },
  PAUSED: { 
    label: 'Pauză', 
    color: 'bg-gray-500 hover:bg-gray-600',
  },
};

interface StageBadgeProps {
  stage: string;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function StageBadge({ 
  stage, 
  size = 'default', 
  showIcon = false,
  className 
}: StageBadgeProps) {
  const config = stageConfig[stage] || { 
    label: stage, 
    color: 'bg-gray-500' 
  };
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge 
      className={cn(
        config.color,
        'text-white font-medium',
        sizeClasses[size],
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
```

### 2.2 ChannelIcon

```tsx
// components/outreach/shared/ChannelIcon.tsx

import { MessageCircle, Mail, Phone, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const channelConfig: Record<string, { 
  icon: React.ComponentType<any>; 
  color: string; 
  label: string;
}> = {
  WHATSAPP: { 
    icon: MessageCircle, 
    color: 'text-green-500', 
    label: 'WhatsApp' 
  },
  EMAIL_COLD: { 
    icon: Mail, 
    color: 'text-blue-500', 
    label: 'Email Cold (Instantly)' 
  },
  EMAIL_WARM: { 
    icon: Mail, 
    color: 'text-amber-500', 
    label: 'Email Warm (Resend)' 
  },
  PHONE: { 
    icon: Phone, 
    color: 'text-purple-500', 
    label: 'Telefon' 
  },
  MANUAL: { 
    icon: Hand, 
    color: 'text-gray-500', 
    label: 'Manual' 
  },
};

interface ChannelIconProps {
  channel: string;
  size?: 'xs' | 'sm' | 'default' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export function ChannelIcon({ 
  channel, 
  size = 'default', 
  showTooltip = true,
  className 
}: ChannelIconProps) {
  const config = channelConfig[channel] || channelConfig.MANUAL;
  const Icon = config.icon;
  
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    default: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const iconElement = (
    <Icon className={cn(sizeClasses[size], config.color, className)} />
  );

  if (!showTooltip) return iconElement;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {iconElement}
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

### 2.3 SentimentIndicator

```tsx
// components/outreach/shared/SentimentIndicator.tsx

import { ThumbsUp, ThumbsDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface SentimentIndicatorProps {
  score: number;  // -100 to +100
  showLabel?: boolean;
  showScore?: boolean;
  variant?: 'icon' | 'bar' | 'compact';
  className?: string;
}

export function SentimentIndicator({ 
  score, 
  showLabel = false, 
  showScore = true,
  variant = 'icon',
  className 
}: SentimentIndicatorProps) {
  
  const getConfig = (s: number) => {
    if (s >= 50) return { 
      color: 'text-green-500', 
      bgColor: 'bg-green-500',
      label: 'Pozitiv',
      Icon: ThumbsUp 
    };
    if (s >= 0) return { 
      color: 'text-yellow-500', 
      bgColor: 'bg-yellow-500',
      label: 'Neutru',
      Icon: Minus 
    };
    if (s >= -50) return { 
      color: 'text-orange-500', 
      bgColor: 'bg-orange-500',
      label: 'Negativ',
      Icon: ThumbsDown 
    };
    return { 
      color: 'text-red-500', 
      bgColor: 'bg-red-500',
      label: 'Foarte Negativ',
      Icon: AlertTriangle 
    };
  };

  const config = getConfig(score);
  const { Icon } = config;

  if (variant === 'bar') {
    // Normalize score from -100..100 to 0..100
    const normalizedScore = (score + 100) / 2;
    
    return (
      <div className={cn('w-full', className)}>
        <div className="flex justify-between text-xs mb-1">
          <span className={config.color}>{config.label}</span>
          {showScore && <span className="font-mono">{score}</span>}
        </div>
        <Progress 
          value={normalizedScore} 
          className="h-2"
          indicatorClassName={config.bgColor}
        />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <span className={cn('inline-flex items-center gap-1', config.color, className)}>
        <Icon className="w-3 h-3" />
        {showScore && <span className="text-xs font-mono">{score}</span>}
      </span>
    );
  }

  // Default icon variant
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Icon className={cn('w-5 h-5', config.color)} />
      {showScore && (
        <span className={cn('font-medium', config.color)}>{score}</span>
      )}
      {showLabel && (
        <span className="text-sm text-muted-foreground">({config.label})</span>
      )}
    </div>
  );
}
```

### 2.4 PriorityBadge

```tsx
// components/outreach/shared/PriorityBadge.tsx

import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const priorityConfig: Record<string, {
  label: string;
  color: string;
  icon: React.ComponentType<any>;
}> = {
  URGENT: {
    label: 'Urgent',
    color: 'bg-red-500 text-white animate-pulse',
    icon: AlertCircle,
  },
  HIGH: {
    label: 'High',
    color: 'bg-orange-500 text-white',
    icon: AlertTriangle,
  },
  MEDIUM: {
    label: 'Medium',
    color: 'bg-yellow-500 text-black',
    icon: Info,
  },
  LOW: {
    label: 'Low',
    color: 'bg-gray-400 text-white',
    icon: ChevronDown,
  },
};

interface PriorityBadgeProps {
  priority: string;
  showIcon?: boolean;
  className?: string;
}

export function PriorityBadge({ 
  priority, 
  showIcon = true, 
  className 
}: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.MEDIUM;
  const Icon = config.icon;

  return (
    <Badge className={cn(config.color, 'font-medium', className)}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
}
```

---

## 3. DASHBOARD COMPONENTS

### 3.1 KPICard

```tsx
// components/outreach/dashboard/KPICard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;  // Percentage change
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  className?: string;
}

export function KPICard({
  title,
  value,
  change,
  icon,
  variant = 'default',
  trend,
  subtitle,
  className,
}: KPICardProps) {
  const variantStyles = {
    default: 'border-border',
    success: 'border-green-500 bg-green-50',
    warning: 'border-amber-500 bg-amber-50',
    danger: 'border-red-500 bg-red-50',
  };

  const getTrendIcon = () => {
    if (trend === 'up' || (change && change > 0)) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    }
    if (trend === 'down' || (change && change < 0)) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = () => {
    if (change === undefined) return 'text-muted-foreground';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(change !== undefined || subtitle) && (
          <div className="flex items-center gap-2 mt-1">
            {change !== undefined && (
              <>
                {getTrendIcon()}
                <span className={cn('text-sm font-medium', getChangeColor())}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
              </>
            )}
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 3.2 QuotaUsageGrid

```tsx
// components/outreach/dashboard/QuotaUsageGrid.tsx

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Phone {
  id: string;
  label: string;
  phoneNumber: string;
  status: 'ACTIVE' | 'PAUSED' | 'OFFLINE' | 'BANNED' | 'QUARANTINE';
  quotaUsed: number;
  quotaLimit: number;
  lastMessageSentAt?: string;
}

interface QuotaUsageGridProps {
  phones: Phone[];
  onPhoneClick?: (phoneId: string) => void;
}

export function QuotaUsageGrid({ phones, onPhoneClick }: QuotaUsageGridProps) {
  const router = useRouter();

  const getStatusColor = (phone: Phone) => {
    if (phone.status === 'BANNED') return 'bg-red-600';
    if (phone.status === 'OFFLINE') return 'bg-gray-400';
    if (phone.status === 'PAUSED') return 'bg-yellow-400';
    if (phone.status === 'QUARANTINE') return 'bg-orange-400';
    
    const percent = (phone.quotaUsed / phone.quotaLimit) * 100;
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 90) return 'bg-amber-500';
    if (percent >= 70) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  const handleClick = (phoneId: string) => {
    if (onPhoneClick) {
      onPhoneClick(phoneId);
    } else {
      router.push(`/outreach/phones/${phoneId}`);
    }
  };

  return (
    <div className="grid grid-cols-10 gap-2">
      {phones.map((phone) => {
        const percent = (phone.quotaUsed / phone.quotaLimit) * 100;
        const statusColor = getStatusColor(phone);
        
        return (
          <Tooltip key={phone.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleClick(phone.id)}
                className="relative group focus:outline-none focus:ring-2 focus:ring-primary rounded"
              >
                <div className="w-full h-16 bg-muted rounded overflow-hidden border border-border group-hover:border-primary transition-colors">
                  <div 
                    className={cn(
                      'absolute bottom-0 w-full transition-all duration-300',
                      statusColor
                    )}
                    style={{ height: `${Math.min(percent, 100)}%` }}
                  />
                  {phone.status !== 'ACTIVE' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-white bg-black/50 px-1 rounded">
                        {phone.status.slice(0, 3)}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-center block mt-1 truncate">
                  {phone.label}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium">{phone.phoneNumber}</p>
                <p>Status: <span className="font-mono">{phone.status}</span></p>
                <p>Utilizare: <span className="font-mono">{phone.quotaUsed}/{phone.quotaLimit}</span></p>
                <p className="text-xs text-muted-foreground">
                  Click pentru detalii
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
```

### 3.3 LeadFunnelChart

```tsx
// components/outreach/dashboard/LeadFunnelChart.tsx

import { useMemo } from 'react';

interface FunnelStage {
  name: string;
  count: number;
  color: string;
}

interface LeadFunnelChartProps {
  stages: FunnelStage[];
  showPercentage?: boolean;
  height?: number;
}

export function LeadFunnelChart({ 
  stages, 
  showPercentage = true,
  height = 300 
}: LeadFunnelChartProps) {
  const maxCount = useMemo(() => Math.max(...stages.map(s => s.count)), [stages]);
  const totalCount = useMemo(() => stages.reduce((sum, s) => sum + s.count, 0), [stages]);

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex flex-col gap-2 h-full justify-center">
        {stages.map((stage, index) => {
          const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const ofTotal = totalCount > 0 ? ((stage.count / totalCount) * 100).toFixed(1) : 0;
          
          return (
            <div key={stage.name} className="flex items-center gap-4">
              <div className="w-24 text-sm text-right truncate">
                {stage.name}
              </div>
              <div className="flex-1 h-8 bg-muted rounded-r-full overflow-hidden">
                <div
                  className="h-full rounded-r-full flex items-center justify-end pr-2 transition-all duration-500"
                  style={{ 
                    width: `${widthPercent}%`,
                    backgroundColor: stage.color,
                    minWidth: stage.count > 0 ? '40px' : '0',
                  }}
                >
                  <span className="text-sm font-medium text-white drop-shadow">
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>
              {showPercentage && (
                <div className="w-16 text-sm text-muted-foreground">
                  {ofTotal}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 4. CONVERSATION COMPONENTS

### 4.1 ConversationTimeline

```tsx
// components/outreach/conversation/ConversationTimeline.tsx

import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { format, isToday, isYesterday } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Message {
  id: string;
  direction: 'OUTBOUND' | 'INBOUND';
  channel: string;
  content: string;
  sentAt: string;
  status: string;
  isAiGenerated?: boolean;
  templateName?: string;
}

interface ConversationTimelineProps {
  messages: Message[];
  maxMessages?: number;
  autoScroll?: boolean;
  showDateSeparators?: boolean;
}

export function ConversationTimeline({
  messages,
  maxMessages,
  autoScroll = true,
  showDateSeparators = true,
}: ConversationTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayMessages = maxMessages 
    ? messages.slice(-maxMessages) 
    : messages;

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Astăzi';
    if (isYesterday(date)) return 'Ieri';
    return format(date, 'd MMMM yyyy', { locale: ro });
  };

  const shouldShowDateSeparator = (index: number) => {
    if (!showDateSeparators || index === 0) return index === 0;
    const currentDate = new Date(displayMessages[index].sentAt).toDateString();
    const prevDate = new Date(displayMessages[index - 1].sentAt).toDateString();
    return currentDate !== prevDate;
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col gap-3 overflow-y-auto p-4"
      style={{ maxHeight: '500px' }}
    >
      {displayMessages.map((message, index) => (
        <div key={message.id}>
          {shouldShowDateSeparator(index) && (
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">
                {formatDateSeparator(message.sentAt)}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          <MessageBubble message={message} />
        </div>
      ))}
    </div>
  );
}
```

### 4.2 MessageBubble

```tsx
// components/outreach/conversation/MessageBubble.tsx

import { cn } from '@/lib/utils';
import { ChannelIcon } from '../shared/ChannelIcon';
import { MessageStatusIcon } from './MessageStatusIcon';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Bot, User } from 'lucide-react';

interface MessageBubbleProps {
  message: {
    direction: 'OUTBOUND' | 'INBOUND';
    channel: string;
    content: string;
    sentAt: string;
    status: string;
    isAiGenerated?: boolean;
    templateName?: string;
  };
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'OUTBOUND';

  return (
    <div
      className={cn(
        'flex gap-2',
        isOutbound ? 'justify-end' : 'justify-start'
      )}
    >
      {!isOutbound && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
      )}
      
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2',
          isOutbound
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted rounded-bl-sm'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <ChannelIcon channel={message.channel} size="xs" showTooltip={false} />
          {message.isAiGenerated && (
            <Badge variant="outline" className="text-xs py-0 h-5">
              <Bot className="w-3 h-3 mr-1" />
              AI
            </Badge>
          )}
          {message.templateName && (
            <span className="text-xs opacity-70">
              {message.templateName}
            </span>
          )}
        </div>

        {/* Content */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 mt-1">
          <span className="text-xs opacity-70">
            {format(new Date(message.sentAt), 'HH:mm')}
          </span>
          {isOutbound && (
            <MessageStatusIcon status={message.status} />
          )}
        </div>
      </div>

      {isOutbound && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          {message.isAiGenerated ? (
            <Bot className="w-4 h-4 text-primary-foreground" />
          ) : (
            <User className="w-4 h-4 text-primary-foreground" />
          )}
        </div>
      )}
    </div>
  );
}
```

### 4.3 MessageStatusIcon

```tsx
// components/outreach/conversation/MessageStatusIcon.tsx

import { Check, CheckCheck, Clock, AlertCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const statusConfig: Record<string, {
  icon: React.ComponentType<any>;
  color: string;
  label: string;
}> = {
  QUEUED: { icon: Clock, color: 'text-gray-400', label: 'În coadă' },
  SENT: { icon: Check, color: 'text-gray-400', label: 'Trimis' },
  DELIVERED: { icon: CheckCheck, color: 'text-gray-400', label: 'Livrat' },
  READ: { icon: CheckCheck, color: 'text-blue-500', label: 'Citit' },
  REPLIED: { icon: CheckCheck, color: 'text-green-500', label: 'Răspuns primit' },
  OPENED: { icon: Eye, color: 'text-blue-500', label: 'Deschis' },
  BOUNCED: { icon: AlertCircle, color: 'text-red-500', label: 'Respins' },
  FAILED: { icon: AlertCircle, color: 'text-red-500', label: 'Eșuat' },
};

interface MessageStatusIconProps {
  status: string;
  showTooltip?: boolean;
  className?: string;
}

export function MessageStatusIcon({ 
  status, 
  showTooltip = true,
  className 
}: MessageStatusIconProps) {
  const config = statusConfig[status] || statusConfig.SENT;
  const Icon = config.icon;

  const iconElement = (
    <Icon className={cn('w-4 h-4', config.color, className)} />
  );

  if (!showTooltip) return iconElement;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {iconElement}
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

---

## 5. REVIEW COMPONENTS

### 5.1 SLACountdown

```tsx
// components/outreach/review/SLACountdown.tsx

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';

interface SLACountdownProps {
  dueAt: string;
  breached?: boolean;
  className?: string;
}

export function SLACountdown({ dueAt, breached, className }: SLACountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const due = new Date(dueAt);
      const diff = due.getTime() - now.getTime();

      if (diff <= 0) {
        setIsOverdue(true);
        const overdueDiff = Math.abs(diff);
        const hours = Math.floor(overdueDiff / (1000 * 60 * 60));
        const minutes = Math.floor((overdueDiff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`-${hours}h ${minutes}m`);
        return;
      }

      setIsOverdue(false);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setIsUrgent(hours < 1);
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [dueAt]);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium',
        isOverdue || breached
          ? 'bg-red-100 text-red-700'
          : isUrgent
            ? 'bg-amber-100 text-amber-700 animate-pulse'
            : 'bg-gray-100 text-gray-700',
        className
      )}
    >
      {isOverdue || breached ? (
        <AlertTriangle className="w-4 h-4" />
      ) : (
        <Clock className="w-4 h-4" />
      )}
      <span>{isOverdue ? 'Depășit' : 'SLA'}: {timeLeft}</span>
    </div>
  );
}
```

---

**Document generat:** 15 Ianuarie 2026
**Total Components:** 25+
**Conformitate:** Master Spec v1.2
