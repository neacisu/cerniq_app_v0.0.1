# CERNIQ.APP — ETAPA 4: UI/UX COMPONENTS
## Reusable Components Specifications
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Status Badges](#1-badges)
2. [Info Cards](#2-cards)
3. [Timeline Components](#3-timeline)
4. [Alert Components](#4-alerts)
5. [Score & Progress](#5-scores)

---

## 1. Status Badges {#1-badges}

### OrderStatusBadge
```tsx
const ORDER_STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  DRAFT: { label: 'Draft', variant: 'secondary', icon: FileEdit },
  PENDING_PAYMENT: { label: 'Așteaptă Plată', variant: 'warning', icon: Clock },
  PAYMENT_RECEIVED: { label: 'Plată Primită', variant: 'success', icon: CheckCircle },
  CREDIT_CHECK: { label: 'Verificare Credit', variant: 'info', icon: Shield },
  CREDIT_BLOCKED: { label: 'Credit Blocat', variant: 'destructive', icon: XCircle },
  CREDIT_APPROVED: { label: 'Credit Aprobat', variant: 'success', icon: CheckCircle },
  PENDING_APPROVAL: { label: 'Așteaptă Aprobare', variant: 'warning', icon: UserCheck },
  CONTRACT_PENDING: { label: 'Contract Pending', variant: 'info', icon: FileSignature },
  CONTRACT_SIGNED: { label: 'Contract Semnat', variant: 'success', icon: FileCheck },
  PROCESSING: { label: 'În Procesare', variant: 'info', icon: Loader },
  READY_FOR_PICKUP: { label: 'Gata Ridicare', variant: 'info', icon: Package },
  PICKED_UP: { label: 'Ridicat', variant: 'info', icon: Truck },
  IN_TRANSIT: { label: 'În Tranzit', variant: 'info', icon: Truck },
  OUT_FOR_DELIVERY: { label: 'În Livrare', variant: 'info', icon: MapPin },
  DELIVERED: { label: 'Livrat', variant: 'success', icon: CheckCircle2 },
  COMPLETED: { label: 'Finalizat', variant: 'success', icon: CheckCircle },
  CANCELLED: { label: 'Anulat', variant: 'destructive', icon: XCircle },
  RETURN_REQUESTED: { label: 'Retur Solicitat', variant: 'warning', icon: RotateCcw }
};

export function OrderStatusBadge({ status }: { status: string }) {
  const config = ORDER_STATUS_CONFIG[status] || { label: status, variant: 'secondary', icon: HelpCircle };
  const Icon = config.icon;
  
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
```

### PaymentStatusBadge
```tsx
const PAYMENT_STATUS_CONFIG = {
  PENDING: { label: 'În Așteptare', variant: 'warning' },
  CONFIRMED: { label: 'Confirmat', variant: 'success' },
  FAILED: { label: 'Eșuat', variant: 'destructive' },
  REFUNDED: { label: 'Returnat', variant: 'secondary' }
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const config = PAYMENT_STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

### ShipmentStatusBadge
```tsx
const SHIPMENT_STATUS_CONFIG = {
  CREATED: { label: 'Creat', variant: 'secondary', icon: Package },
  PENDING_PICKUP: { label: 'Așteaptă Ridicare', variant: 'warning', icon: Clock },
  PICKED_UP: { label: 'Ridicat', variant: 'info', icon: Package },
  IN_TRANSIT: { label: 'În Tranzit', variant: 'info', icon: Truck },
  OUT_FOR_DELIVERY: { label: 'În Livrare', variant: 'info', icon: MapPin },
  DELIVERED: { label: 'Livrat', variant: 'success', icon: CheckCircle2 },
  DELIVERY_FAILED: { label: 'Livrare Eșuată', variant: 'destructive', icon: XCircle },
  RETURNED_TO_SENDER: { label: 'Returnat', variant: 'warning', icon: RotateCcw }
};

export function ShipmentStatusBadge({ status }: { status: string }) {
  const config = SHIPMENT_STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
```

### CreditScoreBadge
```tsx
export function CreditScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <Badge variant="secondary">N/A</Badge>;
  
  const config = score < 30 ? { variant: 'destructive', label: 'Blocat' } :
                 score < 50 ? { variant: 'warning', label: 'Scăzut' } :
                 score < 70 ? { variant: 'secondary', label: 'Mediu' } :
                 score < 90 ? { variant: 'info', label: 'Ridicat' } :
                              { variant: 'success', label: 'Premium' };
  
  return (
    <Badge variant={config.variant}>
      {score} - {config.label}
    </Badge>
  );
}
```

---

## 2. Info Cards {#2-cards}

### ClientInfoCard
```tsx
export function ClientInfoCard({ client, creditProfile }: { client: Client; creditProfile?: CreditProfile }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{client.companyName}</CardTitle>
        <CardDescription>CUI: {client.cui}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-500">Contact:</div>
          <div>{client.contactName}</div>
          <div className="text-gray-500">Email:</div>
          <div className="truncate">{client.email}</div>
          <div className="text-gray-500">Telefon:</div>
          <div>{client.phone}</div>
        </div>
        
        {creditProfile && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Credit Score</span>
                <CreditScoreBadge score={creditProfile.creditScore} />
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Limită</span>
                <span className="font-medium">{formatCurrency(creditProfile.creditLimit)} EUR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Disponibil</span>
                <span className="font-medium text-green-600">{formatCurrency(creditProfile.creditAvailable)} EUR</span>
              </div>
              <Progress value={(creditProfile.creditUsed / creditProfile.creditLimit) * 100} className="h-2" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

### ShipmentTrackingCard
```tsx
export function ShipmentTrackingCard({ shipment }: { shipment: Shipment }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>AWB: {shipment.awbNumber}</span>
          <ShipmentStatusBadge status={shipment.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-500">Curier:</div>
          <div>{shipment.carrier}</div>
          <div className="text-gray-500">ETA:</div>
          <div>{shipment.estimatedDeliveryDate ? formatDate(shipment.estimatedDeliveryDate) : 'N/A'}</div>
          {shipment.codAmount > 0 && (
            <>
              <div className="text-gray-500">Ramburs:</div>
              <div className="font-medium">{formatCurrency(shipment.codAmount)}</div>
            </>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(shipment.trackingUrl, '_blank')}>
            <ExternalLink className="w-3 h-3 mr-1" /> Track
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadPdf(shipment.labelPdfUrl)}>
            <Download className="w-3 h-3 mr-1" /> AWB
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 3. Timeline Components {#3-timeline}

### OrderTimeline
```tsx
export function OrderTimeline({ orderId }: { orderId: string }) {
  const { data: events } = useQuery({
    queryKey: ['order-timeline', orderId],
    queryFn: () => fetchOrderTimeline(orderId)
  });
  
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
      
      <div className="space-y-4">
        {events?.map((event, index) => (
          <div key={event.id} className="relative flex gap-4">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center z-10
              ${event.type === 'success' ? 'bg-green-100 text-green-600' :
                event.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                event.type === 'error' ? 'bg-red-100 text-red-600' :
                'bg-blue-100 text-blue-600'}
            `}>
              <TimelineIcon type={event.eventType} />
            </div>
            
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{event.title}</span>
                <span className="text-sm text-gray-500">{formatDateTime(event.createdAt)}</span>
              </div>
              {event.description && (
                <p className="text-sm text-gray-600 mt-1">{event.description}</p>
              )}
              {event.actor && (
                <p className="text-xs text-gray-400 mt-1">De către: {event.actor}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 4. Alert Components {#4-alerts}

### OrderStatusBanner
```tsx
export function OrderStatusBanner({ order }: { order: Order }) {
  const alerts = [];
  
  if (order.status === 'CREDIT_BLOCKED') {
    alerts.push({
      type: 'warning',
      title: 'Credit Blocat',
      message: 'Această comandă necesită aprobare manuală pentru depășire credit.',
      action: { label: 'Solicită Aprobare', onClick: () => requestCreditOverride(order.id) }
    });
  }
  
  if (order.amountDue > 0 && new Date(order.dueDate) < new Date()) {
    const daysOverdue = Math.floor((Date.now() - new Date(order.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    alerts.push({
      type: 'error',
      title: 'Factură Restantă',
      message: `Această factură este restantă de ${daysOverdue} zile.`,
      action: { label: 'Trimite Reminder', onClick: () => sendPaymentReminder(order.id) }
    });
  }
  
  if (order.contract?.status === 'SENT_FOR_SIGNATURE') {
    alerts.push({
      type: 'info',
      title: 'Contract în Așteptare',
      message: 'Contractul a fost trimis pentru semnare.',
      action: { label: 'Retrimite', onClick: () => resendContractReminder(order.contractId) }
    });
  }
  
  if (alerts.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <Alert key={i} variant={alert.type}>
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{alert.message}</span>
            {alert.action && (
              <Button variant="outline" size="sm" onClick={alert.action.onClick}>
                {alert.action.label}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

---

## 5. Score & Progress {#5-scores}

### CreditScoreGauge
```tsx
export function CreditScoreGauge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 80, md: 120, lg: 160 };
  const dimension = sizes[size];
  const strokeWidth = size === 'lg' ? 12 : size === 'md' ? 10 : 8;
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  
  const color = score < 30 ? '#ef4444' : score < 50 ? '#f59e0b' : score < 70 ? '#6b7280' : score < 90 ? '#3b82f6' : '#22c55e';
  
  return (
    <div className="relative" style={{ width: dimension, height: dimension }}>
      <svg className="transform -rotate-90" width={dimension} height={dimension}>
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold">{score}</span>
      </div>
    </div>
  );
}
```

### CreditLimitProgress
```tsx
export function CreditLimitProgress({ profile }: { profile: CreditProfile }) {
  const usedPercent = (profile.creditUsed / profile.creditLimit) * 100;
  const reservedPercent = (profile.creditReserved / profile.creditLimit) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Utilizat: {formatCurrency(profile.creditUsed)}</span>
        <span>Limită: {formatCurrency(profile.creditLimit)}</span>
      </div>
      <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="absolute h-full bg-blue-500 transition-all"
          style={{ width: `${usedPercent}%` }}
        />
        <div 
          className="absolute h-full bg-yellow-500 transition-all"
          style={{ width: `${reservedPercent}%`, left: `${usedPercent}%` }}
        />
      </div>
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" /> Utilizat
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" /> Rezervat
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-200" /> Disponibil
        </span>
      </div>
    </div>
  );
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
