# CERNIQ.APP — ETAPA 5: MONITORING & OBSERVABILITY
## Metrics, Tracing & Alerting pentru Nurturing Agentic
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Prometheus Metrics

### 1.1 Business Metrics

```typescript
// metrics/etapa5-business.ts
import { Registry, Gauge, Counter, Histogram } from 'prom-client';

export const etapa5Metrics = {
  // Nurturing State Distribution
  nurturingStateGauge: new Gauge({
    name: 'nurturing_clients_by_state',
    help: 'Number of clients in each nurturing state',
    labelNames: ['tenant_id', 'state']
  }),
  
  // Churn Metrics
  churnScoreHistogram: new Histogram({
    name: 'nurturing_churn_score',
    help: 'Distribution of churn scores',
    labelNames: ['tenant_id', 'risk_level'],
    buckets: [10, 25, 50, 75, 90, 100]
  }),
  
  clientsAtRiskGauge: new Gauge({
    name: 'nurturing_clients_at_risk',
    help: 'Number of clients at risk of churning',
    labelNames: ['tenant_id', 'risk_level']
  }),
  
  churnSignalsCounter: new Counter({
    name: 'nurturing_churn_signals_total',
    help: 'Total churn signals detected',
    labelNames: ['tenant_id', 'signal_type']
  }),
  
  // Referral Metrics
  referralsCreatedCounter: new Counter({
    name: 'nurturing_referrals_created_total',
    help: 'Total referrals created',
    labelNames: ['tenant_id', 'type']
  }),
  
  referralConversionGauge: new Gauge({
    name: 'nurturing_referral_conversion_rate',
    help: 'Referral conversion rate',
    labelNames: ['tenant_id']
  }),
  
  referralRevenueCounter: new Counter({
    name: 'nurturing_referral_revenue_total',
    help: 'Total revenue from referrals',
    labelNames: ['tenant_id']
  }),
  
  // NPS Metrics
  npsScoreGauge: new Gauge({
    name: 'nurturing_nps_score_avg',
    help: 'Average NPS score',
    labelNames: ['tenant_id']
  }),
  
  npsDistributionGauge: new Gauge({
    name: 'nurturing_nps_distribution',
    help: 'NPS distribution by category',
    labelNames: ['tenant_id', 'category']
  }),
  
  // Cluster Metrics
  clusterPenetrationGauge: new Gauge({
    name: 'nurturing_cluster_penetration',
    help: 'Cluster penetration rate',
    labelNames: ['tenant_id', 'cluster_type']
  }),
  
  // Win-Back Metrics
  winbackCampaignsGauge: new Gauge({
    name: 'nurturing_winback_campaigns_active',
    help: 'Active win-back campaigns',
    labelNames: ['tenant_id', 'campaign_type']
  }),
  
  winbackSuccessRate: new Gauge({
    name: 'nurturing_winback_success_rate',
    help: 'Win-back success rate',
    labelNames: ['tenant_id']
  })
};
```

### 1.2 Technical Metrics

```typescript
// metrics/etapa5-technical.ts
export const etapa5TechnicalMetrics = {
  // Queue Metrics
  queueJobsWaiting: new Gauge({
    name: 'etapa5_queue_jobs_waiting',
    help: 'Jobs waiting in queue',
    labelNames: ['queue']
  }),
  
  queueJobsActive: new Gauge({
    name: 'etapa5_queue_jobs_active',
    help: 'Active jobs in queue',
    labelNames: ['queue']
  }),
  
  queueJobsFailed: new Counter({
    name: 'etapa5_queue_jobs_failed_total',
    help: 'Total failed jobs',
    labelNames: ['queue', 'error_type']
  }),
  
  queueProcessingTime: new Histogram({
    name: 'etapa5_queue_processing_seconds',
    help: 'Job processing time',
    labelNames: ['queue', 'worker'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
  }),
  
  // LLM Metrics
  llmRequestsTotal: new Counter({
    name: 'etapa5_llm_requests_total',
    help: 'Total LLM API requests',
    labelNames: ['model', 'operation']
  }),
  
  llmLatencyHistogram: new Histogram({
    name: 'etapa5_llm_latency_seconds',
    help: 'LLM request latency',
    labelNames: ['model'],
    buckets: [0.5, 1, 2, 5, 10, 30]
  }),
  
  llmTokensCounter: new Counter({
    name: 'etapa5_llm_tokens_total',
    help: 'Total LLM tokens used',
    labelNames: ['model', 'type']
  }),
  
  // PostGIS Metrics
  postgisQueryTime: new Histogram({
    name: 'etapa5_postgis_query_seconds',
    help: 'PostGIS query execution time',
    labelNames: ['query_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
  }),
  
  // Graph Metrics
  graphBuildTime: new Histogram({
    name: 'etapa5_graph_build_seconds',
    help: 'Graph build time',
    labelNames: ['algorithm'],
    buckets: [10, 30, 60, 120, 300, 600]
  }),
  
  // HITL Metrics
  hitlTasksCreated: new Counter({
    name: 'etapa5_hitl_tasks_created_total',
    help: 'Total HITL tasks created',
    labelNames: ['task_type', 'priority']
  }),
  
  hitlResolutionTime: new Histogram({
    name: 'etapa5_hitl_resolution_seconds',
    help: 'HITL task resolution time',
    labelNames: ['task_type'],
    buckets: [300, 900, 1800, 3600, 7200, 14400, 28800]
  }),
  
  hitlSlaBreaches: new Counter({
    name: 'etapa5_hitl_sla_breaches_total',
    help: 'Total SLA breaches',
    labelNames: ['task_type', 'priority']
  })
};
```

---

## 2. OpenTelemetry Tracing

### 2.1 Worker Tracing

```typescript
// tracing/etapa5-worker-tracing.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('etapa5-workers');

export function traceWorker<T>(
  workerName: string, 
  handler: (job: Job) => Promise<T>
) {
  return async (job: Job): Promise<T> => {
    const span = tracer.startSpan(`worker:${workerName}`, {
      attributes: {
        'job.id': job.id,
        'job.name': job.name,
        'job.queue': job.queueName,
        'job.attempt': job.attemptsMade,
        'tenant.id': job.data.tenantId,
        'client.id': job.data.clientId
      }
    });
    
    try {
      const result = await handler(job);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  };
}
```

### 2.2 Chain Tracing

```typescript
// tracing/etapa5-chain-tracing.ts
export function propagateTrace(
  parentSpan: Span, 
  childJobData: any
): any {
  const context = trace.setSpan(
    opentelemetry.context.active(), 
    parentSpan
  );
  
  const carrier = {};
  opentelemetry.propagation.inject(context, carrier);
  
  return {
    ...childJobData,
    _traceContext: carrier
  };
}

export function extractTrace(jobData: any): Context {
  if (!jobData._traceContext) {
    return opentelemetry.context.active();
  }
  
  return opentelemetry.propagation.extract(
    opentelemetry.context.active(),
    jobData._traceContext
  );
}
```

---

## 3. Grafana Dashboards

### 3.1 Nurturing Overview Dashboard

```json
{
  "dashboard": {
    "title": "Etapa 5 - Nurturing Overview",
    "panels": [
      {
        "title": "Clients by State",
        "type": "piechart",
        "targets": [{
          "expr": "nurturing_clients_by_state{tenant_id=\"$tenant\"}"
        }]
      },
      {
        "title": "Churn Score Distribution",
        "type": "histogram",
        "targets": [{
          "expr": "nurturing_churn_score_bucket{tenant_id=\"$tenant\"}"
        }]
      },
      {
        "title": "At Risk Clients Trend",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(nurturing_clients_at_risk{tenant_id=\"$tenant\"}) by (risk_level)"
        }]
      },
      {
        "title": "NPS Trend",
        "type": "timeseries",
        "targets": [{
          "expr": "nurturing_nps_score_avg{tenant_id=\"$tenant\"}"
        }]
      },
      {
        "title": "Referral Funnel",
        "type": "bargauge",
        "targets": [
          { "expr": "sum(nurturing_referrals_created_total{tenant_id=\"$tenant\"})", "legendFormat": "Created" },
          { "expr": "sum(nurturing_referrals_consent_given{tenant_id=\"$tenant\"})", "legendFormat": "Consent" },
          { "expr": "sum(nurturing_referrals_converted{tenant_id=\"$tenant\"})", "legendFormat": "Converted" }
        ]
      },
      {
        "title": "Cluster Penetration",
        "type": "bargauge",
        "targets": [{
          "expr": "nurturing_cluster_penetration{tenant_id=\"$tenant\"}"
        }]
      }
    ]
  }
}
```

### 3.2 Technical Health Dashboard

```json
{
  "dashboard": {
    "title": "Etapa 5 - Technical Health",
    "panels": [
      {
        "title": "Queue Health",
        "type": "table",
        "targets": [{
          "expr": "etapa5_queue_jobs_waiting + etapa5_queue_jobs_active"
        }]
      },
      {
        "title": "Worker Throughput",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(rate(etapa5_queue_jobs_completed_total[5m])) by (queue)"
        }]
      },
      {
        "title": "LLM Latency P95",
        "type": "timeseries",
        "targets": [{
          "expr": "histogram_quantile(0.95, etapa5_llm_latency_seconds_bucket)"
        }]
      },
      {
        "title": "PostGIS Query Performance",
        "type": "timeseries",
        "targets": [{
          "expr": "histogram_quantile(0.95, etapa5_postgis_query_seconds_bucket)"
        }]
      },
      {
        "title": "HITL SLA Status",
        "type": "stat",
        "targets": [{
          "expr": "sum(etapa5_hitl_tasks_pending{sla_status=\"BREACHED\"})"
        }]
      },
      {
        "title": "Error Rate",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(rate(etapa5_queue_jobs_failed_total[5m])) by (queue)"
        }]
      }
    ]
  }
}
```

---

## 4. Logging Standards

### 4.1 Structured Logging

```typescript
// logging/etapa5-logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  mixin() {
    return {
      service: 'etapa5-nurturing',
      version: process.env.APP_VERSION
    };
  }
});

// Worker logging helper
export function workerLogger(workerName: string, job: Job) {
  return logger.child({
    worker: workerName,
    jobId: job.id,
    tenantId: job.data.tenantId,
    clientId: job.data.clientId,
    correlationId: job.data.correlationId
  });
}
```

### 4.2 Log Events

```typescript
// Standard log events for Etapa 5
const LOG_EVENTS = {
  // State Machine
  STATE_TRANSITION: 'nurturing.state.transition',
  ONBOARDING_COMPLETE: 'nurturing.onboarding.complete',
  ADVOCATE_PROMOTED: 'nurturing.advocate.promoted',
  
  // Churn
  CHURN_SIGNAL_DETECTED: 'churn.signal.detected',
  CHURN_RISK_ESCALATED: 'churn.risk.escalated',
  CHURN_INTERVENTION_TRIGGERED: 'churn.intervention.triggered',
  
  // Referral
  REFERRAL_CREATED: 'referral.created',
  REFERRAL_CONSENT_RECEIVED: 'referral.consent.received',
  REFERRAL_CONVERTED: 'referral.converted',
  
  // Win-Back
  WINBACK_CAMPAIGN_STARTED: 'winback.campaign.started',
  WINBACK_SUCCESS: 'winback.success',
  
  // HITL
  HITL_TASK_CREATED: 'hitl.task.created',
  HITL_TASK_RESOLVED: 'hitl.task.resolved',
  HITL_SLA_BREACH: 'hitl.sla.breach',
  
  // Compliance
  CONSENT_VERIFIED: 'compliance.consent.verified',
  COMPETITION_CHECK_PASSED: 'compliance.competition.passed'
};
```

---

## 5. Alert Rules

```yaml
# alerts/etapa5-alerts.yaml
groups:
  - name: etapa5-business-alerts
    rules:
      - alert: HighChurnRiskClients
        expr: sum(nurturing_clients_at_risk{risk_level="CRITICAL"}) > 5
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "{{ $value }} clients at critical churn risk"
          
      - alert: LowNPSScore
        expr: nurturing_nps_score_avg < 6
        for: 24h
        labels:
          severity: warning
        annotations:
          summary: "Average NPS dropped below 6"
          
      - alert: ReferralConversionDrop
        expr: nurturing_referral_conversion_rate < 0.1
        for: 7d
        labels:
          severity: warning
          
  - name: etapa5-technical-alerts
    rules:
      - alert: SentimentWorkerBacklog
        expr: etapa5_queue_jobs_waiting{queue="sentiment"} > 200
        for: 15m
        labels:
          severity: warning
          
      - alert: LLMHighLatency
        expr: histogram_quantile(0.95, etapa5_llm_latency_seconds_bucket) > 30
        for: 10m
        labels:
          severity: warning
          
      - alert: HITLSLABreachRate
        expr: rate(etapa5_hitl_sla_breaches_total[1h]) > 0.1
        for: 30m
        labels:
          severity: critical
          
      - alert: GraphBuildFailure
        expr: increase(etapa5_graph_build_failures_total[24h]) > 0
        labels:
          severity: warning
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
