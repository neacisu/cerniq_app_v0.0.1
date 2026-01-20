# CERNIQ.APP — ETAPA 4: UI/UX CHARTS & DASHBOARDS
## Chart Components and Dashboard Layouts
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Cash Flow Chart
```tsx
export function CashFlowChart({ data }: { data: CashFlowData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={formatDate} />
        <YAxis tickFormatter={formatCurrency} />
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Area type="monotone" dataKey="incoming" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Încasări" />
        <Area type="monotone" dataKey="outgoing" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Plăți" />
        <Legend />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

## 2. Order Status Pie Chart
```tsx
export function OrderStatusPieChart({ data }: { data: StatusBreakdown[] }) {
  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#6b7280'];
  
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="count" nameKey="status" label>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

## 3. Credit Score Distribution
```tsx
export function CreditScoreDistribution({ data }: { data: ScoreDistribution[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="tier" type="category" />
        <Tooltip />
        <Bar dataKey="count" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

## 4. Payment Aging Report
```tsx
export function PaymentAgingChart({ data }: { data: AgingData }) {
  const chartData = [
    { name: 'Current', value: data.current, color: '#22c55e' },
    { name: '1-30 zile', value: data.days1to30, color: '#f59e0b' },
    { name: '31-60 zile', value: data.days31to60, color: '#f97316' },
    { name: '61-90 zile', value: data.days61to90, color: '#ef4444' },
    { name: '>90 zile', value: data.over90, color: '#991b1b' }
  ];
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={formatCurrency} />
        <Tooltip formatter={formatCurrency} />
        <Bar dataKey="value">
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

## 5. Delivery Performance Chart
```tsx
export function DeliveryPerformanceChart({ data }: { data: DeliveryMetrics[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Line yAxisId="left" type="monotone" dataKey="delivered" stroke="#22c55e" name="Livrate" />
        <Line yAxisId="left" type="monotone" dataKey="failed" stroke="#ef4444" name="Eșuate" />
        <Line yAxisId="right" type="monotone" dataKey="avgDays" stroke="#3b82f6" name="Timp Mediu (zile)" />
        <Legend />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
