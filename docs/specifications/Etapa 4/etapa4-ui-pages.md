# CERNIQ.APP — ETAPA 4: UI/UX PAGES
## Complete Page Specifications
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Navigation Structure](#1-navigation)
2. [Orders Dashboard](#2-orders-dashboard)
3. [Orders List Page](#3-orders-list)
4. [Order Detail Page](#4-order-detail)
5. [Payments Page](#5-payments)
6. [Credit Management](#6-credit)
7. [Shipments Page](#7-shipments)
8. [Returns Page](#8-returns)
9. [Contracts Page](#9-contracts)
10. [HITL Dashboard](#10-hitl)
11. [Analytics Page](#11-analytics)

---

## 1. Navigation Structure {#1-navigation}

```
/monitoring
├── /dashboard                 # Overview KPIs
├── /orders                    # Order management
│   ├── /[orderId]            # Order detail
│   └── /[orderId]/timeline   # Order timeline
├── /payments                  # Payment tracking
│   ├── /reconciliation       # Reconciliation queue
│   └── /overdue              # Overdue invoices
├── /credit                    # Credit management
│   ├── /profiles             # Client credit profiles
│   └── /limits               # Credit limit overview
├── /shipments                 # Logistics tracking
│   ├── /active               # Active shipments
│   └── /returns              # Returns/RMA
├── /contracts                 # Contract management
│   ├── /pending              # Pending signatures
│   └── /templates            # Contract templates
├── /hitl                      # HITL Dashboard
│   ├── /queue                # Approval queue
│   └── /history              # Resolution history
└── /analytics                 # Reports & Analytics
```

---

## 2. Orders Dashboard {#2-orders-dashboard}

### Page: /monitoring/dashboard

```tsx
// pages/monitoring/dashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { KPICard, StatusChart, RecentActivity, AlertsPanel } from '@/components/monitoring';

export default function MonitoringDashboard() {
  const { data: stats } = useQuery({ queryKey: ['monitoring-stats'], queryFn: fetchMonitoringStats });
  
  return (
    <PageLayout title="Monitorizare Post-Vânzare" breadcrumbs={['Monitoring', 'Dashboard']}>
      
      {/* KPI Cards Row */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard
          title="Comenzi Active"
          value={stats?.activeOrders || 0}
          change={stats?.ordersChange}
          icon={<ShoppingCart className="w-5 h-5" />}
          href="/monitoring/orders"
        />
        <KPICard
          title="Plăți Azi"
          value={formatCurrency(stats?.paymentsToday || 0)}
          change={stats?.paymentsChange}
          icon={<CreditCard className="w-5 h-5" />}
          variant="success"
        />
        <KPICard
          title="Livrări în Curs"
          value={stats?.shipmentsInTransit || 0}
          icon={<Truck className="w-5 h-5" />}
          href="/monitoring/shipments/active"
        />
        <KPICard
          title="Facturi Restante"
          value={stats?.overdueInvoices || 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant={stats?.overdueInvoices > 0 ? 'danger' : 'default'}
          href="/monitoring/payments/overdue"
        />
        <KPICard
          title="HITL Pending"
          value={stats?.hitlPending || 0}
          icon={<Clock className="w-5 h-5" />}
          variant={stats?.hitlPending > 5 ? 'warning' : 'default'}
          href="/monitoring/hitl/queue"
        />
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Cash Flow - Ultimele 30 Zile</CardTitle>
          </CardHeader>
          <CardContent>
            <CashFlowChart data={stats?.cashFlowData} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Statusuri Comenzi</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderStatusPieChart data={stats?.orderStatusBreakdown} />
          </CardContent>
        </Card>
      </div>
      
      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Alerts Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerte Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertsList alerts={stats?.activeAlerts} />
          </CardContent>
        </Card>
        
        {/* Recent Activity */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Activitate Recentă</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={stats?.recentActivities} />
          </CardContent>
        </Card>
      </div>
      
    </PageLayout>
  );
}
```

### KPI Card Component
```tsx
interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  href?: string;
}

export function KPICard({ title, value, change, icon, variant = 'default', href }: KPICardProps) {
  const variants = {
    default: 'bg-white border-gray-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200'
  };
  
  const content = (
    <div className={`p-4 rounded-lg border ${variants[variant]} hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{title}</span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold">{value}</span>
        {change !== undefined && (
          <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </div>
  );
  
  return href ? <Link href={href}>{content}</Link> : content;
}
```

---

## 3. Orders List Page {#3-orders-list}

### Page: /monitoring/orders

```tsx
export default function OrdersListPage() {
  const [filters, setFilters] = useState<OrderFilters>({
    status: [],
    dateRange: 'last_30_days',
    search: ''
  });
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(filters)
  });
  
  return (
    <PageLayout title="Comenzi" breadcrumbs={['Monitoring', 'Comenzi']}>
      
      {/* Filters Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Caută comandă, client..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            
            {/* Status Filter */}
            <MultiSelect
              label="Status"
              options={ORDER_STATUS_OPTIONS}
              value={filters.status}
              onChange={(status) => setFilters({ ...filters, status })}
              className="w-[200px]"
            />
            
            {/* Date Range */}
            <DateRangePicker
              value={filters.dateRange}
              onChange={(dateRange) => setFilters({ ...filters, dateRange })}
              presets={['today', 'last_7_days', 'last_30_days', 'this_month']}
            />
            
            {/* Quick Filters */}
            <div className="flex gap-2">
              <Button
                variant={filters.status.includes('PENDING_PAYMENT') ? 'primary' : 'outline'}
                size="sm"
                onClick={() => toggleStatusFilter('PENDING_PAYMENT')}
              >
                Așteaptă Plată
              </Button>
              <Button
                variant={filters.status.includes('CREDIT_BLOCKED') ? 'primary' : 'outline'}
                size="sm"
                onClick={() => toggleStatusFilter('CREDIT_BLOCKED')}
              >
                Credit Blocat
              </Button>
            </div>
            
            {/* Actions */}
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Orders Table */}
      <Card>
        <DataTable
          columns={ordersColumns}
          data={data?.orders || []}
          loading={isLoading}
          pagination={{
            page: data?.page || 1,
            pageSize: data?.pageSize || 25,
            total: data?.total || 0,
            onPageChange: (page) => setFilters({ ...filters, page })
          }}
          sorting={{
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
            onSort: (sortBy, sortOrder) => setFilters({ ...filters, sortBy, sortOrder })
          }}
          rowActions={(order) => (
            <DropdownMenu>
              <DropdownMenuItem onClick={() => router.push(`/monitoring/orders/${order.id}`)}>
                <Eye className="w-4 h-4 mr-2" /> Vezi Detalii
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openInvoiceDialog(order)}>
                <FileText className="w-4 h-4 mr-2" /> Vezi Factură
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openShipmentDialog(order)}>
                <Truck className="w-4 h-4 mr-2" /> Tracking
              </DropdownMenuItem>
              {order.status === 'CREDIT_BLOCKED' && (
                <DropdownMenuItem onClick={() => openCreditOverrideDialog(order)}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Override Credit
                </DropdownMenuItem>
              )}
            </DropdownMenu>
          )}
        />
      </Card>
      
    </PageLayout>
  );
}

// Orders Table Columns
const ordersColumns: ColumnDef<Order>[] = [
  {
    accessorKey: 'orderNumber',
    header: 'Comandă',
    cell: ({ row }) => (
      <Link href={`/monitoring/orders/${row.original.id}`} className="font-medium text-blue-600 hover:underline">
        {row.original.orderNumber}
      </Link>
    )
  },
  {
    accessorKey: 'client.companyName',
    header: 'Client',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.client.companyName}</div>
        <div className="text-sm text-gray-500">{row.original.client.cui}</div>
      </div>
    )
  },
  {
    accessorKey: 'totalAmount',
    header: 'Valoare',
    cell: ({ row }) => (
      <div className="text-right">
        <div className="font-medium">{formatCurrency(row.original.totalAmount)}</div>
        {row.original.amountDue > 0 && (
          <div className="text-sm text-red-500">Restant: {formatCurrency(row.original.amountDue)}</div>
        )}
      </div>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <OrderStatusBadge status={row.original.status} />
  },
  {
    accessorKey: 'createdAt',
    header: 'Data',
    cell: ({ row }) => formatDate(row.original.createdAt)
  },
  {
    accessorKey: 'dueDate',
    header: 'Scadență',
    cell: ({ row }) => {
      if (!row.original.dueDate) return '-';
      const isOverdue = new Date(row.original.dueDate) < new Date() && row.original.amountDue > 0;
      return (
        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.original.dueDate)}
          {isOverdue && ' (Restant)'}
        </span>
      );
    }
  }
];
```

---

## 4. Order Detail Page {#4-order-detail}

### Page: /monitoring/orders/[orderId]

```tsx
export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrder(orderId)
  });
  
  if (isLoading) return <PageSkeleton />;
  
  return (
    <PageLayout
      title={`Comandă ${order.orderNumber}`}
      breadcrumbs={['Monitoring', 'Comenzi', order.orderNumber]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openInvoiceDialog()}>
            <FileText className="w-4 h-4 mr-2" /> Factură
          </Button>
          <Button variant="outline" onClick={() => openContractDialog()}>
            <FileSignature className="w-4 h-4 mr-2" /> Contract
          </Button>
          {order.shipment && (
            <Button variant="outline" onClick={() => window.open(order.shipment.trackingUrl, '_blank')}>
              <Truck className="w-4 h-4 mr-2" /> Tracking
            </Button>
          )}
        </div>
      }
    >
      
      {/* Status Banner */}
      <OrderStatusBanner order={order} className="mb-6" />
      
      <div className="grid grid-cols-3 gap-6">
        
        {/* Left Column - Order Info */}
        <div className="col-span-2 space-y-6">
          
          {/* Order Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Detalii Comandă</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Număr Comandă" value={order.orderNumber} />
                <InfoRow label="Data Creare" value={formatDateTime(order.createdAt)} />
                <InfoRow label="Status" value={<OrderStatusBadge status={order.status} />} />
                <InfoRow label="Metodă Plată" value={PAYMENT_METHODS[order.paymentMethod]} />
                <InfoRow label="Termeni Plată" value={`${order.paymentTermsDays} zile`} />
                <InfoRow label="Scadență" value={formatDate(order.dueDate)} />
              </div>
            </CardContent>
          </Card>
          
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Produse</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produs</TableHead>
                    <TableHead className="text-right">Cantitate</TableHead>
                    <TableHead className="text-right">Preț Unitar</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-gray-500">{item.productSku}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unitOfMeasure}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right">Subtotal</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.subtotal)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right">TVA ({order.vatRate}%)</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.vatAmount)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(order.totalAmount)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
          
          {/* Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Plăți</span>
                <Badge variant={order.amountDue > 0 ? 'destructive' : 'success'}>
                  {order.amountDue > 0 ? `Restant: ${formatCurrency(order.amountDue)}` : 'Achitat'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Referință</TableHead>
                      <TableHead>Sursă</TableHead>
                      <TableHead className="text-right">Sumă</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDateTime(payment.transactionDate)}</TableCell>
                        <TableCell>{payment.reference || payment.externalId}</TableCell>
                        <TableCell>{payment.externalSource}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell><PaymentStatusBadge status={payment.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState message="Nu există plăți înregistrate" />
              )}
            </CardContent>
          </Card>
          
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline orderId={order.id} />
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Client & Shipment */}
        <div className="space-y-6">
          
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="font-medium">{order.client.companyName}</div>
                  <div className="text-sm text-gray-500">CUI: {order.client.cui}</div>
                </div>
                <Separator />
                <div className="text-sm">
                  <div>{order.client.contactName}</div>
                  <div>{order.client.email}</div>
                  <div>{order.client.phone}</div>
                </div>
                <Separator />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Credit Score:</span>
                  <CreditScoreBadge score={order.client.creditProfile?.creditScore} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Credit Disponibil:</span>
                  <span className="font-medium">{formatCurrency(order.client.creditProfile?.creditAvailable)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => router.push(`/contacts/${order.clientId}`)}>
                Vezi Profil Client
              </Button>
            </CardFooter>
          </Card>
          
          {/* Shipment Info */}
          {order.shipment && (
            <Card>
              <CardHeader>
                <CardTitle>Livrare</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">AWB</span>
                    <span className="font-mono">{order.shipment.awbNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Curier</span>
                    <span>{order.shipment.carrier}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <ShipmentStatusBadge status={order.shipment.status} />
                  </div>
                  <Separator />
                  <div className="text-sm">
                    <div className="font-medium">Adresa Livrare</div>
                    <div>{order.deliveryAddress?.streetAddress}</div>
                    <div>{order.deliveryAddress?.city}, {order.deliveryAddress?.county}</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => window.open(order.shipment.trackingUrl, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" /> Track
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => downloadLabel(order.shipment.labelPdfUrl)}>
                  <Download className="w-4 h-4 mr-2" /> AWB PDF
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {/* Contract Info */}
          {order.contract && (
            <Card>
              <CardHeader>
                <CardTitle>Contract</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Număr</span>
                    <span>{order.contract.contractNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <ContractStatusBadge status={order.contract.status} />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => downloadContract(order.contract.pdfUrl)}>
                  <Download className="w-4 h-4 mr-2" /> Descarcă Contract
                </Button>
              </CardFooter>
            </Card>
          )}
          
        </div>
      </div>
      
    </PageLayout>
  );
}
```

---

## 5. Payments Page {#5-payments}

### Page: /monitoring/payments

```tsx
export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('all');
  
  return (
    <PageLayout title="Plăți" breadcrumbs={['Monitoring', 'Plăți']}>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">Toate Plățile</TabsTrigger>
          <TabsTrigger value="reconciliation">
            Reconciliere
            <Badge variant="secondary" className="ml-2">{stats?.pendingReconciliation || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Restanțe
            <Badge variant="destructive" className="ml-2">{stats?.overdueCount || 0}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <PaymentsTable filters={{ status: ['CONFIRMED', 'PENDING'] }} />
        </TabsContent>
        
        <TabsContent value="reconciliation">
          <ReconciliationQueue />
        </TabsContent>
        
        <TabsContent value="overdue">
          <OverdueInvoicesTable />
        </TabsContent>
      </Tabs>
      
    </PageLayout>
  );
}
```

### Reconciliation Queue Component
```tsx
function ReconciliationQueue() {
  const { data: payments } = useQuery({
    queryKey: ['payments-unmatched'],
    queryFn: () => fetchPayments({ reconciliationStatus: 'UNMATCHED' })
  });
  
  return (
    <div className="space-y-4">
      {payments?.map((payment) => (
        <Card key={payment.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{formatCurrency(payment.amount)}</div>
                <div className="text-sm text-gray-500">{payment.counterpartyName}</div>
                <div className="text-sm text-gray-500">{formatDateTime(payment.transactionDate)}</div>
              </div>
              
              <div className="flex-1 mx-6">
                <div className="text-sm text-gray-500 mb-2">Candidați posibili:</div>
                <div className="flex gap-2 flex-wrap">
                  {payment.candidates?.map((candidate) => (
                    <Button
                      key={candidate.invoiceId}
                      variant="outline"
                      size="sm"
                      onClick={() => manualMatch(payment.id, candidate.invoiceId)}
                    >
                      {candidate.invoiceNumber} ({candidate.score}%)
                    </Button>
                  ))}
                </div>
              </div>
              
              <Button onClick={() => openInvestigationDialog(payment)}>
                <Search className="w-4 h-4 mr-2" /> Investighează
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## 6-11. Additional Pages (Summary)

### Credit Management (/monitoring/credit)
- Credit Profiles DataTable cu score, limit, used, available
- Credit Score History Chart per client
- Risk Tier Distribution Pie Chart
- Override History List

### Shipments (/monitoring/shipments)
- Active Shipments Map View
- Shipments DataTable cu AWB, status, ETA
- COD Collections Summary
- Returns Queue

### Contracts (/monitoring/contracts)
- Pending Signatures List cu reminder actions
- Contract Templates Management
- Signature Timeline per contract
- DocuSign Status Integration

### HITL Dashboard (/monitoring/hitl)
- Approval Queue cu SLA timers
- Resolution History
- Escalation Chain View
- Performance Metrics

### Analytics (/monitoring/analytics)
- Revenue by Period Chart
- Payment Aging Report
- Credit Risk Distribution
- Delivery Performance Metrics

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
