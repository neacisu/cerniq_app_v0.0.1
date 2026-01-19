# CERNIQ.APP — ETAPA 4: UI/UX TABLES
## DataTable Specifications
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Orders Table Columns
```tsx
const ordersColumns: ColumnDef<Order>[] = [
  { accessorKey: 'orderNumber', header: 'Comandă', enableSorting: true },
  { accessorKey: 'client.companyName', header: 'Client' },
  { accessorKey: 'totalAmount', header: 'Valoare', cell: formatCurrency },
  { accessorKey: 'amountDue', header: 'Restant', cell: formatCurrency },
  { accessorKey: 'status', header: 'Status', cell: OrderStatusBadge },
  { accessorKey: 'paymentMethod', header: 'Plată' },
  { accessorKey: 'dueDate', header: 'Scadență', cell: formatDate },
  { accessorKey: 'createdAt', header: 'Data', enableSorting: true }
];
```

## 2. Payments Table Columns
```tsx
const paymentsColumns: ColumnDef<Payment>[] = [
  { accessorKey: 'transactionDate', header: 'Data', enableSorting: true },
  { accessorKey: 'externalId', header: 'Referință' },
  { accessorKey: 'counterpartyName', header: 'De la' },
  { accessorKey: 'amount', header: 'Sumă', cell: formatCurrency },
  { accessorKey: 'reconciliationStatus', header: 'Reconciliere', cell: ReconciliationBadge },
  { accessorKey: 'invoice.invoiceNumber', header: 'Factură' },
  { accessorKey: 'status', header: 'Status', cell: PaymentStatusBadge }
];
```

## 3. Shipments Table Columns
```tsx
const shipmentsColumns: ColumnDef<Shipment>[] = [
  { accessorKey: 'awbNumber', header: 'AWB' },
  { accessorKey: 'order.orderNumber', header: 'Comandă' },
  { accessorKey: 'order.client.companyName', header: 'Client' },
  { accessorKey: 'status', header: 'Status', cell: ShipmentStatusBadge },
  { accessorKey: 'estimatedDeliveryDate', header: 'ETA' },
  { accessorKey: 'codAmount', header: 'COD', cell: val => val > 0 ? formatCurrency(val) : '-' },
  { id: 'tracking', header: 'Tracking', cell: ({ row }) => (
    <Button size="sm" variant="ghost" onClick={() => window.open(row.original.trackingUrl)}>
      <ExternalLink className="w-4 h-4" />
    </Button>
  )}
];
```

## 4. Credit Profiles Table
```tsx
const creditProfilesColumns: ColumnDef<CreditProfile>[] = [
  { accessorKey: 'client.companyName', header: 'Client' },
  { accessorKey: 'creditScore', header: 'Score', cell: CreditScoreBadge },
  { accessorKey: 'riskTier', header: 'Tier', cell: RiskTierBadge },
  { accessorKey: 'creditLimit', header: 'Limită' },
  { accessorKey: 'creditUsed', header: 'Utilizat' },
  { accessorKey: 'creditAvailable', header: 'Disponibil' },
  { accessorKey: 'lastScoredAt', header: 'Ultima Evaluare' }
];
```

## 5. HITL Queue Table
```tsx
const hitlQueueColumns: ColumnDef<HITLTask>[] = [
  { accessorKey: 'taskType', header: 'Tip' },
  { accessorKey: 'title', header: 'Titlu' },
  { accessorKey: 'priority', header: 'Prioritate', cell: PriorityBadge },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'assignedRole', header: 'Asignat' },
  { accessorKey: 'slaDeadline', header: 'SLA', cell: SLACountdown },
  { accessorKey: 'createdAt', header: 'Creat' }
];
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
