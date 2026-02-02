# CERNIQ.APP — ETAPA 2: MONITORING & OBSERVABILITY

## Metrics, Alerts, Dashboards & Logging

### Versiunea 1.1 | 2 Februarie 2026

---

## 1. METRICS ARCHITECTURE

### 1.1 Prometheus Metrics

```typescript
// metrics/outreach.metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('cerniq-outreach');

// ============================================
// QUOTA METRICS
// ============================================

export const quotaUsage = meter.createUpDownCounter('cerniq_outreach_wa_quota_usage', {
  description: 'Current WhatsApp quota usage per phone',
  unit: '1'
});

export const quotaCheckTotal = meter.createCounter('cerniq_outreach_quota_check_total', {
  description: 'Total quota checks performed',
});

// ============================================
// MESSAGE METRICS
// ============================================

export const messagesSent = new Counter({
  name: 'cerniq_outreach_messages_sent_total',
  help: 'Total messages sent',
  labelNames: ['channel', 'type', 'tenant_id'],
  registers: [register],
});

export const messagesDelivered = new Counter({
  name: 'cerniq_outreach_messages_delivered_total',
  help: 'Total messages delivered',
  labelNames: ['channel', 'tenant_id'],
  registers: [register],
});

export const repliesReceived = new Counter({
  name: 'cerniq_outreach_replies_received_total',
  help: 'Total replies received',
  labelNames: ['channel', 'sentiment', 'tenant_id'],
  registers: [register],
});

export const bounces = new Counter({
  name: 'cerniq_outreach_bounces_total',
  help: 'Total bounced messages',
  labelNames: ['channel', 'bounce_type', 'tenant_id'],
  registers: [register],
});

// ============================================
// QUEUE METRICS
// ============================================

// NOTE: Queue Depth metrics are collected automatically by the Monitoring API Sidecar.
// Do NOT instrument them inside the worker to avoid duplication and Redis overload.
// See `etapa0-monitoring-api-spec.md`.

export const jobProcessingDuration = new Histogram({
  name: 'cerniq_outreach_job_processing_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['queue_name', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [register],
});

export const jobRetries = new Counter({
  name: 'cerniq_outreach_job_retries_total',
  help: 'Total job retries',
  labelNames: ['queue_name', 'error_type'],
  registers: [register],
});

// ============================================
// PHONE HEALTH METRICS
// ============================================

export const phoneStatus = new Gauge({
  name: 'cerniq_outreach_phone_status',
  help: 'Phone status (1=active, 0=inactive)',
  labelNames: ['phone_id', 'phone_label', 'status'],
  registers: [register],
});

export const phoneResponseTime = new Histogram({
  name: 'cerniq_outreach_phone_response_seconds',
  help: 'Phone API response time',
  labelNames: ['phone_id'],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

// ============================================
// HITL METRICS
// ============================================

export const reviewQueueSize = new Gauge({
  name: 'cerniq_outreach_review_queue_size',
  help: 'Current review queue size',
  labelNames: ['priority', 'status'],
  registers: [register],
});

export const reviewResolutionTime = new Histogram({
  name: 'cerniq_outreach_review_resolution_seconds',
  help: 'Time to resolve reviews',
  labelNames: ['priority', 'action'],
  buckets: [60, 300, 900, 3600, 14400, 86400],
  registers: [register],
});

export const slaBreach = new Counter({
  name: 'cerniq_outreach_sla_breach_total',
  help: 'Total SLA breaches',
  labelNames: ['priority'],
  registers: [register],
});

// ============================================
// CONVERSION METRICS
// ============================================

export const stageTransitions = new Counter({
  name: 'cerniq_outreach_stage_transitions_total',
  help: 'Lead stage transitions',
  labelNames: ['from_stage', 'to_stage', 'tenant_id'],
  registers: [register],
});

export const conversions = new Counter({
  name: 'cerniq_outreach_conversions_total',
  help: 'Total conversions',
  labelNames: ['source_channel', 'tenant_id'],
  registers: [register],
});

export default register;
```

---

## 2. ALERT RULES

### 2.1 Prometheus Alerting Rules

```yaml
# alerting/outreach-alerts.yml

groups:
  - name: outreach_quota
    interval: 30s
    rules:
      - alert: QuotaNearLimit
        expr: cerniq_outreach_wa_quota_usage > 180
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "WhatsApp quota near limit"
          description: "Phone {{ $labels.phone_label }} has used {{ $value }}/200 quota"

      - alert: QuotaExhausted
        expr: cerniq_outreach_wa_quota_usage >= 200
        for: 1m
        labels:
          severity: high
        annotations:
          summary: "WhatsApp quota exhausted"
          description: "Phone {{ $labels.phone_label }} has exhausted daily quota"

      - alert: AllPhonesQuotaExhausted
        expr: count(cerniq_outreach_wa_quota_usage >= 200) == count(cerniq_outreach_wa_quota_usage)
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "All WhatsApp phones quota exhausted"
          description: "No phones available for new contacts"

  - name: outreach_phone_health
    interval: 1m
    rules:
      - alert: PhoneOffline
        expr: cerniq_outreach_phone_status{status="ACTIVE"} == 0
        for: 10m
        labels:
          severity: high
        annotations:
          summary: "WhatsApp phone offline"
          description: "Phone {{ $labels.phone_label }} has been offline for >10 minutes"

      - alert: PhoneBanned
        expr: cerniq_outreach_phone_status{status="BANNED"} == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "WhatsApp phone banned"
          description: "Phone {{ $labels.phone_label }} has been banned by WhatsApp"

      - alert: MultiplePhoneIssues
        expr: count(cerniq_outreach_phone_status{status!="ACTIVE"}) > 3
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Multiple phone issues detected"
          description: "{{ $value }} phones are not in ACTIVE status"

  - name: outreach_queue_health
    interval: 30s
    rules:
      - alert: QueueBacklog
        expr: cerniq_outreach_queue_depth{status="waiting"} > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Queue backlog growing"
          description: "Queue {{ $labels.queue_name }} has {{ $value }} waiting jobs"

      - alert: QueueStalled
        expr: rate(cerniq_outreach_job_processing_seconds_count[5m]) == 0 AND cerniq_outreach_queue_depth{status="waiting"} > 0
        for: 10m
        labels:
          severity: high
        annotations:
          summary: "Queue appears stalled"
          description: "Queue {{ $labels.queue_name }} has stopped processing"

      - alert: HighFailureRate
        expr: rate(cerniq_outreach_job_retries_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High job failure rate"
          description: "Queue {{ $labels.queue_name }} has high retry rate"

  - name: outreach_email_deliverability
    interval: 5m
    rules:
      - alert: HighBounceRate
        expr: rate(cerniq_outreach_bounces_total{channel="EMAIL_COLD"}[1h]) / rate(cerniq_outreach_messages_sent_total{channel="EMAIL_COLD"}[1h]) > 0.03
        for: 15m
        labels:
          severity: high
        annotations:
          summary: "High email bounce rate"
          description: "Cold email bounce rate exceeds 3%"

  - name: outreach_hitl
    interval: 1m
    rules:
      - alert: SLAAtRisk
        expr: cerniq_outreach_review_queue_size{status="PENDING",priority="URGENT"} > 0
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "URGENT reviews pending for >30min"
          description: "{{ $value }} URGENT reviews approaching SLA"

      - alert: SLABreach
        expr: increase(cerniq_outreach_sla_breach_total[1h]) > 0
        for: 1m
        labels:
          severity: high
        annotations:
          summary: "SLA breach detected"
          description: "{{ $value }} SLA breaches in the last hour"
```

---

## 3. GRAFANA DASHBOARDS

### 3.1 Main Outreach Dashboard

```json
{
  "dashboard": {
    "title": "Cerniq Outreach - Overview",
    "uid": "outreach-overview",
    "panels": [
      {
        "title": "Messages Sent Today",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(increase(cerniq_outreach_messages_sent_total[24h]))"
          }
        ],
        "gridPos": { "x": 0, "y": 0, "w": 6, "h": 4 }
      },
      {
        "title": "Replies Received Today",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(increase(cerniq_outreach_replies_received_total[24h]))"
          }
        ],
        "gridPos": { "x": 6, "y": 0, "w": 6, "h": 4 }
      },
      {
        "title": "Reply Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "sum(rate(cerniq_outreach_replies_received_total[24h])) / sum(rate(cerniq_outreach_messages_sent_total[24h])) * 100"
          }
        ],
        "gridPos": { "x": 12, "y": 0, "w": 6, "h": 4 }
      },
      {
        "title": "Pending Reviews",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(cerniq_outreach_review_queue_size{status='PENDING'})"
          }
        ],
        "gridPos": { "x": 18, "y": 0, "w": 6, "h": 4 }
      },
      {
        "title": "WhatsApp Quota Usage",
        "type": "bargauge",
        "targets": [
          {
            "expr": "cerniq_outreach_wa_quota_usage",
            "legendFormat": "{{phone_label}}"
          }
        ],
        "gridPos": { "x": 0, "y": 4, "w": 24, "h": 6 },
        "fieldConfig": {
          "defaults": {
            "max": 200,
            "thresholds": {
              "steps": [
                { "color": "green", "value": 0 },
                { "color": "yellow", "value": 150 },
                { "color": "red", "value": 190 }
              ]
            }
          }
        }
      },
      {
        "title": "Messages by Channel (24h)",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum by (channel) (increase(cerniq_outreach_messages_sent_total[24h]))",
            "legendFormat": "{{channel}}"
          }
        ],
        "gridPos": { "x": 0, "y": 10, "w": 8, "h": 8 }
      },
      {
        "title": "Replies by Sentiment (24h)",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum by (sentiment) (increase(cerniq_outreach_replies_received_total[24h]))",
            "legendFormat": "{{sentiment}}"
          }
        ],
        "gridPos": { "x": 8, "y": 10, "w": 8, "h": 8 }
      },
      {
        "title": "Stage Transitions (24h)",
        "type": "heatmap",
        "targets": [
          {
            "expr": "sum by (from_stage, to_stage) (increase(cerniq_outreach_stage_transitions_total[24h]))"
          }
        ],
        "gridPos": { "x": 16, "y": 10, "w": 8, "h": 8 }
      }
    ]
  }
}
```

---

## 4. STRUCTURED LOGGING

### 4.1 Log Format Standard

```typescript
// logger/outreach.logger.ts

import pino from 'pino';

export const outreachLogger = pino({
  name: 'cerniq-outreach',
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'outreach',
    env: process.env.NODE_ENV,
  },
});

// Standard log fields
interface OutreachLogContext {
  // Identifiers
  correlationId?: string;
  tenantId?: string;
  leadId?: string;
  phoneId?: string;
  jobId?: string;

  // Operation
  action: string;
  channel?: 'WHATSAPP' | 'EMAIL_COLD' | 'EMAIL_WARM';
  
  // Timing
  durationMs?: number;
  
  // Error context
  errorCode?: string;
  errorMessage?: string;
  
  // Additional metadata
  metadata?: Record<string, any>;
}

export function logOutreachEvent(
  level: 'info' | 'warn' | 'error' | 'debug',
  context: OutreachLogContext,
  message: string
) {
  outreachLogger[level]({
    ...context,
    timestamp: new Date().toISOString(),
  }, message);
}

// Usage examples:
/*
logOutreachEvent('info', {
  correlationId: 'abc-123',
  tenantId: 'tenant-uuid',
  leadId: 'lead-uuid',
  phoneId: 'phone-uuid',
  action: 'wa:send:initial:success',
  channel: 'WHATSAPP',
  durationMs: 1523,
}, 'WhatsApp message sent successfully');

logOutreachEvent('error', {
  correlationId: 'abc-123',
  action: 'wa:send:initial:failed',
  errorCode: 'QUOTA_EXCEEDED',
  errorMessage: 'Daily quota of 200 exceeded',
}, 'Failed to send WhatsApp message');
*/
```

### 4.2 Log Queries (Loki/OpenSearch)

```bash
# Find all messages for a specific lead
{service="outreach"} |= "lead-uuid-here"

# Find quota exceeded errors
{service="outreach"} | json | action=~".*quota.*" | errorCode="QUOTA_EXCEEDED"

# Find slow operations (>5s)
{service="outreach"} | json | durationMs > 5000

# Find all errors in last hour
{service="outreach"} | json | level="error" | line_format "{{.timestamp}} {{.action}}: {{.errorMessage}}"

# Trace a specific correlation ID
{service="outreach"} |= "correlation-id-here" | json | line_format "{{.timestamp}} {{.action}}"
```

---

## 5. HEALTH CHECK ENDPOINTS

```typescript
// api/health/outreach.ts

export async function outreachHealthCheck(): Promise<HealthStatus> {
  const checks: HealthCheck[] = [];

  // 1. Redis connection
  try {
    await redis.ping();
    checks.push({ name: 'redis', status: 'healthy' });
  } catch {
    checks.push({ name: 'redis', status: 'unhealthy', error: 'Connection failed' });
  }

  // 2. Database connection
  try {
    await db.execute(sql`SELECT 1`);
    checks.push({ name: 'database', status: 'healthy' });
  } catch {
    checks.push({ name: 'database', status: 'unhealthy', error: 'Query failed' });
  }

  // 3. Queue workers
  const queueStats = await getQueueHealth();
  for (const [queue, stats] of Object.entries(queueStats)) {
    checks.push({
      name: `queue:${queue}`,
      status: stats.active > 0 || stats.waiting === 0 ? 'healthy' : 'degraded',
      details: stats,
    });
  }

  // 4. Phone health
  const phones = await db.select().from(waPhoneNumbers);
  const activePhones = phones.filter(p => p.status === 'ACTIVE').length;
  checks.push({
    name: 'phones',
    status: activePhones >= 10 ? 'healthy' : activePhones >= 5 ? 'degraded' : 'unhealthy',
    details: { active: activePhones, total: phones.length },
  });

  // 5. External services
  try {
    await timelinesaiClient.healthCheck();
    checks.push({ name: 'timelinesai', status: 'healthy' });
  } catch {
    checks.push({ name: 'timelinesai', status: 'unhealthy' });
  }

  const overall = checks.every(c => c.status === 'healthy') 
    ? 'healthy' 
    : checks.some(c => c.status === 'unhealthy')
      ? 'unhealthy'
      : 'degraded';

  return { overall, checks, timestamp: new Date().toISOString() };
}
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2
