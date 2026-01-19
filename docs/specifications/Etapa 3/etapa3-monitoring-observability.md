# Etapa 3 - Monitoring și Observability Stack

> **Document Version**: 1.0.0  
> **Last Updated**: 2026-01-19  
> **Author**: Cerniq Development Team  
> **Status**: COMPLETE  
> **Parent**: Cerniq Master Specification v1.2

---

## Table of Contents

1. [Overview](#1-overview)
2. [Observability Architecture](#2-observability-architecture)
3. [OpenTelemetry Configuration](#3-opentelemetry-configuration)
4. [SigNoz Integration](#4-signoz-integration)
5. [Prometheus Metrics](#5-prometheus-metrics)
6. [Custom Metrics per Worker](#6-custom-metrics-per-worker)
7. [Logging Strategy](#7-logging-strategy)
8. [Distributed Tracing](#8-distributed-tracing)
9. [Alerting Rules](#9-alerting-rules)
10. [Grafana Dashboards](#10-grafana-dashboards)
11. [Health Checks](#11-health-checks)
12. [SLA Monitoring](#12-sla-monitoring)
13. [Cost Monitoring](#13-cost-monitoring)
14. [Security Monitoring](#14-security-monitoring)
15. [Performance Baselines](#15-performance-baselines)
16. [Incident Response Integration](#16-incident-response-integration)

---

## 1. Overview

### 1.1 Purpose

Acest document definește strategia completă de monitoring și observability pentru Etapa 3 - AI Sales Agent. Etapa 3 reprezintă componenta cea mai complexă din perspectiva observability datorită:

- **AI Processing**: Sesiuni LLM cu latență variabilă și costuri semnificative
- **Negocieri FSM**: State machine complex cu tranziții multiple
- **Integrări Fiscale**: ANAF e-Factura, Oblio, generare documente
- **Multi-Channel**: Conversații pe Email, WhatsApp, Phone
- **HITL Approvals**: Procese de aprobare cu SLA strict

### 1.2 Objectives

| Objective | Target | Measurement |
|-----------|--------|-------------|
| **Trace Coverage** | ≥95% | % requests with complete traces |
| **Metric Collection** | 100% workers | All workers export metrics |
| **Log Correlation** | 100% | Logs linked to traces |
| **Alert Response** | <5 min | Time to first alert acknowledgment |
| **Dashboard Latency** | <2s | Dashboard refresh time |
| **Retention** | 30 days traces, 90 days metrics | Configurable per data type |

### 1.3 Stack Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OBSERVABILITY STACK - ETAPA 3                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │   Traces    │  │   Metrics   │  │    Logs     │  │      Alerts         ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘│
│         │                │                │                     │           │
│         ▼                ▼                ▼                     ▼           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    OpenTelemetry Collector                           │  │
│  │                    (OTLP gRPC :4317, HTTP :4318)                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         ClickHouse                                   │  │
│  │                   (signoz_traces, signoz_metrics, signoz_logs)       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    SigNoz Query Service                              │  │
│  │                    (signoz.cerniq.app)                               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│         ┌──────────────────────────┼──────────────────────────┐            │
│         ▼                          ▼                          ▼            │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐       │
│  │   SigNoz    │           │   Grafana   │           │  AlertMgr   │       │
│  │     UI      │           │  Dashboards │           │   + Slack   │       │
│  └─────────────┘           └─────────────┘           └─────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW - ETAPA 3 OBSERVABILITY                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WORKERS & SERVICES                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │ AI Agent Core  │  │  Negotiation   │  │   e-Factura    │                │
│  │    Worker      │  │   FSM Worker   │  │    Worker      │                │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘                │
│          │                   │                   │                          │
│          │ OTLP              │ OTLP              │ OTLP                     │
│          ▼                   ▼                   ▼                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    OpenTelemetry SDK                                 │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │  │
│  │  │ Tracer  │  │ Meter   │  │ Logger  │  │Propagator│                 │  │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                 │  │
│  └───────┼────────────┼────────────┼────────────┼──────────────────────┘  │
│          │            │            │            │                          │
│          └────────────┴────────────┴────────────┘                          │
│                              │                                              │
│                              ▼ OTLP Protocol                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    OTel Collector                                    │  │
│  │                                                                       │  │
│  │  Receivers:           Processors:           Exporters:               │  │
│  │  - OTLP gRPC         - batch               - clickhousetraces        │  │
│  │  - OTLP HTTP         - memory_limiter      - clickhousemetrics       │  │
│  │  - prometheus        - resource            - clickhouselogs          │  │
│  │                      - attributes          - prometheus              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    ClickHouse Cluster                                │  │
│  │                                                                       │  │
│  │  Databases:                      Tables:                             │  │
│  │  - signoz_traces                 - distributed_signoz_spans          │  │
│  │  - signoz_metrics                - distributed_samples_v4            │  │
│  │  - signoz_logs                   - distributed_logs                  │  │
│  │                                                                       │  │
│  │  Retention: 30 days (configurable)                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Observability Architecture

### 2.1 Three Pillars Implementation

```typescript
// packages/shared/observability/index.ts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAMESPACE
} from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';

export interface ObservabilityConfig {
  serviceName: string;
  serviceVersion: string;
  environment: 'development' | 'staging' | 'production';
  otlpEndpoint: string;
  enableTracing?: boolean;
  enableMetrics?: boolean;
  enableLogs?: boolean;
  samplingRatio?: number;
  metricExportIntervalMs?: number;
}

export function initializeObservability(config: ObservabilityConfig): NodeSDK {
  const {
    serviceName,
    serviceVersion,
    environment,
    otlpEndpoint,
    enableTracing = true,
    enableMetrics = true,
    enableLogs = true,
    samplingRatio = 1.0,
    metricExportIntervalMs = 60000
  } = config;

  // Resource attributes
  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
    [SEMRESATTRS_SERVICE_NAMESPACE]: 'cerniq-etapa3',
    'service.stage': 'etapa3',
    'service.category': 'ai-sales-agent'
  });

  // Trace exporter
  const traceExporter = enableTracing
    ? new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` })
    : undefined;

  // Metric reader
  const metricReader = enableMetrics
    ? new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` }),
        exportIntervalMillis: metricExportIntervalMs
      })
    : undefined;

  // Log processor
  const logRecordProcessor = enableLogs
    ? new BatchLogRecordProcessor(
        new OTLPLogExporter({ url: `${otlpEndpoint}/v1/logs` })
      )
    : undefined;

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    logRecordProcessor,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (request) => {
            // Ignore health checks
            return request.url?.includes('/health') || false;
          }
        },
        '@opentelemetry/instrumentation-pg': {
          enhancedDatabaseReporting: true
        },
        '@opentelemetry/instrumentation-redis': {
          requireParentSpan: true
        }
      })
    ]
  });

  // Start SDK
  sdk.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Observability SDK shut down'))
      .catch((err) => console.error('Error shutting down SDK', err))
      .finally(() => process.exit(0));
  });

  return sdk;
}
```

### 2.2 Worker Observability Base Class

```typescript
// packages/shared/observability/worker-observability.ts

import { trace, metrics, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import type { Span, Tracer, Meter, Counter, Histogram, Gauge } from '@opentelemetry/api';
import { Logger } from 'pino';
import { Job } from 'bullmq';

export interface WorkerMetrics {
  jobsProcessed: Counter;
  jobsSucceeded: Counter;
  jobsFailed: Counter;
  jobDuration: Histogram;
  activeJobs: Gauge;
  queueDepth: Gauge;
  retryCount: Counter;
}

export interface WorkerSpanAttributes {
  'worker.name': string;
  'worker.category': string;
  'job.id': string;
  'job.name': string;
  'job.attempt': number;
  'tenant.id': string;
  'correlation.id': string;
  [key: string]: string | number | boolean;
}

export class WorkerObservability {
  private tracer: Tracer;
  private meter: Meter;
  private metrics: WorkerMetrics;
  private logger: Logger;
  private workerName: string;
  private category: string;

  constructor(
    workerName: string,
    category: string,
    logger: Logger
  ) {
    this.workerName = workerName;
    this.category = category;
    this.logger = logger;

    // Initialize tracer
    this.tracer = trace.getTracer(`cerniq-etapa3-${workerName}`, '1.0.0');

    // Initialize meter
    this.meter = metrics.getMeter(`cerniq-etapa3-${workerName}`, '1.0.0');

    // Initialize metrics
    this.metrics = this.createMetrics();
  }

  private createMetrics(): WorkerMetrics {
    const prefix = `cerniq_etapa3_${this.workerName.replace(/-/g, '_')}`;

    return {
      jobsProcessed: this.meter.createCounter(`${prefix}_jobs_processed_total`, {
        description: `Total jobs processed by ${this.workerName}`,
        unit: 'jobs'
      }),
      jobsSucceeded: this.meter.createCounter(`${prefix}_jobs_succeeded_total`, {
        description: `Successful jobs for ${this.workerName}`,
        unit: 'jobs'
      }),
      jobsFailed: this.meter.createCounter(`${prefix}_jobs_failed_total`, {
        description: `Failed jobs for ${this.workerName}`,
        unit: 'jobs'
      }),
      jobDuration: this.meter.createHistogram(`${prefix}_job_duration_ms`, {
        description: `Job processing duration for ${this.workerName}`,
        unit: 'ms',
        boundaries: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000]
      }),
      activeJobs: this.meter.createGauge(`${prefix}_active_jobs`, {
        description: `Currently processing jobs for ${this.workerName}`,
        unit: 'jobs'
      }),
      queueDepth: this.meter.createGauge(`${prefix}_queue_depth`, {
        description: `Queue depth for ${this.workerName}`,
        unit: 'jobs'
      }),
      retryCount: this.meter.createCounter(`${prefix}_retries_total`, {
        description: `Total retries for ${this.workerName}`,
        unit: 'retries'
      })
    };
  }

  /**
   * Start a span for job processing
   */
  startJobSpan<T extends Record<string, unknown>>(
    job: Job<T>,
    operation: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): Span {
    const attributes: WorkerSpanAttributes = {
      'worker.name': this.workerName,
      'worker.category': this.category,
      'job.id': job.id || 'unknown',
      'job.name': job.name,
      'job.attempt': job.attemptsMade + 1,
      'tenant.id': (job.data as any).tenantId || 'unknown',
      'correlation.id': (job.data as any).correlationId || job.id || 'unknown',
      ...additionalAttributes
    };

    const span = this.tracer.startSpan(`${this.workerName}:${operation}`, {
      kind: SpanKind.CONSUMER,
      attributes
    });

    // Record active job
    this.metrics.activeJobs.add(1, { worker: this.workerName });

    return span;
  }

  /**
   * End span with success
   */
  endSpanSuccess(span: Span, durationMs: number): void {
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    // Record metrics
    this.metrics.jobsProcessed.add(1, { worker: this.workerName, status: 'completed' });
    this.metrics.jobsSucceeded.add(1, { worker: this.workerName });
    this.metrics.jobDuration.record(durationMs, { worker: this.workerName, status: 'success' });
    this.metrics.activeJobs.add(-1, { worker: this.workerName });
  }

  /**
   * End span with error
   */
  endSpanError(span: Span, error: Error, durationMs: number): void {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    span.end();

    // Record metrics
    this.metrics.jobsProcessed.add(1, { worker: this.workerName, status: 'failed' });
    this.metrics.jobsFailed.add(1, { 
      worker: this.workerName, 
      error_type: error.name || 'UnknownError' 
    });
    this.metrics.jobDuration.record(durationMs, { worker: this.workerName, status: 'error' });
    this.metrics.activeJobs.add(-1, { worker: this.workerName });
  }

  /**
   * Record retry attempt
   */
  recordRetry(job: Job<unknown>, error: Error): void {
    this.metrics.retryCount.add(1, {
      worker: this.workerName,
      error_type: error.name || 'UnknownError',
      attempt: job.attemptsMade
    });

    this.logger.warn({
      jobId: job.id,
      worker: this.workerName,
      attempt: job.attemptsMade,
      error: error.message
    }, 'Job retry scheduled');
  }

  /**
   * Update queue depth gauge
   */
  updateQueueDepth(depth: number): void {
    this.metrics.queueDepth.add(depth, { worker: this.workerName });
  }

  /**
   * Create a child span for sub-operations
   */
  createChildSpan(
    parentSpan: Span,
    operation: string,
    attributes?: Record<string, string | number | boolean>
  ): Span {
    const ctx = trace.setSpan(context.active(), parentSpan);
    return this.tracer.startSpan(
      `${this.workerName}:${operation}`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'worker.name': this.workerName,
          'worker.category': this.category,
          ...attributes
        }
      },
      ctx
    );
  }

  /**
   * Add event to span
   */
  addSpanEvent(
    span: Span,
    name: string,
    attributes?: Record<string, string | number | boolean>
  ): void {
    span.addEvent(name, attributes);
  }

  /**
   * Get tracer for advanced usage
   */
  getTracer(): Tracer {
    return this.tracer;
  }

  /**
   * Get meter for custom metrics
   */
  getMeter(): Meter {
    return this.meter;
  }

  /**
   * Get pre-created metrics
   */
  getMetrics(): WorkerMetrics {
    return this.metrics;
  }
}
```

### 2.3 Context Propagation

```typescript
// packages/shared/observability/context-propagation.ts

import {
  context,
  propagation,
  trace,
  SpanContext,
  ROOT_CONTEXT
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

export interface PropagatedContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  traceState?: string;
  baggage?: Record<string, string>;
}

// Initialize W3C Trace Context propagator
propagation.setGlobalPropagator(new W3CTraceContextPropagator());

/**
 * Extract context from incoming headers/message
 */
export function extractContext(
  carrier: Record<string, string>
): PropagatedContext | null {
  const extractedContext = propagation.extract(ROOT_CONTEXT, carrier);
  const spanContext = trace.getSpanContext(extractedContext);

  if (!spanContext) {
    return null;
  }

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags,
    traceState: spanContext.traceState?.serialize()
  };
}

/**
 * Inject context into outgoing headers/message
 */
export function injectContext(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

/**
 * Create context from propagated data (for BullMQ jobs)
 */
export function createContextFromPropagated(
  propagated: PropagatedContext
): SpanContext {
  return {
    traceId: propagated.traceId,
    spanId: propagated.spanId,
    traceFlags: propagated.traceFlags,
    isRemote: true
  };
}

/**
 * BullMQ Job with trace context
 */
export interface TracedJobData<T = unknown> {
  payload: T;
  traceContext: PropagatedContext;
  correlationId: string;
  tenantId: string;
}

/**
 * Create traced job data
 */
export function createTracedJobData<T>(
  payload: T,
  tenantId: string,
  correlationId?: string
): TracedJobData<T> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);

  const spanContext = trace.getSpanContext(context.active());

  return {
    payload,
    tenantId,
    correlationId: correlationId || spanContext?.traceId || crypto.randomUUID(),
    traceContext: {
      traceId: spanContext?.traceId || '',
      spanId: spanContext?.spanId || '',
      traceFlags: spanContext?.traceFlags || 0
    }
  };
}

/**
 * Run function with extracted context
 */
export async function withTracedContext<T>(
  propagatedContext: PropagatedContext,
  fn: () => Promise<T>
): Promise<T> {
  const spanContext = createContextFromPropagated(propagatedContext);
  const ctx = trace.setSpanContext(context.active(), spanContext);
  return context.with(ctx, fn);
}
```


---

## 3. OpenTelemetry Configuration

### 3.1 OTel Collector Configuration

```yaml
# config/otel/otel-collector-etapa3.yaml
# OpenTelemetry Collector Configuration for Cerniq Etapa 3
# Version: 1.0.0
# Last Updated: 2026-01-19

receivers:
  # OTLP Receiver - Primary receiver for all telemetry
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16
        max_concurrent_streams: 100
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
            - "https://cerniq.app"
            - "https://*.cerniq.app"
          allowed_headers:
            - "*"

  # Prometheus scraping for external metrics
  prometheus:
    config:
      scrape_configs:
        - job_name: 'etapa3-workers'
          scrape_interval: 15s
          static_configs:
            - targets:
              - 'ai-agent-worker:9090'
              - 'negotiation-worker:9090'
              - 'efactura-worker:9090'
              - 'document-worker:9090'
              - 'mcp-server:9090'
              - 'guardrails-worker:9090'
          metric_relabel_configs:
            - source_labels: [__name__]
              regex: 'go_.*'
              action: drop

  # Host metrics for infrastructure monitoring
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
      memory:
        metrics:
          system.memory.utilization:
            enabled: true
      disk:
        metrics:
          system.disk.io:
            enabled: true
      network:
        metrics:
          system.network.io:
            enabled: true

processors:
  # Batch processor for efficiency
  batch:
    timeout: 1s
    send_batch_size: 1000
    send_batch_max_size: 1500

  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 4000
    spike_limit_mib: 1000

  # Resource processor for enrichment
  resource:
    attributes:
      - key: deployment.environment
        value: ${DEPLOYMENT_ENV}
        action: upsert
      - key: service.namespace
        value: cerniq-etapa3
        action: upsert
      - key: cloud.provider
        value: hetzner
        action: upsert

  # Attributes processor for data transformation
  attributes:
    actions:
      # Add etapa3 identifier to all telemetry
      - key: cerniq.etapa
        value: 3
        action: upsert
      # Mask sensitive data
      - key: db.statement
        action: hash
      - key: http.request.header.authorization
        action: delete

  # Filter processor for noise reduction
  filter:
    error_mode: ignore
    traces:
      span:
        # Drop health check spans
        - 'attributes["http.target"] == "/health"'
        - 'attributes["http.target"] == "/ready"'
        - 'attributes["http.target"] == "/metrics"'
    metrics:
      metric:
        # Drop internal Go metrics
        - 'name == "go_gc_duration_seconds"'
        - 'name == "go_goroutines"'

  # Tail sampling for intelligent trace sampling
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    policies:
      # Always sample errors
      - name: errors
        type: status_code
        status_code: {status_codes: [ERROR]}
      # Always sample slow traces (>5s)
      - name: slow-traces
        type: latency
        latency: {threshold_ms: 5000}
      # Sample AI operations at 100%
      - name: ai-operations
        type: string_attribute
        string_attribute:
          key: worker.category
          values: [ai-agent, llm-processing]
      # Sample HITL approvals at 100%
      - name: hitl-approvals
        type: string_attribute
        string_attribute:
          key: operation.type
          values: [hitl_approval, hitl_rejection, hitl_escalation]
      # Sample fiscal operations at 100%
      - name: fiscal-operations
        type: string_attribute
        string_attribute:
          key: worker.name
          values: [efactura-worker, oblio-worker, document-generator]
      # Probabilistic sampling for rest
      - name: probabilistic
        type: probabilistic
        probabilistic: {sampling_percentage: 10}

  # Grouping by trace for better batching
  groupbytrace:
    wait_duration: 5s
    num_traces: 10000

exporters:
  # ClickHouse for traces
  clickhousetraces:
    datasource: tcp://clickhouse:9000/signoz_traces
    migrations_folder: /signoz/migrations/traces
    low_cardinal_exception_grouping: true
    timeout: 30s
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

  # ClickHouse for metrics
  clickhousemetricswrite:
    datasource: tcp://clickhouse:9000/signoz_metrics
    timeout: 30s
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

  # ClickHouse for logs
  clickhouselogs:
    dsn: tcp://clickhouse:9000/signoz_logs
    timeout: 30s
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

  # Prometheus for Grafana integration
  prometheus:
    endpoint: 0.0.0.0:8889
    namespace: cerniq_etapa3
    const_labels:
      environment: ${DEPLOYMENT_ENV}

  # Debug exporter (development only)
  debug:
    verbosity: detailed
    sampling_initial: 5
    sampling_thereafter: 200

extensions:
  # Health check extension
  health_check:
    endpoint: 0.0.0.0:13133
    path: /health
    check_collector_pipeline:
      enabled: true
      interval: 5s
      exporter_failure_threshold: 5

  # pprof for debugging
  pprof:
    endpoint: 0.0.0.0:1777

  # zpages for debugging
  zpages:
    endpoint: 0.0.0.0:55679

service:
  extensions: [health_check, pprof, zpages]
  
  telemetry:
    logs:
      level: info
      initial_fields:
        service: otel-collector-etapa3
    metrics:
      address: 0.0.0.0:8888
      level: detailed

  pipelines:
    # Traces pipeline
    traces:
      receivers: [otlp]
      processors: [memory_limiter, filter, attributes, resource, tail_sampling, batch]
      exporters: [clickhousetraces]

    # Metrics pipeline
    metrics:
      receivers: [otlp, prometheus, hostmetrics]
      processors: [memory_limiter, filter, attributes, resource, batch]
      exporters: [clickhousemetricswrite, prometheus]

    # Logs pipeline
    logs:
      receivers: [otlp]
      processors: [memory_limiter, filter, attributes, resource, batch]
      exporters: [clickhouselogs]
```

### 3.2 Service-Specific Instrumentation

```typescript
// packages/workers/ai-agent/src/instrumentation.ts

import { initializeObservability } from '@cerniq/shared/observability';

// Initialize before any other imports
const sdk = initializeObservability({
  serviceName: 'cerniq-ai-agent-worker',
  serviceVersion: process.env.npm_package_version || '1.0.0',
  environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
  enableTracing: true,
  enableMetrics: true,
  enableLogs: true,
  samplingRatio: 1.0, // 100% sampling for AI operations
  metricExportIntervalMs: 30000 // 30s export interval
});

export { sdk };

// Additional AI-specific instrumentation
import { trace, metrics } from '@opentelemetry/api';

const tracer = trace.getTracer('ai-agent-worker');
const meter = metrics.getMeter('ai-agent-worker');

// AI-specific metrics
export const aiMetrics = {
  llmRequests: meter.createCounter('cerniq_ai_llm_requests_total', {
    description: 'Total LLM API requests',
    unit: 'requests'
  }),
  
  llmTokensInput: meter.createCounter('cerniq_ai_llm_tokens_input_total', {
    description: 'Total input tokens used',
    unit: 'tokens'
  }),
  
  llmTokensOutput: meter.createCounter('cerniq_ai_llm_tokens_output_total', {
    description: 'Total output tokens generated',
    unit: 'tokens'
  }),
  
  llmLatency: meter.createHistogram('cerniq_ai_llm_latency_ms', {
    description: 'LLM API response latency',
    unit: 'ms',
    boundaries: [100, 250, 500, 1000, 2000, 5000, 10000, 30000]
  }),
  
  llmCost: meter.createHistogram('cerniq_ai_llm_cost_usd', {
    description: 'Estimated LLM API cost',
    unit: 'USD',
    boundaries: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0]
  }),
  
  guardrailBlocks: meter.createCounter('cerniq_ai_guardrail_blocks_total', {
    description: 'Total guardrail blocks',
    unit: 'blocks'
  }),
  
  conversationTurns: meter.createHistogram('cerniq_ai_conversation_turns', {
    description: 'Conversation turns before resolution',
    unit: 'turns',
    boundaries: [1, 2, 3, 5, 10, 15, 20, 30]
  }),
  
  intentClassifications: meter.createCounter('cerniq_ai_intent_classifications_total', {
    description: 'Intent classification results',
    unit: 'classifications'
  })
};

// Create spans for LLM calls
export function createLLMSpan(
  model: string,
  operation: string,
  conversationId: string
) {
  return tracer.startSpan(`llm:${operation}`, {
    attributes: {
      'llm.model': model,
      'llm.operation': operation,
      'conversation.id': conversationId,
      'worker.category': 'ai-agent'
    }
  });
}
```

### 3.3 BullMQ Instrumentation

```typescript
// packages/shared/observability/bullmq-instrumentation.ts

import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { Worker, Job, Queue } from 'bullmq';
import { createContextFromPropagated, TracedJobData } from './context-propagation';

const tracer = trace.getTracer('cerniq-bullmq');

/**
 * Instrumented BullMQ Worker
 */
export function createInstrumentedWorker<T>(
  name: string,
  processor: (job: Job<TracedJobData<T>>) => Promise<unknown>,
  options: ConstructorParameters<typeof Worker>[2] = {}
): Worker {
  const instrumentedProcessor = async (job: Job<TracedJobData<T>>) => {
    const jobData = job.data;
    
    // Extract trace context
    let spanContext;
    if (jobData.traceContext) {
      spanContext = createContextFromPropagated(jobData.traceContext);
    }

    // Create span with parent context if available
    const parentContext = spanContext
      ? trace.setSpanContext(context.active(), spanContext)
      : context.active();

    const span = tracer.startSpan(
      `bullmq:${name}:process`,
      {
        kind: SpanKind.CONSUMER,
        attributes: {
          'messaging.system': 'bullmq',
          'messaging.destination': name,
          'messaging.operation': 'process',
          'job.id': job.id || 'unknown',
          'job.name': job.name,
          'job.attempt': job.attemptsMade + 1,
          'tenant.id': jobData.tenantId,
          'correlation.id': jobData.correlationId
        }
      },
      parentContext
    );

    const startTime = Date.now();

    try {
      const result = await context.with(
        trace.setSpan(parentContext, span),
        async () => processor(job)
      );
      
      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute('job.duration_ms', Date.now() - startTime);
      
      return result;
    } catch (error) {
      const err = error as Error;
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      span.recordException(err);
      span.setAttribute('job.duration_ms', Date.now() - startTime);
      throw error;
    } finally {
      span.end();
    }
  };

  return new Worker(name, instrumentedProcessor, options);
}

/**
 * Instrumented Queue.add
 */
export async function addInstrumentedJob<T>(
  queue: Queue,
  name: string,
  data: T,
  tenantId: string,
  options?: Parameters<Queue['add']>[2]
): Promise<Job> {
  const span = tracer.startSpan(`bullmq:${queue.name}:add`, {
    kind: SpanKind.PRODUCER,
    attributes: {
      'messaging.system': 'bullmq',
      'messaging.destination': queue.name,
      'messaging.operation': 'publish',
      'job.name': name,
      'tenant.id': tenantId
    }
  });

  try {
    const carrier: Record<string, string> = {};
    const propagation = await import('@opentelemetry/api').then(m => m.propagation);
    propagation.inject(context.active(), carrier);

    const spanContext = trace.getSpanContext(context.active());

    const tracedData: TracedJobData<T> = {
      payload: data,
      tenantId,
      correlationId: spanContext?.traceId || crypto.randomUUID(),
      traceContext: {
        traceId: spanContext?.traceId || '',
        spanId: spanContext?.spanId || '',
        traceFlags: spanContext?.traceFlags || 0
      }
    };

    const job = await queue.add(name, tracedData, options);
    
    span.setStatus({ code: SpanStatusCode.OK });
    span.setAttribute('job.id', job.id || 'unknown');
    
    return job;
  } catch (error) {
    const err = error as Error;
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    span.recordException(err);
    throw error;
  } finally {
    span.end();
  }
}
```


---

## 4. SigNoz Integration

### 4.1 SigNoz Dashboard Configuration

```typescript
// packages/api/src/modules/observability/signoz-dashboards.ts

export interface SignozDashboard {
  id: string;
  title: string;
  description: string;
  panels: SignozPanel[];
  variables: SignozVariable[];
  refresh: string;
  timeRange: { from: string; to: string };
}

export interface SignozPanel {
  id: string;
  title: string;
  type: 'graph' | 'stat' | 'table' | 'heatmap' | 'gauge';
  query: string;
  gridPos: { x: number; y: number; w: number; h: number };
  options?: Record<string, unknown>;
}

export interface SignozVariable {
  name: string;
  label: string;
  type: 'query' | 'custom' | 'textbox';
  query?: string;
  options?: string[];
  defaultValue: string;
}

// Etapa 3 Main Dashboard
export const etapa3MainDashboard: SignozDashboard = {
  id: 'etapa3-main',
  title: 'Cerniq Etapa 3 - AI Sales Agent Overview',
  description: 'Main dashboard for Etapa 3 AI Sales Agent monitoring',
  refresh: '30s',
  timeRange: { from: 'now-1h', to: 'now' },
  variables: [
    {
      name: 'tenant_id',
      label: 'Tenant',
      type: 'query',
      query: 'SELECT DISTINCT tenant_id FROM signoz_traces.distributed_signoz_spans WHERE timestamp > now() - interval 1 hour',
      defaultValue: '*'
    },
    {
      name: 'worker',
      label: 'Worker',
      type: 'custom',
      options: [
        'ai-agent-worker',
        'negotiation-fsm',
        'efactura-worker',
        'document-generator',
        'mcp-server',
        'guardrails-worker'
      ],
      defaultValue: '*'
    }
  ],
  panels: [
    // Row 1: Key Metrics
    {
      id: 'total-conversations',
      title: 'Active Conversations',
      type: 'stat',
      query: `
        SELECT count(DISTINCT attributes_string['conversation.id']) as value
        FROM signoz_traces.distributed_signoz_spans
        WHERE serviceName = 'cerniq-ai-agent-worker'
        AND timestamp > now() - interval 1 hour
        AND attributes_string['tenant.id'] LIKE '{{tenant_id}}'
      `,
      gridPos: { x: 0, y: 0, w: 6, h: 4 }
    },
    {
      id: 'llm-requests',
      title: 'LLM Requests (1h)',
      type: 'stat',
      query: `
        SELECT sum(value) as value
        FROM signoz_metrics.distributed_samples_v4
        WHERE metric_name = 'cerniq_ai_llm_requests_total'
        AND timestamp > now() - interval 1 hour
      `,
      gridPos: { x: 6, y: 0, w: 6, h: 4 }
    },
    {
      id: 'llm-cost',
      title: 'LLM Cost (1h)',
      type: 'stat',
      query: `
        SELECT sum(value) as value
        FROM signoz_metrics.distributed_samples_v4
        WHERE metric_name = 'cerniq_ai_llm_cost_usd_sum'
        AND timestamp > now() - interval 1 hour
      `,
      gridPos: { x: 12, y: 0, w: 6, h: 4 },
      options: { unit: 'currencyUSD', decimals: 2 }
    },
    {
      id: 'hitl-pending',
      title: 'HITL Pending',
      type: 'stat',
      query: `
        SELECT count(*) as value
        FROM signoz_traces.distributed_signoz_spans
        WHERE name LIKE 'hitl:create_approval%'
        AND attributes_string['approval.status'] = 'pending'
        AND timestamp > now() - interval 24 hour
      `,
      gridPos: { x: 18, y: 0, w: 6, h: 4 }
    },

    // Row 2: Performance
    {
      id: 'llm-latency',
      title: 'LLM Response Latency',
      type: 'graph',
      query: `
        SELECT
          toStartOfMinute(timestamp) as time,
          quantile(0.50)(value) as p50,
          quantile(0.95)(value) as p95,
          quantile(0.99)(value) as p99
        FROM signoz_metrics.distributed_samples_v4
        WHERE metric_name = 'cerniq_ai_llm_latency_ms'
        AND timestamp > now() - interval 1 hour
        GROUP BY time
        ORDER BY time
      `,
      gridPos: { x: 0, y: 4, w: 12, h: 8 }
    },
    {
      id: 'worker-throughput',
      title: 'Worker Throughput',
      type: 'graph',
      query: `
        SELECT
          toStartOfMinute(timestamp) as time,
          labels['worker'] as worker,
          sum(value) as jobs
        FROM signoz_metrics.distributed_samples_v4
        WHERE metric_name = 'cerniq_etapa3_jobs_processed_total'
        AND timestamp > now() - interval 1 hour
        AND labels['worker'] LIKE '{{worker}}'
        GROUP BY time, worker
        ORDER BY time
      `,
      gridPos: { x: 12, y: 4, w: 12, h: 8 }
    },

    // Row 3: Errors & Issues
    {
      id: 'error-rate',
      title: 'Error Rate by Worker',
      type: 'graph',
      query: `
        SELECT
          toStartOfMinute(timestamp) as time,
          labels['worker'] as worker,
          sum(value) as errors
        FROM signoz_metrics.distributed_samples_v4
        WHERE metric_name = 'cerniq_etapa3_jobs_failed_total'
        AND timestamp > now() - interval 1 hour
        GROUP BY time, worker
        ORDER BY time
      `,
      gridPos: { x: 0, y: 12, w: 12, h: 8 }
    },
    {
      id: 'guardrail-blocks',
      title: 'Guardrail Blocks',
      type: 'graph',
      query: `
        SELECT
          toStartOfMinute(timestamp) as time,
          labels['guardrail_type'] as type,
          sum(value) as blocks
        FROM signoz_metrics.distributed_samples_v4
        WHERE metric_name = 'cerniq_ai_guardrail_blocks_total'
        AND timestamp > now() - interval 1 hour
        GROUP BY time, type
        ORDER BY time
      `,
      gridPos: { x: 12, y: 12, w: 12, h: 8 }
    },

    // Row 4: AI Performance
    {
      id: 'token-usage',
      title: 'Token Usage by Model',
      type: 'graph',
      query: `
        SELECT
          toStartOfMinute(timestamp) as time,
          labels['model'] as model,
          sum(value) as tokens
        FROM signoz_metrics.distributed_samples_v4
        WHERE metric_name IN ('cerniq_ai_llm_tokens_input_total', 'cerniq_ai_llm_tokens_output_total')
        AND timestamp > now() - interval 1 hour
        GROUP BY time, model
        ORDER BY time
      `,
      gridPos: { x: 0, y: 20, w: 12, h: 8 }
    },
    {
      id: 'negotiation-stages',
      title: 'Negotiation Stage Distribution',
      type: 'heatmap',
      query: `
        SELECT
          toStartOfHour(timestamp) as time,
          attributes_string['negotiation.stage'] as stage,
          count(*) as count
        FROM signoz_traces.distributed_signoz_spans
        WHERE serviceName = 'cerniq-negotiation-fsm'
        AND name = 'negotiation:stage_transition'
        AND timestamp > now() - interval 24 hour
        GROUP BY time, stage
        ORDER BY time
      `,
      gridPos: { x: 12, y: 20, w: 12, h: 8 }
    }
  ]
};
```

### 4.2 SigNoz Alerts Configuration

```yaml
# config/signoz/alerts-etapa3.yaml
# SigNoz Alert Rules for Etapa 3

groups:
  - name: etapa3-ai-agent
    interval: 30s
    rules:
      # High LLM Latency
      - alert: HighLLMLatency
        expr: |
          histogram_quantile(0.95, 
            rate(cerniq_ai_llm_latency_ms_bucket[5m])
          ) > 5000
        for: 5m
        labels:
          severity: warning
          team: ai-platform
          etapa: "3"
        annotations:
          summary: "High LLM latency detected"
          description: |
            LLM P95 latency is {{ $value | printf "%.0f" }}ms 
            (threshold: 5000ms)
          runbook_url: "https://docs.cerniq.app/runbooks/high-llm-latency"

      # LLM Error Rate
      - alert: HighLLMErrorRate
        expr: |
          (
            rate(cerniq_ai_llm_requests_total{status="error"}[5m])
            /
            rate(cerniq_ai_llm_requests_total[5m])
          ) * 100 > 5
        for: 5m
        labels:
          severity: critical
          team: ai-platform
          etapa: "3"
        annotations:
          summary: "High LLM error rate"
          description: |
            LLM error rate is {{ $value | printf "%.1f" }}%
            (threshold: 5%)
          runbook_url: "https://docs.cerniq.app/runbooks/llm-error-rate"

      # Cost Spike
      - alert: LLMCostSpike
        expr: |
          sum(rate(cerniq_ai_llm_cost_usd_sum[1h])) * 3600 > 10
        for: 15m
        labels:
          severity: warning
          team: ai-platform
          etapa: "3"
        annotations:
          summary: "LLM cost spike detected"
          description: |
            Estimated hourly LLM cost is ${{ $value | printf "%.2f" }}
            (threshold: $10/hour)
          runbook_url: "https://docs.cerniq.app/runbooks/llm-cost-spike"

      # Guardrail Blocks Spike
      - alert: HighGuardrailBlocks
        expr: |
          rate(cerniq_ai_guardrail_blocks_total[15m]) * 900 > 50
        for: 10m
        labels:
          severity: warning
          team: ai-platform
          etapa: "3"
        annotations:
          summary: "High guardrail block rate"
          description: |
            {{ $value | printf "%.0f" }} guardrail blocks in 15 minutes
            (threshold: 50)
          runbook_url: "https://docs.cerniq.app/runbooks/guardrail-blocks"

  - name: etapa3-workers
    interval: 30s
    rules:
      # Worker Job Failures
      - alert: WorkerHighFailureRate
        expr: |
          (
            rate(cerniq_etapa3_jobs_failed_total[5m])
            /
            rate(cerniq_etapa3_jobs_processed_total[5m])
          ) * 100 > 10
        for: 5m
        labels:
          severity: critical
          team: backend
          etapa: "3"
        annotations:
          summary: "High worker failure rate"
          description: |
            Worker {{ $labels.worker }} has {{ $value | printf "%.1f" }}% failure rate
            (threshold: 10%)
          runbook_url: "https://docs.cerniq.app/runbooks/worker-failures"

      # Queue Depth High
      - alert: HighQueueDepth
        expr: |
          cerniq_etapa3_queue_depth > 1000
        for: 10m
        labels:
          severity: warning
          team: backend
          etapa: "3"
        annotations:
          summary: "High queue depth"
          description: |
            Queue {{ $labels.worker }} has {{ $value }} pending jobs
            (threshold: 1000)
          runbook_url: "https://docs.cerniq.app/runbooks/queue-depth"

      # Worker Stalled
      - alert: WorkerStalled
        expr: |
          rate(cerniq_etapa3_jobs_processed_total[10m]) == 0
          AND cerniq_etapa3_queue_depth > 0
        for: 15m
        labels:
          severity: critical
          team: backend
          etapa: "3"
        annotations:
          summary: "Worker stalled"
          description: |
            Worker {{ $labels.worker }} has not processed jobs for 15 minutes
            but queue has {{ $value }} pending jobs
          runbook_url: "https://docs.cerniq.app/runbooks/worker-stalled"

  - name: etapa3-fiscal
    interval: 60s
    rules:
      # e-Factura Submission Failures
      - alert: EFacturaSubmissionFailures
        expr: |
          rate(cerniq_efactura_submissions_total{status="failed"}[1h]) * 3600 > 5
        for: 30m
        labels:
          severity: critical
          team: fiscal
          etapa: "3"
        annotations:
          summary: "e-Factura submission failures"
          description: |
            {{ $value | printf "%.0f" }} e-Factura submissions failed in the last hour
            (threshold: 5)
          runbook_url: "https://docs.cerniq.app/runbooks/efactura-failures"

      # Oblio API Unavailable
      - alert: OblioAPIUnavailable
        expr: |
          up{job="oblio-health"} == 0
        for: 5m
        labels:
          severity: critical
          team: fiscal
          etapa: "3"
        annotations:
          summary: "Oblio API unavailable"
          description: |
            Oblio API health check failing for 5 minutes
          runbook_url: "https://docs.cerniq.app/runbooks/oblio-unavailable"

  - name: etapa3-hitl
    interval: 30s
    rules:
      # HITL SLA Breach
      - alert: HITLSLABreach
        expr: |
          (
            time() - cerniq_hitl_approval_created_timestamp
          ) > cerniq_hitl_approval_sla_seconds
          AND cerniq_hitl_approval_status == "pending"
        for: 1m
        labels:
          severity: critical
          team: operations
          etapa: "3"
        annotations:
          summary: "HITL approval SLA breach"
          description: |
            Approval {{ $labels.approval_id }} has breached SLA
            (created {{ $value | humanizeDuration }} ago)
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-sla-breach"

      # High Pending Approvals
      - alert: HighPendingApprovals
        expr: |
          count(cerniq_hitl_approval_status == "pending") > 50
        for: 15m
        labels:
          severity: warning
          team: operations
          etapa: "3"
        annotations:
          summary: "High pending HITL approvals"
          description: |
            {{ $value }} HITL approvals pending for more than 15 minutes
            (threshold: 50)
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-backlog"
```

### 4.3 SigNoz API Integration

```typescript
// packages/api/src/modules/observability/signoz-client.ts

import { z } from 'zod';

const signozConfigSchema = z.object({
  endpoint: z.string().url(),
  accessToken: z.string().optional(),
  timeout: z.number().default(30000)
});

type SignozConfig = z.infer<typeof signozConfigSchema>;

export class SignozClient {
  private endpoint: string;
  private accessToken?: string;
  private timeout: number;

  constructor(config: SignozConfig) {
    const validated = signozConfigSchema.parse(config);
    this.endpoint = validated.endpoint;
    this.accessToken = validated.accessToken;
    this.timeout = validated.timeout;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.endpoint}${path}`, {
        ...options,
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`SigNoz API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Query traces
   */
  async queryTraces(params: {
    start: number;
    end: number;
    serviceName?: string;
    limit?: number;
    offset?: number;
    tags?: Record<string, string>;
  }): Promise<Trace[]> {
    const query = new URLSearchParams({
      start: params.start.toString(),
      end: params.end.toString(),
      limit: (params.limit || 100).toString(),
      offset: (params.offset || 0).toString()
    });

    if (params.serviceName) {
      query.set('serviceName', params.serviceName);
    }

    if (params.tags) {
      Object.entries(params.tags).forEach(([key, value]) => {
        query.set(`tag.${key}`, value);
      });
    }

    return this.request<Trace[]>(`/api/v1/traces?${query}`);
  }

  /**
   * Get trace by ID
   */
  async getTrace(traceId: string): Promise<TraceDetail> {
    return this.request<TraceDetail>(`/api/v1/traces/${traceId}`);
  }

  /**
   * Query metrics
   */
  async queryMetrics(query: string, params: {
    start: number;
    end: number;
    step?: number;
  }): Promise<MetricResult[]> {
    const body = {
      query,
      start: params.start,
      end: params.end,
      step: params.step || 60
    };

    return this.request<MetricResult[]>('/api/v1/query_range', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * Query logs
   */
  async queryLogs(params: {
    start: number;
    end: number;
    query?: string;
    limit?: number;
    orderBy?: 'asc' | 'desc';
  }): Promise<LogEntry[]> {
    const body = {
      start: params.start,
      end: params.end,
      query: params.query || '*',
      limit: params.limit || 100,
      orderBy: params.orderBy || 'desc'
    };

    return this.request<LogEntry[]>('/api/v1/logs', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * Get service map
   */
  async getServiceMap(params: {
    start: number;
    end: number;
  }): Promise<ServiceMapNode[]> {
    const query = new URLSearchParams({
      start: params.start.toString(),
      end: params.end.toString()
    });

    return this.request<ServiceMapNode[]>(`/api/v1/service-map?${query}`);
  }

  /**
   * Get top operations
   */
  async getTopOperations(serviceName: string, params: {
    start: number;
    end: number;
    limit?: number;
  }): Promise<TopOperation[]> {
    const query = new URLSearchParams({
      start: params.start.toString(),
      end: params.end.toString(),
      limit: (params.limit || 10).toString()
    });

    return this.request<TopOperation[]>(
      `/api/v1/services/${serviceName}/operations?${query}`
    );
  }
}

// Types
export interface Trace {
  traceId: string;
  serviceName: string;
  operationName: string;
  startTime: number;
  duration: number;
  spanCount: number;
  hasError: boolean;
}

export interface TraceDetail {
  traceId: string;
  spans: Span[];
}

export interface Span {
  spanId: string;
  parentSpanId?: string;
  traceId: string;
  serviceName: string;
  operationName: string;
  startTime: number;
  duration: number;
  tags: Record<string, string>;
  logs: SpanLog[];
  status: 'OK' | 'ERROR' | 'UNSET';
}

export interface SpanLog {
  timestamp: number;
  fields: Record<string, unknown>;
}

export interface MetricResult {
  metric: Record<string, string>;
  values: Array<[number, string]>;
}

export interface LogEntry {
  timestamp: number;
  severityText: string;
  body: string;
  attributes: Record<string, string>;
  traceId?: string;
  spanId?: string;
}

export interface ServiceMapNode {
  serviceName: string;
  numCalls: number;
  avgDuration: number;
  errorRate: number;
  connections: ServiceMapConnection[];
}

export interface ServiceMapConnection {
  from: string;
  to: string;
  numCalls: number;
  avgDuration: number;
  errorRate: number;
}

export interface TopOperation {
  operationName: string;
  numCalls: number;
  avgDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  errorRate: number;
}
```


---

## 5. Prometheus Metrics

### 5.1 Metrics Registry

```typescript
// packages/shared/observability/prometheus-metrics.ts

import { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';
import { collectDefaultMetrics } from 'prom-client';

// Create a new registry
export const registry = new Registry();

// Add default metrics (process, node.js runtime)
collectDefaultMetrics({ register: registry, prefix: 'cerniq_' });

// ============================================================================
// COMMON WORKER METRICS
// ============================================================================

export const workerMetrics = {
  // Jobs processed counter
  jobsProcessed: new Counter({
    name: 'cerniq_etapa3_jobs_processed_total',
    help: 'Total number of jobs processed',
    labelNames: ['worker', 'status', 'tenant_id'],
    registers: [registry]
  }),

  // Job duration histogram
  jobDuration: new Histogram({
    name: 'cerniq_etapa3_job_duration_seconds',
    help: 'Job processing duration in seconds',
    labelNames: ['worker', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
    registers: [registry]
  }),

  // Active jobs gauge
  activeJobs: new Gauge({
    name: 'cerniq_etapa3_active_jobs',
    help: 'Currently processing jobs',
    labelNames: ['worker'],
    registers: [registry]
  }),

  // Queue depth gauge
  queueDepth: new Gauge({
    name: 'cerniq_etapa3_queue_depth',
    help: 'Number of jobs waiting in queue',
    labelNames: ['worker', 'priority'],
    registers: [registry]
  }),

  // Retry counter
  retries: new Counter({
    name: 'cerniq_etapa3_job_retries_total',
    help: 'Total number of job retries',
    labelNames: ['worker', 'error_type'],
    registers: [registry]
  }),

  // Worker health gauge
  workerHealth: new Gauge({
    name: 'cerniq_etapa3_worker_health',
    help: 'Worker health status (1=healthy, 0=unhealthy)',
    labelNames: ['worker'],
    registers: [registry]
  })
};

// ============================================================================
// AI/LLM SPECIFIC METRICS
// ============================================================================

export const aiMetrics = {
  // LLM requests counter
  llmRequests: new Counter({
    name: 'cerniq_ai_llm_requests_total',
    help: 'Total LLM API requests',
    labelNames: ['model', 'provider', 'status', 'operation'],
    registers: [registry]
  }),

  // Token usage counters
  tokensInput: new Counter({
    name: 'cerniq_ai_llm_tokens_input_total',
    help: 'Total input tokens consumed',
    labelNames: ['model', 'provider', 'operation'],
    registers: [registry]
  }),

  tokensOutput: new Counter({
    name: 'cerniq_ai_llm_tokens_output_total',
    help: 'Total output tokens generated',
    labelNames: ['model', 'provider', 'operation'],
    registers: [registry]
  }),

  // LLM latency histogram
  llmLatency: new Histogram({
    name: 'cerniq_ai_llm_latency_seconds',
    help: 'LLM API response latency',
    labelNames: ['model', 'provider', 'operation'],
    buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
    registers: [registry]
  }),

  // Cost histogram
  llmCost: new Histogram({
    name: 'cerniq_ai_llm_cost_usd',
    help: 'LLM API cost per request',
    labelNames: ['model', 'provider', 'operation'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [registry]
  }),

  // Guardrail metrics
  guardrailBlocks: new Counter({
    name: 'cerniq_ai_guardrail_blocks_total',
    help: 'Total guardrail blocks',
    labelNames: ['guardrail_type', 'severity', 'action'],
    registers: [registry]
  }),

  guardrailLatency: new Histogram({
    name: 'cerniq_ai_guardrail_latency_seconds',
    help: 'Guardrail evaluation latency',
    labelNames: ['guardrail_type'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25],
    registers: [registry]
  }),

  // Intent classification
  intentClassification: new Counter({
    name: 'cerniq_ai_intent_classifications_total',
    help: 'Intent classification results',
    labelNames: ['intent', 'confidence_bucket', 'channel'],
    registers: [registry]
  }),

  // Sentiment analysis
  sentimentAnalysis: new Counter({
    name: 'cerniq_ai_sentiment_analysis_total',
    help: 'Sentiment analysis results',
    labelNames: ['sentiment', 'channel'],
    registers: [registry]
  }),

  // Context retrieval (RAG)
  contextRetrieval: new Histogram({
    name: 'cerniq_ai_context_retrieval_seconds',
    help: 'Context retrieval latency (hybrid search)',
    labelNames: ['search_type', 'result_count_bucket'],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [registry]
  }),

  // Conversation metrics
  conversationTurns: new Histogram({
    name: 'cerniq_ai_conversation_turns',
    help: 'Number of turns in resolved conversations',
    labelNames: ['outcome', 'channel'],
    buckets: [1, 2, 3, 5, 10, 15, 20, 30, 50],
    registers: [registry]
  })
};

// ============================================================================
// NEGOTIATION METRICS
// ============================================================================

export const negotiationMetrics = {
  // Active negotiations gauge
  activeNegotiations: new Gauge({
    name: 'cerniq_negotiation_active',
    help: 'Currently active negotiations',
    labelNames: ['stage', 'tenant_id'],
    registers: [registry]
  }),

  // Stage transitions counter
  stageTransitions: new Counter({
    name: 'cerniq_negotiation_stage_transitions_total',
    help: 'Negotiation stage transitions',
    labelNames: ['from_stage', 'to_stage', 'trigger'],
    registers: [registry]
  }),

  // Win probability histogram
  winProbability: new Histogram({
    name: 'cerniq_negotiation_win_probability',
    help: 'Win probability at stage transition',
    labelNames: ['stage'],
    buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    registers: [registry]
  }),

  // Negotiation duration histogram
  negotiationDuration: new Histogram({
    name: 'cerniq_negotiation_duration_hours',
    help: 'Total negotiation duration until close',
    labelNames: ['outcome'],
    buckets: [1, 4, 8, 24, 48, 72, 168, 336, 720],
    registers: [registry]
  }),

  // Rounds counter
  negotiationRounds: new Histogram({
    name: 'cerniq_negotiation_rounds',
    help: 'Number of negotiation rounds',
    labelNames: ['outcome'],
    buckets: [1, 2, 3, 5, 7, 10, 15, 20],
    registers: [registry]
  }),

  // Discount metrics
  discountApplied: new Histogram({
    name: 'cerniq_negotiation_discount_percent',
    help: 'Discount percentage applied',
    labelNames: ['product_category', 'approval_required'],
    buckets: [0, 5, 10, 15, 20, 25, 30, 35, 40, 50],
    registers: [registry]
  })
};

// ============================================================================
// FISCAL/INVOICE METRICS
// ============================================================================

export const fiscalMetrics = {
  // Invoice generation counter
  invoicesGenerated: new Counter({
    name: 'cerniq_fiscal_invoices_generated_total',
    help: 'Total invoices generated',
    labelNames: ['type', 'status', 'tenant_id'],
    registers: [registry]
  }),

  // e-Factura submissions
  efacturaSubmissions: new Counter({
    name: 'cerniq_efactura_submissions_total',
    help: 'e-Factura ANAF submissions',
    labelNames: ['status', 'document_type'],
    registers: [registry]
  }),

  // e-Factura latency
  efacturaLatency: new Histogram({
    name: 'cerniq_efactura_submission_seconds',
    help: 'e-Factura submission latency',
    labelNames: ['status'],
    buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
    registers: [registry]
  }),

  // Oblio API calls
  oblioApiCalls: new Counter({
    name: 'cerniq_oblio_api_calls_total',
    help: 'Oblio API calls',
    labelNames: ['operation', 'status'],
    registers: [registry]
  }),

  // Document value histogram
  documentValue: new Histogram({
    name: 'cerniq_fiscal_document_value_ron',
    help: 'Document value in RON',
    labelNames: ['document_type'],
    buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000],
    registers: [registry]
  })
};

// ============================================================================
// HITL METRICS
// ============================================================================

export const hitlMetrics = {
  // Pending approvals gauge
  pendingApprovals: new Gauge({
    name: 'cerniq_hitl_approvals_pending',
    help: 'Currently pending HITL approvals',
    labelNames: ['approval_type', 'urgency', 'tenant_id'],
    registers: [registry]
  }),

  // Approval actions counter
  approvalActions: new Counter({
    name: 'cerniq_hitl_approval_actions_total',
    help: 'HITL approval actions',
    labelNames: ['action', 'approval_type', 'auto_approved'],
    registers: [registry]
  }),

  // Approval latency
  approvalLatency: new Histogram({
    name: 'cerniq_hitl_approval_latency_seconds',
    help: 'Time from creation to resolution',
    labelNames: ['approval_type', 'urgency', 'action'],
    buckets: [60, 300, 600, 1800, 3600, 7200, 14400, 28800, 86400],
    registers: [registry]
  }),

  // SLA breaches counter
  slaBreaches: new Counter({
    name: 'cerniq_hitl_sla_breaches_total',
    help: 'HITL SLA breaches',
    labelNames: ['approval_type', 'urgency'],
    registers: [registry]
  }),

  // Escalations counter
  escalations: new Counter({
    name: 'cerniq_hitl_escalations_total',
    help: 'HITL escalations',
    labelNames: ['approval_type', 'escalation_level'],
    registers: [registry]
  })
};

// ============================================================================
// MCP SERVER METRICS
// ============================================================================

export const mcpMetrics = {
  // Tool calls counter
  toolCalls: new Counter({
    name: 'cerniq_mcp_tool_calls_total',
    help: 'MCP tool invocations',
    labelNames: ['tool_name', 'status', 'tenant_id'],
    registers: [registry]
  }),

  // Tool latency
  toolLatency: new Histogram({
    name: 'cerniq_mcp_tool_latency_seconds',
    help: 'MCP tool execution latency',
    labelNames: ['tool_name'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry]
  }),

  // Resource access
  resourceAccess: new Counter({
    name: 'cerniq_mcp_resource_access_total',
    help: 'MCP resource access',
    labelNames: ['resource_type', 'operation'],
    registers: [registry]
  }),

  // Active sessions
  activeSessions: new Gauge({
    name: 'cerniq_mcp_active_sessions',
    help: 'Active MCP sessions',
    labelNames: ['client_type'],
    registers: [registry]
  })
};

// ============================================================================
// METRICS ENDPOINT
// ============================================================================

import { FastifyPluginAsync } from 'fastify';

export const metricsPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', registry.contentType);
    return registry.metrics();
  });

  fastify.get('/metrics/json', async (request, reply) => {
    return registry.getMetricsAsJSON();
  });
};

// ============================================================================
// METRICS HELPERS
// ============================================================================

/**
 * Record LLM request metrics
 */
export function recordLLMRequest(params: {
  model: string;
  provider: string;
  operation: string;
  status: 'success' | 'error';
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}): void {
  const labels = {
    model: params.model,
    provider: params.provider,
    operation: params.operation
  };

  aiMetrics.llmRequests.inc({ ...labels, status: params.status });
  aiMetrics.llmLatency.observe(labels, params.latencyMs / 1000);
  aiMetrics.tokensInput.inc(labels, params.inputTokens);
  aiMetrics.tokensOutput.inc(labels, params.outputTokens);
  aiMetrics.llmCost.observe(labels, params.costUsd);
}

/**
 * Record job completion metrics
 */
export function recordJobCompletion(params: {
  worker: string;
  status: 'completed' | 'failed';
  durationMs: number;
  tenantId: string;
}): void {
  workerMetrics.jobsProcessed.inc({
    worker: params.worker,
    status: params.status,
    tenant_id: params.tenantId
  });
  workerMetrics.jobDuration.observe(
    { worker: params.worker, status: params.status },
    params.durationMs / 1000
  );
}

/**
 * Record negotiation stage transition
 */
export function recordStageTransition(params: {
  fromStage: string;
  toStage: string;
  trigger: string;
  winProbability: number;
}): void {
  negotiationMetrics.stageTransitions.inc({
    from_stage: params.fromStage,
    to_stage: params.toStage,
    trigger: params.trigger
  });
  negotiationMetrics.winProbability.observe(
    { stage: params.toStage },
    params.winProbability
  );
}

/**
 * Record HITL approval action
 */
export function recordHITLAction(params: {
  action: 'approved' | 'rejected' | 'escalated' | 'auto_approved';
  approvalType: string;
  urgency: string;
  latencySeconds: number;
  autoApproved: boolean;
}): void {
  hitlMetrics.approvalActions.inc({
    action: params.action,
    approval_type: params.approvalType,
    auto_approved: params.autoApproved.toString()
  });
  hitlMetrics.approvalLatency.observe(
    {
      approval_type: params.approvalType,
      urgency: params.urgency,
      action: params.action
    },
    params.latencySeconds
  );
}
```

### 5.2 Prometheus Recording Rules

```yaml
# config/prometheus/recording-rules-etapa3.yaml
# Prometheus Recording Rules for Etapa 3

groups:
  - name: etapa3_aggregations
    interval: 30s
    rules:
      # Request rate per worker
      - record: cerniq:etapa3:jobs_rate:5m
        expr: |
          sum by (worker) (
            rate(cerniq_etapa3_jobs_processed_total[5m])
          )

      # Error rate per worker
      - record: cerniq:etapa3:error_rate:5m
        expr: |
          sum by (worker) (
            rate(cerniq_etapa3_jobs_processed_total{status="failed"}[5m])
          )
          /
          sum by (worker) (
            rate(cerniq_etapa3_jobs_processed_total[5m])
          )

      # P95 latency per worker
      - record: cerniq:etapa3:latency_p95:5m
        expr: |
          histogram_quantile(0.95,
            sum by (worker, le) (
              rate(cerniq_etapa3_job_duration_seconds_bucket[5m])
            )
          )

      # LLM cost per hour
      - record: cerniq:ai:llm_cost_per_hour
        expr: |
          sum(rate(cerniq_ai_llm_cost_usd_sum[1h])) * 3600

      # LLM token usage per model
      - record: cerniq:ai:tokens_per_model:1h
        expr: |
          sum by (model) (
            increase(cerniq_ai_llm_tokens_input_total[1h])
            + increase(cerniq_ai_llm_tokens_output_total[1h])
          )

      # Guardrail block rate
      - record: cerniq:ai:guardrail_block_rate:15m
        expr: |
          sum by (guardrail_type) (
            rate(cerniq_ai_guardrail_blocks_total[15m])
          )

      # HITL pending by urgency
      - record: cerniq:hitl:pending_by_urgency
        expr: |
          sum by (urgency) (
            cerniq_hitl_approvals_pending
          )

      # HITL approval rate
      - record: cerniq:hitl:approval_rate:1h
        expr: |
          sum(rate(cerniq_hitl_approval_actions_total{action="approved"}[1h]))
          /
          sum(rate(cerniq_hitl_approval_actions_total[1h]))

      # Negotiation win rate by stage
      - record: cerniq:negotiation:win_rate_by_stage
        expr: |
          sum by (from_stage) (
            rate(cerniq_negotiation_stage_transitions_total{to_stage="won"}[24h])
          )
          /
          sum by (from_stage) (
            rate(cerniq_negotiation_stage_transitions_total[24h])
          )

      # e-Factura success rate
      - record: cerniq:fiscal:efactura_success_rate:1h
        expr: |
          sum(rate(cerniq_efactura_submissions_total{status="success"}[1h]))
          /
          sum(rate(cerniq_efactura_submissions_total[1h]))
```


---

## 6. Custom Metrics per Worker

### 6.1 AI Agent Core Worker Metrics

```typescript
// packages/workers/ai-agent/src/metrics/ai-agent-metrics.ts

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('cerniq-ai-agent-worker', '1.0.0');

export const aiAgentMetrics = {
  // Conversation lifecycle
  conversationsStarted: meter.createCounter('cerniq_ai_conversations_started_total', {
    description: 'Total conversations initiated',
    unit: 'conversations'
  }),

  conversationsCompleted: meter.createCounter('cerniq_ai_conversations_completed_total', {
    description: 'Total conversations completed',
    unit: 'conversations'
  }),

  conversationDuration: meter.createHistogram('cerniq_ai_conversation_duration_minutes', {
    description: 'Conversation duration in minutes',
    unit: 'minutes',
    boundaries: [1, 5, 10, 30, 60, 120, 240, 480, 1440]
  }),

  // Message processing
  messagesProcessed: meter.createCounter('cerniq_ai_messages_processed_total', {
    description: 'Total messages processed by AI',
    unit: 'messages'
  }),

  messageGenerationLatency: meter.createHistogram('cerniq_ai_message_generation_latency_ms', {
    description: 'Time to generate AI response',
    unit: 'ms',
    boundaries: [100, 250, 500, 1000, 2000, 5000, 10000]
  }),

  // Context window management
  contextWindowUsage: meter.createHistogram('cerniq_ai_context_window_tokens', {
    description: 'Context window token usage',
    unit: 'tokens',
    boundaries: [1000, 5000, 10000, 25000, 50000, 100000, 150000]
  }),

  contextTruncations: meter.createCounter('cerniq_ai_context_truncations_total', {
    description: 'Context truncation events',
    unit: 'truncations'
  }),

  // Handover events
  handovers: meter.createCounter('cerniq_ai_handovers_total', {
    description: 'Human handover events',
    unit: 'handovers'
  }),

  handoverLatency: meter.createHistogram('cerniq_ai_handover_latency_ms', {
    description: 'Time from handover request to human pickup',
    unit: 'ms',
    boundaries: [1000, 5000, 10000, 30000, 60000, 300000, 600000]
  }),

  // Product recommendations
  productRecommendations: meter.createCounter('cerniq_ai_product_recommendations_total', {
    description: 'Product recommendations made',
    unit: 'recommendations'
  }),

  recommendationAcceptance: meter.createHistogram('cerniq_ai_recommendation_acceptance_rate', {
    description: 'Recommendation acceptance rate per conversation',
    unit: 'ratio',
    boundaries: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]
  }),

  // Error tracking
  processingErrors: meter.createCounter('cerniq_ai_processing_errors_total', {
    description: 'AI processing errors',
    unit: 'errors'
  }),

  recoveredErrors: meter.createCounter('cerniq_ai_recovered_errors_total', {
    description: 'Automatically recovered errors',
    unit: 'recoveries'
  })
};

// Usage example
export function recordConversationStart(params: {
  channel: string;
  tenantId: string;
  contactTier: string;
}): void {
  aiAgentMetrics.conversationsStarted.add(1, {
    channel: params.channel,
    tenant_id: params.tenantId,
    contact_tier: params.contactTier
  });
}

export function recordConversationCompletion(params: {
  channel: string;
  outcome: 'sale' | 'qualified' | 'unqualified' | 'handover' | 'abandoned';
  durationMinutes: number;
  turnsCount: number;
}): void {
  aiAgentMetrics.conversationsCompleted.add(1, {
    channel: params.channel,
    outcome: params.outcome
  });

  aiAgentMetrics.conversationDuration.record(params.durationMinutes, {
    channel: params.channel,
    outcome: params.outcome
  });
}
```

### 6.2 Negotiation FSM Worker Metrics

```typescript
// packages/workers/negotiation-fsm/src/metrics/negotiation-metrics.ts

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('cerniq-negotiation-fsm', '1.0.0');

export const negotiationFSMMetrics = {
  // State machine
  activeNegotiations: meter.createGauge('cerniq_neg_active_count', {
    description: 'Currently active negotiations',
    unit: 'negotiations'
  }),

  stateTransitions: meter.createCounter('cerniq_neg_state_transitions_total', {
    description: 'State machine transitions',
    unit: 'transitions'
  }),

  invalidTransitions: meter.createCounter('cerniq_neg_invalid_transitions_total', {
    description: 'Invalid state transition attempts',
    unit: 'attempts'
  }),

  stateTimeInMinutes: meter.createHistogram('cerniq_neg_state_time_minutes', {
    description: 'Time spent in each state',
    unit: 'minutes',
    boundaries: [5, 15, 30, 60, 120, 240, 480, 1440, 2880]
  }),

  // Pricing & Discounts
  priceNegotiations: meter.createCounter('cerniq_neg_price_negotiations_total', {
    description: 'Price negotiation rounds',
    unit: 'rounds'
  }),

  discountRequested: meter.createHistogram('cerniq_neg_discount_requested_percent', {
    description: 'Discount percentage requested by customer',
    unit: 'percent',
    boundaries: [5, 10, 15, 20, 25, 30, 40, 50]
  }),

  discountApproved: meter.createHistogram('cerniq_neg_discount_approved_percent', {
    description: 'Discount percentage approved',
    unit: 'percent',
    boundaries: [5, 10, 15, 20, 25, 30, 40, 50]
  }),

  // Win/Loss tracking
  negotiationOutcomes: meter.createCounter('cerniq_neg_outcomes_total', {
    description: 'Negotiation outcomes',
    unit: 'negotiations'
  }),

  dealValue: meter.createHistogram('cerniq_neg_deal_value_ron', {
    description: 'Deal value in RON',
    unit: 'RON',
    boundaries: [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000]
  }),

  // Velocity metrics
  timeToFirstOffer: meter.createHistogram('cerniq_neg_time_to_first_offer_hours', {
    description: 'Time from lead to first offer',
    unit: 'hours',
    boundaries: [1, 4, 8, 24, 48, 72, 168]
  }),

  timeToClose: meter.createHistogram('cerniq_neg_time_to_close_hours', {
    description: 'Time from first contact to close',
    unit: 'hours',
    boundaries: [24, 48, 72, 168, 336, 720, 1440]
  }),

  // Concession tracking
  concessionRounds: meter.createHistogram('cerniq_neg_concession_rounds', {
    description: 'Number of concession rounds',
    unit: 'rounds',
    boundaries: [1, 2, 3, 4, 5, 7, 10]
  }),

  concessionVelocity: meter.createHistogram('cerniq_neg_concession_velocity', {
    description: 'Average concession per round',
    unit: 'percent',
    boundaries: [1, 2, 3, 5, 7, 10, 15]
  })
};

// Usage
export function recordStateTransition(params: {
  fromState: string;
  toState: string;
  negotiationId: string;
  tenantId: string;
  trigger: string;
  timeInPreviousStateMinutes: number;
}): void {
  negotiationFSMMetrics.stateTransitions.add(1, {
    from_state: params.fromState,
    to_state: params.toState,
    trigger: params.trigger,
    tenant_id: params.tenantId
  });

  negotiationFSMMetrics.stateTimeInMinutes.record(params.timeInPreviousStateMinutes, {
    state: params.fromState,
    tenant_id: params.tenantId
  });
}

export function recordNegotiationOutcome(params: {
  outcome: 'won' | 'lost' | 'stalled' | 'abandoned';
  dealValueRon: number;
  totalDurationHours: number;
  concessionRounds: number;
  finalDiscountPercent: number;
}): void {
  negotiationFSMMetrics.negotiationOutcomes.add(1, {
    outcome: params.outcome
  });

  if (params.outcome === 'won') {
    negotiationFSMMetrics.dealValue.record(params.dealValueRon, {
      outcome: params.outcome
    });
  }

  negotiationFSMMetrics.timeToClose.record(params.totalDurationHours, {
    outcome: params.outcome
  });

  negotiationFSMMetrics.concessionRounds.record(params.concessionRounds, {
    outcome: params.outcome
  });
}
```

### 6.3 e-Factura Worker Metrics

```typescript
// packages/workers/efactura/src/metrics/efactura-metrics.ts

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('cerniq-efactura-worker', '1.0.0');

export const efacturaMetrics = {
  // API Interactions
  apiCalls: meter.createCounter('cerniq_efactura_api_calls_total', {
    description: 'Total ANAF API calls',
    unit: 'calls'
  }),

  apiLatency: meter.createHistogram('cerniq_efactura_api_latency_ms', {
    description: 'ANAF API response latency',
    unit: 'ms',
    boundaries: [100, 250, 500, 1000, 2500, 5000, 10000, 30000]
  }),

  apiErrors: meter.createCounter('cerniq_efactura_api_errors_total', {
    description: 'ANAF API errors',
    unit: 'errors'
  }),

  // Document lifecycle
  documentsSubmitted: meter.createCounter('cerniq_efactura_documents_submitted_total', {
    description: 'Documents submitted to ANAF',
    unit: 'documents'
  }),

  documentsValidated: meter.createCounter('cerniq_efactura_documents_validated_total', {
    description: 'Documents validated by ANAF',
    unit: 'documents'
  }),

  documentsRejected: meter.createCounter('cerniq_efactura_documents_rejected_total', {
    description: 'Documents rejected by ANAF',
    unit: 'documents'
  }),

  validationTime: meter.createHistogram('cerniq_efactura_validation_time_seconds', {
    description: 'Time from submission to validation',
    unit: 'seconds',
    boundaries: [1, 5, 10, 30, 60, 120, 300, 600, 1800]
  }),

  // XML Generation
  xmlGenerationTime: meter.createHistogram('cerniq_efactura_xml_generation_ms', {
    description: 'XML generation time',
    unit: 'ms',
    boundaries: [10, 25, 50, 100, 250, 500, 1000]
  }),

  xmlValidationErrors: meter.createCounter('cerniq_efactura_xml_validation_errors_total', {
    description: 'XML validation errors before submission',
    unit: 'errors'
  }),

  // SPV Tokens
  tokenRefreshes: meter.createCounter('cerniq_efactura_token_refreshes_total', {
    description: 'OAuth token refreshes',
    unit: 'refreshes'
  }),

  tokenErrors: meter.createCounter('cerniq_efactura_token_errors_total', {
    description: 'OAuth token errors',
    unit: 'errors'
  }),

  // Document values
  documentValue: meter.createHistogram('cerniq_efactura_document_value_ron', {
    description: 'Document value in RON',
    unit: 'RON',
    boundaries: [100, 500, 1000, 5000, 10000, 50000, 100000]
  }),

  // Retry tracking
  submissionRetries: meter.createHistogram('cerniq_efactura_submission_retries', {
    description: 'Number of retries per submission',
    unit: 'retries',
    boundaries: [0, 1, 2, 3, 5, 10]
  }),

  // Download/Status check
  statusChecks: meter.createCounter('cerniq_efactura_status_checks_total', {
    description: 'Status check API calls',
    unit: 'checks'
  }),

  downloadLatency: meter.createHistogram('cerniq_efactura_download_latency_ms', {
    description: 'Document download latency',
    unit: 'ms',
    boundaries: [100, 250, 500, 1000, 2500, 5000]
  })
};

// Usage
export function recordEFacturaSubmission(params: {
  documentType: 'factura' | 'factura_corecție' | 'aviz';
  status: 'submitted' | 'validated' | 'rejected' | 'error';
  valueRon: number;
  submissionLatencyMs: number;
  retryCount: number;
}): void {
  efacturaMetrics.documentsSubmitted.add(1, {
    document_type: params.documentType,
    status: params.status
  });

  efacturaMetrics.apiLatency.record(params.submissionLatencyMs, {
    operation: 'submit',
    document_type: params.documentType
  });

  efacturaMetrics.documentValue.record(params.valueRon, {
    document_type: params.documentType
  });

  efacturaMetrics.submissionRetries.record(params.retryCount, {
    document_type: params.documentType,
    status: params.status
  });
}
```

### 6.4 MCP Server Metrics

```typescript
// packages/mcp-server/src/metrics/mcp-metrics.ts

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('cerniq-mcp-server', '1.0.0');

export const mcpServerMetrics = {
  // Tool execution
  toolInvocations: meter.createCounter('cerniq_mcp_tool_invocations_total', {
    description: 'Tool invocations',
    unit: 'invocations'
  }),

  toolLatency: meter.createHistogram('cerniq_mcp_tool_latency_ms', {
    description: 'Tool execution latency',
    unit: 'ms',
    boundaries: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
  }),

  toolErrors: meter.createCounter('cerniq_mcp_tool_errors_total', {
    description: 'Tool execution errors',
    unit: 'errors'
  }),

  // Resource access
  resourceReads: meter.createCounter('cerniq_mcp_resource_reads_total', {
    description: 'Resource read operations',
    unit: 'reads'
  }),

  resourcePayloadSize: meter.createHistogram('cerniq_mcp_resource_payload_bytes', {
    description: 'Resource payload size',
    unit: 'bytes',
    boundaries: [100, 500, 1000, 5000, 10000, 50000, 100000]
  }),

  // Session management
  activeSessions: meter.createGauge('cerniq_mcp_active_sessions', {
    description: 'Active MCP sessions',
    unit: 'sessions'
  }),

  sessionDuration: meter.createHistogram('cerniq_mcp_session_duration_seconds', {
    description: 'MCP session duration',
    unit: 'seconds',
    boundaries: [60, 300, 600, 1800, 3600, 7200, 14400]
  }),

  // Request handling
  requestsReceived: meter.createCounter('cerniq_mcp_requests_received_total', {
    description: 'Total MCP requests received',
    unit: 'requests'
  }),

  requestLatency: meter.createHistogram('cerniq_mcp_request_latency_ms', {
    description: 'Request handling latency',
    unit: 'ms',
    boundaries: [1, 5, 10, 25, 50, 100, 250, 500]
  }),

  // Rate limiting
  rateLimitHits: meter.createCounter('cerniq_mcp_rate_limit_hits_total', {
    description: 'Rate limit hits',
    unit: 'hits'
  }),

  // Cache performance
  cacheHits: meter.createCounter('cerniq_mcp_cache_hits_total', {
    description: 'Cache hits',
    unit: 'hits'
  }),

  cacheMisses: meter.createCounter('cerniq_mcp_cache_misses_total', {
    description: 'Cache misses',
    unit: 'misses'
  })
};

// Tool-specific metrics
export const toolMetrics = {
  // search_products tool
  productSearches: meter.createCounter('cerniq_mcp_product_searches_total', {
    description: 'Product search invocations',
    unit: 'searches'
  }),

  productSearchResults: meter.createHistogram('cerniq_mcp_product_search_results', {
    description: 'Number of results per search',
    unit: 'results',
    boundaries: [0, 1, 5, 10, 25, 50, 100]
  }),

  // get_pricing tool
  pricingLookups: meter.createCounter('cerniq_mcp_pricing_lookups_total', {
    description: 'Pricing lookups',
    unit: 'lookups'
  }),

  // check_stock tool
  stockChecks: meter.createCounter('cerniq_mcp_stock_checks_total', {
    description: 'Stock availability checks',
    unit: 'checks'
  }),

  // create_offer tool
  offersCreated: meter.createCounter('cerniq_mcp_offers_created_total', {
    description: 'Offers created via MCP',
    unit: 'offers'
  }),

  // update_negotiation tool
  negotiationUpdates: meter.createCounter('cerniq_mcp_negotiation_updates_total', {
    description: 'Negotiation updates via MCP',
    unit: 'updates'
  })
};

// Usage
export function recordToolInvocation(params: {
  toolName: string;
  status: 'success' | 'error';
  latencyMs: number;
  tenantId: string;
  fromCache: boolean;
}): void {
  mcpServerMetrics.toolInvocations.add(1, {
    tool_name: params.toolName,
    status: params.status,
    tenant_id: params.tenantId
  });

  mcpServerMetrics.toolLatency.record(params.latencyMs, {
    tool_name: params.toolName,
    status: params.status
  });

  if (params.fromCache) {
    mcpServerMetrics.cacheHits.add(1, { tool_name: params.toolName });
  } else {
    mcpServerMetrics.cacheMisses.add(1, { tool_name: params.toolName });
  }

  if (params.status === 'error') {
    mcpServerMetrics.toolErrors.add(1, { tool_name: params.toolName });
  }
}
```

### 6.5 Guardrails Worker Metrics

```typescript
// packages/workers/guardrails/src/metrics/guardrails-metrics.ts

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('cerniq-guardrails-worker', '1.0.0');

export const guardrailsMetrics = {
  // Evaluation metrics
  evaluations: meter.createCounter('cerniq_guardrail_evaluations_total', {
    description: 'Total guardrail evaluations',
    unit: 'evaluations'
  }),

  evaluationLatency: meter.createHistogram('cerniq_guardrail_evaluation_latency_ms', {
    description: 'Guardrail evaluation latency',
    unit: 'ms',
    boundaries: [1, 5, 10, 25, 50, 100, 250, 500]
  }),

  // Block/Allow decisions
  decisions: meter.createCounter('cerniq_guardrail_decisions_total', {
    description: 'Guardrail decisions',
    unit: 'decisions'
  }),

  // Specific guardrail types
  contentFilter: meter.createCounter('cerniq_guardrail_content_filter_total', {
    description: 'Content filter evaluations',
    unit: 'evaluations'
  }),

  piiDetection: meter.createCounter('cerniq_guardrail_pii_detection_total', {
    description: 'PII detection evaluations',
    unit: 'evaluations'
  }),

  pricingGuardrail: meter.createCounter('cerniq_guardrail_pricing_total', {
    description: 'Pricing guardrail evaluations',
    unit: 'evaluations'
  }),

  commitmentGuardrail: meter.createCounter('cerniq_guardrail_commitment_total', {
    description: 'Commitment guardrail evaluations',
    unit: 'evaluations'
  }),

  // Confidence scores
  confidenceScores: meter.createHistogram('cerniq_guardrail_confidence_score', {
    description: 'Guardrail confidence scores',
    unit: 'score',
    boundaries: [0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 0.99]
  }),

  // False positive tracking (after human review)
  falsePositives: meter.createCounter('cerniq_guardrail_false_positives_total', {
    description: 'False positive blocks (after review)',
    unit: 'false_positives'
  }),

  // Message modifications
  messageModifications: meter.createCounter('cerniq_guardrail_modifications_total', {
    description: 'Messages modified by guardrails',
    unit: 'modifications'
  }),

  // Escalations
  escalationsTriggered: meter.createCounter('cerniq_guardrail_escalations_total', {
    description: 'Escalations triggered by guardrails',
    unit: 'escalations'
  })
};

// Usage
export function recordGuardrailEvaluation(params: {
  guardrailType: string;
  decision: 'allow' | 'block' | 'modify' | 'escalate';
  confidence: number;
  latencyMs: number;
  tenantId: string;
}): void {
  guardrailsMetrics.evaluations.add(1, {
    guardrail_type: params.guardrailType,
    tenant_id: params.tenantId
  });

  guardrailsMetrics.decisions.add(1, {
    guardrail_type: params.guardrailType,
    decision: params.decision
  });

  guardrailsMetrics.evaluationLatency.record(params.latencyMs, {
    guardrail_type: params.guardrailType
  });

  guardrailsMetrics.confidenceScores.record(params.confidence, {
    guardrail_type: params.guardrailType,
    decision: params.decision
  });

  if (params.decision === 'escalate') {
    guardrailsMetrics.escalationsTriggered.add(1, {
      guardrail_type: params.guardrailType
    });
  }
}
```


---

## 7. Logging Strategy

### 7.1 Structured Logging Configuration

```typescript
// packages/shared/observability/logger.ts

import pino, { Logger, LoggerOptions, DestinationStream } from 'pino';
import { trace, context } from '@opentelemetry/api';
import pretty from 'pino-pretty';

export interface LogContext {
  tenantId?: string;
  correlationId?: string;
  userId?: string;
  conversationId?: string;
  negotiationId?: string;
  jobId?: string;
  [key: string]: unknown;
}

export interface LoggerConfig {
  serviceName: string;
  environment: 'development' | 'staging' | 'production';
  level?: string;
  prettyPrint?: boolean;
  redactPaths?: string[];
}

/**
 * Create instrumented logger with trace correlation
 */
export function createLogger(config: LoggerConfig): Logger {
  const {
    serviceName,
    environment,
    level = environment === 'production' ? 'info' : 'debug',
    prettyPrint = environment !== 'production',
    redactPaths = []
  } = config;

  const defaultRedactPaths = [
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    '*.password',
    '*.token',
    '*.secret',
    '*.apiKey',
    '*.cui',
    '*.cnp',
    '*.email',
    '*.phone',
    'payload.cardNumber',
    'payload.cvv'
  ];

  const options: LoggerOptions = {
    name: serviceName,
    level,
    base: {
      service: serviceName,
      environment,
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'unknown'
    },
    redact: {
      paths: [...defaultRedactPaths, ...redactPaths],
      censor: '[REDACTED]'
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        service: bindings.name,
        pid: bindings.pid,
        hostname: bindings.hostname
      }),
      log: (obj) => {
        // Add trace context to every log
        const span = trace.getSpan(context.active());
        if (span) {
          const spanContext = span.spanContext();
          return {
            ...obj,
            traceId: spanContext.traceId,
            spanId: spanContext.spanId,
            traceFlags: spanContext.traceFlags
          };
        }
        return obj;
      }
    },
    mixin: () => {
      // Add timestamp for indexing
      return {
        '@timestamp': new Date().toISOString()
      };
    }
  };

  let destination: DestinationStream | undefined;

  if (prettyPrint) {
    destination = pretty({
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      messageFormat: '{service} [{traceId}] {msg}'
    });
  }

  return pino(options, destination);
}

/**
 * Logger mixin for context injection
 */
export function withContext(logger: Logger, ctx: LogContext): Logger {
  return logger.child(ctx);
}

/**
 * Request logger middleware
 */
export function createRequestLogger(logger: Logger) {
  return {
    requestLogger: (request: any, reply: any, done: () => void) => {
      const requestLogger = logger.child({
        requestId: request.id,
        method: request.method,
        url: request.url,
        tenantId: request.headers['x-tenant-id'],
        correlationId: request.headers['x-correlation-id']
      });

      request.log = requestLogger;
      done();
    }
  };
}
```

### 7.2 Worker Logging Patterns

```typescript
// packages/shared/observability/worker-logger.ts

import { Logger } from 'pino';
import { Job } from 'bullmq';
import { createLogger, withContext, LogContext } from './logger';

export interface WorkerLogContext extends LogContext {
  worker: string;
  jobId: string;
  jobName: string;
  attempt: number;
}

/**
 * Create worker-specific logger
 */
export function createWorkerLogger(
  workerName: string,
  config: { environment: 'development' | 'staging' | 'production' }
): Logger {
  return createLogger({
    serviceName: `cerniq-worker-${workerName}`,
    environment: config.environment
  });
}

/**
 * Create job-scoped logger
 */
export function createJobLogger<T extends Record<string, unknown>>(
  baseLogger: Logger,
  job: Job<T>,
  workerName: string
): Logger {
  const jobData = job.data as any;
  
  const jobContext: WorkerLogContext = {
    worker: workerName,
    jobId: job.id || 'unknown',
    jobName: job.name,
    attempt: job.attemptsMade + 1,
    tenantId: jobData.tenantId,
    correlationId: jobData.correlationId || job.id
  };

  // Add optional context from job data
  if (jobData.conversationId) {
    jobContext.conversationId = jobData.conversationId;
  }
  if (jobData.negotiationId) {
    jobContext.negotiationId = jobData.negotiationId;
  }
  if (jobData.contactId) {
    jobContext.contactId = jobData.contactId;
  }

  return withContext(baseLogger, jobContext);
}

/**
 * Standard log patterns for workers
 */
export class WorkerLogPatterns {
  constructor(private logger: Logger) {}

  // Job lifecycle
  jobStarted(job: Job<unknown>, additionalContext?: Record<string, unknown>): void {
    this.logger.info(
      {
        action: 'JOB_STARTED',
        timestamp: new Date().toISOString(),
        ...additionalContext
      },
      `Job ${job.id} started processing`
    );
  }

  jobCompleted(
    job: Job<unknown>,
    durationMs: number,
    result?: unknown
  ): void {
    this.logger.info(
      {
        action: 'JOB_COMPLETED',
        durationMs,
        timestamp: new Date().toISOString(),
        resultSummary: this.summarizeResult(result)
      },
      `Job ${job.id} completed in ${durationMs}ms`
    );
  }

  jobFailed(
    job: Job<unknown>,
    error: Error,
    durationMs: number
  ): void {
    this.logger.error(
      {
        action: 'JOB_FAILED',
        durationMs,
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code
        }
      },
      `Job ${job.id} failed: ${error.message}`
    );
  }

  jobRetrying(job: Job<unknown>, error: Error, delay: number): void {
    this.logger.warn(
      {
        action: 'JOB_RETRYING',
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
        delayMs: delay,
        error: {
          name: error.name,
          message: error.message
        },
        timestamp: new Date().toISOString()
      },
      `Job ${job.id} will retry in ${delay}ms (attempt ${job.attemptsMade + 1})`
    );
  }

  // AI-specific logging
  llmRequestStarted(params: {
    model: string;
    provider: string;
    operation: string;
    inputTokens?: number;
  }): void {
    this.logger.debug(
      {
        action: 'LLM_REQUEST_STARTED',
        ...params,
        timestamp: new Date().toISOString()
      },
      `LLM request to ${params.provider}/${params.model}`
    );
  }

  llmRequestCompleted(params: {
    model: string;
    provider: string;
    operation: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    costUsd: number;
  }): void {
    this.logger.info(
      {
        action: 'LLM_REQUEST_COMPLETED',
        ...params,
        timestamp: new Date().toISOString()
      },
      `LLM response: ${params.outputTokens} tokens in ${params.latencyMs}ms ($${params.costUsd.toFixed(4)})`
    );
  }

  llmRequestFailed(params: {
    model: string;
    provider: string;
    operation: string;
    error: Error;
    latencyMs: number;
  }): void {
    this.logger.error(
      {
        action: 'LLM_REQUEST_FAILED',
        model: params.model,
        provider: params.provider,
        operation: params.operation,
        latencyMs: params.latencyMs,
        error: {
          name: params.error.name,
          message: params.error.message
        },
        timestamp: new Date().toISOString()
      },
      `LLM request failed: ${params.error.message}`
    );
  }

  // Guardrail logging
  guardrailEvaluated(params: {
    guardrailType: string;
    decision: string;
    confidence: number;
    latencyMs: number;
    reason?: string;
  }): void {
    const level = params.decision === 'block' ? 'warn' : 'debug';
    this.logger[level](
      {
        action: 'GUARDRAIL_EVALUATED',
        ...params,
        timestamp: new Date().toISOString()
      },
      `Guardrail ${params.guardrailType}: ${params.decision} (confidence: ${params.confidence})`
    );
  }

  // HITL logging
  hitlApprovalCreated(params: {
    approvalId: string;
    type: string;
    urgency: string;
    slaDeadline: string;
  }): void {
    this.logger.info(
      {
        action: 'HITL_APPROVAL_CREATED',
        ...params,
        timestamp: new Date().toISOString()
      },
      `HITL approval ${params.approvalId} created (${params.urgency})`
    );
  }

  hitlApprovalResolved(params: {
    approvalId: string;
    type: string;
    resolution: string;
    resolvedBy: string;
    latencySeconds: number;
  }): void {
    this.logger.info(
      {
        action: 'HITL_APPROVAL_RESOLVED',
        ...params,
        timestamp: new Date().toISOString()
      },
      `HITL approval ${params.approvalId} ${params.resolution} by ${params.resolvedBy}`
    );
  }

  // External API logging
  externalApiCall(params: {
    api: string;
    operation: string;
    status: 'started' | 'success' | 'error';
    latencyMs?: number;
    statusCode?: number;
    error?: Error;
  }): void {
    const level = params.status === 'error' ? 'error' : 'debug';
    this.logger[level](
      {
        action: `EXTERNAL_API_${params.status.toUpperCase()}`,
        api: params.api,
        operation: params.operation,
        latencyMs: params.latencyMs,
        statusCode: params.statusCode,
        error: params.error ? {
          name: params.error.name,
          message: params.error.message
        } : undefined,
        timestamp: new Date().toISOString()
      },
      `${params.api}:${params.operation} ${params.status}${params.latencyMs ? ` (${params.latencyMs}ms)` : ''}`
    );
  }

  private summarizeResult(result: unknown): Record<string, unknown> | undefined {
    if (!result) return undefined;
    if (typeof result !== 'object') return { value: result };
    
    // Create a safe summary without sensitive data
    const summary: Record<string, unknown> = {};
    const obj = result as Record<string, unknown>;
    
    if ('id' in obj) summary.id = obj.id;
    if ('status' in obj) summary.status = obj.status;
    if ('count' in obj) summary.count = obj.count;
    if ('success' in obj) summary.success = obj.success;
    
    return Object.keys(summary).length > 0 ? summary : undefined;
  }
}
```

### 7.3 Log Aggregation Configuration

```yaml
# config/otel/logs-pipeline.yaml
# Log aggregation pipeline configuration

receivers:
  filelog:
    include:
      - /var/log/cerniq/**/*.log
    include_file_name: true
    include_file_path: true
    operators:
      # Parse JSON logs
      - type: json_parser
        timestamp:
          parse_from: attributes["@timestamp"]
          layout: '%Y-%m-%dT%H:%M:%S.%fZ'
      
      # Extract trace context
      - type: trace_parser
        trace_id:
          parse_from: attributes.traceId
        span_id:
          parse_from: attributes.spanId
      
      # Set severity
      - type: severity_parser
        parse_from: attributes.level
        mapping:
          debug: debug
          info: info
          warn: warning
          error: error
          fatal: fatal
      
      # Move body
      - type: move
        from: attributes.msg
        to: body

  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1000
    
  resource:
    attributes:
      - key: service.namespace
        value: cerniq-etapa3
        action: upsert
        
  attributes:
    actions:
      # Add log source
      - key: log.source
        value: etapa3
        action: upsert
      
      # Hash sensitive fields
      - key: attributes.email
        action: hash
      - key: attributes.phone
        action: hash
      - key: attributes.cui
        action: hash

exporters:
  clickhouselogs:
    dsn: tcp://clickhouse:9000/signoz_logs
    timeout: 30s
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

service:
  pipelines:
    logs:
      receivers: [filelog, otlp]
      processors: [batch, resource, attributes]
      exporters: [clickhouselogs]
```

### 7.4 Log Search Patterns

```typescript
// packages/api/src/modules/observability/log-search.ts

import { SignozClient } from './signoz-client';

export interface LogSearchParams {
  start: number;
  end: number;
  query?: string;
  level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  service?: string;
  traceId?: string;
  correlationId?: string;
  tenantId?: string;
  jobId?: string;
  conversationId?: string;
  limit?: number;
  offset?: number;
}

export class LogSearchService {
  constructor(private signoz: SignozClient) {}

  /**
   * Build ClickHouse query for logs
   */
  private buildLogQuery(params: LogSearchParams): string {
    const conditions: string[] = [
      `timestamp >= toDateTime64(${params.start / 1000}, 3)`,
      `timestamp <= toDateTime64(${params.end / 1000}, 3)`
    ];

    if (params.query) {
      conditions.push(`body LIKE '%${this.escapeString(params.query)}%'`);
    }

    if (params.level) {
      conditions.push(`severity_text = '${params.level}'`);
    }

    if (params.service) {
      conditions.push(`resources_string['service.name'] = '${params.service}'`);
    }

    if (params.traceId) {
      conditions.push(`trace_id = '${params.traceId}'`);
    }

    if (params.correlationId) {
      conditions.push(`attributes_string['correlationId'] = '${params.correlationId}'`);
    }

    if (params.tenantId) {
      conditions.push(`attributes_string['tenantId'] = '${params.tenantId}'`);
    }

    if (params.jobId) {
      conditions.push(`attributes_string['jobId'] = '${params.jobId}'`);
    }

    if (params.conversationId) {
      conditions.push(`attributes_string['conversationId'] = '${params.conversationId}'`);
    }

    return `
      SELECT
        timestamp,
        severity_text as level,
        body as message,
        trace_id,
        span_id,
        resources_string['service.name'] as service,
        attributes_string as attributes
      FROM signoz_logs.distributed_logs
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT ${params.limit || 100}
      OFFSET ${params.offset || 0}
    `;
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/%/g, '\\%');
  }

  /**
   * Search logs with filters
   */
  async searchLogs(params: LogSearchParams): Promise<LogEntry[]> {
    return this.signoz.queryLogs({
      start: params.start,
      end: params.end,
      query: params.query,
      limit: params.limit
    });
  }

  /**
   * Get logs for a specific trace
   */
  async getLogsForTrace(traceId: string, params: {
    start: number;
    end: number;
  }): Promise<LogEntry[]> {
    return this.searchLogs({
      ...params,
      traceId,
      limit: 1000
    });
  }

  /**
   * Get error logs summary
   */
  async getErrorSummary(params: {
    start: number;
    end: number;
    tenantId?: string;
  }): Promise<ErrorSummary[]> {
    const query = `
      SELECT
        resources_string['service.name'] as service,
        attributes_string['error.name'] as error_type,
        attributes_string['error.message'] as error_message,
        count(*) as count,
        min(timestamp) as first_occurrence,
        max(timestamp) as last_occurrence
      FROM signoz_logs.distributed_logs
      WHERE timestamp >= toDateTime64(${params.start / 1000}, 3)
        AND timestamp <= toDateTime64(${params.end / 1000}, 3)
        AND severity_text IN ('error', 'fatal')
        ${params.tenantId ? `AND attributes_string['tenantId'] = '${params.tenantId}'` : ''}
      GROUP BY service, error_type, error_message
      ORDER BY count DESC
      LIMIT 100
    `;

    // Execute via SigNoz API or direct ClickHouse
    return this.executeQuery<ErrorSummary>(query);
  }

  private async executeQuery<T>(query: string): Promise<T[]> {
    // Implementation depends on direct ClickHouse access or SigNoz API
    throw new Error('Not implemented - use SigNoz API or direct ClickHouse client');
  }
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  traceId?: string;
  spanId?: string;
  service: string;
  attributes: Record<string, string>;
}

interface ErrorSummary {
  service: string;
  error_type: string;
  error_message: string;
  count: number;
  first_occurrence: string;
  last_occurrence: string;
}
```


---

## 8. Distributed Tracing

### 8.1 Trace Sampling Strategy

```typescript
// packages/shared/observability/sampling.ts

import { Sampler, SamplingResult, SamplingDecision, Context, Attributes } from '@opentelemetry/api';

/**
 * Custom sampler for Etapa 3 with intelligent sampling rules
 */
export class Etapa3Sampler implements Sampler {
  private readonly baseSamplingRatio: number;

  constructor(baseSamplingRatio = 0.1) {
    this.baseSamplingRatio = baseSamplingRatio;
  }

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: number,
    attributes: Attributes
  ): SamplingResult {
    // Always sample errors
    if (attributes['error'] === true || attributes['error.type']) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }

    // Always sample AI operations
    if (
      spanName.includes('llm:') ||
      spanName.includes('ai-agent') ||
      attributes['worker.category'] === 'ai-agent'
    ) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }

    // Always sample HITL approvals
    if (
      spanName.includes('hitl:') ||
      attributes['operation.type']?.toString().startsWith('hitl_')
    ) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }

    // Always sample fiscal operations
    if (
      spanName.includes('efactura') ||
      spanName.includes('oblio') ||
      attributes['worker.name']?.toString().includes('fiscal')
    ) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }

    // Always sample negotiations
    if (
      spanName.includes('negotiation') ||
      attributes['negotiation.id']
    ) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }

    // Sample slow operations (>5s)
    const duration = attributes['operation.duration_ms'];
    if (typeof duration === 'number' && duration > 5000) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }

    // High-priority tenants - always sample
    const tenantPriority = attributes['tenant.priority'];
    if (tenantPriority === 'high' || tenantPriority === 'enterprise') {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }

    // Probabilistic sampling for everything else
    const decision = this.probabilisticSample(traceId);
    return { decision };
  }

  private probabilisticSample(traceId: string): SamplingDecision {
    // Use last 8 chars of traceId for consistent sampling
    const hash = parseInt(traceId.slice(-8), 16);
    const threshold = Math.floor(this.baseSamplingRatio * 0xffffffff);
    
    return (hash & 0xffffffff) < threshold
      ? SamplingDecision.RECORD_AND_SAMPLED
      : SamplingDecision.NOT_RECORD;
  }

  toString(): string {
    return `Etapa3Sampler{baseSamplingRatio=${this.baseSamplingRatio}}`;
  }
}
```

### 8.2 Trace Context for Cross-Service Communication

```typescript
// packages/shared/observability/trace-context.ts

import { trace, context, SpanKind, propagation } from '@opentelemetry/api';
import type { Span, SpanContext } from '@opentelemetry/api';

const tracer = trace.getTracer('cerniq-etapa3-tracing', '1.0.0');

/**
 * Create a span for external API calls
 */
export function createExternalApiSpan(params: {
  service: string;
  operation: string;
  method: string;
  url: string;
}): Span {
  return tracer.startSpan(`${params.service}:${params.operation}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'http.method': params.method,
      'http.url': params.url,
      'peer.service': params.service,
      'service.operation': params.operation
    }
  });
}

/**
 * Create a span for database operations
 */
export function createDbSpan(params: {
  operation: string;
  table: string;
  query?: string;
}): Span {
  return tracer.startSpan(`db:${params.operation}:${params.table}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'db.system': 'postgresql',
      'db.operation': params.operation,
      'db.table': params.table,
      'db.statement': params.query ? hashSensitiveData(params.query) : undefined
    }
  });
}

/**
 * Create a span for cache operations
 */
export function createCacheSpan(params: {
  operation: 'get' | 'set' | 'delete' | 'mget' | 'mset';
  key: string;
}): Span {
  return tracer.startSpan(`cache:${params.operation}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'cache.system': 'redis',
      'cache.operation': params.operation,
      'cache.key': hashSensitiveData(params.key)
    }
  });
}

/**
 * Create a span for queue operations
 */
export function createQueueSpan(params: {
  operation: 'publish' | 'consume' | 'ack' | 'nack';
  queue: string;
  jobName?: string;
}): Span {
  const kind = params.operation === 'publish' ? SpanKind.PRODUCER : SpanKind.CONSUMER;
  
  return tracer.startSpan(`queue:${params.operation}:${params.queue}`, {
    kind,
    attributes: {
      'messaging.system': 'bullmq',
      'messaging.destination': params.queue,
      'messaging.operation': params.operation,
      'messaging.message_type': params.jobName
    }
  });
}

/**
 * Inject trace context into outgoing headers
 */
export function injectTraceContext(headers: Record<string, string>): void {
  propagation.inject(context.active(), headers);
}

/**
 * Extract trace context from incoming headers
 */
export function extractTraceContext(headers: Record<string, string>): SpanContext | undefined {
  const extractedContext = propagation.extract(context.active(), headers);
  return trace.getSpanContext(extractedContext);
}

/**
 * Run function within a span
 */
export async function withSpan<T>(
  spanName: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const span = tracer.startSpan(spanName, { attributes });
  
  try {
    const result = await context.with(
      trace.setSpan(context.active(), span),
      () => fn(span)
    );
    span.setStatus({ code: 1 }); // OK
    return result;
  } catch (error) {
    span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

function hashSensitiveData(data: string): string {
  // Simple hash for logging - not cryptographically secure
  if (data.length < 10) return data;
  return `${data.slice(0, 5)}...${data.slice(-5)}`;
}
```

### 8.3 Trace Visualization Queries

```sql
-- Trace analysis queries for ClickHouse/SigNoz

-- Find slow traces (>5s) in the last hour
SELECT
  traceID,
  serviceName,
  name as operationName,
  durationNano / 1e9 as durationSeconds,
  timestamp
FROM signoz_traces.distributed_signoz_spans
WHERE timestamp > now() - interval 1 hour
  AND durationNano > 5000000000
  AND parentSpanId = ''
ORDER BY durationNano DESC
LIMIT 100;

-- Trace error distribution by service
SELECT
  serviceName,
  statusCode,
  count(*) as errorCount,
  avg(durationNano) / 1e6 as avgDurationMs
FROM signoz_traces.distributed_signoz_spans
WHERE timestamp > now() - interval 24 hour
  AND statusCode = 2  -- ERROR
GROUP BY serviceName, statusCode
ORDER BY errorCount DESC;

-- Service dependency map
SELECT
  serviceName as source,
  spanAttributes['peer.service'] as target,
  count(*) as callCount,
  avg(durationNano) / 1e6 as avgLatencyMs,
  sum(CASE WHEN statusCode = 2 THEN 1 ELSE 0 END) as errors
FROM signoz_traces.distributed_signoz_spans
WHERE timestamp > now() - interval 1 hour
  AND spanAttributes['peer.service'] != ''
GROUP BY source, target
ORDER BY callCount DESC;

-- LLM call analysis
SELECT
  spanAttributes['llm.model'] as model,
  spanAttributes['llm.provider'] as provider,
  count(*) as requests,
  avg(durationNano) / 1e6 as avgLatencyMs,
  quantile(0.95)(durationNano) / 1e6 as p95LatencyMs,
  sum(toUInt64(spanAttributes['llm.tokens.input'])) as totalInputTokens,
  sum(toUInt64(spanAttributes['llm.tokens.output'])) as totalOutputTokens
FROM signoz_traces.distributed_signoz_spans
WHERE timestamp > now() - interval 24 hour
  AND name LIKE 'llm:%'
GROUP BY model, provider
ORDER BY requests DESC;

-- Negotiation flow analysis
SELECT
  spanAttributes['negotiation.id'] as negotiationId,
  groupArray(name) as spanSequence,
  sum(durationNano) / 1e9 as totalDurationSeconds,
  max(timestamp) - min(timestamp) as wallClockDuration
FROM signoz_traces.distributed_signoz_spans
WHERE timestamp > now() - interval 24 hour
  AND name LIKE 'negotiation:%'
GROUP BY negotiationId
HAVING count(*) > 1
ORDER BY totalDurationSeconds DESC
LIMIT 50;
```

---

## 9. Alerting Rules

### 9.1 Critical Alerts

```yaml
# config/signoz/alerts-critical-etapa3.yaml
# Critical alerts requiring immediate attention

groups:
  - name: etapa3-critical
    interval: 15s
    rules:
      # AI Agent Down
      - alert: AIAgentDown
        expr: |
          up{job="ai-agent-worker"} == 0
        for: 2m
        labels:
          severity: critical
          team: ai-platform
          etapa: "3"
          pagerduty: "true"
        annotations:
          summary: "AI Agent worker is down"
          description: "AI Agent worker has been unreachable for 2 minutes"
          runbook_url: "https://docs.cerniq.app/runbooks/ai-agent-down"
          dashboard_url: "https://signoz.cerniq.app/dashboard/etapa3-workers"

      # Database Connection Pool Exhausted
      - alert: DatabasePoolExhausted
        expr: |
          pg_stat_activity_count{datname="cerniq", state="active"}
          / 
          pg_settings_value{setting="max_connections"} > 0.9
        for: 5m
        labels:
          severity: critical
          team: database
          etapa: "3"
          pagerduty: "true"
        annotations:
          summary: "Database connection pool near exhaustion"
          description: |
            Database connection pool is at {{ $value | printf "%.0f" }}% capacity
          runbook_url: "https://docs.cerniq.app/runbooks/db-pool-exhausted"

      # Redis Memory Critical
      - alert: RedisMemoryCritical
        expr: |
          redis_memory_used_bytes / redis_memory_max_bytes > 0.95
        for: 5m
        labels:
          severity: critical
          team: infrastructure
          etapa: "3"
          pagerduty: "true"
        annotations:
          summary: "Redis memory critically high"
          description: |
            Redis memory usage is {{ $value | printf "%.0f" }}%
          runbook_url: "https://docs.cerniq.app/runbooks/redis-memory"

      # e-Factura Submission Failures
      - alert: EFacturaCriticalFailures
        expr: |
          (
            sum(rate(cerniq_efactura_submissions_total{status="failed"}[15m]))
            /
            sum(rate(cerniq_efactura_submissions_total[15m]))
          ) * 100 > 25
        for: 10m
        labels:
          severity: critical
          team: fiscal
          etapa: "3"
          pagerduty: "true"
        annotations:
          summary: "High e-Factura submission failure rate"
          description: |
            e-Factura submission failure rate is {{ $value | printf "%.1f" }}%
            (threshold: 25%)
          runbook_url: "https://docs.cerniq.app/runbooks/efactura-failures"

      # HITL SLA Breaches
      - alert: HITLCriticalSLABreach
        expr: |
          count(
            cerniq_hitl_approvals_pending{urgency="critical"}
            AND 
            (time() - cerniq_hitl_approval_created_timestamp) > 3600
          ) > 0
        for: 1m
        labels:
          severity: critical
          team: operations
          etapa: "3"
          pagerduty: "true"
        annotations:
          summary: "Critical HITL approvals SLA breached"
          description: |
            {{ $value }} critical HITL approvals have breached 1-hour SLA
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-sla-breach"

      # LLM Provider Outage
      - alert: LLMProviderOutage
        expr: |
          (
            sum(rate(cerniq_ai_llm_requests_total{status="error"}[5m]))
            /
            sum(rate(cerniq_ai_llm_requests_total[5m]))
          ) * 100 > 50
        for: 5m
        labels:
          severity: critical
          team: ai-platform
          etapa: "3"
          pagerduty: "true"
        annotations:
          summary: "LLM provider potential outage"
          description: |
            LLM error rate is {{ $value | printf "%.0f" }}% - possible provider outage
          runbook_url: "https://docs.cerniq.app/runbooks/llm-outage"
```

### 9.2 Warning Alerts

```yaml
# config/signoz/alerts-warning-etapa3.yaml
# Warning alerts for proactive monitoring

groups:
  - name: etapa3-warnings
    interval: 30s
    rules:
      # Queue Depth Growing
      - alert: QueueDepthGrowing
        expr: |
          cerniq_etapa3_queue_depth > 500
          AND
          delta(cerniq_etapa3_queue_depth[10m]) > 100
        for: 10m
        labels:
          severity: warning
          team: backend
          etapa: "3"
        annotations:
          summary: "Queue depth growing"
          description: |
            Queue {{ $labels.worker }} has {{ $value }} pending jobs 
            and is growing
          runbook_url: "https://docs.cerniq.app/runbooks/queue-depth"

      # High LLM Cost
      - alert: LLMCostHigh
        expr: |
          sum(rate(cerniq_ai_llm_cost_usd_sum[1h])) * 3600 * 24 > 100
        for: 30m
        labels:
          severity: warning
          team: ai-platform
          etapa: "3"
        annotations:
          summary: "High projected LLM cost"
          description: |
            Projected daily LLM cost is ${{ $value | printf "%.2f" }}
            (threshold: $100/day)
          runbook_url: "https://docs.cerniq.app/runbooks/llm-cost"

      # Guardrail Block Rate High
      - alert: GuardrailBlockRateHigh
        expr: |
          (
            sum(rate(cerniq_ai_guardrail_blocks_total[30m]))
            /
            sum(rate(cerniq_ai_messages_processed_total[30m]))
          ) * 100 > 5
        for: 15m
        labels:
          severity: warning
          team: ai-platform
          etapa: "3"
        annotations:
          summary: "High guardrail block rate"
          description: |
            {{ $value | printf "%.1f" }}% of messages are being blocked by guardrails
          runbook_url: "https://docs.cerniq.app/runbooks/guardrail-blocks"

      # Slow Negotiations
      - alert: NegotiationsStalling
        expr: |
          count(
            cerniq_negotiation_state_time_minutes{state=~"qualification|discovery"}
            > 2880  # 48 hours
          ) > 10
        for: 1h
        labels:
          severity: warning
          team: sales
          etapa: "3"
        annotations:
          summary: "Multiple negotiations stalling"
          description: |
            {{ $value }} negotiations have been in early stages for >48 hours
          runbook_url: "https://docs.cerniq.app/runbooks/stalled-negotiations"

      # Memory Usage High
      - alert: WorkerMemoryHigh
        expr: |
          process_resident_memory_bytes{job=~".*etapa3.*"} 
          / 
          node_memory_MemTotal_bytes * 100 > 80
        for: 15m
        labels:
          severity: warning
          team: infrastructure
          etapa: "3"
        annotations:
          summary: "Worker memory usage high"
          description: |
            Worker {{ $labels.job }} memory usage is {{ $value | printf "%.0f" }}%
          runbook_url: "https://docs.cerniq.app/runbooks/worker-memory"

      # ANAF API Latency
      - alert: ANAFAPILatencyHigh
        expr: |
          histogram_quantile(0.95, 
            rate(cerniq_efactura_api_latency_ms_bucket[15m])
          ) > 10000
        for: 15m
        labels:
          severity: warning
          team: fiscal
          etapa: "3"
        annotations:
          summary: "ANAF API latency high"
          description: |
            ANAF API P95 latency is {{ $value | printf "%.0f" }}ms
          runbook_url: "https://docs.cerniq.app/runbooks/anaf-latency"
```

---

## 10. Grafana Dashboards

### 10.1 Main Overview Dashboard

```json
{
  "dashboard": {
    "id": null,
    "uid": "etapa3-overview",
    "title": "Cerniq Etapa 3 - AI Sales Agent Overview",
    "tags": ["cerniq", "etapa3", "production"],
    "timezone": "Europe/Bucharest",
    "refresh": "30s",
    "schemaVersion": 38,
    "version": 1,
    "templating": {
      "list": [
        {
          "name": "tenant",
          "type": "query",
          "query": "label_values(cerniq_etapa3_jobs_processed_total, tenant_id)",
          "current": { "selected": true, "text": "All", "value": "$__all" },
          "includeAll": true,
          "multi": true
        },
        {
          "name": "worker",
          "type": "query",
          "query": "label_values(cerniq_etapa3_jobs_processed_total, worker)",
          "current": { "selected": true, "text": "All", "value": "$__all" },
          "includeAll": true,
          "multi": true
        }
      ]
    },
    "panels": [
      {
        "title": "Active Conversations",
        "type": "stat",
        "gridPos": { "x": 0, "y": 0, "w": 4, "h": 4 },
        "targets": [
          {
            "expr": "sum(cerniq_ai_conversations_active{tenant_id=~\"$tenant\"})",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 100 },
                { "color": "red", "value": 500 }
              ]
            }
          }
        }
      },
      {
        "title": "LLM Requests/min",
        "type": "stat",
        "gridPos": { "x": 4, "y": 0, "w": 4, "h": 4 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_ai_llm_requests_total[5m])) * 60",
            "refId": "A"
          }
        ]
      },
      {
        "title": "LLM Cost (24h)",
        "type": "stat",
        "gridPos": { "x": 8, "y": 0, "w": 4, "h": 4 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_ai_llm_cost_usd_sum[24h]))",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD",
            "decimals": 2,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 50 },
                { "color": "red", "value": 100 }
              ]
            }
          }
        }
      },
      {
        "title": "Pending HITL",
        "type": "stat",
        "gridPos": { "x": 12, "y": 0, "w": 4, "h": 4 },
        "targets": [
          {
            "expr": "sum(cerniq_hitl_approvals_pending)",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 10 },
                { "color": "red", "value": 50 }
              ]
            }
          }
        }
      },
      {
        "title": "e-Factura Success Rate",
        "type": "gauge",
        "gridPos": { "x": 16, "y": 0, "w": 4, "h": 4 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_efactura_submissions_total{status=\"success\"}[1h])) / sum(rate(cerniq_efactura_submissions_total[1h])) * 100",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "red", "value": null },
                { "color": "yellow", "value": 90 },
                { "color": "green", "value": 98 }
              ]
            }
          }
        }
      },
      {
        "title": "Error Rate",
        "type": "gauge",
        "gridPos": { "x": 20, "y": 0, "w": 4, "h": 4 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_etapa3_jobs_processed_total{status=\"failed\", worker=~\"$worker\"}[5m])) / sum(rate(cerniq_etapa3_jobs_processed_total{worker=~\"$worker\"}[5m])) * 100",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 1 },
                { "color": "red", "value": 5 }
              ]
            }
          }
        }
      },
      {
        "title": "LLM Latency Distribution",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 4, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(cerniq_ai_llm_latency_seconds_bucket[5m])) by (le))",
            "legendFormat": "P50",
            "refId": "A"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(cerniq_ai_llm_latency_seconds_bucket[5m])) by (le))",
            "legendFormat": "P95",
            "refId": "B"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(cerniq_ai_llm_latency_seconds_bucket[5m])) by (le))",
            "legendFormat": "P99",
            "refId": "C"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "custom": {
              "drawStyle": "line",
              "lineInterpolation": "smooth"
            }
          }
        }
      },
      {
        "title": "Worker Throughput",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 4, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum by (worker) (rate(cerniq_etapa3_jobs_processed_total{worker=~\"$worker\"}[5m]))",
            "legendFormat": "{{worker}}",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "ops",
            "custom": {
              "drawStyle": "line",
              "fillOpacity": 10
            }
          }
        }
      },
      {
        "title": "Token Usage by Model",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 12, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum by (model) (rate(cerniq_ai_llm_tokens_input_total[5m]) + rate(cerniq_ai_llm_tokens_output_total[5m]))",
            "legendFormat": "{{model}}",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "custom": {
              "drawStyle": "bars",
              "stacking": { "mode": "normal" }
            }
          }
        }
      },
      {
        "title": "Negotiation Stage Distribution",
        "type": "piechart",
        "gridPos": { "x": 12, "y": 12, "w": 6, "h": 8 },
        "targets": [
          {
            "expr": "sum by (stage) (cerniq_negotiation_active{tenant_id=~\"$tenant\"})",
            "legendFormat": "{{stage}}",
            "refId": "A"
          }
        ]
      },
      {
        "title": "Guardrail Blocks by Type",
        "type": "piechart",
        "gridPos": { "x": 18, "y": 12, "w": 6, "h": 8 },
        "targets": [
          {
            "expr": "sum by (guardrail_type) (increase(cerniq_ai_guardrail_blocks_total[1h]))",
            "legendFormat": "{{guardrail_type}}",
            "refId": "A"
          }
        ]
      }
    ]
  }
}
```

### 10.2 Worker Details Dashboard

```json
{
  "dashboard": {
    "uid": "etapa3-worker-details",
    "title": "Cerniq Etapa 3 - Worker Details",
    "tags": ["cerniq", "etapa3", "workers"],
    "panels": [
      {
        "title": "Job Processing Rate",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum by (worker, status) (rate(cerniq_etapa3_jobs_processed_total{worker=~\"$worker\"}[5m]))",
            "legendFormat": "{{worker}} - {{status}}",
            "refId": "A"
          }
        ]
      },
      {
        "title": "Queue Depths",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 0, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "cerniq_etapa3_queue_depth{worker=~\"$worker\"}",
            "legendFormat": "{{worker}}",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 100 },
                { "color": "red", "value": 500 }
              ]
            }
          }
        }
      },
      {
        "title": "Job Duration Percentiles",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 8, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum by (worker, le) (rate(cerniq_etapa3_job_duration_seconds_bucket{worker=~\"$worker\"}[5m])))",
            "legendFormat": "{{worker}} P50",
            "refId": "A"
          },
          {
            "expr": "histogram_quantile(0.95, sum by (worker, le) (rate(cerniq_etapa3_job_duration_seconds_bucket{worker=~\"$worker\"}[5m])))",
            "legendFormat": "{{worker}} P95",
            "refId": "B"
          }
        ],
        "fieldConfig": {
          "defaults": { "unit": "s" }
        }
      },
      {
        "title": "Retries by Worker",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 8, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum by (worker, error_type) (rate(cerniq_etapa3_job_retries_total{worker=~\"$worker\"}[5m]))",
            "legendFormat": "{{worker}} - {{error_type}}",
            "refId": "A"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 16, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "process_resident_memory_bytes{job=~\".*$worker.*\"}",
            "legendFormat": "{{job}}",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": { "unit": "bytes" }
        }
      },
      {
        "title": "CPU Usage",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 16, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "rate(process_cpu_seconds_total{job=~\".*$worker.*\"}[5m])",
            "legendFormat": "{{job}}",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": { "unit": "percentunit" }
        }
      }
    ]
  }
}
```


---

## 11. Health Checks și Readiness Probes

### 11.1 Health Check Framework

```typescript
// src/monitoring/health/health-check-framework.ts

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { Queue } from 'bullmq';

// ============================================================================
// HEALTH CHECK TYPES
// ============================================================================

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTimeMs: number;
  message?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface OverallHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: HealthCheckResult[];
  timestamp: Date;
}

export interface HealthCheckConfig {
  name: string;
  critical: boolean;
  timeoutMs: number;
  intervalMs: number;
  check: () => Promise<HealthCheckResult>;
}

// ============================================================================
// HEALTH CHECK REGISTRY
// ============================================================================

export class HealthCheckRegistry {
  private checks: Map<string, HealthCheckConfig> = new Map();
  private lastResults: Map<string, HealthCheckResult> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private startTime: Date = new Date();

  register(config: HealthCheckConfig): void {
    this.checks.set(config.name, config);
    
    // Run initial check
    this.runCheck(config.name).catch(console.error);
    
    // Set up periodic checks
    const interval = setInterval(
      () => this.runCheck(config.name).catch(console.error),
      config.intervalMs
    );
    this.intervals.set(config.name, interval);
  }

  unregister(name: string): void {
    this.checks.delete(name);
    this.lastResults.delete(name);
    
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }
  }

  private async runCheck(name: string): Promise<void> {
    const config = this.checks.get(name);
    if (!config) return;

    const start = Date.now();
    
    try {
      const result = await Promise.race([
        config.check(),
        this.timeout(config.timeoutMs, name)
      ]);
      
      this.lastResults.set(name, result);
    } catch (error) {
      this.lastResults.set(name, {
        name,
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  private timeout(ms: number, name: string): Promise<HealthCheckResult> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Health check ${name} timed out after ${ms}ms`)), ms);
    });
  }

  getOverallHealth(): OverallHealthStatus {
    const checks = Array.from(this.lastResults.values());
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    for (const check of checks) {
      const config = this.checks.get(check.name);
      
      if (check.status === 'unhealthy' && config?.critical) {
        status = 'unhealthy';
        break;
      } else if (check.status === 'unhealthy' || check.status === 'degraded') {
        if (status !== 'unhealthy') {
          status = 'degraded';
        }
      }
    }

    return {
      status,
      version: process.env.APP_VERSION || '1.0.0',
      uptime: Date.now() - this.startTime.getTime(),
      checks,
      timestamp: new Date()
    };
  }

  async runAllChecks(): Promise<OverallHealthStatus> {
    await Promise.all(
      Array.from(this.checks.keys()).map(name => this.runCheck(name))
    );
    return this.getOverallHealth();
  }

  shutdown(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }
}

// ============================================================================
// INDIVIDUAL HEALTH CHECKS
// ============================================================================

export function createPostgresHealthCheck(pool: Pool): HealthCheckConfig {
  return {
    name: 'postgresql',
    critical: true,
    timeoutMs: 5000,
    intervalMs: 30000,
    check: async (): Promise<HealthCheckResult> => {
      const start = Date.now();
      
      try {
        const result = await pool.query(`
          SELECT 
            pg_is_in_recovery() as is_replica,
            pg_database_size(current_database()) as db_size,
            numbackends as active_connections,
            (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction') as idle_in_transaction,
            (SELECT count(*) FROM pg_locks WHERE granted = false) as waiting_locks
          FROM pg_stat_database 
          WHERE datname = current_database()
        `);
        
        const row = result.rows[0];
        const responseTimeMs = Date.now() - start;
        
        // Check for warning conditions
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        const warnings: string[] = [];
        
        if (row.idle_in_transaction > 5) {
          status = 'degraded';
          warnings.push(`${row.idle_in_transaction} idle-in-transaction connections`);
        }
        
        if (row.waiting_locks > 10) {
          status = 'degraded';
          warnings.push(`${row.waiting_locks} waiting locks`);
        }
        
        // Latency check
        if (responseTimeMs > 1000) {
          status = 'degraded';
          warnings.push(`High latency: ${responseTimeMs}ms`);
        }

        return {
          name: 'postgresql',
          status,
          responseTimeMs,
          message: warnings.length > 0 ? warnings.join(', ') : 'Database healthy',
          details: {
            isReplica: row.is_replica,
            dbSizeBytes: parseInt(row.db_size),
            activeConnections: parseInt(row.active_connections),
            idleInTransaction: parseInt(row.idle_in_transaction),
            waitingLocks: parseInt(row.waiting_locks)
          },
          timestamp: new Date()
        };
      } catch (error) {
        return {
          name: 'postgresql',
          status: 'unhealthy',
          responseTimeMs: Date.now() - start,
          message: error instanceof Error ? error.message : 'Database check failed',
          timestamp: new Date()
        };
      }
    }
  };
}

export function createRedisHealthCheck(redis: Redis): HealthCheckConfig {
  return {
    name: 'redis',
    critical: true,
    timeoutMs: 3000,
    intervalMs: 15000,
    check: async (): Promise<HealthCheckResult> => {
      const start = Date.now();
      
      try {
        const info = await redis.info('server memory clients');
        const responseTimeMs = Date.now() - start;
        
        // Parse Redis INFO
        const parseInfo = (info: string): Record<string, string> => {
          const result: Record<string, string> = {};
          for (const line of info.split('\n')) {
            const [key, value] = line.split(':');
            if (key && value) {
              result[key.trim()] = value.trim();
            }
          }
          return result;
        };
        
        const parsed = parseInfo(info);
        const usedMemory = parseInt(parsed.used_memory || '0');
        const maxMemory = parseInt(parsed.maxmemory || '0');
        const connectedClients = parseInt(parsed.connected_clients || '0');
        
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        const warnings: string[] = [];
        
        // Memory check
        if (maxMemory > 0) {
          const memoryUsage = usedMemory / maxMemory;
          if (memoryUsage > 0.9) {
            status = 'degraded';
            warnings.push(`Memory usage at ${(memoryUsage * 100).toFixed(1)}%`);
          }
        }
        
        // Client check
        if (connectedClients > 100) {
          status = 'degraded';
          warnings.push(`${connectedClients} connected clients`);
        }
        
        // Latency check
        if (responseTimeMs > 100) {
          status = 'degraded';
          warnings.push(`High latency: ${responseTimeMs}ms`);
        }

        return {
          name: 'redis',
          status,
          responseTimeMs,
          message: warnings.length > 0 ? warnings.join(', ') : 'Redis healthy',
          details: {
            version: parsed.redis_version,
            usedMemoryBytes: usedMemory,
            maxMemoryBytes: maxMemory,
            connectedClients,
            uptimeSeconds: parseInt(parsed.uptime_in_seconds || '0')
          },
          timestamp: new Date()
        };
      } catch (error) {
        return {
          name: 'redis',
          status: 'unhealthy',
          responseTimeMs: Date.now() - start,
          message: error instanceof Error ? error.message : 'Redis check failed',
          timestamp: new Date()
        };
      }
    }
  };
}

export function createBullMQHealthCheck(
  queues: Map<string, Queue>,
  thresholds: {
    maxQueueDepth: number;
    maxFailedJobs: number;
    maxStalledJobs: number;
  }
): HealthCheckConfig {
  return {
    name: 'bullmq',
    critical: true,
    timeoutMs: 10000,
    intervalMs: 30000,
    check: async (): Promise<HealthCheckResult> => {
      const start = Date.now();
      
      try {
        const queueStats: Array<{
          name: string;
          waiting: number;
          active: number;
          failed: number;
          delayed: number;
          stalled: number;
        }> = [];
        
        for (const [name, queue] of queues) {
          const counts = await queue.getJobCounts();
          queueStats.push({
            name,
            waiting: counts.waiting,
            active: counts.active,
            failed: counts.failed,
            delayed: counts.delayed,
            stalled: counts.waiting // Approximate
          });
        }
        
        const responseTimeMs = Date.now() - start;
        
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        const warnings: string[] = [];
        
        const totalWaiting = queueStats.reduce((sum, q) => sum + q.waiting, 0);
        const totalFailed = queueStats.reduce((sum, q) => sum + q.failed, 0);
        
        if (totalWaiting > thresholds.maxQueueDepth) {
          status = 'degraded';
          warnings.push(`High queue depth: ${totalWaiting}`);
        }
        
        if (totalFailed > thresholds.maxFailedJobs) {
          status = 'degraded';
          warnings.push(`${totalFailed} failed jobs`);
        }
        
        // Check for stalled queues (no activity)
        for (const q of queueStats) {
          if (q.waiting > 100 && q.active === 0) {
            status = 'degraded';
            warnings.push(`Queue ${q.name} may be stalled (${q.waiting} waiting, 0 active)`);
          }
        }

        return {
          name: 'bullmq',
          status,
          responseTimeMs,
          message: warnings.length > 0 ? warnings.join(', ') : 'All queues healthy',
          details: {
            queues: queueStats,
            totalWaiting,
            totalFailed,
            queueCount: queueStats.length
          },
          timestamp: new Date()
        };
      } catch (error) {
        return {
          name: 'bullmq',
          status: 'unhealthy',
          responseTimeMs: Date.now() - start,
          message: error instanceof Error ? error.message : 'BullMQ check failed',
          timestamp: new Date()
        };
      }
    }
  };
}

export function createLLMProviderHealthCheck(
  providers: Array<{ name: string; endpoint: string; apiKey: string }>
): HealthCheckConfig {
  return {
    name: 'llm-providers',
    critical: true,
    timeoutMs: 15000,
    intervalMs: 60000,
    check: async (): Promise<HealthCheckResult> => {
      const start = Date.now();
      
      const providerResults: Array<{
        name: string;
        available: boolean;
        latencyMs: number;
        error?: string;
      }> = [];
      
      for (const provider of providers) {
        const providerStart = Date.now();
        
        try {
          // Simple health check - just verify endpoint is reachable
          // In production, use provider-specific health endpoints
          const response = await fetch(`${provider.endpoint}/health`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${provider.apiKey}`
            },
            signal: AbortSignal.timeout(5000)
          });
          
          providerResults.push({
            name: provider.name,
            available: response.ok,
            latencyMs: Date.now() - providerStart,
            error: response.ok ? undefined : `HTTP ${response.status}`
          });
        } catch (error) {
          providerResults.push({
            name: provider.name,
            available: false,
            latencyMs: Date.now() - providerStart,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      const responseTimeMs = Date.now() - start;
      const availableCount = providerResults.filter(p => p.available).length;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (availableCount === 0) {
        status = 'unhealthy';
      } else if (availableCount < providers.length) {
        status = 'degraded';
      }

      return {
        name: 'llm-providers',
        status,
        responseTimeMs,
        message: `${availableCount}/${providers.length} providers available`,
        details: {
          providers: providerResults,
          availableCount,
          totalProviders: providers.length
        },
        timestamp: new Date()
      };
    }
  };
}

export function createExternalAPIHealthCheck(
  apis: Array<{ name: string; url: string; critical: boolean }>
): HealthCheckConfig {
  return {
    name: 'external-apis',
    critical: false,
    timeoutMs: 30000,
    intervalMs: 120000,
    check: async (): Promise<HealthCheckResult> => {
      const start = Date.now();
      
      const apiResults: Array<{
        name: string;
        available: boolean;
        latencyMs: number;
        critical: boolean;
        error?: string;
      }> = [];
      
      for (const api of apis) {
        const apiStart = Date.now();
        
        try {
          const response = await fetch(api.url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000)
          });
          
          apiResults.push({
            name: api.name,
            available: response.ok || response.status === 405,
            latencyMs: Date.now() - apiStart,
            critical: api.critical
          });
        } catch (error) {
          apiResults.push({
            name: api.name,
            available: false,
            latencyMs: Date.now() - apiStart,
            critical: api.critical,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      const responseTimeMs = Date.now() - start;
      const criticalUnavailable = apiResults.filter(a => !a.available && a.critical);
      const nonCriticalUnavailable = apiResults.filter(a => !a.available && !a.critical);
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (criticalUnavailable.length > 0) {
        status = 'unhealthy';
      } else if (nonCriticalUnavailable.length > 0) {
        status = 'degraded';
      }

      return {
        name: 'external-apis',
        status,
        responseTimeMs,
        message: `${criticalUnavailable.length} critical, ${nonCriticalUnavailable.length} non-critical APIs unavailable`,
        details: {
          apis: apiResults,
          criticalUnavailable: criticalUnavailable.map(a => a.name),
          nonCriticalUnavailable: nonCriticalUnavailable.map(a => a.name)
        },
        timestamp: new Date()
      };
    }
  };
}
```

### 11.2 Health Check Endpoints

```typescript
// src/monitoring/health/health-endpoints.ts

import { FastifyPluginAsync } from 'fastify';
import { HealthCheckRegistry, OverallHealthStatus } from './health-check-framework';

interface HealthPluginOptions {
  registry: HealthCheckRegistry;
  exposePath?: string;
  readinessPath?: string;
  livenessPath?: string;
}

export const healthPlugin: FastifyPluginAsync<HealthPluginOptions> = async (
  fastify,
  options
) => {
  const {
    registry,
    exposePath = '/health',
    readinessPath = '/health/ready',
    livenessPath = '/health/live'
  } = options;

  // ============================================================================
  // LIVENESS PROBE
  // Simple check - is the process running?
  // ============================================================================
  fastify.get(livenessPath, {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['alive'] },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async () => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString()
    };
  });

  // ============================================================================
  // READINESS PROBE
  // Check if service is ready to accept traffic
  // ============================================================================
  fastify.get(readinessPath, {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ready', 'not_ready'] },
            checks: { type: 'array' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['not_ready'] },
            checks: { type: 'array' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const health = registry.getOverallHealth();
    
    const response = {
      status: health.status === 'unhealthy' ? 'not_ready' : 'ready',
      checks: health.checks.filter(c => {
        // Only show critical checks in readiness
        const checkConfig = registry['checks'].get(c.name);
        return checkConfig?.critical;
      }),
      timestamp: new Date().toISOString()
    };
    
    if (health.status === 'unhealthy') {
      reply.code(503);
    }
    
    return response;
  });

  // ============================================================================
  // FULL HEALTH STATUS
  // Detailed health information for monitoring
  // ============================================================================
  fastify.get(exposePath, {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            version: { type: 'string' },
            uptime: { type: 'number' },
            checks: { type: 'array' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async () => {
    const health = registry.getOverallHealth();
    
    return {
      ...health,
      timestamp: health.timestamp.toISOString(),
      checks: health.checks.map(c => ({
        ...c,
        timestamp: c.timestamp.toISOString()
      }))
    };
  });

  // ============================================================================
  // DEEP HEALTH CHECK
  // Force run all health checks (for debugging)
  // ============================================================================
  fastify.get(`${exposePath}/deep`, {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            version: { type: 'string' },
            uptime: { type: 'number' },
            checks: { type: 'array' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async () => {
    const health = await registry.runAllChecks();
    
    return {
      ...health,
      timestamp: health.timestamp.toISOString(),
      checks: health.checks.map(c => ({
        ...c,
        timestamp: c.timestamp.toISOString()
      }))
    };
  });
};

// ============================================================================
// PROMETHEUS HEALTH METRICS
// ============================================================================

export function exposeHealthMetrics(registry: HealthCheckRegistry): string {
  const health = registry.getOverallHealth();
  
  const lines: string[] = [
    '# HELP cerniq_health_status Overall service health status (1=healthy, 0.5=degraded, 0=unhealthy)',
    '# TYPE cerniq_health_status gauge',
    `cerniq_health_status{service="etapa3"} ${
      health.status === 'healthy' ? 1 : health.status === 'degraded' ? 0.5 : 0
    }`,
    '',
    '# HELP cerniq_health_check_status Individual health check status (1=healthy, 0.5=degraded, 0=unhealthy)',
    '# TYPE cerniq_health_check_status gauge'
  ];
  
  for (const check of health.checks) {
    const value = check.status === 'healthy' ? 1 : check.status === 'degraded' ? 0.5 : 0;
    lines.push(`cerniq_health_check_status{check="${check.name}"} ${value}`);
  }
  
  lines.push('');
  lines.push('# HELP cerniq_health_check_response_time_seconds Health check response time');
  lines.push('# TYPE cerniq_health_check_response_time_seconds gauge');
  
  for (const check of health.checks) {
    lines.push(
      `cerniq_health_check_response_time_seconds{check="${check.name}"} ${check.responseTimeMs / 1000}`
    );
  }
  
  lines.push('');
  lines.push('# HELP cerniq_uptime_seconds Service uptime in seconds');
  lines.push('# TYPE cerniq_uptime_seconds gauge');
  lines.push(`cerniq_uptime_seconds{service="etapa3"} ${health.uptime / 1000}`);
  
  return lines.join('\n');
}
```

### 11.3 Kubernetes Probes Configuration

```yaml
# kubernetes/etapa3-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: cerniq-etapa3-api
  namespace: cerniq
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cerniq-etapa3-api
  template:
    metadata:
      labels:
        app: cerniq-etapa3-api
    spec:
      containers:
        - name: api
          image: cerniq/etapa3-api:latest
          ports:
            - containerPort: 3000
          
          # Liveness probe - restart if process is unresponsive
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3
          
          # Readiness probe - remove from load balancer if unhealthy
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 2
          
          # Startup probe - allow longer startup time
          startupProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 0
            periodSeconds: 5
            timeoutSeconds: 5
            failureThreshold: 30  # 150 seconds to start
          
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          
          env:
            - name: NODE_ENV
              value: "production"
            - name: APP_VERSION
              valueFrom:
                fieldRef:
                  fieldPath: metadata.labels['version']

---
# Worker deployment with different probe configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cerniq-etapa3-workers
  namespace: cerniq
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cerniq-etapa3-workers
  template:
    metadata:
      labels:
        app: cerniq-etapa3-workers
    spec:
      containers:
        - name: workers
          image: cerniq/etapa3-workers:latest
          
          # Workers don't serve HTTP, use exec probe
          livenessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - "node /app/scripts/health-check.js"
            initialDelaySeconds: 30
            periodSeconds: 30
            timeoutSeconds: 10
            failureThreshold: 3
          
          readinessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - "node /app/scripts/worker-ready.js"
            initialDelaySeconds: 10
            periodSeconds: 15
            timeoutSeconds: 10
            failureThreshold: 2
          
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
```

### 11.4 Worker Health Check Scripts

```typescript
// scripts/health-check.ts
// Used for worker liveness probe

import { Redis } from 'ioredis';
import { Pool } from 'pg';

async function healthCheck(): Promise<void> {
  const errors: string[] = [];
  
  // Check Redis
  try {
    const redis = new Redis(process.env.REDIS_URL!);
    await redis.ping();
    await redis.quit();
  } catch (error) {
    errors.push(`Redis: ${error}`);
  }
  
  // Check PostgreSQL
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query('SELECT 1');
    await pool.end();
  } catch (error) {
    errors.push(`PostgreSQL: ${error}`);
  }
  
  // Check worker heartbeat file
  const fs = await import('fs/promises');
  try {
    const heartbeat = await fs.readFile('/tmp/worker-heartbeat', 'utf-8');
    const lastBeat = parseInt(heartbeat, 10);
    const age = Date.now() - lastBeat;
    
    if (age > 60000) { // 1 minute
      errors.push(`Worker heartbeat stale: ${age}ms ago`);
    }
  } catch (error) {
    errors.push(`Heartbeat file: ${error}`);
  }
  
  if (errors.length > 0) {
    console.error('Health check failed:', errors);
    process.exit(1);
  }
  
  console.log('Health check passed');
  process.exit(0);
}

healthCheck().catch(error => {
  console.error('Health check error:', error);
  process.exit(1);
});
```

```typescript
// scripts/worker-ready.ts
// Used for worker readiness probe

import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

async function readinessCheck(): Promise<void> {
  const errors: string[] = [];
  
  const redis = new Redis(process.env.REDIS_URL!);
  
  // Check if worker is registered
  try {
    const workerKey = `bull:etapa3:worker:${process.env.HOSTNAME}`;
    const workerData = await redis.get(workerKey);
    
    if (!workerData) {
      errors.push('Worker not registered in Redis');
    }
  } catch (error) {
    errors.push(`Worker registration check: ${error}`);
  }
  
  // Check queue connectivity
  const queueNames = [
    'etapa3:ai-agent',
    'etapa3:negotiation-fsm',
    'etapa3:efactura'
  ];
  
  for (const queueName of queueNames) {
    try {
      const queue = new Queue(queueName, { connection: redis });
      await queue.getJobCounts();
      await queue.close();
    } catch (error) {
      errors.push(`Queue ${queueName}: ${error}`);
    }
  }
  
  await redis.quit();
  
  if (errors.length > 0) {
    console.error('Readiness check failed:', errors);
    process.exit(1);
  }
  
  console.log('Readiness check passed');
  process.exit(0);
}

readinessCheck().catch(error => {
  console.error('Readiness check error:', error);
  process.exit(1);
});
```


---

## 12. SLA Monitoring și Compliance Tracking

### 12.1 SLA Definitions

```typescript
// src/monitoring/sla/sla-definitions.ts

export interface SLADefinition {
  id: string;
  name: string;
  description: string;
  metric: string;
  target: number;
  unit: 'percentage' | 'seconds' | 'milliseconds' | 'count';
  window: 'hourly' | 'daily' | 'weekly' | 'monthly';
  priority: 'critical' | 'high' | 'medium' | 'low';
  calculation: 'availability' | 'latency_p95' | 'latency_p99' | 'error_rate' | 'throughput';
  thresholds: {
    breach: number;
    warning: number;
  };
}

export const ETAPA3_SLAS: SLADefinition[] = [
  // ============================================================================
  // SYSTEM AVAILABILITY SLAs
  // ============================================================================
  {
    id: 'sla-001',
    name: 'AI Agent Availability',
    description: 'AI Agent service must be available for processing conversations',
    metric: 'cerniq_etapa3_ai_agent_availability',
    target: 99.9,
    unit: 'percentage',
    window: 'monthly',
    priority: 'critical',
    calculation: 'availability',
    thresholds: {
      breach: 99.5,
      warning: 99.8
    }
  },
  {
    id: 'sla-002',
    name: 'API Availability',
    description: 'REST API must be available for client requests',
    metric: 'cerniq_etapa3_api_availability',
    target: 99.95,
    unit: 'percentage',
    window: 'monthly',
    priority: 'critical',
    calculation: 'availability',
    thresholds: {
      breach: 99.5,
      warning: 99.9
    }
  },
  {
    id: 'sla-003',
    name: 'e-Factura Service Availability',
    description: 'e-Factura submission service must be operational',
    metric: 'cerniq_etapa3_efactura_availability',
    target: 99.5,
    unit: 'percentage',
    window: 'monthly',
    priority: 'critical',
    calculation: 'availability',
    thresholds: {
      breach: 98.0,
      warning: 99.0
    }
  },

  // ============================================================================
  // LATENCY SLAs
  // ============================================================================
  {
    id: 'sla-010',
    name: 'LLM Response Latency (P95)',
    description: '95th percentile latency for LLM responses',
    metric: 'cerniq_etapa3_llm_latency_seconds',
    target: 5.0,
    unit: 'seconds',
    window: 'daily',
    priority: 'high',
    calculation: 'latency_p95',
    thresholds: {
      breach: 10.0,
      warning: 7.0
    }
  },
  {
    id: 'sla-011',
    name: 'API Response Latency (P95)',
    description: '95th percentile latency for API requests',
    metric: 'cerniq_etapa3_api_latency_seconds',
    target: 0.5,
    unit: 'seconds',
    window: 'daily',
    priority: 'high',
    calculation: 'latency_p95',
    thresholds: {
      breach: 2.0,
      warning: 1.0
    }
  },
  {
    id: 'sla-012',
    name: 'e-Factura Submission Latency (P95)',
    description: '95th percentile time for e-Factura submission to ANAF',
    metric: 'cerniq_etapa3_efactura_submission_latency_seconds',
    target: 30.0,
    unit: 'seconds',
    window: 'daily',
    priority: 'high',
    calculation: 'latency_p95',
    thresholds: {
      breach: 120.0,
      warning: 60.0
    }
  },

  // ============================================================================
  // HITL SLAs
  // ============================================================================
  {
    id: 'sla-020',
    name: 'Critical HITL Approval Time',
    description: 'Maximum time for critical HITL approvals',
    metric: 'cerniq_etapa3_hitl_approval_time_seconds',
    target: 3600, // 1 hour
    unit: 'seconds',
    window: 'daily',
    priority: 'critical',
    calculation: 'latency_p95',
    thresholds: {
      breach: 7200,  // 2 hours
      warning: 5400  // 1.5 hours
    }
  },
  {
    id: 'sla-021',
    name: 'High Priority HITL Approval Time',
    description: 'Maximum time for high priority HITL approvals',
    metric: 'cerniq_etapa3_hitl_approval_time_seconds',
    target: 14400, // 4 hours
    unit: 'seconds',
    window: 'daily',
    priority: 'high',
    calculation: 'latency_p95',
    thresholds: {
      breach: 28800,  // 8 hours
      warning: 21600  // 6 hours
    }
  },
  {
    id: 'sla-022',
    name: 'HITL Escalation Rate',
    description: 'Percentage of HITL requests that escalate',
    metric: 'cerniq_etapa3_hitl_escalation_rate',
    target: 5.0,
    unit: 'percentage',
    window: 'weekly',
    priority: 'medium',
    calculation: 'percentage',
    thresholds: {
      breach: 15.0,
      warning: 10.0
    }
  },

  // ============================================================================
  // ERROR RATE SLAs
  // ============================================================================
  {
    id: 'sla-030',
    name: 'LLM Error Rate',
    description: 'Percentage of LLM requests that fail',
    metric: 'cerniq_etapa3_llm_error_rate',
    target: 1.0,
    unit: 'percentage',
    window: 'daily',
    priority: 'high',
    calculation: 'error_rate',
    thresholds: {
      breach: 5.0,
      warning: 2.0
    }
  },
  {
    id: 'sla-031',
    name: 'e-Factura Submission Success Rate',
    description: 'Percentage of e-Factura submissions that succeed',
    metric: 'cerniq_etapa3_efactura_success_rate',
    target: 95.0,
    unit: 'percentage',
    window: 'daily',
    priority: 'critical',
    calculation: 'percentage',
    thresholds: {
      breach: 85.0,
      warning: 90.0
    }
  },
  {
    id: 'sla-032',
    name: 'Worker Job Failure Rate',
    description: 'Percentage of worker jobs that fail after all retries',
    metric: 'cerniq_etapa3_worker_failure_rate',
    target: 2.0,
    unit: 'percentage',
    window: 'daily',
    priority: 'high',
    calculation: 'error_rate',
    thresholds: {
      breach: 10.0,
      warning: 5.0
    }
  },

  // ============================================================================
  // THROUGHPUT SLAs
  // ============================================================================
  {
    id: 'sla-040',
    name: 'Conversation Processing Throughput',
    description: 'Minimum conversations processed per hour',
    metric: 'cerniq_etapa3_conversations_per_hour',
    target: 100,
    unit: 'count',
    window: 'hourly',
    priority: 'high',
    calculation: 'throughput',
    thresholds: {
      breach: 50,
      warning: 75
    }
  },
  {
    id: 'sla-041',
    name: 'e-Factura Daily Processing',
    description: 'Minimum e-Factura documents processed per day',
    metric: 'cerniq_etapa3_efactura_daily_count',
    target: 500,
    unit: 'count',
    window: 'daily',
    priority: 'medium',
    calculation: 'throughput',
    thresholds: {
      breach: 200,
      warning: 350
    }
  }
];
```

### 12.2 SLA Monitoring Service

```typescript
// src/monitoring/sla/sla-monitoring-service.ts

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { SLADefinition, ETAPA3_SLAS } from './sla-definitions';
import { PrometheusClient } from '../prometheus/prometheus-client';
import { EventEmitter } from 'events';

export interface SLAStatus {
  slaId: string;
  name: string;
  currentValue: number;
  target: number;
  status: 'met' | 'warning' | 'breached';
  windowStart: Date;
  windowEnd: Date;
  lastUpdated: Date;
  trend: 'improving' | 'stable' | 'degrading';
  details?: Record<string, unknown>;
}

export interface SLAReport {
  generatedAt: Date;
  reportPeriod: {
    start: Date;
    end: Date;
  };
  overallCompliance: number;
  slaStatuses: SLAStatus[];
  breaches: SLABreach[];
  summary: {
    met: number;
    warning: number;
    breached: number;
  };
}

export interface SLABreach {
  slaId: string;
  slaName: string;
  breachTime: Date;
  value: number;
  target: number;
  duration: number;
  resolved: boolean;
  resolvedAt?: Date;
}

export class SLAMonitoringService extends EventEmitter {
  private slas: Map<string, SLADefinition> = new Map();
  private currentStatuses: Map<string, SLAStatus> = new Map();
  private monitoringInterval?: NodeJS.Timeout;

  constructor(
    private db: Pool,
    private redis: Redis,
    private prometheus: PrometheusClient
  ) {
    super();
    
    // Load SLA definitions
    for (const sla of ETAPA3_SLAS) {
      this.slas.set(sla.id, sla);
    }
  }

  async start(intervalMs: number = 60000): Promise<void> {
    // Initial check
    await this.checkAllSLAs();
    
    // Periodic monitoring
    this.monitoringInterval = setInterval(
      () => this.checkAllSLAs().catch(console.error),
      intervalMs
    );
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  async checkAllSLAs(): Promise<void> {
    for (const [slaId, sla] of this.slas) {
      try {
        const status = await this.checkSLA(sla);
        const previousStatus = this.currentStatuses.get(slaId);
        
        this.currentStatuses.set(slaId, status);
        
        // Emit events for status changes
        if (previousStatus) {
          if (status.status === 'breached' && previousStatus.status !== 'breached') {
            this.emit('breach', sla, status);
            await this.recordBreach(sla, status);
          } else if (status.status === 'warning' && previousStatus.status === 'met') {
            this.emit('warning', sla, status);
          } else if (status.status === 'met' && previousStatus.status === 'breached') {
            this.emit('recovered', sla, status);
            await this.resolveBreaches(sla);
          }
        }
        
        // Update metrics
        await this.updateMetrics(sla, status);
      } catch (error) {
        console.error(`Failed to check SLA ${slaId}:`, error);
      }
    }
  }

  private async checkSLA(sla: SLADefinition): Promise<SLAStatus> {
    const now = new Date();
    const windowStart = this.getWindowStart(now, sla.window);
    
    let currentValue: number;
    
    switch (sla.calculation) {
      case 'availability':
        currentValue = await this.calculateAvailability(sla, windowStart, now);
        break;
      case 'latency_p95':
        currentValue = await this.calculateLatencyPercentile(sla, windowStart, now, 95);
        break;
      case 'latency_p99':
        currentValue = await this.calculateLatencyPercentile(sla, windowStart, now, 99);
        break;
      case 'error_rate':
        currentValue = await this.calculateErrorRate(sla, windowStart, now);
        break;
      case 'throughput':
        currentValue = await this.calculateThroughput(sla, windowStart, now);
        break;
      default:
        currentValue = await this.calculateGenericMetric(sla, windowStart, now);
    }
    
    // Determine status
    let status: 'met' | 'warning' | 'breached';
    
    if (sla.unit === 'percentage' || sla.calculation === 'availability') {
      // Higher is better for percentage/availability
      if (currentValue < sla.thresholds.breach) {
        status = 'breached';
      } else if (currentValue < sla.thresholds.warning) {
        status = 'warning';
      } else {
        status = 'met';
      }
    } else if (sla.calculation === 'error_rate') {
      // Lower is better for error rate
      if (currentValue > sla.thresholds.breach) {
        status = 'breached';
      } else if (currentValue > sla.thresholds.warning) {
        status = 'warning';
      } else {
        status = 'met';
      }
    } else if (sla.calculation.startsWith('latency')) {
      // Lower is better for latency
      if (currentValue > sla.thresholds.breach) {
        status = 'breached';
      } else if (currentValue > sla.thresholds.warning) {
        status = 'warning';
      } else {
        status = 'met';
      }
    } else {
      // Higher is better for throughput
      if (currentValue < sla.thresholds.breach) {
        status = 'breached';
      } else if (currentValue < sla.thresholds.warning) {
        status = 'warning';
      } else {
        status = 'met';
      }
    }
    
    // Calculate trend
    const previousValue = await this.getPreviousValue(sla.id, windowStart);
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    
    if (previousValue !== null) {
      const change = ((currentValue - previousValue) / previousValue) * 100;
      
      if (sla.unit === 'percentage' || sla.calculation === 'throughput') {
        trend = change > 1 ? 'improving' : change < -1 ? 'degrading' : 'stable';
      } else {
        trend = change < -1 ? 'improving' : change > 1 ? 'degrading' : 'stable';
      }
    }

    return {
      slaId: sla.id,
      name: sla.name,
      currentValue,
      target: sla.target,
      status,
      windowStart,
      windowEnd: now,
      lastUpdated: now,
      trend
    };
  }

  private async calculateAvailability(
    sla: SLADefinition,
    start: Date,
    end: Date
  ): Promise<number> {
    const query = `
      SELECT
        (1 - (SUM(CASE WHEN status = 'down' THEN duration_seconds ELSE 0 END) / 
              EXTRACT(EPOCH FROM ($2::timestamp - $1::timestamp)))) * 100 as availability
      FROM monitoring.availability_events
      WHERE service_name = $3
        AND event_time >= $1
        AND event_time < $2
    `;
    
    const result = await this.db.query(query, [start, end, sla.metric]);
    return parseFloat(result.rows[0]?.availability || '100');
  }

  private async calculateLatencyPercentile(
    sla: SLADefinition,
    start: Date,
    end: Date,
    percentile: number
  ): Promise<number> {
    const promQuery = `histogram_quantile(${percentile / 100}, 
      sum by (le) (
        rate(${sla.metric}_bucket[${this.getWindowDuration(sla.window)}])
      )
    )`;
    
    const result = await this.prometheus.query(promQuery);
    return parseFloat(result.data?.result?.[0]?.value?.[1] || '0');
  }

  private async calculateErrorRate(
    sla: SLADefinition,
    start: Date,
    end: Date
  ): Promise<number> {
    const promQuery = `
      sum(rate(${sla.metric.replace('_rate', '_total')}{status=~"error|failed"}[${this.getWindowDuration(sla.window)}])) 
      / 
      sum(rate(${sla.metric.replace('_rate', '_total')}[${this.getWindowDuration(sla.window)}])) 
      * 100
    `;
    
    const result = await this.prometheus.query(promQuery);
    return parseFloat(result.data?.result?.[0]?.value?.[1] || '0');
  }

  private async calculateThroughput(
    sla: SLADefinition,
    start: Date,
    end: Date
  ): Promise<number> {
    const promQuery = `sum(increase(${sla.metric}[${this.getWindowDuration(sla.window)}]))`;
    
    const result = await this.prometheus.query(promQuery);
    return parseFloat(result.data?.result?.[0]?.value?.[1] || '0');
  }

  private async calculateGenericMetric(
    sla: SLADefinition,
    start: Date,
    end: Date
  ): Promise<number> {
    const promQuery = `avg(${sla.metric}[${this.getWindowDuration(sla.window)}])`;
    
    const result = await this.prometheus.query(promQuery);
    return parseFloat(result.data?.result?.[0]?.value?.[1] || '0');
  }

  private getWindowStart(now: Date, window: SLADefinition['window']): Date {
    const start = new Date(now);
    
    switch (window) {
      case 'hourly':
        start.setMinutes(0, 0, 0);
        break;
      case 'daily':
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
    }
    
    return start;
  }

  private getWindowDuration(window: SLADefinition['window']): string {
    switch (window) {
      case 'hourly': return '1h';
      case 'daily': return '24h';
      case 'weekly': return '7d';
      case 'monthly': return '30d';
    }
  }

  private async getPreviousValue(slaId: string, windowStart: Date): Promise<number | null> {
    const key = `sla:history:${slaId}`;
    const previousRecord = await this.redis.get(key);
    
    if (previousRecord) {
      const parsed = JSON.parse(previousRecord);
      return parsed.value;
    }
    
    return null;
  }

  private async recordBreach(sla: SLADefinition, status: SLAStatus): Promise<void> {
    await this.db.query(`
      INSERT INTO monitoring.sla_breaches (
        sla_id, sla_name, breach_time, value, target, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
    `, [sla.id, sla.name, new Date(), status.currentValue, sla.target, sla.priority]);
  }

  private async resolveBreaches(sla: SLADefinition): Promise<void> {
    await this.db.query(`
      UPDATE monitoring.sla_breaches 
      SET status = 'resolved', resolved_at = NOW()
      WHERE sla_id = $1 AND status = 'active'
    `, [sla.id]);
  }

  private async updateMetrics(sla: SLADefinition, status: SLAStatus): Promise<void> {
    // Store in Redis for quick access
    await this.redis.set(
      `sla:status:${sla.id}`,
      JSON.stringify(status),
      'EX',
      3600
    );
    
    // Store historical value
    await this.redis.set(
      `sla:history:${sla.id}`,
      JSON.stringify({ value: status.currentValue, timestamp: status.lastUpdated }),
      'EX',
      86400 * 7 // 7 days
    );
  }

  // ============================================================================
  // REPORTING
  // ============================================================================

  async generateReport(start: Date, end: Date): Promise<SLAReport> {
    const statuses = Array.from(this.currentStatuses.values());
    
    // Get breaches in period
    const breachesResult = await this.db.query(`
      SELECT 
        sla_id, sla_name, breach_time, value, target,
        EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - breach_time)) as duration,
        status = 'resolved' as resolved,
        resolved_at
      FROM monitoring.sla_breaches
      WHERE breach_time >= $1 AND breach_time < $2
      ORDER BY breach_time DESC
    `, [start, end]);
    
    const breaches: SLABreach[] = breachesResult.rows.map(row => ({
      slaId: row.sla_id,
      slaName: row.sla_name,
      breachTime: row.breach_time,
      value: row.value,
      target: row.target,
      duration: row.duration,
      resolved: row.resolved,
      resolvedAt: row.resolved_at
    }));
    
    // Calculate summary
    const summary = {
      met: statuses.filter(s => s.status === 'met').length,
      warning: statuses.filter(s => s.status === 'warning').length,
      breached: statuses.filter(s => s.status === 'breached').length
    };
    
    const overallCompliance = (summary.met / statuses.length) * 100;

    return {
      generatedAt: new Date(),
      reportPeriod: { start, end },
      overallCompliance,
      slaStatuses: statuses,
      breaches,
      summary
    };
  }

  getCurrentStatuses(): SLAStatus[] {
    return Array.from(this.currentStatuses.values());
  }

  getSLAStatus(slaId: string): SLAStatus | undefined {
    return this.currentStatuses.get(slaId);
  }
}
```

### 12.3 SLA Dashboard Configuration

```typescript
// src/monitoring/sla/sla-dashboard.ts

export const SLA_DASHBOARD_CONFIG = {
  title: 'Cerniq Etapa 3 - SLA Dashboard',
  uid: 'cerniq-etapa3-sla',
  refresh: '1m',
  
  panels: [
    // Overall Compliance
    {
      title: 'Overall SLA Compliance',
      type: 'gauge',
      gridPos: { x: 0, y: 0, w: 6, h: 6 },
      targets: [{
        expr: '(sum(cerniq_sla_status{status="met"}) / count(cerniq_sla_status)) * 100',
        legendFormat: 'Compliance %'
      }],
      fieldConfig: {
        defaults: {
          min: 0,
          max: 100,
          thresholds: {
            mode: 'absolute',
            steps: [
              { color: 'red', value: null },
              { color: 'orange', value: 80 },
              { color: 'yellow', value: 95 },
              { color: 'green', value: 99 }
            ]
          }
        }
      }
    },
    
    // SLA Status Matrix
    {
      title: 'SLA Status Overview',
      type: 'table',
      gridPos: { x: 6, y: 0, w: 18, h: 6 },
      targets: [{
        expr: 'cerniq_sla_status',
        format: 'table',
        instant: true
      }],
      transformations: [
        {
          id: 'organize',
          options: {
            excludeByName: { Time: true, __name__: true },
            renameByName: {
              sla_name: 'SLA',
              current_value: 'Current',
              target: 'Target',
              status: 'Status'
            }
          }
        }
      ]
    },
    
    // Availability SLAs
    {
      title: 'Service Availability',
      type: 'timeseries',
      gridPos: { x: 0, y: 6, w: 12, h: 8 },
      targets: [
        {
          expr: 'cerniq_sla_value{sla_type="availability"}',
          legendFormat: '{{sla_name}}'
        },
        {
          expr: '99.9',
          legendFormat: 'Target (99.9%)'
        }
      ],
      fieldConfig: {
        defaults: {
          unit: 'percent',
          min: 95,
          max: 100
        }
      }
    },
    
    // Latency SLAs
    {
      title: 'Latency P95',
      type: 'timeseries',
      gridPos: { x: 12, y: 6, w: 12, h: 8 },
      targets: [
        {
          expr: 'cerniq_sla_value{sla_type="latency_p95"}',
          legendFormat: '{{sla_name}}'
        }
      ],
      fieldConfig: {
        defaults: {
          unit: 's',
          thresholds: {
            mode: 'absolute',
            steps: [
              { color: 'green', value: null },
              { color: 'yellow', value: 3 },
              { color: 'red', value: 5 }
            ]
          }
        }
      }
    },
    
    // HITL SLAs
    {
      title: 'HITL Approval Times',
      type: 'timeseries',
      gridPos: { x: 0, y: 14, w: 12, h: 8 },
      targets: [
        {
          expr: 'histogram_quantile(0.95, sum by (priority, le) (rate(cerniq_etapa3_hitl_approval_time_seconds_bucket[1h])))',
          legendFormat: '{{priority}} P95'
        },
        {
          expr: 'cerniq_sla_target{sla_id=~"sla-020|sla-021"}',
          legendFormat: '{{sla_name}} Target'
        }
      ],
      fieldConfig: {
        defaults: { unit: 's' }
      }
    },
    
    // Error Rate SLAs
    {
      title: 'Error Rates vs Targets',
      type: 'bargauge',
      gridPos: { x: 12, y: 14, w: 12, h: 8 },
      targets: [{
        expr: 'cerniq_sla_value{sla_type="error_rate"}',
        legendFormat: '{{sla_name}}'
      }],
      fieldConfig: {
        defaults: {
          unit: 'percent',
          max: 10,
          thresholds: {
            mode: 'absolute',
            steps: [
              { color: 'green', value: null },
              { color: 'yellow', value: 2 },
              { color: 'red', value: 5 }
            ]
          }
        }
      }
    },
    
    // SLA Breach History
    {
      title: 'SLA Breach History',
      type: 'table',
      gridPos: { x: 0, y: 22, w: 24, h: 6 },
      targets: [{
        expr: 'cerniq_sla_breach_info',
        format: 'table',
        instant: true
      }],
      transformations: [
        {
          id: 'organize',
          options: {
            excludeByName: { Time: true, __name__: true },
            renameByName: {
              sla_name: 'SLA',
              breach_time: 'Breach Time',
              duration: 'Duration',
              resolved: 'Resolved'
            }
          }
        }
      ]
    }
  ]
};
```

### 12.4 SLA Alerting Rules

```yaml
# prometheus/rules/sla-alerts.yaml

groups:
  - name: sla_alerts
    interval: 1m
    rules:
      # ========================================================================
      # CRITICAL SLA BREACHES
      # ========================================================================
      
      - alert: CriticalSLABreach
        expr: |
          cerniq_sla_status{priority="critical", status="breached"} == 1
        for: 0m
        labels:
          severity: critical
          team: platform
          category: sla
        annotations:
          summary: "Critical SLA breach: {{ $labels.sla_name }}"
          description: |
            Critical SLA {{ $labels.sla_name }} has been breached.
            Current value: {{ $labels.current_value }}
            Target: {{ $labels.target }}
            
            Immediate action required.
          runbook_url: "https://docs.cerniq.app/runbooks/sla-breach"

      - alert: HighPrioritySLABreach
        expr: |
          cerniq_sla_status{priority="high", status="breached"} == 1
        for: 5m
        labels:
          severity: warning
          team: platform
          category: sla
        annotations:
          summary: "High priority SLA breach: {{ $labels.sla_name }}"
          description: |
            High priority SLA {{ $labels.sla_name }} has been breached.
            Current value: {{ $labels.current_value }}
            Target: {{ $labels.target }}

      # ========================================================================
      # SLA WARNING THRESHOLDS
      # ========================================================================
      
      - alert: SLANearingBreach
        expr: |
          cerniq_sla_status{status="warning"} == 1
        for: 15m
        labels:
          severity: warning
          team: platform
          category: sla
        annotations:
          summary: "SLA nearing breach threshold: {{ $labels.sla_name }}"
          description: |
            SLA {{ $labels.sla_name }} is approaching breach threshold.
            Current value: {{ $labels.current_value }}
            Warning threshold: {{ $labels.warning_threshold }}
            Breach threshold: {{ $labels.breach_threshold }}
            
            Proactive investigation recommended.

      # ========================================================================
      # SPECIFIC SLA ALERTS
      # ========================================================================
      
      - alert: AIAgentAvailabilityLow
        expr: |
          avg_over_time(cerniq_etapa3_ai_agent_up[5m]) < 0.99
        for: 5m
        labels:
          severity: critical
          sla_id: sla-001
          team: ai
        annotations:
          summary: "AI Agent availability below SLA target"
          description: |
            AI Agent availability is {{ $value | humanizePercentage }}.
            Target: 99.9%
            
            Check AI Agent pods and LLM provider status.

      - alert: EFacturaSuccessRateLow
        expr: |
          (
            sum(rate(cerniq_etapa3_efactura_submissions_total{status="success"}[1h]))
            /
            sum(rate(cerniq_etapa3_efactura_submissions_total[1h]))
          ) < 0.95
        for: 30m
        labels:
          severity: critical
          sla_id: sla-031
          team: fiscal
        annotations:
          summary: "e-Factura success rate below SLA target"
          description: |
            e-Factura success rate is {{ $value | humanizePercentage }}.
            Target: 95%
            
            Check ANAF API status and validation errors.

      - alert: HITLCriticalApprovalDelayed
        expr: |
          histogram_quantile(0.95,
            sum by (le) (
              rate(cerniq_etapa3_hitl_approval_time_seconds_bucket{priority="critical"}[1h])
            )
          ) > 3600
        for: 5m
        labels:
          severity: critical
          sla_id: sla-020
          team: operations
        annotations:
          summary: "Critical HITL approvals exceeding SLA"
          description: |
            Critical HITL approval P95 is {{ $value | humanizeDuration }}.
            Target: 1 hour
            
            Check HITL queue and escalation status.

      - alert: LLMLatencyHigh
        expr: |
          histogram_quantile(0.95,
            sum by (le) (
              rate(cerniq_etapa3_llm_latency_seconds_bucket[5m])
            )
          ) > 5
        for: 10m
        labels:
          severity: warning
          sla_id: sla-010
          team: ai
        annotations:
          summary: "LLM latency exceeding SLA target"
          description: |
            LLM P95 latency is {{ $value | humanizeDuration }}.
            Target: 5 seconds
            
            Check LLM provider status and request complexity.

      # ========================================================================
      # TREND ALERTS
      # ========================================================================
      
      - alert: SLADegradingTrend
        expr: |
          cerniq_sla_trend{trend="degrading"} == 1 and cerniq_sla_status{status="met"} == 1
        for: 1h
        labels:
          severity: info
          team: platform
          category: sla
        annotations:
          summary: "SLA showing degrading trend: {{ $labels.sla_name }}"
          description: |
            SLA {{ $labels.sla_name }} is currently met but showing a degrading trend.
            Current value: {{ $labels.current_value }}
            
            Monitor closely to prevent future breaches.

      - alert: MultipleSLAWarnings
        expr: |
          count(cerniq_sla_status{status="warning"}) > 3
        for: 30m
        labels:
          severity: warning
          team: platform
          category: sla
        annotations:
          summary: "Multiple SLAs in warning state"
          description: |
            {{ $value }} SLAs are currently in warning state.
            
            System may be experiencing widespread degradation.
```


---

## 13. Cost Monitoring și Optimization

### 13.1 LLM Cost Tracking

```typescript
// src/monitoring/cost-tracking.ts

import { register, Gauge, Counter, Histogram } from 'prom-client';
import { db } from '../db';
import { llmUsageLogs, tenants } from '../db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';

/**
 * Cost Tracking pentru LLM și servicii externe
 * 
 * Monitorizează costurile în timp real și generează alerte
 * când se depășesc pragurile definite
 */

// ============================================================================
// COST MODELS
// ============================================================================

interface LLMPricingModel {
  provider: string;
  model: string;
  inputPricePerMillion: number;  // USD per 1M tokens
  outputPricePerMillion: number;
  cachePricePerMillion?: number;
}

const LLM_PRICING: LLMPricingModel[] = [
  // Anthropic Claude
  { provider: 'anthropic', model: 'claude-sonnet-4-20250514', inputPricePerMillion: 3.0, outputPricePerMillion: 15.0, cachePricePerMillion: 0.30 },
  { provider: 'anthropic', model: 'claude-haiku-4-20250514', inputPricePerMillion: 0.25, outputPricePerMillion: 1.25, cachePricePerMillion: 0.025 },
  
  // OpenAI
  { provider: 'openai', model: 'gpt-4o', inputPricePerMillion: 2.50, outputPricePerMillion: 10.0 },
  { provider: 'openai', model: 'gpt-4o-mini', inputPricePerMillion: 0.15, outputPricePerMillion: 0.60 },
  
  // Google
  { provider: 'google', model: 'gemini-2.0-flash', inputPricePerMillion: 0.10, outputPricePerMillion: 0.40 },
  { provider: 'google', model: 'gemini-2.5-pro', inputPricePerMillion: 1.25, outputPricePerMillion: 10.0 },
];

// ============================================================================
// COST METRICS
// ============================================================================

const llmCostTotal = new Counter({
  name: 'cerniq_etapa3_llm_cost_usd_total',
  help: 'Total LLM cost in USD',
  labelNames: ['tenant_id', 'provider', 'model', 'operation', 'worker'],
});

const llmCostCurrentHour = new Gauge({
  name: 'cerniq_etapa3_llm_cost_current_hour_usd',
  help: 'LLM cost in current hour in USD',
  labelNames: ['tenant_id', 'provider'],
});

const llmCostCurrentDay = new Gauge({
  name: 'cerniq_etapa3_llm_cost_current_day_usd',
  help: 'LLM cost in current day in USD',
  labelNames: ['tenant_id', 'provider'],
});

const llmCostProjectedDay = new Gauge({
  name: 'cerniq_etapa3_llm_cost_projected_day_usd',
  help: 'Projected daily LLM cost based on current hour trend',
  labelNames: ['tenant_id'],
});

const llmBudgetUtilization = new Gauge({
  name: 'cerniq_etapa3_llm_budget_utilization_ratio',
  help: 'Current budget utilization (0-1)',
  labelNames: ['tenant_id', 'budget_type'],
});

const llmBudgetRemaining = new Gauge({
  name: 'cerniq_etapa3_llm_budget_remaining_usd',
  help: 'Remaining budget in USD',
  labelNames: ['tenant_id', 'budget_type'],
});

const externalApiCostTotal = new Counter({
  name: 'cerniq_etapa3_external_api_cost_usd_total',
  help: 'Total external API cost in USD',
  labelNames: ['tenant_id', 'service', 'operation'],
});

const tokenUsageHistogram = new Histogram({
  name: 'cerniq_etapa3_llm_tokens_per_request',
  help: 'Token usage distribution per request',
  labelNames: ['provider', 'model', 'operation'],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
});

// ============================================================================
// COST TRACKER CLASS
// ============================================================================

interface CostRecord {
  tenantId: string;
  provider: string;
  model: string;
  operation: string;
  worker: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  cost: number;
  timestamp: Date;
}

interface BudgetConfig {
  dailyBudget: number;
  monthlyBudget: number;
  perConversationLimit: number;
  alertThresholds: {
    warning: number;   // e.g., 0.7 = 70%
    critical: number;  // e.g., 0.9 = 90%
  };
}

export class CostTracker {
  private pricingMap: Map<string, LLMPricingModel>;
  private budgetConfigs: Map<string, BudgetConfig>;
  
  constructor() {
    this.pricingMap = new Map();
    LLM_PRICING.forEach(p => {
      this.pricingMap.set(`${p.provider}:${p.model}`, p);
    });
    this.budgetConfigs = new Map();
  }
  
  /**
   * Calculează costul pentru o cerere LLM
   */
  calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    cachedTokens: number = 0
  ): number {
    const pricing = this.pricingMap.get(`${provider}:${model}`);
    
    if (!pricing) {
      console.warn(`Unknown pricing for ${provider}:${model}, using estimate`);
      // Estimare conservatoare pentru modele necunoscute
      return (inputTokens * 5 + outputTokens * 15) / 1_000_000;
    }
    
    const inputCost = (inputTokens - cachedTokens) * pricing.inputPricePerMillion / 1_000_000;
    const outputCost = outputTokens * pricing.outputPricePerMillion / 1_000_000;
    const cacheCost = cachedTokens * (pricing.cachePricePerMillion || 0) / 1_000_000;
    
    return inputCost + outputCost + cacheCost;
  }
  
  /**
   * Înregistrează utilizarea și costul
   */
  async recordUsage(record: Omit<CostRecord, 'cost' | 'timestamp'>): Promise<CostRecord> {
    const cost = this.calculateCost(
      record.provider,
      record.model,
      record.inputTokens,
      record.outputTokens,
      record.cachedTokens
    );
    
    const fullRecord: CostRecord = {
      ...record,
      cost,
      timestamp: new Date(),
    };
    
    // Update metrics
    llmCostTotal.inc(
      {
        tenant_id: record.tenantId,
        provider: record.provider,
        model: record.model,
        operation: record.operation,
        worker: record.worker,
      },
      cost
    );
    
    tokenUsageHistogram.observe(
      {
        provider: record.provider,
        model: record.model,
        operation: record.operation,
      },
      record.inputTokens + record.outputTokens
    );
    
    // Persist to database
    await this.persistUsageLog(fullRecord);
    
    // Check budget alerts
    await this.checkBudgetAlerts(record.tenantId);
    
    return fullRecord;
  }
  
  /**
   * Persist usage to database for historical analysis
   */
  private async persistUsageLog(record: CostRecord): Promise<void> {
    await db.insert(llmUsageLogs).values({
      tenantId: record.tenantId,
      provider: record.provider,
      model: record.model,
      operation: record.operation,
      worker: record.worker,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      cachedTokens: record.cachedTokens || 0,
      costUsd: record.cost.toString(),
      createdAt: record.timestamp,
    });
  }
  
  /**
   * Get cost summary for a tenant
   */
  async getCostSummary(tenantId: string, period: 'hour' | 'day' | 'month'): Promise<{
    totalCost: number;
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
    byOperation: Record<string, number>;
    tokenUsage: {
      input: number;
      output: number;
      cached: number;
    };
  }> {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    
    const result = await db.select({
      provider: llmUsageLogs.provider,
      model: llmUsageLogs.model,
      operation: llmUsageLogs.operation,
      totalCost: sql<string>`SUM(cost_usd)`,
      totalInputTokens: sql<string>`SUM(input_tokens)`,
      totalOutputTokens: sql<string>`SUM(output_tokens)`,
      totalCachedTokens: sql<string>`SUM(cached_tokens)`,
    })
    .from(llmUsageLogs)
    .where(
      and(
        eq(llmUsageLogs.tenantId, tenantId),
        gte(llmUsageLogs.createdAt, startDate)
      )
    )
    .groupBy(
      llmUsageLogs.provider,
      llmUsageLogs.model,
      llmUsageLogs.operation
    );
    
    const summary = {
      totalCost: 0,
      byProvider: {} as Record<string, number>,
      byModel: {} as Record<string, number>,
      byOperation: {} as Record<string, number>,
      tokenUsage: { input: 0, output: 0, cached: 0 },
    };
    
    for (const row of result) {
      const cost = parseFloat(row.totalCost || '0');
      summary.totalCost += cost;
      
      summary.byProvider[row.provider] = (summary.byProvider[row.provider] || 0) + cost;
      summary.byModel[row.model] = (summary.byModel[row.model] || 0) + cost;
      summary.byOperation[row.operation] = (summary.byOperation[row.operation] || 0) + cost;
      
      summary.tokenUsage.input += parseInt(row.totalInputTokens || '0');
      summary.tokenUsage.output += parseInt(row.totalOutputTokens || '0');
      summary.tokenUsage.cached += parseInt(row.totalCachedTokens || '0');
    }
    
    return summary;
  }
  
  /**
   * Update budget utilization metrics
   */
  async updateBudgetMetrics(tenantId: string): Promise<void> {
    const config = await this.getBudgetConfig(tenantId);
    const daySummary = await this.getCostSummary(tenantId, 'day');
    const monthSummary = await this.getCostSummary(tenantId, 'month');
    
    // Daily budget
    llmBudgetUtilization.set(
      { tenant_id: tenantId, budget_type: 'daily' },
      daySummary.totalCost / config.dailyBudget
    );
    llmBudgetRemaining.set(
      { tenant_id: tenantId, budget_type: 'daily' },
      Math.max(0, config.dailyBudget - daySummary.totalCost)
    );
    
    // Monthly budget
    llmBudgetUtilization.set(
      { tenant_id: tenantId, budget_type: 'monthly' },
      monthSummary.totalCost / config.monthlyBudget
    );
    llmBudgetRemaining.set(
      { tenant_id: tenantId, budget_type: 'monthly' },
      Math.max(0, config.monthlyBudget - monthSummary.totalCost)
    );
    
    // Projected daily cost
    const hourSummary = await this.getCostSummary(tenantId, 'hour');
    const now = new Date();
    const hoursElapsed = now.getHours() + now.getMinutes() / 60;
    const projectedDaily = hoursElapsed > 0
      ? (daySummary.totalCost / hoursElapsed) * 24
      : hourSummary.totalCost * 24;
    
    llmCostProjectedDay.set(
      { tenant_id: tenantId },
      projectedDaily
    );
    
    // Update current period metrics
    llmCostCurrentHour.set(
      { tenant_id: tenantId, provider: 'all' },
      hourSummary.totalCost
    );
    llmCostCurrentDay.set(
      { tenant_id: tenantId, provider: 'all' },
      daySummary.totalCost
    );
  }
  
  /**
   * Check and trigger budget alerts
   */
  private async checkBudgetAlerts(tenantId: string): Promise<void> {
    const config = await this.getBudgetConfig(tenantId);
    const daySummary = await this.getCostSummary(tenantId, 'day');
    const monthSummary = await this.getCostSummary(tenantId, 'month');
    
    // Daily budget alerts
    const dailyUtilization = daySummary.totalCost / config.dailyBudget;
    if (dailyUtilization >= config.alertThresholds.critical) {
      await this.sendBudgetAlert(tenantId, 'daily', 'critical', dailyUtilization);
    } else if (dailyUtilization >= config.alertThresholds.warning) {
      await this.sendBudgetAlert(tenantId, 'daily', 'warning', dailyUtilization);
    }
    
    // Monthly budget alerts
    const monthlyUtilization = monthSummary.totalCost / config.monthlyBudget;
    if (monthlyUtilization >= config.alertThresholds.critical) {
      await this.sendBudgetAlert(tenantId, 'monthly', 'critical', monthlyUtilization);
    } else if (monthlyUtilization >= config.alertThresholds.warning) {
      await this.sendBudgetAlert(tenantId, 'monthly', 'warning', monthlyUtilization);
    }
  }
  
  private async sendBudgetAlert(
    tenantId: string,
    budgetType: 'daily' | 'monthly',
    severity: 'warning' | 'critical',
    utilization: number
  ): Promise<void> {
    console.warn(`[BUDGET ALERT] ${severity.toUpperCase()}: Tenant ${tenantId} ${budgetType} budget at ${(utilization * 100).toFixed(1)}%`);
    
    // In production, send to AlertManager or notification service
    // await alertManager.sendAlert({...})
  }
  
  private async getBudgetConfig(tenantId: string): Promise<BudgetConfig> {
    // Check cache first
    if (this.budgetConfigs.has(tenantId)) {
      return this.budgetConfigs.get(tenantId)!;
    }
    
    // Load from database
    const tenant = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    
    const config: BudgetConfig = tenant[0]?.llmBudgetConfig || {
      dailyBudget: 100,      // Default $100/day
      monthlyBudget: 2000,   // Default $2000/month
      perConversationLimit: 5, // Default $5/conversation
      alertThresholds: {
        warning: 0.7,
        critical: 0.9,
      },
    };
    
    this.budgetConfigs.set(tenantId, config);
    return config;
  }
}

// Export singleton instance
export const costTracker = new CostTracker();
```

### 13.2 External API Cost Tracking

```typescript
// src/monitoring/external-api-costs.ts

import { Counter, Gauge, register } from 'prom-client';

/**
 * Cost tracking pentru servicii externe (non-LLM)
 */

// ============================================================================
// EXTERNAL SERVICE PRICING
// ============================================================================

interface ExternalServicePricing {
  service: string;
  operation: string;
  pricePerCall: number;       // USD per API call
  pricePerUnit?: number;      // USD per unit (e.g., per email sent)
  freeQuota?: number;         // Free calls per month
}

const EXTERNAL_PRICING: ExternalServicePricing[] = [
  // ANAF Services
  { service: 'anaf', operation: 'company_lookup', pricePerCall: 0 },  // Free
  { service: 'anaf', operation: 'efactura_submit', pricePerCall: 0 }, // Free
  { service: 'anaf', operation: 'efactura_status', pricePerCall: 0 }, // Free
  
  // Termene.ro
  { service: 'termene', operation: 'company_info', pricePerCall: 0.05 },
  { service: 'termene', operation: 'financial_data', pricePerCall: 0.10 },
  { service: 'termene', operation: 'litigation_check', pricePerCall: 0.08 },
  
  // Hunter.io
  { service: 'hunter', operation: 'email_finder', pricePerCall: 0.03, freeQuota: 25 },
  { service: 'hunter', operation: 'email_verify', pricePerCall: 0.01, freeQuota: 50 },
  
  // Oblio.eu
  { service: 'oblio', operation: 'invoice_create', pricePerCall: 0 },  // Subscription based
  { service: 'oblio', operation: 'invoice_send', pricePerCall: 0 },
  
  // Email Services (Resend/SendGrid)
  { service: 'resend', operation: 'email_send', pricePerCall: 0, pricePerUnit: 0.001 },
  { service: 'resend', operation: 'email_batch', pricePerCall: 0, pricePerUnit: 0.0008 },
  
  // WhatsApp Business API
  { service: 'whatsapp', operation: 'message_template', pricePerUnit: 0.05 },  // varies by region
  { service: 'whatsapp', operation: 'message_session', pricePerUnit: 0.01 },
  
  // SMS (via Twilio or similar)
  { service: 'sms', operation: 'send_ro', pricePerUnit: 0.04 },  // Romania
  
  // Geocoding
  { service: 'google_maps', operation: 'geocode', pricePerCall: 0.005, freeQuota: 40000 },
  { service: 'google_maps', operation: 'directions', pricePerCall: 0.01, freeQuota: 40000 },
];

// ============================================================================
// EXTERNAL API METRICS
// ============================================================================

const externalApiCallsTotal = new Counter({
  name: 'cerniq_etapa3_external_api_calls_total',
  help: 'Total external API calls',
  labelNames: ['tenant_id', 'service', 'operation', 'status'],
});

const externalApiCostTotal = new Counter({
  name: 'cerniq_etapa3_external_api_cost_usd_total',
  help: 'Total external API cost in USD',
  labelNames: ['tenant_id', 'service', 'operation'],
});

const externalApiQuotaRemaining = new Gauge({
  name: 'cerniq_etapa3_external_api_quota_remaining',
  help: 'Remaining free quota for external API',
  labelNames: ['service'],
});

const externalApiMonthlySpend = new Gauge({
  name: 'cerniq_etapa3_external_api_monthly_spend_usd',
  help: 'Monthly spend on external APIs',
  labelNames: ['tenant_id', 'service'],
});

// ============================================================================
// EXTERNAL API COST TRACKER
// ============================================================================

export class ExternalApiCostTracker {
  private pricingMap: Map<string, ExternalServicePricing>;
  private quotaUsage: Map<string, number>;  // service -> calls this month
  
  constructor() {
    this.pricingMap = new Map();
    EXTERNAL_PRICING.forEach(p => {
      this.pricingMap.set(`${p.service}:${p.operation}`, p);
    });
    this.quotaUsage = new Map();
  }
  
  /**
   * Record an external API call
   */
  recordCall(
    tenantId: string,
    service: string,
    operation: string,
    status: 'success' | 'error',
    units: number = 1
  ): number {
    const key = `${service}:${operation}`;
    const pricing = this.pricingMap.get(key);
    
    // Update call counter
    externalApiCallsTotal.inc({
      tenant_id: tenantId,
      service,
      operation,
      status,
    });
    
    if (!pricing || status === 'error') {
      return 0;  // No cost for errors or unknown services
    }
    
    // Calculate cost
    let cost = 0;
    
    if (pricing.freeQuota) {
      const currentUsage = this.quotaUsage.get(service) || 0;
      if (currentUsage < pricing.freeQuota) {
        // Still in free quota
        this.quotaUsage.set(service, currentUsage + units);
        externalApiQuotaRemaining.set(
          { service },
          pricing.freeQuota - currentUsage - units
        );
      } else {
        // Beyond free quota
        cost = pricing.pricePerCall + (pricing.pricePerUnit || 0) * units;
      }
    } else {
      cost = pricing.pricePerCall + (pricing.pricePerUnit || 0) * units;
    }
    
    if (cost > 0) {
      externalApiCostTotal.inc(
        { tenant_id: tenantId, service, operation },
        cost
      );
    }
    
    return cost;
  }
  
  /**
   * Get monthly spend summary
   */
  async getMonthlySpend(tenantId: string): Promise<Record<string, number>> {
    // In production, query from database
    // This is a simplified in-memory version
    return {};
  }
  
  /**
   * Reset monthly quotas (call on 1st of each month)
   */
  resetMonthlyQuotas(): void {
    this.quotaUsage.clear();
    
    // Reset quota metrics
    EXTERNAL_PRICING.forEach(p => {
      if (p.freeQuota) {
        externalApiQuotaRemaining.set({ service: p.service }, p.freeQuota);
      }
    });
  }
}

export const externalApiTracker = new ExternalApiCostTracker();
```

### 13.3 Cost Optimization Recommendations

```typescript
// src/monitoring/cost-optimizer.ts

import { costTracker } from './cost-tracking';
import { db } from '../db';
import { llmUsageLogs, conversations } from '../db/schema';
import { eq, sql, and, gte, desc } from 'drizzle-orm';

/**
 * Cost Optimization Engine
 * 
 * Analizează utilizarea și generează recomandări
 * pentru optimizarea costurilor
 */

interface CostOptimizationRecommendation {
  id: string;
  category: 'model_selection' | 'caching' | 'prompt_optimization' | 'batching' | 'quota_management';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedSavings: number;  // USD per month
  implementation: string;
  currentMetric: string;
  targetMetric: string;
}

export class CostOptimizer {
  /**
   * Generate optimization recommendations for a tenant
   */
  async generateRecommendations(tenantId: string): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];
    
    // Analyze last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // 1. Model Selection Analysis
    const modelUsage = await db.select({
      model: llmUsageLogs.model,
      operation: llmUsageLogs.operation,
      totalCost: sql<string>`SUM(cost_usd)`,
      totalCalls: sql<string>`COUNT(*)`,
      avgInputTokens: sql<string>`AVG(input_tokens)`,
      avgOutputTokens: sql<string>`AVG(output_tokens)`,
    })
    .from(llmUsageLogs)
    .where(
      and(
        eq(llmUsageLogs.tenantId, tenantId),
        gte(llmUsageLogs.createdAt, thirtyDaysAgo)
      )
    )
    .groupBy(llmUsageLogs.model, llmUsageLogs.operation);
    
    // Check for expensive models on simple tasks
    for (const usage of modelUsage) {
      if (
        usage.model.includes('sonnet') &&
        (usage.operation === 'classification' || usage.operation === 'extraction')
      ) {
        const calls = parseInt(usage.totalCalls || '0');
        const avgTokens = parseInt(usage.avgInputTokens || '0') + parseInt(usage.avgOutputTokens || '0');
        
        if (avgTokens < 2000) {  // Simple tasks with small context
          const currentCost = parseFloat(usage.totalCost || '0');
          const estimatedWithHaiku = currentCost * 0.1;  // Haiku ~10x cheaper
          
          recommendations.push({
            id: `model-${usage.operation}-${usage.model}`,
            category: 'model_selection',
            priority: currentCost > 100 ? 'high' : 'medium',
            title: `Switch ${usage.operation} from ${usage.model} to Haiku`,
            description: `The operation "${usage.operation}" uses ${usage.model} but has small context (avg ${avgTokens} tokens). Consider using Claude Haiku for simple tasks.`,
            estimatedSavings: currentCost - estimatedWithHaiku,
            implementation: `Update model routing config: operations['${usage.operation}'].model = 'claude-haiku-4-20250514'`,
            currentMetric: `$${currentCost.toFixed(2)}/month, ${calls} calls`,
            targetMetric: `$${estimatedWithHaiku.toFixed(2)}/month with Haiku`,
          });
        }
      }
    }
    
    // 2. Caching Analysis
    const cacheablePatterns = await this.analyzeCacheablePatterns(tenantId, thirtyDaysAgo);
    if (cacheablePatterns.potentialSavings > 50) {
      recommendations.push({
        id: 'caching-system-prompts',
        category: 'caching',
        priority: cacheablePatterns.potentialSavings > 200 ? 'high' : 'medium',
        title: 'Enable Prompt Caching for System Prompts',
        description: `Detected ${cacheablePatterns.repeatPatterns} repeated system prompt patterns. Enable prompt caching to reduce costs.`,
        estimatedSavings: cacheablePatterns.potentialSavings,
        implementation: `Enable prompt caching: anthropic.messages.create({ cache_control: { type: 'ephemeral' } })`,
        currentMetric: `${cacheablePatterns.totalInputTokens.toLocaleString()} input tokens/month`,
        targetMetric: `${Math.floor(cacheablePatterns.totalInputTokens * 0.3).toLocaleString()} billable tokens with caching`,
      });
    }
    
    // 3. Prompt Optimization
    const longPrompts = await this.analyzeLongPrompts(tenantId, thirtyDaysAgo);
    if (longPrompts.avgExcessTokens > 1000) {
      recommendations.push({
        id: 'prompt-optimization',
        category: 'prompt_optimization',
        priority: 'medium',
        title: 'Optimize Verbose Prompts',
        description: `Average prompts contain ${longPrompts.avgExcessTokens} tokens more than necessary. Consider prompt compression.`,
        estimatedSavings: longPrompts.potentialSavings,
        implementation: 'Review prompts for redundancy, use structured output schemas, implement dynamic context loading',
        currentMetric: `Avg ${longPrompts.avgInputTokens.toLocaleString()} input tokens/request`,
        targetMetric: `Target ${Math.floor(longPrompts.avgInputTokens * 0.6).toLocaleString()} input tokens/request`,
      });
    }
    
    // 4. Batching Analysis
    const batchingOpportunities = await this.analyzeBatchingOpportunities(tenantId, thirtyDaysAgo);
    if (batchingOpportunities.potentialSavings > 30) {
      recommendations.push({
        id: 'batching-classification',
        category: 'batching',
        priority: 'low',
        title: 'Batch Classification Requests',
        description: `${batchingOpportunities.singleRequests} single classification requests could be batched for 50% cost reduction.`,
        estimatedSavings: batchingOpportunities.potentialSavings,
        implementation: 'Implement batch endpoint for bulk classifications, use message batching API',
        currentMetric: `${batchingOpportunities.singleRequests} single requests/day`,
        targetMetric: `${Math.ceil(batchingOpportunities.singleRequests / 10)} batch requests/day`,
      });
    }
    
    // Sort by estimated savings
    recommendations.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
    
    return recommendations;
  }
  
  private async analyzeCacheablePatterns(tenantId: string, since: Date): Promise<{
    repeatPatterns: number;
    totalInputTokens: number;
    potentialSavings: number;
  }> {
    // Simplified analysis - in production, analyze actual prompt hashes
    return {
      repeatPatterns: 150,
      totalInputTokens: 5_000_000,
      potentialSavings: 75,
    };
  }
  
  private async analyzeLongPrompts(tenantId: string, since: Date): Promise<{
    avgInputTokens: number;
    avgExcessTokens: number;
    potentialSavings: number;
  }> {
    const stats = await db.select({
      avgInputTokens: sql<string>`AVG(input_tokens)`,
    })
    .from(llmUsageLogs)
    .where(
      and(
        eq(llmUsageLogs.tenantId, tenantId),
        gte(llmUsageLogs.createdAt, since)
      )
    );
    
    const avgInput = parseFloat(stats[0]?.avgInputTokens || '3000');
    const targetInput = 2000;  // Target average
    
    return {
      avgInputTokens: avgInput,
      avgExcessTokens: Math.max(0, avgInput - targetInput),
      potentialSavings: Math.max(0, (avgInput - targetInput) * 0.003 * 30),  // $3/1M tokens * 30 days
    };
  }
  
  private async analyzeBatchingOpportunities(tenantId: string, since: Date): Promise<{
    singleRequests: number;
    potentialSavings: number;
  }> {
    // Simplified - analyze request patterns in production
    return {
      singleRequests: 500,
      potentialSavings: 45,
    };
  }
}

export const costOptimizer = new CostOptimizer();
```

### 13.4 Cost Dashboard Panels

```yaml
# grafana/dashboards/cost-monitoring.json
{
  "dashboard": {
    "title": "Etapa 3 - Cost Monitoring",
    "uid": "etapa3-cost",
    "tags": ["etapa3", "cost", "llm"],
    "timezone": "browser",
    "refresh": "1m",
    "time": {
      "from": "now-7d",
      "to": "now"
    },
    "panels": [
      {
        "title": "LLM Cost - Today",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 0, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD",
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 50 },
                { "color": "red", "value": 100 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "sum(cerniq_etapa3_llm_cost_current_day_usd{tenant_id=~\"$tenant\"})"
          }
        ]
      },
      {
        "title": "LLM Cost - This Month",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 4, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD",
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 1000 },
                { "color": "red", "value": 2000 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "sum(increase(cerniq_etapa3_llm_cost_usd_total{tenant_id=~\"$tenant\"}[$__range]))"
          }
        ]
      },
      {
        "title": "Projected Daily Cost",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 8, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD",
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 75 },
                { "color": "red", "value": 150 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "sum(cerniq_etapa3_llm_cost_projected_day_usd{tenant_id=~\"$tenant\"})"
          }
        ]
      },
      {
        "title": "Budget Utilization - Daily",
        "type": "gauge",
        "gridPos": { "h": 4, "w": 4, "x": 12, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "min": 0,
            "max": 1,
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 0.7 },
                { "color": "red", "value": 0.9 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "avg(cerniq_etapa3_llm_budget_utilization_ratio{tenant_id=~\"$tenant\", budget_type=\"daily\"})"
          }
        ]
      },
      {
        "title": "Budget Utilization - Monthly",
        "type": "gauge",
        "gridPos": { "h": 4, "w": 4, "x": 16, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "min": 0,
            "max": 1,
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 0.7 },
                { "color": "red", "value": 0.9 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "avg(cerniq_etapa3_llm_budget_utilization_ratio{tenant_id=~\"$tenant\", budget_type=\"monthly\"})"
          }
        ]
      },
      {
        "title": "External API Spend",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 20, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD"
          }
        },
        "targets": [
          {
            "expr": "sum(increase(cerniq_etapa3_external_api_cost_usd_total{tenant_id=~\"$tenant\"}[30d]))"
          }
        ]
      },
      {
        "title": "LLM Cost Over Time",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 4 },
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD",
            "custom": {
              "drawStyle": "line",
              "fillOpacity": 20,
              "stacking": { "mode": "normal" }
            }
          }
        },
        "targets": [
          {
            "expr": "sum by (provider) (increase(cerniq_etapa3_llm_cost_usd_total{tenant_id=~\"$tenant\"}[1h]))",
            "legendFormat": "{{ provider }}"
          }
        ]
      },
      {
        "title": "Cost by Model",
        "type": "piechart",
        "gridPos": { "h": 8, "w": 6, "x": 12, "y": 4 },
        "targets": [
          {
            "expr": "sum by (model) (increase(cerniq_etapa3_llm_cost_usd_total{tenant_id=~\"$tenant\"}[$__range]))",
            "legendFormat": "{{ model }}"
          }
        ]
      },
      {
        "title": "Cost by Operation",
        "type": "piechart",
        "gridPos": { "h": 8, "w": 6, "x": 18, "y": 4 },
        "targets": [
          {
            "expr": "sum by (operation) (increase(cerniq_etapa3_llm_cost_usd_total{tenant_id=~\"$tenant\"}[$__range]))",
            "legendFormat": "{{ operation }}"
          }
        ]
      },
      {
        "title": "Token Usage Over Time",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 12 },
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "custom": {
              "drawStyle": "bars",
              "stacking": { "mode": "normal" }
            }
          }
        },
        "targets": [
          {
            "expr": "sum(increase(cerniq_etapa3_llm_tokens_input_total{tenant_id=~\"$tenant\"}[1h]))",
            "legendFormat": "Input Tokens"
          },
          {
            "expr": "sum(increase(cerniq_etapa3_llm_tokens_output_total{tenant_id=~\"$tenant\"}[1h]))",
            "legendFormat": "Output Tokens"
          }
        ]
      },
      {
        "title": "Cost per Conversation",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 12 },
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD",
            "custom": {
              "drawStyle": "line"
            }
          }
        },
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum by (le) (rate(cerniq_etapa3_conversation_cost_usd_bucket{tenant_id=~\"$tenant\"}[1h])))",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, sum by (le) (rate(cerniq_etapa3_conversation_cost_usd_bucket{tenant_id=~\"$tenant\"}[1h])))",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, sum by (le) (rate(cerniq_etapa3_conversation_cost_usd_bucket{tenant_id=~\"$tenant\"}[1h])))",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "title": "External API Calls by Service",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 20 },
        "targets": [
          {
            "expr": "sum by (service) (rate(cerniq_etapa3_external_api_calls_total{tenant_id=~\"$tenant\", status=\"success\"}[5m]))",
            "legendFormat": "{{ service }}"
          }
        ]
      },
      {
        "title": "API Quota Remaining",
        "type": "bargauge",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 20 },
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "color": "red", "value": null },
                { "color": "yellow", "value": 1000 },
                { "color": "green", "value": 5000 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "cerniq_etapa3_external_api_quota_remaining",
            "legendFormat": "{{ service }}"
          }
        ]
      }
    ],
    "templating": {
      "list": [
        {
          "name": "tenant",
          "type": "query",
          "query": "label_values(cerniq_etapa3_llm_cost_usd_total, tenant_id)",
          "includeAll": true,
          "multi": true
        }
      ]
    }
  }
}
```

### 13.5 Cost Alerting Rules

```yaml
# prometheus/rules/cost-alerts.yaml

groups:
  - name: etapa3_cost_alerts
    interval: 1m
    rules:
      # ========================================================================
      # BUDGET ALERTS
      # ========================================================================
      
      - alert: DailyBudgetWarning
        expr: |
          avg by (tenant_id) (
            cerniq_etapa3_llm_budget_utilization_ratio{budget_type="daily"}
          ) > 0.7
        for: 5m
        labels:
          severity: warning
          team: platform
          category: cost
        annotations:
          summary: "Daily LLM budget at {{ $value | humanizePercentage }} for tenant {{ $labels.tenant_id }}"
          description: |
            Tenant {{ $labels.tenant_id }} has used {{ $value | humanizePercentage }} of daily LLM budget.
            
            Consider reviewing usage patterns or adjusting budget.

      - alert: DailyBudgetCritical
        expr: |
          avg by (tenant_id) (
            cerniq_etapa3_llm_budget_utilization_ratio{budget_type="daily"}
          ) > 0.9
        for: 5m
        labels:
          severity: critical
          team: platform
          category: cost
        annotations:
          summary: "Daily LLM budget critical at {{ $value | humanizePercentage }} for tenant {{ $labels.tenant_id }}"
          description: |
            Tenant {{ $labels.tenant_id }} has used {{ $value | humanizePercentage }} of daily LLM budget.
            
            Budget may be exhausted soon. Consider rate limiting or budget increase.

      - alert: MonthlyBudgetWarning
        expr: |
          avg by (tenant_id) (
            cerniq_etapa3_llm_budget_utilization_ratio{budget_type="monthly"}
          ) > 0.7
        for: 30m
        labels:
          severity: warning
          team: platform
          category: cost
        annotations:
          summary: "Monthly LLM budget at {{ $value | humanizePercentage }} for tenant {{ $labels.tenant_id }}"
          description: |
            Tenant {{ $labels.tenant_id }} has used {{ $value | humanizePercentage }} of monthly LLM budget.

      # ========================================================================
      # COST SPIKE ALERTS
      # ========================================================================
      
      - alert: HourlyCostSpike
        expr: |
          sum by (tenant_id) (
            increase(cerniq_etapa3_llm_cost_usd_total[1h])
          ) > 20
        for: 5m
        labels:
          severity: warning
          team: platform
          category: cost
        annotations:
          summary: "High hourly LLM cost: ${{ $value | printf \"%.2f\" }} for tenant {{ $labels.tenant_id }}"
          description: |
            Hourly LLM cost is ${{ $value | printf "%.2f" }} which exceeds the $20/hour threshold.
            
            Check for unusual activity or runaway processes.

      - alert: CostPerConversationHigh
        expr: |
          histogram_quantile(0.95,
            sum by (le, tenant_id) (
              rate(cerniq_etapa3_conversation_cost_usd_bucket[1h])
            )
          ) > 5
        for: 30m
        labels:
          severity: warning
          team: ai
          category: cost
        annotations:
          summary: "High cost per conversation: P95 > $5 for tenant {{ $labels.tenant_id }}"
          description: |
            95th percentile conversation cost is ${{ $value | printf "%.2f" }}.
            
            Review conversation complexity and model selection.

      - alert: ProjectedDailyCostHigh
        expr: |
          sum by (tenant_id) (
            cerniq_etapa3_llm_cost_projected_day_usd
          ) > 200
        for: 1h
        labels:
          severity: warning
          team: platform
          category: cost
        annotations:
          summary: "Projected daily cost is ${{ $value | printf \"%.2f\" }} for tenant {{ $labels.tenant_id }}"
          description: |
            Based on current usage, projected daily LLM cost is ${{ $value | printf "%.2f" }}.
            
            This exceeds the $200/day threshold. Monitor closely.

      # ========================================================================
      # TOKEN USAGE ALERTS
      # ========================================================================
      
      - alert: HighTokenUsage
        expr: |
          sum by (tenant_id) (
            increase(cerniq_etapa3_llm_tokens_input_total[1h])
          ) + sum by (tenant_id) (
            increase(cerniq_etapa3_llm_tokens_output_total[1h])
          ) > 10000000
        for: 15m
        labels:
          severity: warning
          team: ai
          category: cost
        annotations:
          summary: "High token usage: {{ $value | humanize }} tokens/hour for tenant {{ $labels.tenant_id }}"
          description: |
            Token usage is {{ $value | humanize }} tokens in the last hour.
            
            Check for prompt inflation or unusual conversation patterns.

      - alert: LowCacheHitRate
        expr: |
          (
            sum by (tenant_id) (rate(cerniq_etapa3_llm_tokens_cached_total[1h]))
            /
            sum by (tenant_id) (rate(cerniq_etapa3_llm_tokens_input_total[1h]))
          ) < 0.3
        for: 1h
        labels:
          severity: info
          team: ai
          category: optimization
        annotations:
          summary: "Low prompt cache hit rate: {{ $value | humanizePercentage }} for tenant {{ $labels.tenant_id }}"
          description: |
            Prompt cache hit rate is only {{ $value | humanizePercentage }}.
            
            Consider optimizing system prompts for better caching.

      # ========================================================================
      # EXTERNAL API COST ALERTS
      # ========================================================================
      
      - alert: ExternalAPIQuotaLow
        expr: |
          cerniq_etapa3_external_api_quota_remaining < 1000
        for: 10m
        labels:
          severity: warning
          team: platform
          category: cost
        annotations:
          summary: "Low API quota remaining: {{ $value }} calls for {{ $labels.service }}"
          description: |
            External API quota for {{ $labels.service }} is running low.
            
            Free quota remaining: {{ $value }} calls.

      - alert: ExternalAPICostHigh
        expr: |
          sum by (service) (
            increase(cerniq_etapa3_external_api_cost_usd_total[24h])
          ) > 50
        for: 1h
        labels:
          severity: warning
          team: platform
          category: cost
        annotations:
          summary: "High external API cost: ${{ $value | printf \"%.2f\" }}/day for {{ $labels.service }}"
          description: |
            Daily cost for {{ $labels.service }} is ${{ $value | printf "%.2f" }}.
            
            Review usage patterns and consider optimization.
```


---

## 14. Security Monitoring

### 14.1 Security Metrics și Events

```typescript
// src/monitoring/security-monitoring.ts

import { Counter, Gauge, Histogram, register } from 'prom-client';
import { createLogger } from './structured-logging';

/**
 * Security Monitoring pentru Etapa 3
 * 
 * Monitorizează evenimente de securitate, accesuri,
 * și potențiale amenințări
 */

const logger = createLogger('security-monitor');

// ============================================================================
// AUTHENTICATION METRICS
// ============================================================================

const authAttempts = new Counter({
  name: 'cerniq_etapa3_auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['tenant_id', 'method', 'status', 'reason'],
});

const authLatency = new Histogram({
  name: 'cerniq_etapa3_auth_latency_seconds',
  help: 'Authentication latency distribution',
  labelNames: ['method'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
});

const activeSessions = new Gauge({
  name: 'cerniq_etapa3_active_sessions',
  help: 'Number of active authenticated sessions',
  labelNames: ['tenant_id', 'role'],
});

const sessionDuration = new Histogram({
  name: 'cerniq_etapa3_session_duration_seconds',
  help: 'Session duration distribution',
  labelNames: ['tenant_id'],
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800],
});

// ============================================================================
// ACCESS CONTROL METRICS
// ============================================================================

const accessDenied = new Counter({
  name: 'cerniq_etapa3_access_denied_total',
  help: 'Total access denied events',
  labelNames: ['tenant_id', 'resource', 'reason', 'user_role'],
});

const privilegeEscalation = new Counter({
  name: 'cerniq_etapa3_privilege_escalation_attempts_total',
  help: 'Potential privilege escalation attempts',
  labelNames: ['tenant_id', 'from_role', 'to_role'],
});

const crossTenantAccess = new Counter({
  name: 'cerniq_etapa3_cross_tenant_access_attempts_total',
  help: 'Cross-tenant access attempts (potential attack)',
  labelNames: ['source_tenant', 'target_tenant', 'resource'],
});

const rbacViolations = new Counter({
  name: 'cerniq_etapa3_rbac_violations_total',
  help: 'RBAC policy violations',
  labelNames: ['tenant_id', 'user_id', 'action', 'resource'],
});

// ============================================================================
// DATA SECURITY METRICS
// ============================================================================

const piiAccess = new Counter({
  name: 'cerniq_etapa3_pii_access_total',
  help: 'PII data access events',
  labelNames: ['tenant_id', 'data_type', 'operation', 'authorized'],
});

const dataExportAttempts = new Counter({
  name: 'cerniq_etapa3_data_export_attempts_total',
  help: 'Data export attempts',
  labelNames: ['tenant_id', 'format', 'status', 'record_count'],
});

const encryptionOperations = new Counter({
  name: 'cerniq_etapa3_encryption_operations_total',
  help: 'Encryption/decryption operations',
  labelNames: ['operation', 'algorithm', 'status'],
});

const sensitiveFieldAccess = new Counter({
  name: 'cerniq_etapa3_sensitive_field_access_total',
  help: 'Access to sensitive database fields',
  labelNames: ['tenant_id', 'table', 'field', 'operation'],
});

// ============================================================================
// API SECURITY METRICS
// ============================================================================

const rateLimitHits = new Counter({
  name: 'cerniq_etapa3_rate_limit_hits_total',
  help: 'Rate limit exceeded events',
  labelNames: ['tenant_id', 'endpoint', 'limit_type'],
});

const apiKeyUsage = new Counter({
  name: 'cerniq_etapa3_api_key_usage_total',
  help: 'API key usage',
  labelNames: ['tenant_id', 'key_id', 'endpoint', 'status'],
});

const suspiciousRequests = new Counter({
  name: 'cerniq_etapa3_suspicious_requests_total',
  help: 'Suspicious API requests detected',
  labelNames: ['tenant_id', 'reason', 'endpoint'],
});

const inputValidationFailures = new Counter({
  name: 'cerniq_etapa3_input_validation_failures_total',
  help: 'Input validation failures',
  labelNames: ['tenant_id', 'endpoint', 'field', 'reason'],
});

// ============================================================================
// LLM SECURITY METRICS
// ============================================================================

const promptInjectionAttempts = new Counter({
  name: 'cerniq_etapa3_prompt_injection_attempts_total',
  help: 'Detected prompt injection attempts',
  labelNames: ['tenant_id', 'detection_method', 'severity'],
});

const jailbreakAttempts = new Counter({
  name: 'cerniq_etapa3_jailbreak_attempts_total',
  help: 'Detected jailbreak attempts',
  labelNames: ['tenant_id', 'pattern'],
});

const outputFilterBlocks = new Counter({
  name: 'cerniq_etapa3_output_filter_blocks_total',
  help: 'LLM output blocked by safety filters',
  labelNames: ['tenant_id', 'filter_type', 'severity'],
});

const modelAbuse = new Counter({
  name: 'cerniq_etapa3_model_abuse_attempts_total',
  help: 'Model abuse attempts (excessive tokens, rapid requests)',
  labelNames: ['tenant_id', 'abuse_type'],
});

// ============================================================================
// SECURITY EVENT LOGGER
// ============================================================================

export interface SecurityEvent {
  eventType: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tenantId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  outcome: 'success' | 'failure' | 'blocked';
  details: Record<string, unknown>;
  timestamp: Date;
}

export type SecurityEventType =
  | 'auth_success'
  | 'auth_failure'
  | 'access_denied'
  | 'privilege_escalation'
  | 'cross_tenant_access'
  | 'pii_access'
  | 'data_export'
  | 'rate_limit'
  | 'suspicious_request'
  | 'prompt_injection'
  | 'jailbreak_attempt'
  | 'output_blocked'
  | 'rbac_violation'
  | 'api_key_misuse';

export class SecurityMonitor {
  /**
   * Log and record security event
   */
  recordEvent(event: SecurityEvent): void {
    // Log the event
    const logLevel = this.severityToLogLevel(event.severity);
    logger[logLevel]({
      eventType: event.eventType,
      severity: event.severity,
      tenantId: event.tenantId,
      userId: event.userId,
      ipAddress: event.ipAddress,
      resource: event.resource,
      action: event.action,
      outcome: event.outcome,
      details: event.details,
    }, `Security event: ${event.eventType}`);
    
    // Update metrics
    this.updateMetrics(event);
    
    // Check for alerts
    this.checkAlerts(event);
  }
  
  private severityToLogLevel(severity: string): 'info' | 'warn' | 'error' | 'fatal' {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warn';
      case 'high': return 'error';
      case 'critical': return 'fatal';
      default: return 'info';
    }
  }
  
  private updateMetrics(event: SecurityEvent): void {
    switch (event.eventType) {
      case 'auth_success':
      case 'auth_failure':
        authAttempts.inc({
          tenant_id: event.tenantId,
          method: event.details.method as string || 'unknown',
          status: event.outcome,
          reason: event.details.reason as string || '',
        });
        break;
        
      case 'access_denied':
        accessDenied.inc({
          tenant_id: event.tenantId,
          resource: event.resource || 'unknown',
          reason: event.details.reason as string || '',
          user_role: event.details.role as string || 'unknown',
        });
        break;
        
      case 'privilege_escalation':
        privilegeEscalation.inc({
          tenant_id: event.tenantId,
          from_role: event.details.fromRole as string || '',
          to_role: event.details.toRole as string || '',
        });
        break;
        
      case 'cross_tenant_access':
        crossTenantAccess.inc({
          source_tenant: event.tenantId,
          target_tenant: event.details.targetTenant as string || '',
          resource: event.resource || '',
        });
        break;
        
      case 'pii_access':
        piiAccess.inc({
          tenant_id: event.tenantId,
          data_type: event.details.dataType as string || '',
          operation: event.action || '',
          authorized: event.outcome === 'success' ? 'true' : 'false',
        });
        break;
        
      case 'rate_limit':
        rateLimitHits.inc({
          tenant_id: event.tenantId,
          endpoint: event.resource || '',
          limit_type: event.details.limitType as string || '',
        });
        break;
        
      case 'suspicious_request':
        suspiciousRequests.inc({
          tenant_id: event.tenantId,
          reason: event.details.reason as string || '',
          endpoint: event.resource || '',
        });
        break;
        
      case 'prompt_injection':
        promptInjectionAttempts.inc({
          tenant_id: event.tenantId,
          detection_method: event.details.method as string || '',
          severity: event.severity,
        });
        break;
        
      case 'jailbreak_attempt':
        jailbreakAttempts.inc({
          tenant_id: event.tenantId,
          pattern: event.details.pattern as string || '',
        });
        break;
        
      case 'output_blocked':
        outputFilterBlocks.inc({
          tenant_id: event.tenantId,
          filter_type: event.details.filterType as string || '',
          severity: event.severity,
        });
        break;
        
      case 'rbac_violation':
        rbacViolations.inc({
          tenant_id: event.tenantId,
          user_id: event.userId || '',
          action: event.action || '',
          resource: event.resource || '',
        });
        break;
    }
  }
  
  private checkAlerts(event: SecurityEvent): void {
    // Critical events trigger immediate alerts
    if (event.severity === 'critical') {
      this.sendImmediateAlert(event);
    }
    
    // High-severity auth failures might indicate brute force
    if (event.eventType === 'auth_failure' && event.severity === 'high') {
      // Check for brute force pattern (handled by alert rules)
    }
  }
  
  private sendImmediateAlert(event: SecurityEvent): void {
    // In production, send to PagerDuty or similar
    logger.fatal({
      alertType: 'CRITICAL_SECURITY_EVENT',
      event,
    }, `CRITICAL: ${event.eventType} detected`);
  }
  
  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================
  
  recordAuthSuccess(tenantId: string, userId: string, method: string, ipAddress?: string): void {
    this.recordEvent({
      eventType: 'auth_success',
      severity: 'low',
      tenantId,
      userId,
      ipAddress,
      outcome: 'success',
      details: { method },
      timestamp: new Date(),
    });
  }
  
  recordAuthFailure(
    tenantId: string,
    userId: string | undefined,
    method: string,
    reason: string,
    ipAddress?: string
  ): void {
    this.recordEvent({
      eventType: 'auth_failure',
      severity: reason === 'brute_force' ? 'high' : 'medium',
      tenantId,
      userId,
      ipAddress,
      outcome: 'failure',
      details: { method, reason },
      timestamp: new Date(),
    });
  }
  
  recordAccessDenied(
    tenantId: string,
    userId: string,
    resource: string,
    reason: string,
    role: string
  ): void {
    this.recordEvent({
      eventType: 'access_denied',
      severity: 'medium',
      tenantId,
      userId,
      resource,
      outcome: 'blocked',
      details: { reason, role },
      timestamp: new Date(),
    });
  }
  
  recordPromptInjection(
    tenantId: string,
    userId: string,
    detectionMethod: string,
    prompt: string
  ): void {
    this.recordEvent({
      eventType: 'prompt_injection',
      severity: 'high',
      tenantId,
      userId,
      outcome: 'blocked',
      details: {
        method: detectionMethod,
        promptLength: prompt.length,
        // Don't log the actual prompt for privacy
      },
      timestamp: new Date(),
    });
  }
  
  recordRateLimitHit(
    tenantId: string,
    endpoint: string,
    limitType: string,
    currentRate: number,
    limit: number
  ): void {
    this.recordEvent({
      eventType: 'rate_limit',
      severity: currentRate > limit * 2 ? 'high' : 'medium',
      tenantId,
      resource: endpoint,
      outcome: 'blocked',
      details: { limitType, currentRate, limit },
      timestamp: new Date(),
    });
  }
}

export const securityMonitor = new SecurityMonitor();
```

### 14.2 Security Alert Rules

```yaml
# prometheus/rules/security-alerts.yaml

groups:
  - name: etapa3_security_alerts
    interval: 30s
    rules:
      # ========================================================================
      # AUTHENTICATION ALERTS
      # ========================================================================
      
      - alert: BruteForceAttack
        expr: |
          sum by (tenant_id, ipAddress) (
            increase(cerniq_etapa3_auth_attempts_total{status="failure"}[5m])
          ) > 10
        for: 1m
        labels:
          severity: critical
          team: security
          category: authentication
        annotations:
          summary: "Potential brute force attack detected"
          description: |
            {{ $value }} failed auth attempts from IP in last 5 minutes for tenant {{ $labels.tenant_id }}.
            
            Consider blocking the IP address.
            
            Runbook: https://docs.cerniq.app/runbooks/security/brute-force

      - alert: AccountTakeover
        expr: |
          sum by (tenant_id, userId) (
            increase(cerniq_etapa3_auth_attempts_total{status="failure"}[10m])
          ) > 5
          and on(tenant_id, userId)
          sum by (tenant_id, userId) (
            increase(cerniq_etapa3_auth_attempts_total{status="success"}[10m])
          ) > 0
        for: 1m
        labels:
          severity: critical
          team: security
          category: authentication
        annotations:
          summary: "Potential account takeover"
          description: |
            Multiple failed attempts followed by success for user {{ $labels.userId }}.
            
            Verify with user and consider password reset.

      - alert: HighAuthFailureRate
        expr: |
          sum(rate(cerniq_etapa3_auth_attempts_total{status="failure"}[5m]))
          /
          sum(rate(cerniq_etapa3_auth_attempts_total[5m]))
          > 0.3
        for: 5m
        labels:
          severity: warning
          team: security
          category: authentication
        annotations:
          summary: "High authentication failure rate: {{ $value | humanizePercentage }}"
          description: |
            Overall auth failure rate is {{ $value | humanizePercentage }}.
            
            May indicate attack or system issue.

      # ========================================================================
      # ACCESS CONTROL ALERTS
      # ========================================================================
      
      - alert: PrivilegeEscalationAttempt
        expr: |
          increase(cerniq_etapa3_privilege_escalation_attempts_total[5m]) > 0
        for: 0m
        labels:
          severity: critical
          team: security
          category: access_control
          pagerduty: "true"
        annotations:
          summary: "Privilege escalation attempt detected"
          description: |
            Tenant {{ $labels.tenant_id }} attempted escalation from {{ $labels.from_role }} to {{ $labels.to_role }}.
            
            Immediate investigation required.

      - alert: CrossTenantAccessAttempt
        expr: |
          increase(cerniq_etapa3_cross_tenant_access_attempts_total[5m]) > 0
        for: 0m
        labels:
          severity: critical
          team: security
          category: access_control
          pagerduty: "true"
        annotations:
          summary: "Cross-tenant access attempt detected"
          description: |
            Tenant {{ $labels.source_tenant }} attempted to access {{ $labels.target_tenant }}'s {{ $labels.resource }}.
            
            This is a critical security violation.

      - alert: HighAccessDenialRate
        expr: |
          sum by (tenant_id) (
            rate(cerniq_etapa3_access_denied_total[5m])
          ) > 10
        for: 5m
        labels:
          severity: warning
          team: security
          category: access_control
        annotations:
          summary: "High access denial rate for tenant {{ $labels.tenant_id }}"
          description: |
            {{ $value | humanize }} access denials per second.
            
            User may need permission adjustment or investigating for malicious activity.

      - alert: RBACViolationSpike
        expr: |
          sum by (tenant_id) (
            increase(cerniq_etapa3_rbac_violations_total[15m])
          ) > 20
        for: 5m
        labels:
          severity: warning
          team: security
          category: access_control
        annotations:
          summary: "RBAC violation spike for tenant {{ $labels.tenant_id }}"
          description: |
            {{ $value }} RBAC violations in last 15 minutes.
            
            Review user permissions and activity.

      # ========================================================================
      # DATA SECURITY ALERTS
      # ========================================================================
      
      - alert: UnauthorizedPIIAccess
        expr: |
          increase(cerniq_etapa3_pii_access_total{authorized="false"}[5m]) > 0
        for: 0m
        labels:
          severity: critical
          team: security
          category: data_protection
          pagerduty: "true"
        annotations:
          summary: "Unauthorized PII access detected"
          description: |
            Unauthorized access to {{ $labels.data_type }} data in tenant {{ $labels.tenant_id }}.
            
            Immediate investigation required.

      - alert: BulkDataExport
        expr: |
          sum by (tenant_id) (
            increase(cerniq_etapa3_data_export_attempts_total{status="success"}[1h])
          ) > 10
        for: 5m
        labels:
          severity: warning
          team: security
          category: data_protection
        annotations:
          summary: "Bulk data export detected for tenant {{ $labels.tenant_id }}"
          description: |
            {{ $value }} data exports in last hour.
            
            Verify this is authorized activity.

      - alert: LargeDataExport
        expr: |
          max by (tenant_id) (
            cerniq_etapa3_data_export_attempts_total{record_count=~".*"}
          ) > 10000
        for: 0m
        labels:
          severity: warning
          team: security
          category: data_protection
        annotations:
          summary: "Large data export detected"
          description: |
            Export of {{ $value }} records for tenant {{ $labels.tenant_id }}.
            
            Verify authorization and business need.

      # ========================================================================
      # API SECURITY ALERTS
      # ========================================================================
      
      - alert: RateLimitExceeded
        expr: |
          sum by (tenant_id, endpoint) (
            rate(cerniq_etapa3_rate_limit_hits_total[5m])
          ) > 1
        for: 5m
        labels:
          severity: warning
          team: security
          category: api
        annotations:
          summary: "Rate limit exceeded for {{ $labels.endpoint }}"
          description: |
            Tenant {{ $labels.tenant_id }} hitting rate limits on {{ $labels.endpoint }}.
            
            May indicate abuse or need for limit adjustment.

      - alert: SuspiciousRequestSpike
        expr: |
          sum by (tenant_id) (
            increase(cerniq_etapa3_suspicious_requests_total[15m])
          ) > 50
        for: 5m
        labels:
          severity: high
          team: security
          category: api
        annotations:
          summary: "Suspicious request spike for tenant {{ $labels.tenant_id }}"
          description: |
            {{ $value }} suspicious requests in last 15 minutes.
            
            Investigate for potential attack.

      - alert: InputValidationFailureSpike
        expr: |
          sum by (tenant_id, endpoint) (
            rate(cerniq_etapa3_input_validation_failures_total[5m])
          ) > 5
        for: 5m
        labels:
          severity: warning
          team: security
          category: api
        annotations:
          summary: "High input validation failures on {{ $labels.endpoint }}"
          description: |
            {{ $value | humanize }}/s validation failures.
            
            May indicate injection attempts or client issues.

      # ========================================================================
      # LLM SECURITY ALERTS
      # ========================================================================
      
      - alert: PromptInjectionDetected
        expr: |
          increase(cerniq_etapa3_prompt_injection_attempts_total[5m]) > 0
        for: 0m
        labels:
          severity: high
          team: security
          category: llm
        annotations:
          summary: "Prompt injection attempt detected"
          description: |
            Detected {{ $value }} prompt injection attempts for tenant {{ $labels.tenant_id }}.
            Detection method: {{ $labels.detection_method }}
            
            Review user activity.

      - alert: JailbreakAttemptDetected
        expr: |
          increase(cerniq_etapa3_jailbreak_attempts_total[5m]) > 0
        for: 0m
        labels:
          severity: high
          team: security
          category: llm
        annotations:
          summary: "Jailbreak attempt detected"
          description: |
            Detected jailbreak attempt with pattern {{ $labels.pattern }} for tenant {{ $labels.tenant_id }}.
            
            User may be attempting to bypass safety guidelines.

      - alert: HighOutputFilterBlocks
        expr: |
          sum by (tenant_id) (
            rate(cerniq_etapa3_output_filter_blocks_total[15m])
          ) > 0.1
        for: 15m
        labels:
          severity: warning
          team: ai
          category: llm
        annotations:
          summary: "High LLM output filter blocks for tenant {{ $labels.tenant_id }}"
          description: |
            {{ $value | humanize }}/s output blocks.
            
            Review conversation patterns and filter tuning.

      - alert: ModelAbuseDetected
        expr: |
          increase(cerniq_etapa3_model_abuse_attempts_total[15m]) > 10
        for: 5m
        labels:
          severity: warning
          team: security
          category: llm
        annotations:
          summary: "Model abuse detected for tenant {{ $labels.tenant_id }}"
          description: |
            {{ $value }} abuse attempts detected.
            Abuse type: {{ $labels.abuse_type }}
            
            Consider rate limiting or account review.
```

### 14.3 Security Dashboard

```yaml
# grafana/dashboards/security-monitoring.json
{
  "dashboard": {
    "title": "Etapa 3 - Security Monitoring",
    "uid": "etapa3-security",
    "tags": ["etapa3", "security"],
    "timezone": "browser",
    "refresh": "30s",
    "time": {
      "from": "now-24h",
      "to": "now"
    },
    "panels": [
      {
        "title": "Security Events (24h)",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 0, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 100 },
                { "color": "red", "value": 500 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "sum(increase(cerniq_etapa3_auth_attempts_total{status=\"failure\"}[24h])) + sum(increase(cerniq_etapa3_access_denied_total[24h])) + sum(increase(cerniq_etapa3_suspicious_requests_total[24h]))"
          }
        ]
      },
      {
        "title": "Auth Failures (1h)",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 4, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 10 },
                { "color": "red", "value": 50 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "sum(increase(cerniq_etapa3_auth_attempts_total{status=\"failure\"}[1h]))"
          }
        ]
      },
      {
        "title": "Rate Limit Hits (1h)",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 8, "y": 0 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_etapa3_rate_limit_hits_total[1h]))"
          }
        ]
      },
      {
        "title": "Prompt Injection Attempts (24h)",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 12, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 1 },
                { "color": "red", "value": 10 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "sum(increase(cerniq_etapa3_prompt_injection_attempts_total[24h]))"
          }
        ]
      },
      {
        "title": "Active Sessions",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 16, "y": 0 },
        "targets": [
          {
            "expr": "sum(cerniq_etapa3_active_sessions)"
          }
        ]
      },
      {
        "title": "Critical Security Events",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 20, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "red", "value": 1 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "sum(increase(cerniq_etapa3_privilege_escalation_attempts_total[24h])) + sum(increase(cerniq_etapa3_cross_tenant_access_attempts_total[24h]))"
          }
        ]
      },
      {
        "title": "Authentication Attempts Over Time",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 4 },
        "fieldConfig": {
          "defaults": {
            "custom": {
              "drawStyle": "line"
            }
          }
        },
        "targets": [
          {
            "expr": "sum(rate(cerniq_etapa3_auth_attempts_total{status=\"success\"}[5m])) * 60",
            "legendFormat": "Success"
          },
          {
            "expr": "sum(rate(cerniq_etapa3_auth_attempts_total{status=\"failure\"}[5m])) * 60",
            "legendFormat": "Failure"
          }
        ]
      },
      {
        "title": "Security Events by Type",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 4 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_etapa3_access_denied_total[5m])) * 60",
            "legendFormat": "Access Denied"
          },
          {
            "expr": "sum(rate(cerniq_etapa3_rate_limit_hits_total[5m])) * 60",
            "legendFormat": "Rate Limit"
          },
          {
            "expr": "sum(rate(cerniq_etapa3_suspicious_requests_total[5m])) * 60",
            "legendFormat": "Suspicious"
          },
          {
            "expr": "sum(rate(cerniq_etapa3_input_validation_failures_total[5m])) * 60",
            "legendFormat": "Validation Failures"
          }
        ]
      },
      {
        "title": "LLM Security Events",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 12 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_etapa3_prompt_injection_attempts_total[5m])) * 60",
            "legendFormat": "Prompt Injection"
          },
          {
            "expr": "sum(rate(cerniq_etapa3_jailbreak_attempts_total[5m])) * 60",
            "legendFormat": "Jailbreak"
          },
          {
            "expr": "sum(rate(cerniq_etapa3_output_filter_blocks_total[5m])) * 60",
            "legendFormat": "Output Blocked"
          }
        ]
      },
      {
        "title": "PII Access Events",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 12 },
        "targets": [
          {
            "expr": "sum by (data_type) (rate(cerniq_etapa3_pii_access_total{authorized=\"true\"}[5m])) * 60",
            "legendFormat": "{{ data_type }} (authorized)"
          },
          {
            "expr": "sum by (data_type) (rate(cerniq_etapa3_pii_access_total{authorized=\"false\"}[5m])) * 60",
            "legendFormat": "{{ data_type }} (unauthorized)"
          }
        ]
      },
      {
        "title": "Top Blocked IPs (24h)",
        "type": "table",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 20 },
        "targets": [
          {
            "expr": "topk(10, sum by (ipAddress) (increase(cerniq_etapa3_auth_attempts_total{status=\"failure\"}[24h])))",
            "legendFormat": "{{ ipAddress }}"
          }
        ]
      },
      {
        "title": "Access Denied by Resource",
        "type": "piechart",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 20 },
        "targets": [
          {
            "expr": "sum by (resource) (increase(cerniq_etapa3_access_denied_total[24h]))",
            "legendFormat": "{{ resource }}"
          }
        ]
      }
    ],
    "templating": {
      "list": [
        {
          "name": "tenant",
          "type": "query",
          "query": "label_values(cerniq_etapa3_auth_attempts_total, tenant_id)",
          "includeAll": true,
          "multi": true
        }
      ]
    }
  }
}
```

### 14.4 Security Audit Log

```typescript
// src/monitoring/audit-log.ts

import { db } from '../db';
import { auditLogs } from '../db/schema';
import { createLogger } from './structured-logging';
import crypto from 'crypto';

/**
 * Security Audit Log
 * 
 * Immutable audit trail pentru toate acțiunile sensibile
 * Conform GDPR și cerințele de compliance
 */

const logger = createLogger('audit-log');

export interface AuditEntry {
  id?: string;
  tenantId: string;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  previousHash?: string;
  hash?: string;
}

export type AuditAction =
  // Auth actions
  | 'login'
  | 'logout'
  | 'password_change'
  | 'mfa_enable'
  | 'mfa_disable'
  | 'api_key_create'
  | 'api_key_revoke'
  // Data actions
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  // Contact/Lead actions
  | 'contact_view'
  | 'contact_update'
  | 'contact_delete'
  | 'contact_export'
  | 'pii_access'
  // Conversation actions
  | 'conversation_start'
  | 'conversation_message'
  | 'conversation_end'
  // HITL actions
  | 'hitl_approve'
  | 'hitl_reject'
  | 'hitl_escalate'
  // System actions
  | 'config_change'
  | 'permission_change'
  | 'user_create'
  | 'user_delete';

export class AuditLogger {
  private lastHash: string | null = null;
  
  /**
   * Log an audit entry with hash chain for tamper detection
   */
  async log(entry: Omit<AuditEntry, 'id' | 'hash' | 'previousHash'>): Promise<string> {
    const id = crypto.randomUUID();
    const previousHash = this.lastHash || 'genesis';
    
    // Create hash for integrity verification
    const hashInput = JSON.stringify({
      id,
      ...entry,
      previousHash,
    });
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
    
    const fullEntry: AuditEntry = {
      id,
      ...entry,
      previousHash,
      hash,
    };
    
    // Persist to database
    await db.insert(auditLogs).values({
      id,
      tenantId: entry.tenantId,
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      details: entry.details,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      previousHash,
      hash,
      createdAt: entry.timestamp,
    });
    
    // Update last hash for chain
    this.lastHash = hash;
    
    // Also log to structured logger for real-time monitoring
    logger.info({
      auditId: id,
      tenantId: entry.tenantId,
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
    }, `Audit: ${entry.action} on ${entry.resourceType}`);
    
    return id;
  }
  
  /**
   * Verify integrity of audit log chain
   */
  async verifyIntegrity(tenantId: string, startFrom?: Date): Promise<{
    valid: boolean;
    checkedEntries: number;
    invalidEntries: string[];
  }> {
    const entries = await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(auditLogs.createdAt);
    
    let previousHash = 'genesis';
    const invalidEntries: string[] = [];
    
    for (const entry of entries) {
      // Verify previous hash matches
      if (entry.previousHash !== previousHash) {
        invalidEntries.push(entry.id);
        continue;
      }
      
      // Recalculate and verify hash
      const hashInput = JSON.stringify({
        id: entry.id,
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        details: entry.details,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        timestamp: entry.createdAt,
        previousHash: entry.previousHash,
      });
      const calculatedHash = crypto.createHash('sha256').update(hashInput).digest('hex');
      
      if (calculatedHash !== entry.hash) {
        invalidEntries.push(entry.id);
      }
      
      previousHash = entry.hash;
    }
    
    return {
      valid: invalidEntries.length === 0,
      checkedEntries: entries.length,
      invalidEntries,
    };
  }
  
  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================
  
  async logLogin(
    tenantId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    success: boolean
  ): Promise<string> {
    return this.log({
      tenantId,
      userId,
      action: 'login',
      resourceType: 'session',
      details: { success },
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  }
  
  async logDataAccess(
    tenantId: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    action: 'read' | 'update' | 'delete',
    ipAddress?: string
  ): Promise<string> {
    return this.log({
      tenantId,
      userId,
      action,
      resourceType,
      resourceId,
      details: {},
      ipAddress,
      timestamp: new Date(),
    });
  }
  
  async logPIIAccess(
    tenantId: string,
    userId: string,
    piiType: string,
    contactId: string,
    reason: string,
    ipAddress?: string
  ): Promise<string> {
    return this.log({
      tenantId,
      userId,
      action: 'pii_access',
      resourceType: 'contact',
      resourceId: contactId,
      details: { piiType, reason },
      ipAddress,
      timestamp: new Date(),
    });
  }
  
  async logHITLAction(
    tenantId: string,
    userId: string,
    approvalId: string,
    action: 'hitl_approve' | 'hitl_reject' | 'hitl_escalate',
    reason?: string
  ): Promise<string> {
    return this.log({
      tenantId,
      userId,
      action,
      resourceType: 'hitl_approval',
      resourceId: approvalId,
      details: { reason },
      timestamp: new Date(),
    });
  }
  
  async logConversationMessage(
    tenantId: string,
    userId: string,
    conversationId: string,
    messageId: string,
    role: 'user' | 'assistant'
  ): Promise<string> {
    return this.log({
      tenantId,
      userId,
      action: 'conversation_message',
      resourceType: 'conversation',
      resourceId: conversationId,
      details: { messageId, role },
      timestamp: new Date(),
    });
  }
  
  async logExport(
    tenantId: string,
    userId: string,
    resourceType: string,
    recordCount: number,
    format: string,
    ipAddress?: string
  ): Promise<string> {
    return this.log({
      tenantId,
      userId,
      action: 'export',
      resourceType,
      details: { recordCount, format },
      ipAddress,
      timestamp: new Date(),
    });
  }
  
  async logConfigChange(
    tenantId: string,
    userId: string,
    configType: string,
    oldValue: unknown,
    newValue: unknown
  ): Promise<string> {
    return this.log({
      tenantId,
      userId,
      action: 'config_change',
      resourceType: 'config',
      resourceId: configType,
      details: { oldValue, newValue },
      timestamp: new Date(),
    });
  }
}

// Import eq for queries
import { eq } from 'drizzle-orm';

export const auditLogger = new AuditLogger();
```


---

## 15. Performance Baselines și Benchmarking

### 15.1 Performance Baseline Definitions

```typescript
// src/monitoring/performance-baselines.ts

import { Gauge, register } from 'prom-client';
import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Performance Baselines pentru Etapa 3
 * 
 * Definește și monitorizează baseline-urile de performanță
 * pentru toate componentele sistemului
 */

// ============================================================================
// BASELINE DEFINITIONS
// ============================================================================

export interface PerformanceBaseline {
  metric: string;
  component: string;
  baseline: {
    p50: number;
    p95: number;
    p99: number;
  };
  thresholds: {
    warning: number;  // multiplier over p95
    critical: number; // multiplier over p99
  };
  unit: string;
}

export const PERFORMANCE_BASELINES: PerformanceBaseline[] = [
  // API Response Times
  {
    metric: 'api_response_time',
    component: 'api_gateway',
    baseline: { p50: 50, p95: 200, p99: 500 },
    thresholds: { warning: 1.5, critical: 2.0 },
    unit: 'ms',
  },
  {
    metric: 'api_response_time',
    component: 'conversation_api',
    baseline: { p50: 100, p95: 500, p99: 1000 },
    thresholds: { warning: 1.5, critical: 2.0 },
    unit: 'ms',
  },
  {
    metric: 'api_response_time',
    component: 'hitl_api',
    baseline: { p50: 75, p95: 250, p99: 500 },
    thresholds: { warning: 1.5, critical: 2.0 },
    unit: 'ms',
  },
  
  // LLM Response Times
  {
    metric: 'llm_latency',
    component: 'claude_sonnet',
    baseline: { p50: 1500, p95: 4000, p99: 8000 },
    thresholds: { warning: 1.25, critical: 1.5 },
    unit: 'ms',
  },
  {
    metric: 'llm_latency',
    component: 'claude_haiku',
    baseline: { p50: 500, p95: 1500, p99: 3000 },
    thresholds: { warning: 1.25, critical: 1.5 },
    unit: 'ms',
  },
  {
    metric: 'llm_latency',
    component: 'guardrails',
    baseline: { p50: 200, p95: 500, p99: 1000 },
    thresholds: { warning: 1.5, critical: 2.0 },
    unit: 'ms',
  },
  
  // Database Query Times
  {
    metric: 'db_query_time',
    component: 'conversations_read',
    baseline: { p50: 5, p95: 20, p99: 50 },
    thresholds: { warning: 2.0, critical: 3.0 },
    unit: 'ms',
  },
  {
    metric: 'db_query_time',
    component: 'conversations_write',
    baseline: { p50: 10, p95: 50, p99: 100 },
    thresholds: { warning: 2.0, critical: 3.0 },
    unit: 'ms',
  },
  {
    metric: 'db_query_time',
    component: 'contacts_search',
    baseline: { p50: 20, p95: 100, p99: 250 },
    thresholds: { warning: 2.0, critical: 3.0 },
    unit: 'ms',
  },
  {
    metric: 'db_query_time',
    component: 'analytics_aggregation',
    baseline: { p50: 100, p95: 500, p99: 2000 },
    thresholds: { warning: 1.5, critical: 2.0 },
    unit: 'ms',
  },
  
  // Worker Processing Times
  {
    metric: 'worker_processing_time',
    component: 'ai_agent_core',
    baseline: { p50: 3000, p95: 8000, p99: 15000 },
    thresholds: { warning: 1.25, critical: 1.5 },
    unit: 'ms',
  },
  {
    metric: 'worker_processing_time',
    component: 'negotiation_fsm',
    baseline: { p50: 500, p95: 2000, p99: 5000 },
    thresholds: { warning: 1.5, critical: 2.0 },
    unit: 'ms',
  },
  {
    metric: 'worker_processing_time',
    component: 'efactura',
    baseline: { p50: 2000, p95: 5000, p99: 10000 },
    thresholds: { warning: 1.5, critical: 2.0 },
    unit: 'ms',
  },
  {
    metric: 'worker_processing_time',
    component: 'guardrails',
    baseline: { p50: 300, p95: 800, p99: 1500 },
    thresholds: { warning: 1.5, critical: 2.0 },
    unit: 'ms',
  },
  
  // Queue Metrics
  {
    metric: 'queue_wait_time',
    component: 'high_priority',
    baseline: { p50: 100, p95: 500, p99: 1000 },
    thresholds: { warning: 2.0, critical: 5.0 },
    unit: 'ms',
  },
  {
    metric: 'queue_wait_time',
    component: 'normal_priority',
    baseline: { p50: 500, p95: 2000, p99: 5000 },
    thresholds: { warning: 2.0, critical: 3.0 },
    unit: 'ms',
  },
  {
    metric: 'queue_depth',
    component: 'ai_agent',
    baseline: { p50: 10, p95: 50, p99: 100 },
    thresholds: { warning: 2.0, critical: 5.0 },
    unit: 'jobs',
  },
  
  // External API Latencies
  {
    metric: 'external_api_latency',
    component: 'anaf',
    baseline: { p50: 1000, p95: 3000, p99: 5000 },
    thresholds: { warning: 1.5, critical: 2.0 },
    unit: 'ms',
  },
  {
    metric: 'external_api_latency',
    component: 'termene',
    baseline: { p50: 500, p95: 1500, p99: 3000 },
    thresholds: { warning: 1.5, critical: 2.0 },
    unit: 'ms',
  },
  {
    metric: 'external_api_latency',
    component: 'oblio',
    baseline: { p50: 300, p95: 1000, p99: 2000 },
    thresholds: { warning: 1.5, critical: 2.0 },
    unit: 'ms',
  },
  
  // Memory and Resource Usage
  {
    metric: 'memory_usage',
    component: 'api_server',
    baseline: { p50: 512, p95: 768, p99: 1024 },
    thresholds: { warning: 1.25, critical: 1.5 },
    unit: 'MB',
  },
  {
    metric: 'memory_usage',
    component: 'worker',
    baseline: { p50: 256, p95: 512, p99: 768 },
    thresholds: { warning: 1.5, critical: 2.0 },
    unit: 'MB',
  },
  {
    metric: 'cpu_usage',
    component: 'api_server',
    baseline: { p50: 20, p95: 50, p99: 70 },
    thresholds: { warning: 1.4, critical: 1.7 },
    unit: 'percent',
  },
];

// ============================================================================
// BASELINE METRICS
// ============================================================================

const baselineP50 = new Gauge({
  name: 'cerniq_etapa3_baseline_p50',
  help: 'Performance baseline P50 value',
  labelNames: ['metric', 'component', 'unit'],
});

const baselineP95 = new Gauge({
  name: 'cerniq_etapa3_baseline_p95',
  help: 'Performance baseline P95 value',
  labelNames: ['metric', 'component', 'unit'],
});

const baselineP99 = new Gauge({
  name: 'cerniq_etapa3_baseline_p99',
  help: 'Performance baseline P99 value',
  labelNames: ['metric', 'component', 'unit'],
});

const baselineDeviation = new Gauge({
  name: 'cerniq_etapa3_baseline_deviation_ratio',
  help: 'Current deviation from baseline (1.0 = at baseline)',
  labelNames: ['metric', 'component', 'percentile'],
});

// ============================================================================
// BASELINE MANAGER
// ============================================================================

export class BaselineManager {
  private baselines: Map<string, PerformanceBaseline>;
  
  constructor() {
    this.baselines = new Map();
    
    // Load baselines
    for (const baseline of PERFORMANCE_BASELINES) {
      const key = `${baseline.metric}:${baseline.component}`;
      this.baselines.set(key, baseline);
      
      // Set baseline metrics
      const labels = {
        metric: baseline.metric,
        component: baseline.component,
        unit: baseline.unit,
      };
      
      baselineP50.set(labels, baseline.baseline.p50);
      baselineP95.set(labels, baseline.baseline.p95);
      baselineP99.set(labels, baseline.baseline.p99);
    }
  }
  
  /**
   * Get baseline for a metric/component
   */
  getBaseline(metric: string, component: string): PerformanceBaseline | undefined {
    return this.baselines.get(`${metric}:${component}`);
  }
  
  /**
   * Check if current value exceeds baseline thresholds
   */
  checkThreshold(
    metric: string,
    component: string,
    currentValue: number,
    percentile: 'p50' | 'p95' | 'p99'
  ): { status: 'ok' | 'warning' | 'critical'; deviation: number } {
    const baseline = this.getBaseline(metric, component);
    
    if (!baseline) {
      return { status: 'ok', deviation: 1.0 };
    }
    
    const baselineValue = baseline.baseline[percentile];
    const deviation = currentValue / baselineValue;
    
    // Update deviation metric
    baselineDeviation.set(
      { metric, component, percentile },
      deviation
    );
    
    if (deviation >= baseline.thresholds.critical) {
      return { status: 'critical', deviation };
    } else if (deviation >= baseline.thresholds.warning) {
      return { status: 'warning', deviation };
    }
    
    return { status: 'ok', deviation };
  }
  
  /**
   * Update baseline from historical data
   */
  async recalculateBaseline(
    metric: string,
    component: string,
    daysOfData: number = 7
  ): Promise<PerformanceBaseline | null> {
    // This would query historical metrics and calculate new baselines
    // Implementation depends on metrics storage (Prometheus, ClickHouse, etc.)
    
    // Example query structure:
    const query = `
      SELECT
        quantile(0.50)(value) as p50,
        quantile(0.95)(value) as p95,
        quantile(0.99)(value) as p99
      FROM cerniq_metrics
      WHERE metric = '${metric}'
        AND component = '${component}'
        AND timestamp > now() - INTERVAL ${daysOfData} DAY
    `;
    
    // Execute query and update baseline
    // This is a placeholder - actual implementation would use ClickHouse client
    
    return null;
  }
  
  /**
   * Get all baselines as report
   */
  getBaselineReport(): {
    metric: string;
    component: string;
    baseline: { p50: number; p95: number; p99: number };
    unit: string;
  }[] {
    return Array.from(this.baselines.values()).map(b => ({
      metric: b.metric,
      component: b.component,
      baseline: b.baseline,
      unit: b.unit,
    }));
  }
}

export const baselineManager = new BaselineManager();
```

### 15.2 Benchmark Tests

```typescript
// src/monitoring/benchmarks.ts

import { Counter, Histogram, Gauge, register } from 'prom-client';

/**
 * Benchmark Tests pentru Etapa 3
 * 
 * Definește și rulează benchmark-uri periodice
 * pentru validarea performanței sistemului
 */

// ============================================================================
// BENCHMARK METRICS
// ============================================================================

const benchmarkDuration = new Histogram({
  name: 'cerniq_etapa3_benchmark_duration_seconds',
  help: 'Benchmark execution duration',
  labelNames: ['benchmark', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});

const benchmarkScore = new Gauge({
  name: 'cerniq_etapa3_benchmark_score',
  help: 'Benchmark score (operations per second or similar)',
  labelNames: ['benchmark'],
});

const benchmarkStatus = new Gauge({
  name: 'cerniq_etapa3_benchmark_status',
  help: 'Benchmark pass/fail status (1=pass, 0=fail)',
  labelNames: ['benchmark'],
});

const benchmarkLastRun = new Gauge({
  name: 'cerniq_etapa3_benchmark_last_run_timestamp',
  help: 'Last benchmark run timestamp',
  labelNames: ['benchmark'],
});

// ============================================================================
// BENCHMARK DEFINITIONS
// ============================================================================

export interface BenchmarkResult {
  name: string;
  passed: boolean;
  score: number;
  unit: string;
  duration: number;
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface BenchmarkConfig {
  name: string;
  description: string;
  minScore: number;
  unit: string;
  timeout: number;  // ms
  run: () => Promise<{ score: number; details: Record<string, unknown> }>;
}

// ============================================================================
// BENCHMARK SUITE
// ============================================================================

export const BENCHMARKS: BenchmarkConfig[] = [
  // API Response Benchmark
  {
    name: 'api_conversation_list',
    description: 'List conversations API endpoint throughput',
    minScore: 100,  // requests per second
    unit: 'req/s',
    timeout: 30000,
    run: async () => {
      const iterations = 100;
      const start = performance.now();
      
      // Simulate API calls
      const promises = Array(iterations).fill(null).map(async () => {
        // In production, this would make actual HTTP requests
        await new Promise(r => setTimeout(r, 10));
        return true;
      });
      
      await Promise.all(promises);
      const duration = (performance.now() - start) / 1000;
      const score = iterations / duration;
      
      return {
        score,
        details: { iterations, duration, avgLatency: duration / iterations * 1000 },
      };
    },
  },
  
  // Database Query Benchmark
  {
    name: 'db_contact_search',
    description: 'Contact search query performance',
    minScore: 500,  // queries per second
    unit: 'q/s',
    timeout: 30000,
    run: async () => {
      const iterations = 100;
      const start = performance.now();
      
      // Simulate database queries
      for (let i = 0; i < iterations; i++) {
        await new Promise(r => setTimeout(r, 2));
      }
      
      const duration = (performance.now() - start) / 1000;
      const score = iterations / duration;
      
      return {
        score,
        details: { iterations, duration, avgLatency: duration / iterations * 1000 },
      };
    },
  },
  
  // LLM Throughput Benchmark
  {
    name: 'llm_classification',
    description: 'LLM classification throughput',
    minScore: 10,  // classifications per second
    unit: 'cls/s',
    timeout: 60000,
    run: async () => {
      const iterations = 20;
      const start = performance.now();
      
      // Simulate LLM calls
      for (let i = 0; i < iterations; i++) {
        await new Promise(r => setTimeout(r, 100));
      }
      
      const duration = (performance.now() - start) / 1000;
      const score = iterations / duration;
      
      return {
        score,
        details: { iterations, duration, avgLatency: duration / iterations * 1000 },
      };
    },
  },
  
  // Worker Processing Benchmark
  {
    name: 'worker_message_processing',
    description: 'Message processing throughput',
    minScore: 50,  // messages per second
    unit: 'msg/s',
    timeout: 30000,
    run: async () => {
      const iterations = 50;
      const start = performance.now();
      
      // Simulate message processing
      for (let i = 0; i < iterations; i++) {
        await new Promise(r => setTimeout(r, 20));
      }
      
      const duration = (performance.now() - start) / 1000;
      const score = iterations / duration;
      
      return {
        score,
        details: { iterations, duration, avgLatency: duration / iterations * 1000 },
      };
    },
  },
  
  // Queue Processing Benchmark
  {
    name: 'queue_throughput',
    description: 'BullMQ job processing throughput',
    minScore: 200,  // jobs per second
    unit: 'jobs/s',
    timeout: 30000,
    run: async () => {
      const iterations = 100;
      const start = performance.now();
      
      // Simulate queue processing
      const promises = Array(iterations).fill(null).map(async () => {
        await new Promise(r => setTimeout(r, 5));
        return true;
      });
      
      await Promise.all(promises);
      const duration = (performance.now() - start) / 1000;
      const score = iterations / duration;
      
      return {
        score,
        details: { iterations, duration, avgLatency: duration / iterations * 1000 },
      };
    },
  },
  
  // Memory Allocation Benchmark
  {
    name: 'memory_allocation',
    description: 'Memory allocation efficiency',
    minScore: 1000,  // allocations per second
    unit: 'alloc/s',
    timeout: 10000,
    run: async () => {
      const iterations = 1000;
      const start = performance.now();
      
      // Simulate memory allocations
      const arrays: unknown[] = [];
      for (let i = 0; i < iterations; i++) {
        arrays.push(new Array(1000).fill(i));
      }
      
      const duration = (performance.now() - start) / 1000;
      const score = iterations / duration;
      
      // Cleanup
      arrays.length = 0;
      
      return {
        score,
        details: { iterations, duration },
      };
    },
  },
  
  // JSON Serialization Benchmark
  {
    name: 'json_serialization',
    description: 'JSON serialization performance',
    minScore: 10000,  // operations per second
    unit: 'ops/s',
    timeout: 10000,
    run: async () => {
      const testData = {
        conversation: {
          id: 'test-123',
          tenantId: 'tenant-1',
          contactId: 'contact-456',
          messages: Array(10).fill(null).map((_, i) => ({
            id: `msg-${i}`,
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: 'Test message content '.repeat(10),
            timestamp: new Date().toISOString(),
          })),
          metadata: { key: 'value' },
        },
      };
      
      const iterations = 10000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const json = JSON.stringify(testData);
        JSON.parse(json);
      }
      
      const duration = (performance.now() - start) / 1000;
      const score = iterations / duration;
      
      return {
        score,
        details: { iterations, duration, dataSize: JSON.stringify(testData).length },
      };
    },
  },
];

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

export class BenchmarkRunner {
  private results: Map<string, BenchmarkResult> = new Map();
  
  /**
   * Run a single benchmark
   */
  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const startTime = performance.now();
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Benchmark timeout')), config.timeout);
      });
      
      const { score, details } = await Promise.race([
        config.run(),
        timeoutPromise,
      ]);
      
      const duration = (performance.now() - startTime) / 1000;
      const passed = score >= config.minScore;
      
      const result: BenchmarkResult = {
        name: config.name,
        passed,
        score,
        unit: config.unit,
        duration,
        details,
        timestamp: new Date(),
      };
      
      // Update metrics
      benchmarkDuration.observe(
        { benchmark: config.name, status: passed ? 'pass' : 'fail' },
        duration
      );
      benchmarkScore.set({ benchmark: config.name }, score);
      benchmarkStatus.set({ benchmark: config.name }, passed ? 1 : 0);
      benchmarkLastRun.set({ benchmark: config.name }, Date.now() / 1000);
      
      this.results.set(config.name, result);
      return result;
      
    } catch (error) {
      const duration = (performance.now() - startTime) / 1000;
      
      const result: BenchmarkResult = {
        name: config.name,
        passed: false,
        score: 0,
        unit: config.unit,
        duration,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date(),
      };
      
      benchmarkDuration.observe(
        { benchmark: config.name, status: 'error' },
        duration
      );
      benchmarkStatus.set({ benchmark: config.name }, 0);
      benchmarkLastRun.set({ benchmark: config.name }, Date.now() / 1000);
      
      this.results.set(config.name, result);
      return result;
    }
  }
  
  /**
   * Run all benchmarks
   */
  async runAll(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    
    for (const benchmark of BENCHMARKS) {
      const result = await this.runBenchmark(benchmark);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Get last result for a benchmark
   */
  getLastResult(name: string): BenchmarkResult | undefined {
    return this.results.get(name);
  }
  
  /**
   * Get all last results
   */
  getAllResults(): BenchmarkResult[] {
    return Array.from(this.results.values());
  }
  
  /**
   * Generate benchmark report
   */
  generateReport(): {
    timestamp: Date;
    passed: number;
    failed: number;
    total: number;
    results: BenchmarkResult[];
  } {
    const results = this.getAllResults();
    const passed = results.filter(r => r.passed).length;
    
    return {
      timestamp: new Date(),
      passed,
      failed: results.length - passed,
      total: results.length,
      results,
    };
  }
}

export const benchmarkRunner = new BenchmarkRunner();
```

### 15.3 Performance Regression Detection

```typescript
// src/monitoring/regression-detection.ts

import { Gauge } from 'prom-client';
import { baselineManager, PerformanceBaseline } from './performance-baselines';

/**
 * Performance Regression Detection
 * 
 * Detectează automat regresii de performanță
 * bazat pe baseline-uri și trend analysis
 */

// ============================================================================
// REGRESSION METRICS
// ============================================================================

const regressionDetected = new Gauge({
  name: 'cerniq_etapa3_regression_detected',
  help: 'Performance regression detected (1=yes, 0=no)',
  labelNames: ['metric', 'component'],
});

const regressionSeverity = new Gauge({
  name: 'cerniq_etapa3_regression_severity',
  help: 'Regression severity score (0-100)',
  labelNames: ['metric', 'component'],
});

const trendDirection = new Gauge({
  name: 'cerniq_etapa3_trend_direction',
  help: 'Performance trend direction (-1=degrading, 0=stable, 1=improving)',
  labelNames: ['metric', 'component'],
});

// ============================================================================
// REGRESSION DETECTOR
// ============================================================================

export interface RegressionAlert {
  metric: string;
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentValue: number;
  baselineValue: number;
  deviation: number;
  trend: 'degrading' | 'stable' | 'improving';
  recommendation: string;
  timestamp: Date;
}

export interface TrendAnalysis {
  direction: 'degrading' | 'stable' | 'improving';
  slope: number;
  confidence: number;
  dataPoints: number;
}

export class RegressionDetector {
  private historicalData: Map<string, number[]> = new Map();
  private windowSize = 100;  // Number of data points to keep
  
  /**
   * Record a metric value and check for regression
   */
  recordAndCheck(
    metric: string,
    component: string,
    value: number,
    percentile: 'p50' | 'p95' | 'p99' = 'p95'
  ): RegressionAlert | null {
    const key = `${metric}:${component}`;
    
    // Store historical value
    let history = this.historicalData.get(key) || [];
    history.push(value);
    
    // Keep only recent values
    if (history.length > this.windowSize) {
      history = history.slice(-this.windowSize);
    }
    this.historicalData.set(key, history);
    
    // Check baseline threshold
    const thresholdResult = baselineManager.checkThreshold(
      metric,
      component,
      value,
      percentile
    );
    
    // Analyze trend
    const trend = this.analyzeTrend(history);
    
    // Update metrics
    const isRegression = thresholdResult.status !== 'ok' || trend.direction === 'degrading';
    regressionDetected.set({ metric, component }, isRegression ? 1 : 0);
    trendDirection.set(
      { metric, component },
      trend.direction === 'improving' ? 1 : (trend.direction === 'stable' ? 0 : -1)
    );
    
    // Generate alert if regression detected
    if (isRegression) {
      const baseline = baselineManager.getBaseline(metric, component);
      const baselineValue = baseline?.baseline[percentile] || 0;
      
      const severity = this.calculateSeverity(thresholdResult.deviation, trend);
      regressionSeverity.set({ metric, component }, this.severityToScore(severity));
      
      return {
        metric,
        component,
        severity,
        currentValue: value,
        baselineValue,
        deviation: thresholdResult.deviation,
        trend: trend.direction,
        recommendation: this.generateRecommendation(metric, component, severity, trend),
        timestamp: new Date(),
      };
    }
    
    return null;
  }
  
  /**
   * Analyze trend from historical data
   */
  private analyzeTrend(data: number[]): TrendAnalysis {
    if (data.length < 10) {
      return { direction: 'stable', slope: 0, confidence: 0, dataPoints: data.length };
    }
    
    // Simple linear regression
    const n = data.length;
    const xMean = (n - 1) / 2;
    const yMean = data.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (data[i] - yMean);
      denominator += (i - xMean) ** 2;
    }
    
    const slope = numerator / denominator;
    
    // Calculate R-squared for confidence
    const predictions = data.map((_, i) => yMean + slope * (i - xMean));
    const ssRes = data.reduce((sum, y, i) => sum + (y - predictions[i]) ** 2, 0);
    const ssTot = data.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
    const rSquared = 1 - ssRes / ssTot;
    
    // Determine direction based on slope magnitude
    const normalizedSlope = slope / yMean;  // Normalize by mean
    
    let direction: 'degrading' | 'stable' | 'improving';
    if (normalizedSlope > 0.01) {
      direction = 'degrading';  // Higher values = worse performance
    } else if (normalizedSlope < -0.01) {
      direction = 'improving';
    } else {
      direction = 'stable';
    }
    
    return {
      direction,
      slope: normalizedSlope,
      confidence: Math.max(0, rSquared),
      dataPoints: n,
    };
  }
  
  /**
   * Calculate severity based on deviation and trend
   */
  private calculateSeverity(
    deviation: number,
    trend: TrendAnalysis
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Base severity on deviation
    let severity: 'low' | 'medium' | 'high' | 'critical';
    
    if (deviation >= 2.0) {
      severity = 'critical';
    } else if (deviation >= 1.5) {
      severity = 'high';
    } else if (deviation >= 1.25) {
      severity = 'medium';
    } else {
      severity = 'low';
    }
    
    // Increase severity if trend is also degrading
    if (trend.direction === 'degrading' && trend.confidence > 0.7) {
      if (severity === 'low') severity = 'medium';
      else if (severity === 'medium') severity = 'high';
    }
    
    return severity;
  }
  
  private severityToScore(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    switch (severity) {
      case 'critical': return 100;
      case 'high': return 75;
      case 'medium': return 50;
      case 'low': return 25;
    }
  }
  
  /**
   * Generate recommendation based on regression type
   */
  private generateRecommendation(
    metric: string,
    component: string,
    severity: string,
    trend: TrendAnalysis
  ): string {
    const recommendations: Record<string, string> = {
      'api_response_time': 'Review recent API changes, check database query performance, verify external service latencies',
      'llm_latency': 'Check LLM provider status, review prompt complexity, consider model downgrade for simple tasks',
      'db_query_time': 'Analyze query plans, check index usage, review recent schema changes',
      'worker_processing_time': 'Check worker queue depths, review recent code changes, verify resource availability',
      'queue_wait_time': 'Scale workers, review job prioritization, check for stuck jobs',
      'external_api_latency': 'Check external service status, implement caching, review retry policies',
      'memory_usage': 'Check for memory leaks, review recent deployments, analyze object allocations',
      'cpu_usage': 'Profile hot paths, review recent code changes, check for runaway processes',
    };
    
    const baseRec = recommendations[metric] || 'Review recent changes and system metrics';
    
    if (trend.direction === 'degrading' && trend.confidence > 0.7) {
      return `${baseRec}. Note: Performance has been degrading over time with ${(trend.confidence * 100).toFixed(0)}% confidence.`;
    }
    
    return baseRec;
  }
  
  /**
   * Get all current regressions
   */
  getCurrentRegressions(): RegressionAlert[] {
    const regressions: RegressionAlert[] = [];
    
    for (const [key, history] of this.historicalData.entries()) {
      const [metric, component] = key.split(':');
      const currentValue = history[history.length - 1];
      
      const alert = this.recordAndCheck(metric, component, currentValue);
      if (alert) {
        regressions.push(alert);
      }
    }
    
    return regressions;
  }
}

export const regressionDetector = new RegressionDetector();
```

### 15.4 Performance Alerting Rules

```yaml
# prometheus/rules/performance-alerts.yaml

groups:
  - name: etapa3_performance_regression_alerts
    interval: 1m
    rules:
      # ========================================================================
      # BASELINE DEVIATION ALERTS
      # ========================================================================
      
      - alert: PerformanceRegression
        expr: |
          cerniq_etapa3_baseline_deviation_ratio{percentile="p95"} > 1.5
        for: 10m
        labels:
          severity: warning
          team: platform
          category: performance
        annotations:
          summary: "Performance regression: {{ $labels.metric }} on {{ $labels.component }}"
          description: |
            {{ $labels.metric }} P95 is {{ $value | printf "%.2f" }}x baseline for {{ $labels.component }}.
            
            Check recent deployments and system changes.

      - alert: SeverePerformanceRegression
        expr: |
          cerniq_etapa3_baseline_deviation_ratio{percentile="p99"} > 2.0
        for: 5m
        labels:
          severity: critical
          team: platform
          category: performance
        annotations:
          summary: "Severe performance regression: {{ $labels.metric }} on {{ $labels.component }}"
          description: |
            {{ $labels.metric }} P99 is {{ $value | printf "%.2f" }}x baseline for {{ $labels.component }}.
            
            Immediate investigation required.

      # ========================================================================
      # TREND ALERTS
      # ========================================================================
      
      - alert: PerformanceDegradingTrend
        expr: |
          cerniq_etapa3_trend_direction == -1
          and
          cerniq_etapa3_baseline_deviation_ratio{percentile="p95"} > 1.2
        for: 30m
        labels:
          severity: warning
          team: platform
          category: performance
        annotations:
          summary: "Degrading performance trend: {{ $labels.metric }} on {{ $labels.component }}"
          description: |
            {{ $labels.metric }} is showing a degrading trend for {{ $labels.component }}.
            
            Proactive investigation recommended.

      # ========================================================================
      # BENCHMARK ALERTS
      # ========================================================================
      
      - alert: BenchmarkFailed
        expr: |
          cerniq_etapa3_benchmark_status == 0
        for: 5m
        labels:
          severity: warning
          team: platform
          category: benchmark
        annotations:
          summary: "Benchmark failed: {{ $labels.benchmark }}"
          description: |
            Benchmark {{ $labels.benchmark }} is failing.
            Current score: {{ with query "cerniq_etapa3_benchmark_score" }}{{ . | first | value | printf "%.2f" }}{{ end }}
            
            Review benchmark criteria and system performance.

      - alert: BenchmarkScoreDrop
        expr: |
          (
            cerniq_etapa3_benchmark_score 
            / 
            cerniq_etapa3_benchmark_score offset 1h
          ) < 0.8
        for: 15m
        labels:
          severity: warning
          team: platform
          category: benchmark
        annotations:
          summary: "Benchmark score dropped: {{ $labels.benchmark }}"
          description: |
            Benchmark {{ $labels.benchmark }} score dropped by more than 20% in the last hour.
            
            Check for recent changes affecting performance.

      - alert: BenchmarkNotRun
        expr: |
          (time() - cerniq_etapa3_benchmark_last_run_timestamp) > 86400
        for: 1h
        labels:
          severity: info
          team: platform
          category: benchmark
        annotations:
          summary: "Benchmark not run in 24h: {{ $labels.benchmark }}"
          description: |
            Benchmark {{ $labels.benchmark }} hasn't run in over 24 hours.
            
            Verify benchmark scheduler is operational.

      # ========================================================================
      # REGRESSION SEVERITY ALERTS
      # ========================================================================
      
      - alert: HighRegressionSeverity
        expr: |
          cerniq_etapa3_regression_severity > 75
        for: 5m
        labels:
          severity: critical
          team: platform
          category: performance
        annotations:
          summary: "High regression severity: {{ $labels.metric }} on {{ $labels.component }}"
          description: |
            Regression severity is {{ $value }} for {{ $labels.metric }} on {{ $labels.component }}.
            
            Immediate attention required.

      - alert: MultipleRegressions
        expr: |
          count(cerniq_etapa3_regression_detected == 1) > 3
        for: 10m
        labels:
          severity: warning
          team: platform
          category: performance
        annotations:
          summary: "Multiple performance regressions detected"
          description: |
            {{ $value }} components are showing performance regressions.
            
            System may be experiencing widespread degradation.
```


---

## 16. Incident Response Integration

### 16.1 AlertManager Configuration

```yaml
# alertmanager/alertmanager.yaml

global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.resend.com:587'
  smtp_from: 'alerts@cerniq.app'
  smtp_auth_username: 'resend'
  smtp_auth_password_file: '/etc/alertmanager/secrets/smtp_password'
  slack_api_url_file: '/etc/alertmanager/secrets/slack_webhook'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

# Route tree
route:
  # Default receiver
  receiver: 'slack-notifications'
  
  # Group alerts by these labels
  group_by: ['alertname', 'severity', 'team']
  
  # Wait before sending first notification
  group_wait: 30s
  
  # Wait before sending subsequent notifications
  group_interval: 5m
  
  # Wait before resending an alert
  repeat_interval: 4h
  
  # Child routes
  routes:
    # Critical alerts -> PagerDuty
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true  # Also send to Slack
    
    # Security alerts -> Security team
    - match:
        category: security
      receiver: 'security-team'
      continue: true
    
    # AI/LLM alerts -> AI team
    - match:
        team: ai
      receiver: 'ai-team-slack'
    
    # Fiscal alerts -> Fiscal team
    - match:
        team: fiscal
      receiver: 'fiscal-team-slack'
    
    # Cost alerts -> Management
    - match:
        category: cost
      receiver: 'management-email'
      repeat_interval: 12h
    
    # SLA alerts -> Operations
    - match:
        category: sla
      receiver: 'operations-slack'

# Inhibition rules
inhibit_rules:
  # Don't alert on warning if critical is firing
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'component']
  
  # Don't alert on component issues if system is down
  - source_match:
      alertname: 'SystemDown'
    target_match_re:
      alertname: '.+'
    equal: ['team']

# Receivers
receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#cerniq-alerts'
        send_resolved: true
        title: '{{ template "slack.title" . }}'
        text: '{{ template "slack.text" . }}'
        actions:
          - type: button
            text: 'View in Grafana'
            url: '{{ template "grafana.url" . }}'
          - type: button
            text: 'Runbook'
            url: '{{ (index .Alerts 0).Annotations.runbook_url }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - routing_key_file: '/etc/alertmanager/secrets/pagerduty_key'
        severity: critical
        description: '{{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ template "pagerduty.firing" . }}'
          num_firing: '{{ .Alerts.Firing | len }}'
          num_resolved: '{{ .Alerts.Resolved | len }}'

  - name: 'security-team'
    slack_configs:
      - channel: '#security-alerts'
        send_resolved: true
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
    email_configs:
      - to: 'security@cerniq.app'
        send_resolved: true

  - name: 'ai-team-slack'
    slack_configs:
      - channel: '#ai-alerts'
        send_resolved: true

  - name: 'fiscal-team-slack'
    slack_configs:
      - channel: '#fiscal-alerts'
        send_resolved: true

  - name: 'operations-slack'
    slack_configs:
      - channel: '#operations'
        send_resolved: true

  - name: 'management-email'
    email_configs:
      - to: 'management@cerniq.app'
        send_resolved: false
        html: '{{ template "email.html" . }}'

# Templates
templates:
  - '/etc/alertmanager/templates/*.tmpl'
```

### 16.2 Alert Templates

```go
{{/* alertmanager/templates/slack.tmpl */}}

{{ define "slack.title" }}
[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}
{{ end }}

{{ define "slack.text" }}
{{ if eq .Status "firing" }}
*Alert:* {{ .CommonLabels.alertname }}
*Severity:* {{ .CommonLabels.severity }}
*Team:* {{ .CommonLabels.team }}

{{ range .Alerts.Firing }}
*Summary:* {{ .Annotations.summary }}
*Description:* {{ .Annotations.description }}
*Since:* {{ .StartsAt.Format "2006-01-02 15:04:05 MST" }}

Labels:
{{ range .Labels.SortedPairs }}• {{ .Name }}: `{{ .Value }}`
{{ end }}
---
{{ end }}
{{ else }}
*Resolved:* {{ .CommonLabels.alertname }}
*Resolved at:* {{ (index .Alerts 0).EndsAt.Format "2006-01-02 15:04:05 MST" }}
{{ end }}
{{ end }}

{{ define "grafana.url" }}
{{- $dashboardUID := "etapa3-overview" -}}
{{- if eq .CommonLabels.category "security" }}{{- $dashboardUID = "etapa3-security" -}}{{ end -}}
{{- if eq .CommonLabels.category "cost" }}{{- $dashboardUID = "etapa3-cost" -}}{{ end -}}
{{- if eq .CommonLabels.category "sla" }}{{- $dashboardUID = "etapa3-sla" -}}{{ end -}}
https://grafana.cerniq.app/d/{{ $dashboardUID }}?from=now-1h&to=now
{{- end }}

{{ define "pagerduty.firing" }}
{{ range .Alerts.Firing }}
Alert: {{ .Labels.alertname }}
Severity: {{ .Labels.severity }}
Summary: {{ .Annotations.summary }}
{{ end }}
{{ end }}
```

```html
{{/* alertmanager/templates/email.html.tmpl */}}

{{ define "email.html" }}
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .header { background: #dc3545; color: white; padding: 15px; }
    .header.resolved { background: #28a745; }
    .content { padding: 20px; }
    .alert { border: 1px solid #ddd; margin: 10px 0; padding: 15px; }
    .label { display: inline-block; background: #e9ecef; padding: 2px 8px; margin: 2px; border-radius: 3px; }
    .severity-critical { border-left: 4px solid #dc3545; }
    .severity-warning { border-left: 4px solid #ffc107; }
    .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; }
  </style>
</head>
<body>
  <div class="header {{ if eq .Status "resolved" }}resolved{{ end }}">
    <h2>{{ if eq .Status "firing" }}🚨 Alert Firing{{ else }}✅ Alert Resolved{{ end }}</h2>
    <p>{{ .CommonLabels.alertname }}</p>
  </div>
  
  <div class="content">
    {{ range .Alerts }}
    <div class="alert severity-{{ .Labels.severity }}">
      <h3>{{ .Annotations.summary }}</h3>
      <p>{{ .Annotations.description }}</p>
      
      <p><strong>Severity:</strong> {{ .Labels.severity }}</p>
      <p><strong>Team:</strong> {{ .Labels.team }}</p>
      <p><strong>Started:</strong> {{ .StartsAt.Format "2006-01-02 15:04:05 MST" }}</p>
      
      <p><strong>Labels:</strong></p>
      {{ range .Labels.SortedPairs }}
      <span class="label">{{ .Name }}: {{ .Value }}</span>
      {{ end }}
    </div>
    {{ end }}
    
    <p style="margin-top: 20px;">
      <a class="btn" href="{{ template "grafana.url" . }}">View in Grafana</a>
    </p>
  </div>
</body>
</html>
{{ end }}
```

### 16.3 Incident Automation

```typescript
// src/monitoring/incident-automation.ts

import { createLogger } from './structured-logging';
import { db } from '../db';
import { incidents, incidentTimeline } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Incident Automation pentru Etapa 3
 * 
 * Automatizează crearea, escalarea și rezolvarea incidentelor
 */

const logger = createLogger('incident-automation');

// ============================================================================
// INCIDENT TYPES
// ============================================================================

export interface Incident {
  id: string;
  tenantId?: string;
  title: string;
  description: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'triggered' | 'acknowledged' | 'investigating' | 'identified' | 'monitoring' | 'resolved';
  category: string;
  source: 'alertmanager' | 'manual' | 'automated';
  alertFingerprint?: string;
  assignee?: string;
  commander?: string;
  affectedServices: string[];
  timeline: IncidentTimelineEntry[];
  metrics: {
    mttd?: number;  // Mean time to detect (seconds)
    mtta?: number;  // Mean time to acknowledge
    mtti?: number;  // Mean time to identify
    mttr?: number;  // Mean time to resolve
  };
  runbook?: string;
  postmortemUrl?: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

export interface IncidentTimelineEntry {
  id: string;
  timestamp: Date;
  type: 'status_change' | 'note' | 'action' | 'escalation' | 'notification';
  author: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface AlertPayload {
  status: 'firing' | 'resolved';
  alerts: Array<{
    status: 'firing' | 'resolved';
    labels: Record<string, string>;
    annotations: Record<string, string>;
    startsAt: string;
    endsAt?: string;
    fingerprint: string;
  }>;
  groupLabels: Record<string, string>;
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
}

// ============================================================================
// INCIDENT MANAGER
// ============================================================================

export class IncidentManager {
  private activeIncidents: Map<string, Incident> = new Map();
  
  /**
   * Create incident from AlertManager webhook
   */
  async handleAlertWebhook(payload: AlertPayload): Promise<string[]> {
    const incidentIds: string[] = [];
    
    for (const alert of payload.alerts) {
      if (alert.status === 'firing') {
        // Check if incident already exists for this alert
        const existing = await this.findByFingerprint(alert.fingerprint);
        
        if (existing) {
          // Update existing incident
          await this.addTimelineEntry(existing.id, {
            type: 'note',
            author: 'system',
            content: `Alert re-triggered: ${alert.annotations.summary}`,
          });
          incidentIds.push(existing.id);
        } else {
          // Create new incident
          const incident = await this.createIncident({
            title: alert.annotations.summary || alert.labels.alertname,
            description: alert.annotations.description || '',
            severity: this.mapSeverity(alert.labels.severity),
            category: alert.labels.category || 'general',
            source: 'alertmanager',
            alertFingerprint: alert.fingerprint,
            affectedServices: this.extractServices(alert.labels),
            runbook: alert.annotations.runbook_url,
          });
          incidentIds.push(incident.id);
        }
      } else {
        // Alert resolved
        const existing = await this.findByFingerprint(alert.fingerprint);
        if (existing && existing.status !== 'resolved') {
          await this.updateStatus(existing.id, 'resolved', 'system', 'Alert resolved automatically');
        }
      }
    }
    
    return incidentIds;
  }
  
  /**
   * Create a new incident
   */
  async createIncident(params: {
    title: string;
    description: string;
    severity: 'P1' | 'P2' | 'P3' | 'P4';
    category: string;
    source: 'alertmanager' | 'manual' | 'automated';
    alertFingerprint?: string;
    affectedServices: string[];
    runbook?: string;
    tenantId?: string;
  }): Promise<Incident> {
    const id = `INC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    const incident: Incident = {
      id,
      ...params,
      status: 'triggered',
      timeline: [],
      metrics: {
        mttd: 0,
      },
      createdAt: new Date(),
    };
    
    // Add initial timeline entry
    incident.timeline.push({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: 'status_change',
      author: 'system',
      content: `Incident created: ${params.title}`,
      metadata: { fromStatus: null, toStatus: 'triggered' },
    });
    
    // Persist to database
    await db.insert(incidents).values({
      id: incident.id,
      tenantId: incident.tenantId,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      category: incident.category,
      source: incident.source,
      alertFingerprint: incident.alertFingerprint,
      affectedServices: incident.affectedServices,
      runbookUrl: incident.runbook,
      createdAt: incident.createdAt,
    });
    
    // Store in memory
    this.activeIncidents.set(id, incident);
    
    // Log
    logger.warn({
      incidentId: id,
      severity: incident.severity,
      title: incident.title,
      category: incident.category,
    }, `Incident created: ${incident.title}`);
    
    // Auto-escalation for P1
    if (incident.severity === 'P1') {
      await this.escalate(id, 'Auto-escalation for P1 incident');
    }
    
    // Send notifications
    await this.sendNotifications(incident, 'created');
    
    return incident;
  }
  
  /**
   * Update incident status
   */
  async updateStatus(
    incidentId: string,
    newStatus: Incident['status'],
    author: string,
    notes?: string
  ): Promise<Incident | null> {
    const incident = this.activeIncidents.get(incidentId) || await this.loadIncident(incidentId);
    
    if (!incident) {
      logger.error({ incidentId }, 'Incident not found');
      return null;
    }
    
    const oldStatus = incident.status;
    incident.status = newStatus;
    
    // Update metrics
    const now = new Date();
    switch (newStatus) {
      case 'acknowledged':
        incident.acknowledgedAt = now;
        incident.metrics.mtta = (now.getTime() - incident.createdAt.getTime()) / 1000;
        break;
      case 'identified':
        incident.metrics.mtti = (now.getTime() - incident.createdAt.getTime()) / 1000;
        break;
      case 'resolved':
        incident.resolvedAt = now;
        incident.metrics.mttr = (now.getTime() - incident.createdAt.getTime()) / 1000;
        break;
    }
    
    // Add timeline entry
    await this.addTimelineEntry(incidentId, {
      type: 'status_change',
      author,
      content: notes || `Status changed from ${oldStatus} to ${newStatus}`,
      metadata: { fromStatus: oldStatus, toStatus: newStatus },
    });
    
    // Update database
    await db.update(incidents)
      .set({
        status: newStatus,
        acknowledgedAt: incident.acknowledgedAt,
        resolvedAt: incident.resolvedAt,
        mtta: incident.metrics.mtta,
        mtti: incident.metrics.mtti,
        mttr: incident.metrics.mttr,
      })
      .where(eq(incidents.id, incidentId));
    
    // Log
    logger.info({
      incidentId,
      oldStatus,
      newStatus,
      author,
    }, `Incident status updated: ${oldStatus} -> ${newStatus}`);
    
    // Send notifications
    await this.sendNotifications(incident, 'status_changed');
    
    // Remove from active if resolved
    if (newStatus === 'resolved') {
      this.activeIncidents.delete(incidentId);
    }
    
    return incident;
  }
  
  /**
   * Add timeline entry
   */
  async addTimelineEntry(
    incidentId: string,
    entry: Omit<IncidentTimelineEntry, 'id' | 'timestamp'>
  ): Promise<void> {
    const incident = this.activeIncidents.get(incidentId) || await this.loadIncident(incidentId);
    
    if (!incident) {
      logger.error({ incidentId }, 'Incident not found for timeline entry');
      return;
    }
    
    const timelineEntry: IncidentTimelineEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...entry,
    };
    
    incident.timeline.push(timelineEntry);
    
    // Persist to database
    await db.insert(incidentTimeline).values({
      id: timelineEntry.id,
      incidentId,
      type: timelineEntry.type,
      author: timelineEntry.author,
      content: timelineEntry.content,
      metadata: timelineEntry.metadata,
      createdAt: timelineEntry.timestamp,
    });
  }
  
  /**
   * Escalate incident
   */
  async escalate(incidentId: string, reason: string): Promise<void> {
    const incident = this.activeIncidents.get(incidentId) || await this.loadIncident(incidentId);
    
    if (!incident) {
      return;
    }
    
    await this.addTimelineEntry(incidentId, {
      type: 'escalation',
      author: 'system',
      content: `Incident escalated: ${reason}`,
    });
    
    // Send escalation notifications
    await this.sendEscalationNotifications(incident, reason);
    
    logger.warn({
      incidentId,
      severity: incident.severity,
      reason,
    }, 'Incident escalated');
  }
  
  /**
   * Assign incident
   */
  async assign(incidentId: string, assignee: string, assigner: string): Promise<void> {
    const incident = this.activeIncidents.get(incidentId) || await this.loadIncident(incidentId);
    
    if (!incident) {
      return;
    }
    
    const previousAssignee = incident.assignee;
    incident.assignee = assignee;
    
    await this.addTimelineEntry(incidentId, {
      type: 'action',
      author: assigner,
      content: `Assigned to ${assignee}${previousAssignee ? ` (was ${previousAssignee})` : ''}`,
    });
    
    await db.update(incidents)
      .set({ assignee })
      .where(eq(incidents.id, incidentId));
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  private mapSeverity(severity?: string): 'P1' | 'P2' | 'P3' | 'P4' {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'P1';
      case 'high': return 'P2';
      case 'warning':
      case 'medium': return 'P3';
      default: return 'P4';
    }
  }
  
  private extractServices(labels: Record<string, string>): string[] {
    const services: string[] = [];
    
    if (labels.service) services.push(labels.service);
    if (labels.component) services.push(labels.component);
    if (labels.worker) services.push(`worker:${labels.worker}`);
    
    return services;
  }
  
  private async findByFingerprint(fingerprint: string): Promise<Incident | null> {
    // Check memory first
    for (const incident of this.activeIncidents.values()) {
      if (incident.alertFingerprint === fingerprint) {
        return incident;
      }
    }
    
    // Check database
    const result = await db.select()
      .from(incidents)
      .where(
        and(
          eq(incidents.alertFingerprint, fingerprint),
          eq(incidents.status, 'triggered')
        )
      )
      .limit(1);
    
    return result[0] ? await this.loadIncident(result[0].id) : null;
  }
  
  private async loadIncident(id: string): Promise<Incident | null> {
    const result = await db.select()
      .from(incidents)
      .where(eq(incidents.id, id))
      .limit(1);
    
    if (!result[0]) {
      return null;
    }
    
    // Load timeline
    const timelineResults = await db.select()
      .from(incidentTimeline)
      .where(eq(incidentTimeline.incidentId, id));
    
    const incident: Incident = {
      id: result[0].id,
      tenantId: result[0].tenantId || undefined,
      title: result[0].title,
      description: result[0].description || '',
      severity: result[0].severity as Incident['severity'],
      status: result[0].status as Incident['status'],
      category: result[0].category,
      source: result[0].source as Incident['source'],
      alertFingerprint: result[0].alertFingerprint || undefined,
      assignee: result[0].assignee || undefined,
      commander: result[0].commander || undefined,
      affectedServices: result[0].affectedServices as string[] || [],
      runbook: result[0].runbookUrl || undefined,
      postmortemUrl: result[0].postmortemUrl || undefined,
      createdAt: result[0].createdAt,
      acknowledgedAt: result[0].acknowledgedAt || undefined,
      resolvedAt: result[0].resolvedAt || undefined,
      metrics: {
        mttd: 0,
        mtta: result[0].mtta || undefined,
        mtti: result[0].mtti || undefined,
        mttr: result[0].mttr || undefined,
      },
      timeline: timelineResults.map(t => ({
        id: t.id,
        timestamp: t.createdAt,
        type: t.type as IncidentTimelineEntry['type'],
        author: t.author,
        content: t.content,
        metadata: t.metadata as Record<string, unknown> | undefined,
      })),
    };
    
    // Store in memory if active
    if (incident.status !== 'resolved') {
      this.activeIncidents.set(id, incident);
    }
    
    return incident;
  }
  
  private async sendNotifications(incident: Incident, event: string): Promise<void> {
    // In production, send to Slack, email, PagerDuty, etc.
    logger.info({
      incidentId: incident.id,
      event,
      severity: incident.severity,
    }, `Sending notification for incident ${event}`);
  }
  
  private async sendEscalationNotifications(incident: Incident, reason: string): Promise<void> {
    // In production, page on-call and management
    logger.warn({
      incidentId: incident.id,
      severity: incident.severity,
      reason,
    }, 'Sending escalation notifications');
  }
  
  /**
   * Get active incidents
   */
  getActiveIncidents(): Incident[] {
    return Array.from(this.activeIncidents.values());
  }
  
  /**
   * Get incident metrics summary
   */
  async getMetricsSummary(days: number = 30): Promise<{
    totalIncidents: number;
    bySeverity: Record<string, number>;
    avgMTTA: number;
    avgMTTR: number;
    openIncidents: number;
  }> {
    // In production, query from database with proper aggregation
    return {
      totalIncidents: this.activeIncidents.size,
      bySeverity: { P1: 0, P2: 0, P3: 0, P4: 0 },
      avgMTTA: 0,
      avgMTTR: 0,
      openIncidents: this.activeIncidents.size,
    };
  }
}

export const incidentManager = new IncidentManager();
```

### 16.4 Runbook Integration

```typescript
// src/monitoring/runbook-integration.ts

import { createLogger } from './structured-logging';

/**
 * Runbook Integration pentru Etapa 3
 * 
 * Integrare cu sistemul de runbooks pentru incident response
 */

const logger = createLogger('runbook');

// ============================================================================
// RUNBOOK DEFINITIONS
// ============================================================================

export interface Runbook {
  id: string;
  title: string;
  description: string;
  forAlerts: string[];  // Alert names this runbook handles
  severity: string[];
  url: string;
  steps: RunbookStep[];
  automatable: boolean;
  lastUpdated: Date;
}

export interface RunbookStep {
  order: number;
  title: string;
  description: string;
  command?: string;  // Optional CLI command
  verifyCommand?: string;  // Command to verify step completion
  rollbackCommand?: string;  // Command for rollback
  automatable: boolean;
  estimatedTime: number;  // seconds
}

// ============================================================================
// RUNBOOK REGISTRY
// ============================================================================

export const RUNBOOKS: Runbook[] = [
  {
    id: 'rb-001',
    title: 'AI Agent High Latency',
    description: 'Troubleshoot high latency in AI Agent responses',
    forAlerts: ['LLMLatencyHigh', 'AIAgentLatencyHigh'],
    severity: ['warning', 'critical'],
    url: 'https://docs.cerniq.app/runbooks/ai-agent-latency',
    steps: [
      {
        order: 1,
        title: 'Check LLM Provider Status',
        description: 'Verify the status of the LLM provider (Anthropic, OpenAI)',
        command: 'curl -s https://status.anthropic.com/api/v2/status.json | jq .status',
        automatable: true,
        estimatedTime: 10,
      },
      {
        order: 2,
        title: 'Check Current Latency Metrics',
        description: 'View current P95 and P99 latency values',
        command: 'curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,rate(cerniq_etapa3_llm_latency_seconds_bucket[5m]))"',
        automatable: true,
        estimatedTime: 10,
      },
      {
        order: 3,
        title: 'Check Queue Depths',
        description: 'Verify AI Agent queue is not backing up',
        command: 'curl -s "http://prometheus:9090/api/v1/query?query=cerniq_etapa3_queue_depth{worker=~\"ai.*\"}"',
        automatable: true,
        estimatedTime: 10,
      },
      {
        order: 4,
        title: 'Check Token Usage',
        description: 'Look for unusually large token counts indicating complex prompts',
        command: 'curl -s "http://prometheus:9090/api/v1/query?query=rate(cerniq_etapa3_llm_tokens_input_total[5m])"',
        automatable: true,
        estimatedTime: 10,
      },
      {
        order: 5,
        title: 'Consider Model Downgrade',
        description: 'If Claude Sonnet is slow, consider routing simple tasks to Haiku',
        automatable: false,
        estimatedTime: 300,
      },
      {
        order: 6,
        title: 'Scale Workers if Needed',
        description: 'Add more AI Agent worker replicas',
        command: 'kubectl scale deployment ai-agent-worker --replicas=4',
        rollbackCommand: 'kubectl scale deployment ai-agent-worker --replicas=2',
        automatable: true,
        estimatedTime: 60,
      },
    ],
    automatable: true,
    lastUpdated: new Date('2026-01-15'),
  },
  
  {
    id: 'rb-002',
    title: 'e-Factura Submission Failures',
    description: 'Handle e-Factura submission failures to ANAF',
    forAlerts: ['EFacturaSubmissionFailures', 'EFacturaCriticalFailures'],
    severity: ['warning', 'critical'],
    url: 'https://docs.cerniq.app/runbooks/efactura-failures',
    steps: [
      {
        order: 1,
        title: 'Check ANAF SPV Status',
        description: 'Verify ANAF SPV system is operational',
        command: 'curl -s -o /dev/null -w "%{http_code}" https://efactura.anaf.ro/status',
        automatable: true,
        estimatedTime: 10,
      },
      {
        order: 2,
        title: 'Check OAuth Token',
        description: 'Verify ANAF OAuth token is valid and not expired',
        command: 'curl -s http://localhost:3000/api/v1/internal/anaf/token-status',
        automatable: true,
        estimatedTime: 10,
      },
      {
        order: 3,
        title: 'Review Recent Errors',
        description: 'Check error logs for common issues (validation, XML format)',
        command: 'kubectl logs -l app=efactura-worker --tail=100 | grep ERROR',
        automatable: true,
        estimatedTime: 30,
      },
      {
        order: 4,
        title: 'Check XML Validation',
        description: 'Validate XML against ANAF schema',
        automatable: false,
        estimatedTime: 300,
      },
      {
        order: 5,
        title: 'Refresh OAuth Token',
        description: 'Force refresh of ANAF OAuth token',
        command: 'curl -X POST http://localhost:3000/api/v1/internal/anaf/refresh-token',
        automatable: true,
        estimatedTime: 30,
      },
      {
        order: 6,
        title: 'Retry Failed Submissions',
        description: 'Trigger retry for failed e-Factura submissions',
        command: 'curl -X POST http://localhost:3000/api/v1/internal/efactura/retry-failed',
        automatable: true,
        estimatedTime: 60,
      },
    ],
    automatable: true,
    lastUpdated: new Date('2026-01-10'),
  },
  
  {
    id: 'rb-003',
    title: 'HITL SLA Breach',
    description: 'Handle HITL approval SLA breaches',
    forAlerts: ['HITLCriticalSLABreach', 'HITLSLABreach'],
    severity: ['warning', 'critical'],
    url: 'https://docs.cerniq.app/runbooks/hitl-sla',
    steps: [
      {
        order: 1,
        title: 'Check Pending Approvals',
        description: 'List all pending HITL approvals',
        command: 'curl -s http://localhost:3000/api/v1/internal/hitl/pending | jq ".approvals | length"',
        automatable: true,
        estimatedTime: 10,
      },
      {
        order: 2,
        title: 'Identify Blockers',
        description: 'Find approvals blocking the queue',
        command: 'curl -s http://localhost:3000/api/v1/internal/hitl/blocking',
        automatable: true,
        estimatedTime: 10,
      },
      {
        order: 3,
        title: 'Notify Approvers',
        description: 'Send reminder notifications to assigned approvers',
        command: 'curl -X POST http://localhost:3000/api/v1/internal/hitl/notify-approvers',
        automatable: true,
        estimatedTime: 30,
      },
      {
        order: 4,
        title: 'Escalate if Needed',
        description: 'Escalate approvals that are significantly past SLA',
        command: 'curl -X POST http://localhost:3000/api/v1/internal/hitl/escalate-overdue',
        automatable: true,
        estimatedTime: 60,
      },
      {
        order: 5,
        title: 'Review Approval Policies',
        description: 'Check if approval thresholds need adjustment',
        automatable: false,
        estimatedTime: 600,
      },
    ],
    automatable: true,
    lastUpdated: new Date('2026-01-12'),
  },
  
  {
    id: 'rb-004',
    title: 'Database Pool Exhausted',
    description: 'Handle database connection pool exhaustion',
    forAlerts: ['DatabasePoolExhausted'],
    severity: ['critical'],
    url: 'https://docs.cerniq.app/runbooks/db-pool',
    steps: [
      {
        order: 1,
        title: 'Check Current Connections',
        description: 'View active database connections',
        command: "psql -h $DB_HOST -U $DB_USER -c \"SELECT count(*) FROM pg_stat_activity WHERE datname='cerniq';\"",
        automatable: true,
        estimatedTime: 10,
      },
      {
        order: 2,
        title: 'Identify Long-Running Queries',
        description: 'Find queries holding connections',
        command: "psql -h $DB_HOST -U $DB_USER -c \"SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;\"",
        automatable: true,
        estimatedTime: 15,
      },
      {
        order: 3,
        title: 'Kill Stuck Queries',
        description: 'Terminate long-running queries if necessary',
        automatable: false,
        estimatedTime: 60,
      },
      {
        order: 4,
        title: 'Restart Application Pods',
        description: 'Rolling restart to release connections',
        command: 'kubectl rollout restart deployment api-server',
        automatable: true,
        estimatedTime: 120,
      },
      {
        order: 5,
        title: 'Increase Pool Size',
        description: 'Temporarily increase connection pool size',
        automatable: false,
        estimatedTime: 300,
      },
    ],
    automatable: true,
    lastUpdated: new Date('2026-01-08'),
  },
];

// ============================================================================
// RUNBOOK SERVICE
// ============================================================================

export class RunbookService {
  private runbooks: Map<string, Runbook> = new Map();
  
  constructor() {
    RUNBOOKS.forEach(rb => {
      this.runbooks.set(rb.id, rb);
    });
  }
  
  /**
   * Get runbook for alert
   */
  getRunbookForAlert(alertName: string): Runbook | null {
    for (const runbook of this.runbooks.values()) {
      if (runbook.forAlerts.includes(alertName)) {
        return runbook;
      }
    }
    return null;
  }
  
  /**
   * Get runbook by ID
   */
  getRunbook(id: string): Runbook | null {
    return this.runbooks.get(id) || null;
  }
  
  /**
   * Execute automatable runbook steps
   */
  async executeAutomatableSteps(runbookId: string, dryRun: boolean = true): Promise<{
    success: boolean;
    results: Array<{
      step: number;
      title: string;
      executed: boolean;
      output?: string;
      error?: string;
    }>;
  }> {
    const runbook = this.getRunbook(runbookId);
    
    if (!runbook) {
      return { success: false, results: [] };
    }
    
    const results: Array<{
      step: number;
      title: string;
      executed: boolean;
      output?: string;
      error?: string;
    }> = [];
    
    for (const step of runbook.steps) {
      if (!step.automatable || !step.command) {
        results.push({
          step: step.order,
          title: step.title,
          executed: false,
          output: 'Manual step - requires human intervention',
        });
        continue;
      }
      
      if (dryRun) {
        results.push({
          step: step.order,
          title: step.title,
          executed: false,
          output: `[DRY RUN] Would execute: ${step.command}`,
        });
        continue;
      }
      
      try {
        // In production, execute the command
        // const output = await executeCommand(step.command);
        const output = `Executed: ${step.command}`;
        
        results.push({
          step: step.order,
          title: step.title,
          executed: true,
          output,
        });
        
        logger.info({
          runbookId,
          step: step.order,
          command: step.command,
        }, `Executed runbook step: ${step.title}`);
        
      } catch (error) {
        results.push({
          step: step.order,
          title: step.title,
          executed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        logger.error({
          runbookId,
          step: step.order,
          error,
        }, `Runbook step failed: ${step.title}`);
        
        // Stop on error unless it's a diagnostic step
        if (step.order > 3) {
          break;
        }
      }
    }
    
    return {
      success: results.every(r => r.executed || !r.error),
      results,
    };
  }
  
  /**
   * Get all runbooks
   */
  getAllRunbooks(): Runbook[] {
    return Array.from(this.runbooks.values());
  }
}

export const runbookService = new RunbookService();
```

### 16.5 Incident Dashboard Panel

```yaml
# grafana/dashboards/incident-management.json
{
  "dashboard": {
    "title": "Etapa 3 - Incident Management",
    "uid": "etapa3-incidents",
    "tags": ["etapa3", "incidents"],
    "timezone": "browser",
    "refresh": "30s",
    "time": {
      "from": "now-7d",
      "to": "now"
    },
    "panels": [
      {
        "title": "Open Incidents",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 0, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 1 },
                { "color": "red", "value": 5 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "sum(cerniq_etapa3_incidents_active)"
          }
        ]
      },
      {
        "title": "P1/P2 Incidents",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 4, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "red", "value": 1 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "sum(cerniq_etapa3_incidents_active{severity=~\"P1|P2\"})"
          }
        ]
      },
      {
        "title": "Avg MTTA (30d)",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 8, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 300 },
                { "color": "red", "value": 900 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "avg(cerniq_etapa3_incident_mtta_seconds)"
          }
        ]
      },
      {
        "title": "Avg MTTR (30d)",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 12, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 1800 },
                { "color": "red", "value": 3600 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "avg(cerniq_etapa3_incident_mttr_seconds)"
          }
        ]
      },
      {
        "title": "Incidents This Week",
        "type": "stat",
        "gridPos": { "h": 4, "w": 4, "x": 16, "y": 0 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_etapa3_incidents_total[7d]))"
          }
        ]
      },
      {
        "title": "Resolution Rate",
        "type": "gauge",
        "gridPos": { "h": 4, "w": 4, "x": 20, "y": 0 },
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "min": 0,
            "max": 1,
            "thresholds": {
              "steps": [
                { "color": "red", "value": null },
                { "color": "yellow", "value": 0.8 },
                { "color": "green", "value": 0.95 }
              ]
            }
          }
        },
        "targets": [
          {
            "expr": "sum(cerniq_etapa3_incidents_resolved) / sum(cerniq_etapa3_incidents_total)"
          }
        ]
      },
      {
        "title": "Incidents Over Time",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 4 },
        "targets": [
          {
            "expr": "sum by (severity) (increase(cerniq_etapa3_incidents_total[1d]))",
            "legendFormat": "{{ severity }}"
          }
        ]
      },
      {
        "title": "MTTR Trend",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 4 },
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        },
        "targets": [
          {
            "expr": "avg(cerniq_etapa3_incident_mttr_seconds) by (severity)",
            "legendFormat": "{{ severity }}"
          }
        ]
      },
      {
        "title": "Active Incidents by Team",
        "type": "piechart",
        "gridPos": { "h": 8, "w": 6, "x": 0, "y": 12 },
        "targets": [
          {
            "expr": "sum by (team) (cerniq_etapa3_incidents_active)",
            "legendFormat": "{{ team }}"
          }
        ]
      },
      {
        "title": "Incidents by Category",
        "type": "piechart",
        "gridPos": { "h": 8, "w": 6, "x": 6, "y": 12 },
        "targets": [
          {
            "expr": "sum by (category) (increase(cerniq_etapa3_incidents_total[30d]))",
            "legendFormat": "{{ category }}"
          }
        ]
      },
      {
        "title": "Active Alerts",
        "type": "table",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 12 },
        "targets": [
          {
            "expr": "ALERTS{alertstate=\"firing\"}",
            "format": "table"
          }
        ],
        "transformations": [
          {
            "id": "organize",
            "options": {
              "excludeByName": {
                "__name__": true
              }
            }
          }
        ]
      }
    ]
  }
}
```

---

## 17. Referințe și Resurse Adiționale

### 17.1 Documente Conexe

| Document | Locație | Descriere |
|----------|---------|-----------|
| Master Spec | `__Cerniq_Master_Spec_Normativ_Complet.md` | Specificație normativă completă |
| Etapa 3 Workers | `etapa3-workers-*.md` | Documentație workers detaliată |
| Etapa 3 Schemas | `etapa3-schema-*.md` | Scheme baze de date |
| Etapa 3 HITL | `etapa3-hitl-system.md` | Sistem HITL complet |
| Infrastructure | `CERNIQ_APP_Infrastructure_Documentation*.md` | Infrastructură Docker |

### 17.2 Resurse Externe

| Resursă | URL | Descriere |
|---------|-----|-----------|
| OpenTelemetry Docs | https://opentelemetry.io/docs/ | Documentație oficială OTel |
| SigNoz Docs | https://signoz.io/docs/ | Documentație SigNoz |
| Prometheus Docs | https://prometheus.io/docs/ | Documentație Prometheus |
| Grafana Docs | https://grafana.com/docs/ | Documentație Grafana |
| AlertManager Docs | https://prometheus.io/docs/alerting/latest/alertmanager/ | Documentație AlertManager |
| Pino Logger | https://getpino.io/ | Documentație Pino |

### 17.3 Changelog

| Versiune | Data | Modificări |
|----------|------|------------|
| 1.0.0 | 2026-01-19 | Versiune inițială completă |

---

**Document generat pentru Cerniq App - Etapa 3 AI Sales Agent**
**Versiune: 1.0.0**
**Data: Ianuarie 2026**
