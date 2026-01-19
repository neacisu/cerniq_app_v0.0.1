# CERNIQ.APP — ETAPA 4: MONITORING & OBSERVABILITY
## Comprehensive Monitoring Stack
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Metrics Overview](#1-metrics)
2. [Prometheus Metrics](#2-prometheus)
3. [Grafana Dashboards](#3-grafana)
4. [Alerting Rules](#4-alerting)
5. [SigNoz Tracing](#5-tracing)

---

## 1. Metrics Overview {#1-metrics}

### Business Metrics
| Metric | Description | Type |
|--------|-------------|------|
| `orders_created_total` | Total orders created | Counter |
| `orders_completed_total` | Completed orders | Counter |
| `payments_received_total` | Total payment value | Counter |
| `credit_utilization_ratio` | Credit used / limit | Gauge |
| `shipments_delivered_total` | Delivered shipments | Counter |
| `hitl_pending_tasks` | Pending HITL tasks | Gauge |

### Technical Metrics
| Metric | Description | Type |
|--------|-------------|------|
| `worker_jobs_processed_total` | Jobs per worker | Counter |
| `worker_job_duration_seconds` | Processing time | Histogram |
| `api_request_duration_seconds` | API latency | Histogram |
| `db_query_duration_seconds` | DB query time | Histogram |
| `external_api_calls_total` | External API calls | Counter |

---

## 2. Prometheus Metrics {#2-prometheus}

```typescript
// metrics/etapa4.ts
import { Counter, Gauge, Histogram, register } from 'prom-client';

// Orders
export const ordersCreated = new Counter({
  name: 'cerniq_etapa4_orders_created_total',
  help: 'Total orders created',
  labelNames: ['tenant_id', 'payment_method', 'status']
});

export const ordersValue = new Counter({
  name: 'cerniq_etapa4_orders_value_total',
  help: 'Total order value in RON',
  labelNames: ['tenant_id', 'currency']
});

// Payments
export const paymentsReceived = new Counter({
  name: 'cerniq_etapa4_payments_received_total',
  help: 'Total payments received',
  labelNames: ['tenant_id', 'source', 'reconciliation_status']
});

export const paymentsReconciliationDuration = new Histogram({
  name: 'cerniq_etapa4_payments_reconciliation_duration_seconds',
  help: 'Time to reconcile payments',
  labelNames: ['match_type'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60]
});

// Credit
export const creditScoreDistribution = new Gauge({
  name: 'cerniq_etapa4_credit_score_distribution',
  help: 'Credit score distribution by tier',
  labelNames: ['tenant_id', 'risk_tier']
});

export const creditUtilization = new Gauge({
  name: 'cerniq_etapa4_credit_utilization_ratio',
  help: 'Credit utilization ratio',
  labelNames: ['tenant_id', 'client_id']
});

// Shipments
export const shipmentsCreated = new Counter({
  name: 'cerniq_etapa4_shipments_created_total',
  help: 'Total shipments created',
  labelNames: ['tenant_id', 'carrier', 'delivery_type']
});

export const shipmentDeliveryTime = new Histogram({
  name: 'cerniq_etapa4_shipment_delivery_time_hours',
  help: 'Shipment delivery time in hours',
  labelNames: ['carrier', 'delivery_type'],
  buckets: [6, 12, 24, 48, 72, 96, 120]
});

// HITL
export const hitlTasksCreated = new Counter({
  name: 'cerniq_etapa4_hitl_tasks_created_total',
  help: 'HITL tasks created',
  labelNames: ['tenant_id', 'task_type', 'priority']
});

export const hitlTasksPending = new Gauge({
  name: 'cerniq_etapa4_hitl_tasks_pending',
  help: 'Pending HITL tasks',
  labelNames: ['tenant_id', 'task_type', 'assigned_role']
});

export const hitlResolutionTime = new Histogram({
  name: 'cerniq_etapa4_hitl_resolution_time_seconds',
  help: 'Time to resolve HITL tasks',
  labelNames: ['task_type', 'decision'],
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400]
});

// Workers
export const workerJobsProcessed = new Counter({
  name: 'cerniq_etapa4_worker_jobs_processed_total',
  help: 'Worker jobs processed',
  labelNames: ['queue', 'status']
});

export const workerJobDuration = new Histogram({
  name: 'cerniq_etapa4_worker_job_duration_seconds',
  help: 'Worker job processing duration',
  labelNames: ['queue'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30]
});

// External APIs
export const externalApiCalls = new Counter({
  name: 'cerniq_etapa4_external_api_calls_total',
  help: 'External API calls',
  labelNames: ['service', 'endpoint', 'status']
});

export const externalApiDuration = new Histogram({
  name: 'cerniq_etapa4_external_api_duration_seconds',
  help: 'External API call duration',
  labelNames: ['service'],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10]
});
```

---

## 3. Grafana Dashboards {#3-grafana}

### Dashboard: Etapa 4 Overview
```json
{
  "title": "Etapa 4 - Monitoring Post-Vânzare",
  "panels": [
    {
      "title": "Orders Today",
      "type": "stat",
      "targets": [{ "expr": "increase(cerniq_etapa4_orders_created_total[24h])" }]
    },
    {
      "title": "Payments Today",
      "type": "stat",
      "targets": [{ "expr": "increase(cerniq_etapa4_payments_received_total[24h])" }]
    },
    {
      "title": "Deliveries Today",
      "type": "stat",
      "targets": [{ "expr": "increase(cerniq_etapa4_shipments_created_total{status=\"DELIVERED\"}[24h])" }]
    },
    {
      "title": "HITL Queue",
      "type": "stat",
      "targets": [{ "expr": "sum(cerniq_etapa4_hitl_tasks_pending)" }]
    },
    {
      "title": "Order Status Flow",
      "type": "timeseries",
      "targets": [{ "expr": "cerniq_etapa4_orders_created_total by (status)" }]
    },
    {
      "title": "Payment Reconciliation Success Rate",
      "type": "gauge",
      "targets": [{ "expr": "sum(rate(cerniq_etapa4_payments_received_total{reconciliation_status=\"MATCHED_EXACT\"}[1h])) / sum(rate(cerniq_etapa4_payments_received_total[1h]))" }]
    }
  ]
}
```

### Dashboard: Worker Performance
```json
{
  "title": "Etapa 4 - Worker Performance",
  "panels": [
    {
      "title": "Job Processing Rate",
      "type": "timeseries",
      "targets": [{ "expr": "rate(cerniq_etapa4_worker_jobs_processed_total[5m]) by (queue)" }]
    },
    {
      "title": "Job Duration P95",
      "type": "timeseries",
      "targets": [{ "expr": "histogram_quantile(0.95, rate(cerniq_etapa4_worker_job_duration_seconds_bucket[5m])) by (queue)" }]
    },
    {
      "title": "Failed Jobs",
      "type": "stat",
      "targets": [{ "expr": "sum(increase(cerniq_etapa4_worker_jobs_processed_total{status=\"error\"}[1h]))" }]
    },
    {
      "title": "Queue Depths",
      "type": "table",
      "targets": [{ "expr": "bullmq_queue_waiting by (queue)" }]
    }
  ]
}
```

---

## 4. Alerting Rules {#4-alerting}

```yaml
# alerts/etapa4.yml
groups:
  - name: etapa4-critical
    rules:
      - alert: PaymentReconciliationFailure
        expr: rate(cerniq_etapa4_payments_received_total{reconciliation_status="UNMATCHED"}[1h]) > 0.2
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: High unmatched payment rate
          
      - alert: HITLQueueBacklog
        expr: sum(cerniq_etapa4_hitl_tasks_pending) > 20
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: HITL queue backlog > 20 tasks
          
      - alert: CreditScoringDown
        expr: rate(cerniq_etapa4_external_api_calls_total{service="termene",status="error"}[5m]) > 0.5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: Termene.ro API error rate > 50%
          
      - alert: DeliveryFailureSpike
        expr: increase(cerniq_etapa4_shipments_created_total{status="DELIVERY_FAILED"}[1h]) > 10
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: >10 delivery failures in last hour
          
      - alert: WorkerJobFailures
        expr: rate(cerniq_etapa4_worker_jobs_processed_total{status="error"}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Worker error rate > 10%
```

---

## 5. SigNoz Tracing {#5-tracing}

### Trace Configuration
```typescript
// tracing/etapa4.ts
import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('cerniq-etapa4');

// Order flow trace
export async function traceOrderFlow(orderId: string, operation: string, fn: () => Promise<any>) {
  const span = tracer.startSpan(`order.${operation}`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'order.id': orderId,
      'order.operation': operation
    }
  });
  
  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}

// External API trace
export async function traceExternalApi(service: string, endpoint: string, fn: () => Promise<any>) {
  const span = tracer.startSpan(`external.${service}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'external.service': service,
      'external.endpoint': endpoint
    }
  });
  
  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
