# Etapa 3 - Runbook Monitoring și Observability

## Document Control
- **Versiune**: 1.0.0
- **Data**: Ianuarie 2026
- **Autor**: Echipa Cerniq
- **Status**: COMPLET
- **Parent Document**: `etapa3-monitoring-observability.md`

---

## Cuprins

1. [Prezentare Generală](#1-prezentare-generală)
2. [Setup Infrastructură Monitoring](#2-setup-infrastructură-monitoring)
3. [Configurare OpenTelemetry](#3-configurare-opentelemetry)
4. [Configurare SigNoz](#4-configurare-signoz)
5. [Configurare Prometheus](#5-configurare-prometheus)
6. [Configurare Grafana](#6-configurare-grafana)
7. [Configurare AlertManager](#7-configurare-alertmanager)
8. [Proceduri Alerts Management](#8-proceduri-alerts-management)
9. [Troubleshooting Monitoring Stack](#9-troubleshooting-monitoring-stack)
10. [Backup și Recovery](#10-backup-și-recovery)
11. [Scaling și Performance](#11-scaling-și-performance)
12. [Security Considerations](#12-security-considerations)
13. [Checklists Operaționale](#13-checklists-operaționale)
14. [Referințe](#14-referințe)

---

## 1. Prezentare Generală

### 1.1 Scopul Documentului

Acest runbook oferă proceduri detaliate pas-cu-pas pentru:
- Setup și configurare a infrastructurii de monitoring pentru Etapa 3
- Gestionarea alertelor și incidentelor
- Troubleshooting probleme comune
- Backup și recovery pentru datele de monitoring
- Scaling componentelor de observability

### 1.2 Componente Monitoring Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Etapa 3 Monitoring Architecture                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │   Application   │────▶│  OpenTelemetry  │────▶│     SigNoz      │   │
│  │    Services     │     │    Collector    │     │   (Traces/Logs) │   │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘   │
│           │                      │                        │             │
│           │                      │                        │             │
│           ▼                      ▼                        ▼             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │   Prometheus    │────▶│    Grafana      │────▶│  AlertManager   │   │
│  │   (Metrics)     │     │  (Dashboards)   │     │    (Alerts)     │   │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘   │
│           │                      │                        │             │
│           │                      │                        │             │
│           ▼                      ▼                        ▼             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Notification Channels                         │   │
│  │   Slack  │  PagerDuty  │  Email  │  SMS  │  Webhook            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Versiuni Componente

| Component | Versiune | Port | Container Name |
|-----------|----------|------|----------------|
| OpenTelemetry Collector | 0.94.0 | 64070, 64071, 64093, 64094, 64095 | otel-collector |
| SigNoz | 0.45.0 | 64089 | signoz-frontend |
| Prometheus | 2.49.0 | 64090 | prometheus |
| Grafana | 10.3.0 | 64091 | grafana |
| AlertManager | 0.27.0 | 64092 | alertmanager |
| ClickHouse (SigNoz backend) | 24.1 | 64082, 64083 | clickhouse |

### 1.4 Cerințe Hardware

| Cerință | Minimum | Recomandat | Note |
|---------|---------|------------|------|
| CPU | 4 cores | 8 cores | Pentru toate componentele |
| RAM | 16 GB | 32 GB | ClickHouse necesită memorie |
| Disk | 100 GB SSD | 500 GB NVMe | Retenție 30 zile |
| Network | 1 Gbps | 10 Gbps | Pentru high-cardinality metrics |

---

## 2. Setup Infrastructură Monitoring

### 2.1 Pre-Requisite Check

```bash
#!/bin/bash
# Filename: pre-requisite-check.sh
# Description: Verifică cerințele pentru monitoring stack

set -e

echo "=== Cerniq Etapa 3 - Monitoring Pre-Requisite Check ==="
echo "Data: $(date)"
echo ""

# Check Docker
echo "Verificare Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
    echo "✅ Docker instalat: $DOCKER_VERSION"
else
    echo "❌ Docker nu este instalat"
    exit 1
fi

# Check Docker Compose
echo "Verificare Docker Compose..."
if command -v docker compose &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version --short)
    echo "✅ Docker Compose instalat: $COMPOSE_VERSION"
else
    echo "❌ Docker Compose nu este instalat"
    exit 1
fi

# Check available disk space
echo "Verificare spațiu disk..."
AVAILABLE_SPACE=$(df -BG /var/lib/docker | tail -1 | awk '{print $4}' | tr -d 'G')
if [ "$AVAILABLE_SPACE" -ge 100 ]; then
    echo "✅ Spațiu disponibil: ${AVAILABLE_SPACE}GB"
else
    echo "⚠️  Spațiu disponibil insuficient: ${AVAILABLE_SPACE}GB (recomandat: 100GB+)"
fi

# Check available memory
echo "Verificare memorie..."
TOTAL_MEM=$(free -g | grep Mem | awk '{print $2}')
if [ "$TOTAL_MEM" -ge 16 ]; then
    echo "✅ Memorie totală: ${TOTAL_MEM}GB"
else
    echo "⚠️  Memorie insuficientă: ${TOTAL_MEM}GB (recomandat: 16GB+)"
fi

# Check ports availability
echo "Verificare porturi..."
PORTS=(64070 64071 64072 64073 64074 64075 64076 64077 64082 64083 64089 64090 64091 64092 64093 64094 64095 64096 64097 64098)
for PORT in "${PORTS[@]}"; do
    if ! netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
        echo "✅ Port $PORT disponibil"
    else
        echo "❌ Port $PORT ocupat"
    fi
done

# Check network connectivity
echo "Verificare conectivitate..."
if curl -s --max-time 5 https://registry.hub.docker.com > /dev/null; then
    echo "✅ Docker Hub accesibil"
else
    echo "⚠️  Docker Hub inaccesibil"
fi

echo ""
echo "=== Pre-Requisite Check Complet ==="
```

### 2.2 Docker Compose pentru Monitoring Stack

```yaml
# Filename: docker-compose.monitoring.yaml
# Description: Docker Compose pentru Etapa 3 Monitoring Stack

version: '3.9'

x-logging: &default-logging
  driver: json-file
  options:
    max-size: "50m"
    max-file: "5"

networks:
  cerniq-monitoring:
    driver: bridge
    ipam:
      config:
        - subnet: 172.30.0.0/24

volumes:
  prometheus-data:
    driver: local
  grafana-data:
    driver: local
  alertmanager-data:
    driver: local
  clickhouse-data:
    driver: local
  signoz-data:
    driver: local

services:
  # ===========================================
  # OpenTelemetry Collector
  # ===========================================
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.94.0
    container_name: otel-collector
    restart: unless-stopped
    logging: *default-logging
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./config/otel-collector-config.yaml:/etc/otel-collector-config.yaml:ro
    ports:
      - "64070:64070"   # OTLP gRPC
      - "64071:64071"   # OTLP HTTP
      - "64093:64093"   # Prometheus metrics
      - "64094:64094"   # Prometheus exporter
      - "64095:64095"   # Health check
    networks:
      cerniq-monitoring:
        ipv4_address: 172.30.0.10
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--spider", "http://localhost:64095/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # ===========================================
  # Prometheus
  # ===========================================
  prometheus:
    image: prom/prometheus:v2.49.0
    container_name: prometheus
    restart: unless-stopped
    logging: *default-logging
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--storage.tsdb.retention.size=50GB'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./config/prometheus-rules/:/etc/prometheus/rules/:ro
      - prometheus-data:/prometheus
    ports:
      - "64090:64090"
    networks:
      cerniq-monitoring:
        ipv4_address: 172.30.0.11
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--spider", "http://localhost:64090/-/healthy"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

  # ===========================================
  # Grafana
  # ===========================================
  grafana:
    image: grafana/grafana:10.3.0
    container_name: grafana
    restart: unless-stopped
    logging: *default-logging
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=${GRAFANA_ROOT_URL:-http://localhost:64091}
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-simple-json-datasource,grafana-piechart-panel
      - GF_FEATURE_TOGGLES_ENABLE=publicDashboards
      - GF_AUTH_ANONYMOUS_ENABLED=false
      - GF_ALERTING_ENABLED=true
      - GF_UNIFIED_ALERTING_ENABLED=true
    volumes:
      - grafana-data:/var/lib/grafana
      - ./config/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./config/grafana/dashboards:/var/lib/grafana/dashboards:ro
    ports:
      - "64091:64091"
    networks:
      cerniq-monitoring:
        ipv4_address: 172.30.0.12
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--spider", "http://localhost:64091/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    depends_on:
      - prometheus
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # ===========================================
  # AlertManager
  # ===========================================
  alertmanager:
    image: prom/alertmanager:v0.27.0
    container_name: alertmanager
    restart: unless-stopped
    logging: *default-logging
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=${ALERTMANAGER_EXTERNAL_URL:-http://localhost:64092}'
      - '--cluster.listen-address='
    volumes:
      - ./config/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - ./config/alertmanager-templates/:/etc/alertmanager/templates/:ro
      - alertmanager-data:/alertmanager
    ports:
      - "64092:64092"
    networks:
      cerniq-monitoring:
        ipv4_address: 172.30.0.13
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--spider", "http://localhost:64092/-/healthy"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M

  # ===========================================
  # ClickHouse (SigNoz Backend)
  # ===========================================
  clickhouse:
    image: clickhouse/clickhouse-server:24.1
    container_name: clickhouse
    restart: unless-stopped
    logging: *default-logging
    environment:
      - CLICKHOUSE_DB=signoz_traces
      - CLICKHOUSE_USER=${CLICKHOUSE_USER:-default}
      - CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD:-}
    volumes:
      - clickhouse-data:/var/lib/clickhouse
      - ./config/clickhouse/config.xml:/etc/clickhouse-server/config.d/config.xml:ro
      - ./config/clickhouse/users.xml:/etc/clickhouse-server/users.d/users.xml:ro
    ports:
      - "64082:64082"  # HTTP
      - "64083:64083"  # Native
    networks:
      cerniq-monitoring:
        ipv4_address: 172.30.0.14
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--spider", "http://localhost:64082/ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G
    ulimits:
      nofile:
        soft: 262144
        hard: 262144

  # ===========================================
  # SigNoz Query Service
  # ===========================================
  signoz-query-service:
    image: signoz/query-service:0.45.0
    container_name: signoz-query-service
    restart: unless-stopped
    logging: *default-logging
    environment:
      - ClickHouseUrl=tcp://clickhouse:64083
      - ALERTMANAGER_API_PREFIX=http://alertmanager:64092/api/
      - SIGNOZ_LOCAL_DB_PATH=/var/lib/signoz/signoz.db
      - DASHBOARDS_PATH=/root/config/dashboards
      - STORAGE=clickhouse
      - GODEBUG=netdns=go
    volumes:
      - signoz-data:/var/lib/signoz
      - ./config/signoz/dashboards:/root/config/dashboards:ro
    ports:
      - "64096:64096"
    networks:
      cerniq-monitoring:
        ipv4_address: 172.30.0.15
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--spider", "http://localhost:64096/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    depends_on:
      - clickhouse
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  # ===========================================
  # SigNoz Frontend
  # ===========================================
  signoz-frontend:
    image: signoz/frontend:0.45.0
    container_name: signoz-frontend
    restart: unless-stopped
    logging: *default-logging
    environment:
      - FRONTEND_API_ENDPOINT=http://signoz-query-service:64096
    ports:
      - "64089:64089"
    networks:
      cerniq-monitoring:
        ipv4_address: 172.30.0.16
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--spider", "http://localhost:64089/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    depends_on:
      - signoz-query-service
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### 2.3 Script de Deployment

```bash
#!/bin/bash
# Filename: deploy-monitoring.sh
# Description: Deploy Etapa 3 Monitoring Stack

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/config"
LOG_FILE="${SCRIPT_DIR}/deploy-monitoring.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

# Create config directories
create_config_dirs() {
    log "Creare directoare configurare..."
    
    mkdir -p "${CONFIG_DIR}/prometheus-rules"
    mkdir -p "${CONFIG_DIR}/grafana/provisioning/datasources"
    mkdir -p "${CONFIG_DIR}/grafana/provisioning/dashboards"
    mkdir -p "${CONFIG_DIR}/grafana/dashboards"
    mkdir -p "${CONFIG_DIR}/alertmanager-templates"
    mkdir -p "${CONFIG_DIR}/clickhouse"
    mkdir -p "${CONFIG_DIR}/signoz/dashboards"
    
    log "Directoare create cu succes"
}

# Create environment file
create_env_file() {
    log "Creare fișier .env..."
    
    if [ ! -f "${SCRIPT_DIR}/.env" ]; then
        cat > "${SCRIPT_DIR}/.env" << 'EOF'
# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=CerniqMonitoring2026!
GRAFANA_ROOT_URL=http://localhost:64091

# AlertManager
ALERTMANAGER_EXTERNAL_URL=http://localhost:64092

# ClickHouse
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

# Slack (pentru alerting)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#cerniq-alerts

# PagerDuty
PAGERDUTY_SERVICE_KEY=your-pagerduty-service-key

# SMTP (pentru email alerts)
SMTP_HOST=smtp.example.com
SMTP_PORT=443
SMTP_FROM=alerts@cerniq.app
SMTP_USERNAME=alerts@cerniq.app
SMTP_PASSWORD=your-smtp-password
EOF
        warn "Fișier .env creat. Vă rugăm să actualizați credențialele!"
    else
        log "Fișier .env existent"
    fi
}

# Deploy stack
deploy_stack() {
    log "Deployment monitoring stack..."
    
    # Pull images
    log "Pull imagini Docker..."
    docker compose -f docker-compose.monitoring.yaml pull
    
    # Start services
    log "Pornire servicii..."
    docker compose -f docker-compose.monitoring.yaml up -d
    
    # Wait for services to be healthy
    log "Așteptare servicii să devină healthy..."
    sleep 30
    
    # Check health
    check_health
}

# Check health of all services
check_health() {
    log "Verificare health servicii..."
    
    services=("otel-collector" "prometheus" "grafana" "alertmanager" "clickhouse" "signoz-query-service" "signoz-frontend")
    
    for service in "${services[@]}"; do
        status=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null || echo "unknown")
        
        if [ "$status" == "healthy" ]; then
            log "✅ $service: healthy"
        elif [ "$status" == "starting" ]; then
            warn "⏳ $service: starting"
        else
            error "❌ $service: $status"
        fi
    done
}

# Main
main() {
    log "=== Cerniq Etapa 3 - Monitoring Stack Deployment ==="
    
    create_config_dirs
    create_env_file
    deploy_stack
    
    log ""
    log "=== Deployment Complet ==="
    log ""
    log "Accesați:"
    log "  - Grafana:      http://localhost:64091"
    log "  - Prometheus:   http://localhost:64090"
    log "  - AlertManager: http://localhost:64092"
    log "  - SigNoz:       http://localhost:64089"
    log ""
}

main "$@"
```

---

## 3. Configurare OpenTelemetry

### 3.1 OpenTelemetry Collector Config

```yaml
# Filename: config/otel-collector-config.yaml
# Description: Configurare OpenTelemetry Collector pentru Etapa 3

receivers:
  # OTLP Receiver - primește telemetrie de la aplicații
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:64070
        max_recv_msg_size_mib: 16
      http:
        endpoint: 0.0.0.0:64071
        cors:
          allowed_origins:
            - "http://localhost:*"
            - "https://*.cerniq.app"

  # Prometheus Receiver - scrape metrics
  prometheus:
    config:
      scrape_configs:
        - job_name: 'otel-collector'
          scrape_interval: 15s
          static_configs:
            - targets: ['localhost:64093']

  # Host Metrics Receiver
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
      filesystem:
      network:
      processes:

processors:
  # Batch Processor - grupează telemetria pentru eficiență
  batch:
    timeout: 5s
    send_batch_size: 1000
    send_batch_max_size: 2000

  # Memory Limiter - previne OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 800
    spike_limit_mib: 200

  # Resource Processor - adaugă atribute comune
  resource:
    attributes:
      - key: service.namespace
        value: cerniq-etapa3
        action: upsert
      - key: deployment.environment
        value: ${DEPLOYMENT_ENV:-production}
        action: upsert
      - key: service.version
        value: ${SERVICE_VERSION:-1.0.0}
        action: upsert

  # Attributes Processor - procesare atribute
  attributes:
    actions:
      # Redact sensitive data
      - key: http.request.header.authorization
        action: delete
      - key: db.statement
        action: hash
        pattern: "(password|token|secret|key)=[^&]+"
      # Add tenant context
      - key: tenant.id
        from_context: tenant_id
        action: upsert

  # Span Processor - procesare traces
  span:
    name:
      from_attributes: ["http.route", "db.operation"]
      separator: " "

  # Probabilistic Sampler - sampling pentru high-volume
  probabilistic_sampler:
    sampling_percentage: 100  # 100% în development, 10-25% în production

  # Tail Sampling - sampling inteligent
  tail_sampling:
    decision_wait: 10s
    num_traces: 50000
    expected_new_traces_per_sec: 100
    policies:
      # Păstrează toate trace-urile cu erori
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      # Păstrează trace-uri lente (>5s)
      - name: slow-traces
        type: latency
        latency:
          threshold_ms: 5000
      # Păstrează trace-uri pentru LLM calls
      - name: llm-traces
        type: string_attribute
        string_attribute:
          key: llm.provider
          values: ["anthropic", "openai", "google"]
      # Sampling probabilistic pentru restul
      - name: default-sample
        type: probabilistic
        probabilistic:
          sampling_percentage: 25

  # Filter Processor - filtrare date
  filter:
    error_mode: ignore
    traces:
      span:
        # Exclude health checks din traces
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/health/ready"'
    metrics:
      metric:
        # Exclude metrici interne
        - 'name == "otelcol_process_*" and resource.attributes["service.name"] == "unknown_service"'

exporters:
  # OTLP Exporter to SigNoz
  otlp/signoz:
    endpoint: signoz-otel-collector:64070
    tls:
      insecure: true
    headers:
      signoz-access-token: ${SIGNOZ_ACCESS_TOKEN:-}
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

  # Prometheus Exporter
  prometheus:
    endpoint: "0.0.0.0:64094"
    const_labels:
      service: cerniq-etapa3
    namespace: cerniq
    enable_open_metrics: true
    resource_to_telemetry_conversion:
      enabled: true

  # Prometheus Remote Write (pentru long-term storage)
  prometheusremotewrite:
    endpoint: "http://prometheus:64090/api/v1/write"
    tls:
      insecure: true
    resource_to_telemetry_conversion:
      enabled: true

  # Logging Exporter (pentru debug)
  logging:
    verbosity: detailed
    sampling_initial: 5
    sampling_thereafter: 200

  # File Exporter (backup)
  file:
    path: /var/log/otel/traces.json
    rotation:
      max_megabytes: 100
      max_days: 7
      max_backups: 5

extensions:
  # Health Check Extension
  health_check:
    endpoint: 0.0.0.0:64095
    path: "/"
    check_collector_pipeline:
      enabled: true
      interval: 5m
      exporter_failure_threshold: 5

  # pprof Extension (pentru profiling)
  pprof:
    endpoint: localhost:64087

  # zPages Extension (pentru debugging)
  zpages:
    endpoint: localhost:64088

service:
  extensions: [health_check, pprof, zpages]
  
  pipelines:
    # Traces Pipeline
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, attributes, span, tail_sampling, batch]
      exporters: [otlp/signoz, logging]

    # Metrics Pipeline
    metrics:
      receivers: [otlp, prometheus, hostmetrics]
      processors: [memory_limiter, resource, filter, batch]
      exporters: [prometheus, prometheusremotewrite]

    # Logs Pipeline
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, attributes, batch]
      exporters: [otlp/signoz]

  telemetry:
    logs:
      level: info
      development: false
      encoding: json
    metrics:
      level: detailed
      address: 0.0.0.0:64093
```

### 3.2 Application SDK Configuration

```typescript
// Filename: src/telemetry/otel-setup.ts
// Description: Setup OpenTelemetry SDK pentru Etapa 3 services

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { 
  SEMRESATTRS_SERVICE_NAME, 
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT 
} from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// Environment configuration
interface OtelConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  otelCollectorUrl: string;
  enableAutoInstrumentation: boolean;
  enableDebugLogs: boolean;
}

const defaultConfig: OtelConfig = {
  serviceName: process.env.OTEL_SERVICE_NAME || 'cerniq-etapa3',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  otelCollectorUrl: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:64070',
  enableAutoInstrumentation: process.env.OTEL_AUTO_INSTRUMENTATION !== 'false',
  enableDebugLogs: process.env.OTEL_DEBUG === 'true',
};

// Enable debug logging if configured
if (defaultConfig.enableDebugLogs) {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

// Create resource with service information
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: defaultConfig.serviceName,
  [SEMRESATTRS_SERVICE_VERSION]: defaultConfig.serviceVersion,
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: defaultConfig.environment,
  'service.namespace': 'cerniq',
  'service.instance.id': process.env.HOSTNAME || `${defaultConfig.serviceName}-${process.pid}`,
});

// Trace exporter
const traceExporter = new OTLPTraceExporter({
  url: `${defaultConfig.otelCollectorUrl}/v1/traces`,
});

// Metric exporter
const metricExporter = new OTLPMetricExporter({
  url: `${defaultConfig.otelCollectorUrl}/v1/metrics`,
});

// Log exporter
const logExporter = new OTLPLogExporter({
  url: `${defaultConfig.otelCollectorUrl}/v1/logs`,
});

// Create SDK
const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 15000, // Export every 15 seconds
  }),
  logRecordProcessor: new BatchLogRecordProcessor(logExporter),
  spanProcessor: new BatchSpanProcessor(traceExporter, {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 30000,
  }),
  instrumentations: defaultConfig.enableAutoInstrumentation 
    ? [getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          requestHook: (span, request) => {
            span.setAttribute('http.request.id', request.headers['x-request-id'] || '');
          },
        },
        '@opentelemetry/instrumentation-pg': {
          enhancedDatabaseReporting: true,
        },
        '@opentelemetry/instrumentation-redis': {
          dbStatementSerializer: (cmd, args) => {
            // Redact sensitive commands
            if (['AUTH', 'SET', 'HSET'].includes(cmd.toUpperCase())) {
              return `${cmd} [REDACTED]`;
            }
            return `${cmd} ${args.slice(0, 2).join(' ')}`;
          },
        },
      })]
    : [],
});

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down successfully'))
    .catch((error) => console.log('Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});

// Start SDK
export async function initializeTelemetry(): Promise<void> {
  try {
    await sdk.start();
    console.log('OpenTelemetry SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry SDK:', error);
    throw error;
  }
}

// Export SDK for manual control
export { sdk };
```

### 3.3 Verificare OpenTelemetry

```bash
#!/bin/bash
# Filename: verify-otel.sh
# Description: Verifică configurarea OpenTelemetry

set -e

echo "=== OpenTelemetry Verification ==="
echo ""

# Check collector health
echo "1. Verificare OTel Collector Health..."
if curl -s http://localhost:64095/ | grep -q "Server available"; then
    echo "   ✅ OTel Collector healthy"
else
    echo "   ❌ OTel Collector unhealthy"
    exit 1
fi

# Check OTLP gRPC endpoint
echo "2. Verificare OTLP gRPC endpoint (64070)..."
if nc -z localhost 64070 2>/dev/null; then
    echo "   ✅ OTLP gRPC endpoint accesibil"
else
    echo "   ❌ OTLP gRPC endpoint inaccesibil"
fi

# Check OTLP HTTP endpoint
echo "3. Verificare OTLP HTTP endpoint (64071)..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:64071/v1/traces 2>/dev/null | grep -q "405\|200"; then
    echo "   ✅ OTLP HTTP endpoint accesibil"
else
    echo "   ❌ OTLP HTTP endpoint inaccesibil"
fi

# Check Prometheus metrics
echo "4. Verificare Prometheus metrics export..."
METRICS=$(curl -s http://localhost:64093/metrics | head -20)
if echo "$METRICS" | grep -q "otelcol"; then
    echo "   ✅ Metrics disponibile"
    echo "   Exemple metrici:"
    curl -s http://localhost:64093/metrics | grep "otelcol_receiver" | head -3 | sed 's/^/      /'
else
    echo "   ❌ Metrics indisponibile"
fi

# Send test trace
echo "5. Trimitere trace test..."
curl -s -X POST http://localhost:64071/v1/traces \
    -H "Content-Type: application/json" \
    -d '{
        "resourceSpans": [{
            "resource": {
                "attributes": [{
                    "key": "service.name",
                    "value": {"stringValue": "test-service"}
                }]
            },
            "scopeSpans": [{
                "scope": {"name": "test"},
                "spans": [{
                    "traceId": "5B8EFFF798038103D269B633813FC60C",
                    "spanId": "EEE19B7EC3C1B173",
                    "name": "test-span",
                    "kind": 1,
                    "startTimeUnixNano": "'$(date +%s%N)'",
                    "endTimeUnixNano": "'$(( $(date +%s%N) + 1000000 ))'"
                }]
            }]
        }]
    }' && echo "   ✅ Trace test trimis cu succes" || echo "   ❌ Eroare trimitere trace"

echo ""
echo "=== Verificare Completă ==="
```

---

## 4. Configurare SigNoz

### 4.1 SigNoz Query Service Configuration

```yaml
# Filename: config/signoz/query-service.yaml
# Description: Configurare SigNoz Query Service

# ClickHouse connection
clickhouse:
  url: tcp://clickhouse:64083
  database: signoz_traces
  username: default
  password: ""
  
  # Connection pool settings
  maxOpenConns: 50
  maxIdleConns: 25
  connMaxLifetime: 5m
  
  # Dial timeout
  dialTimeout: 10s
  
  # Read/Write timeout
  readTimeout: 30s
  writeTimeout: 30s

# Trace settings
trace:
  # Retention period
  retention:
    enabled: true
    days: 30
  
  # Sampling for storage
  sampling:
    enabled: false
    percentage: 100
  
  # Batch settings for ingestion
  batch:
    size: 1000
    timeout: 5s

# Metrics settings
metrics:
  # Retention period
  retention:
    enabled: true
    days: 90
  
  # Aggregation intervals
  aggregation:
    - interval: 5m
      retention: 7d
    - interval: 1h
      retention: 30d
    - interval: 1d
      retention: 90d

# Logs settings
logs:
  # Retention period
  retention:
    enabled: true
    days: 30
  
  # Maximum log size
  maxSize: 10KB
  
  # Batch settings
  batch:
    size: 500
    timeout: 5s

# Alert settings
alerting:
  # AlertManager endpoint
  alertmanager:
    url: http://alertmanager:64092
  
  # Evaluation interval
  evaluationInterval: 15s
  
  # Notification channels
  channels:
    - type: slack
      name: cerniq-alerts
      webhook: ${SLACK_WEBHOOK_URL}
    - type: email
      name: cerniq-email
      smtp:
        host: ${SMTP_HOST}
        port: ${SMTP_PORT}
        from: ${SMTP_FROM}

# Security settings
security:
  # CORS
  cors:
    allowedOrigins:
      - http://localhost:*
      - https://*.cerniq.app
    allowedMethods:
      - GET
      - POST
      - PUT
      - DELETE
      - OPTIONS
    allowedHeaders:
      - "*"
    allowCredentials: true
  
  # Rate limiting
  rateLimit:
    enabled: true
    requestsPerSecond: 100
    burst: 200

# Logging
logging:
  level: info
  format: json
  output: stdout
```

### 4.2 SigNoz Dashboard Import

```bash
#!/bin/bash
# Filename: import-signoz-dashboards.sh
# Description: Import dashboards în SigNoz pentru Etapa 3

SIGNOZ_URL="${SIGNOZ_URL:-http://localhost:64089}"
DASHBOARDS_DIR="./config/signoz/dashboards"

echo "=== Import SigNoz Dashboards ==="

# Wait for SigNoz to be ready
echo "Așteptare SigNoz..."
until curl -s "${SIGNOZ_URL}/api/v1/health" > /dev/null 2>&1; do
    sleep 5
done
echo "SigNoz ready"

# Import each dashboard
for dashboard_file in "${DASHBOARDS_DIR}"/*.json; do
    if [ -f "$dashboard_file" ]; then
        dashboard_name=$(basename "$dashboard_file" .json)
        echo "Import dashboard: $dashboard_name"
        
        response=$(curl -s -X POST "${SIGNOZ_URL}/api/v3/dashboards" \
            -H "Content-Type: application/json" \
            -d @"$dashboard_file")
        
        if echo "$response" | grep -q '"status":"success"'; then
            echo "  ✅ Dashboard importat cu succes"
        else
            echo "  ❌ Eroare import: $response"
        fi
    fi
done

echo ""
echo "=== Import Complet ==="
```

### 4.3 Etapa 3 AI Sales Dashboard pentru SigNoz

```json
{
  "title": "Etapa 3 - AI Sales Agent Overview",
  "description": "Dashboard principal pentru AI Sales Agent - monitoring conversații, LLM, și negocieri",
  "tags": ["cerniq", "etapa3", "ai-sales"],
  "variables": [
    {
      "name": "tenant_id",
      "label": "Tenant",
      "type": "query",
      "query": "SELECT DISTINCT JSONExtractString(resource_attributes, 'tenant.id') FROM signoz_traces.distributed_traces WHERE timestamp > now() - INTERVAL 1 DAY"
    },
    {
      "name": "interval",
      "label": "Interval",
      "type": "interval",
      "values": ["1m", "5m", "15m", "30m", "1h"]
    }
  ],
  "panels": [
    {
      "title": "Conversații Active",
      "type": "value",
      "gridPos": {"h": 4, "w": 4, "x": 0, "y": 0},
      "query": {
        "queryType": "builder",
        "builder": {
          "queryData": [{
            "aggregateOperator": "count_distinct",
            "aggregateAttribute": {
              "key": "conversation_id",
              "dataType": "string"
            },
            "filters": [{
              "key": "service.name",
              "value": "ai-agent-core",
              "operator": "="
            }],
            "timeAggregation": "rate"
          }]
        }
      }
    },
    {
      "title": "LLM Requests/min",
      "type": "value",
      "gridPos": {"h": 4, "w": 4, "x": 4, "y": 0},
      "query": {
        "queryType": "builder",
        "builder": {
          "queryData": [{
            "aggregateOperator": "rate",
            "aggregateAttribute": {
              "key": "llm.request",
              "dataType": "number"
            },
            "filters": [{
              "key": "span.kind",
              "value": "client",
              "operator": "="
            }]
          }]
        }
      }
    },
    {
      "title": "Avg LLM Latency",
      "type": "value",
      "gridPos": {"h": 4, "w": 4, "x": 8, "y": 0},
      "query": {
        "queryType": "builder",
        "builder": {
          "queryData": [{
            "aggregateOperator": "p95",
            "aggregateAttribute": {
              "key": "duration_nano",
              "dataType": "float64"
            },
            "filters": [{
              "key": "llm.provider",
              "operator": "exists"
            }]
          }]
        }
      },
      "unit": "ns"
    },
    {
      "title": "Error Rate",
      "type": "value",
      "gridPos": {"h": 4, "w": 4, "x": 12, "y": 0},
      "query": {
        "queryType": "builder",
        "builder": {
          "queryData": [{
            "expression": "A/B*100",
            "formulaQueries": [
              {
                "name": "A",
                "aggregateOperator": "count",
                "filters": [{"key": "status_code", "value": "STATUS_CODE_ERROR", "operator": "="}]
              },
              {
                "name": "B",
                "aggregateOperator": "count"
              }
            ]
          }]
        }
      },
      "unit": "%"
    },
    {
      "title": "Negocieri în Curs",
      "type": "value",
      "gridPos": {"h": 4, "w": 4, "x": 16, "y": 0},
      "query": {
        "queryType": "clickhouse",
        "rawQuery": "SELECT count(DISTINCT JSONExtractString(resource_attributes, 'negotiation.id')) FROM signoz_traces.distributed_traces WHERE serviceName = 'negotiation-fsm' AND JSONExtractString(span_attributes, 'fsm.state') NOT IN ('completed', 'cancelled', 'failed') AND timestamp > now() - INTERVAL 1 DAY"
      }
    },
    {
      "title": "Cost LLM Azi",
      "type": "value",
      "gridPos": {"h": 4, "w": 4, "x": 20, "y": 0},
      "query": {
        "queryType": "metrics",
        "metricsQuery": {
          "metricName": "cerniq_etapa3_llm_cost_total_daily",
          "aggregateOperator": "latest"
        }
      },
      "unit": "currency:USD"
    },
    {
      "title": "LLM Requests by Provider",
      "type": "timeseries",
      "gridPos": {"h": 8, "w": 12, "x": 0, "y": 4},
      "query": {
        "queryType": "builder",
        "builder": {
          "queryData": [{
            "aggregateOperator": "rate",
            "aggregateAttribute": {
              "key": "duration_nano",
              "dataType": "float64"
            },
            "groupBy": [{
              "key": "llm.provider",
              "dataType": "string"
            }],
            "filters": [{
              "key": "llm.provider",
              "operator": "exists"
            }]
          }]
        }
      }
    },
    {
      "title": "LLM Latency Distribution",
      "type": "histogram",
      "gridPos": {"h": 8, "w": 12, "x": 12, "y": 4},
      "query": {
        "queryType": "builder",
        "builder": {
          "queryData": [{
            "aggregateOperator": "histogram",
            "aggregateAttribute": {
              "key": "duration_nano",
              "dataType": "float64"
            },
            "filters": [{
              "key": "llm.provider",
              "operator": "exists"
            }]
          }]
        }
      }
    },
    {
      "title": "Top Errors",
      "type": "table",
      "gridPos": {"h": 8, "w": 12, "x": 0, "y": 12},
      "query": {
        "queryType": "builder",
        "builder": {
          "queryData": [{
            "aggregateOperator": "count",
            "groupBy": [
              {"key": "exception.type", "dataType": "string"},
              {"key": "exception.message", "dataType": "string"}
            ],
            "filters": [{
              "key": "status_code",
              "value": "STATUS_CODE_ERROR",
              "operator": "="
            }],
            "orderBy": {
              "columnName": "count",
              "order": "desc"
            },
            "limit": 20
          }]
        }
      }
    },
    {
      "title": "Traces - Recent Errors",
      "type": "traces",
      "gridPos": {"h": 8, "w": 12, "x": 12, "y": 12},
      "query": {
        "queryType": "builder",
        "builder": {
          "queryData": [{
            "filters": [{
              "key": "status_code",
              "value": "STATUS_CODE_ERROR",
              "operator": "="
            }],
            "orderBy": {
              "columnName": "timestamp",
              "order": "desc"
            },
            "limit": 50
          }]
        }
      }
    }
  ]
}
```

---

## 5. Configurare Prometheus

### 5.1 Prometheus Main Configuration

```yaml
# Filename: config/prometheus.yml
# Description: Configurare Prometheus pentru Etapa 3

global:
  scrape_interval: 15s
  scrape_timeout: 10s
  evaluation_interval: 15s
  external_labels:
    cluster: 'cerniq-production'
    environment: 'production'

# Alerting configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:64092
      scheme: http
      timeout: 10s
      api_version: v2

# Rule files
rule_files:
  - /etc/prometheus/rules/*.yml

# Scrape configurations
scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:64090']
    metrics_path: /metrics
    scheme: http

  # OpenTelemetry Collector
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:64093', 'otel-collector:64094']

  # Etapa 3 Backend Services
  - job_name: 'etapa3-backend'
    dns_sd_configs:
      - names:
          - 'tasks.etapa3-api'
        type: 'A'
        port: 64098
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '(.+):64098'
        replacement: '${1}'

  # Etapa 3 Workers
  - job_name: 'etapa3-workers'
    static_configs:
      - targets:
          - 'worker-product-knowledge:64098'
          - 'worker-hybrid-search:64098'
          - 'worker-ai-agent-core:64098'
          - 'worker-negotiation-fsm:64098'
          - 'worker-pricing-discount:64098'
          - 'worker-stock-inventory:64098'
          - 'worker-oblio-integration:64098'
          - 'worker-efactura-spv:64098'
          - 'worker-document-generation:64098'
          - 'worker-handover-channel:64098'
          - 'worker-sentiment-intent:64098'
          - 'worker-mcp-server:64098'
          - 'worker-guardrails:64098'
          - 'worker-human-intervention:64098'
        labels:
          group: 'workers'
    relabel_configs:
      - source_labels: [__address__]
        target_label: worker_name
        regex: 'worker-(.+):64098'
        replacement: '${1}'

  # PostgreSQL
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:64072']
    metrics_path: /metrics

  # Redis
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:64073']

  # BullMQ Dashboard
  - job_name: 'bullmq'
    static_configs:
      - targets: ['bull-exporter:64074']

  # Node Exporter (host metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:64075']

  # cAdvisor (container metrics)
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:64097']

  # Blackbox Exporter (endpoint monitoring)
  - job_name: 'blackbox-http'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://api.cerniq.app/health
          - https://api.cerniq.app/health/ready
          - https://www.anaf.ro
          - https://api.termene.ro
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:64076

# Remote write (pentru long-term storage)
remote_write:
  - url: "http://victoriametrics:64077/api/v1/write"
    queue_config:
      max_samples_per_send: 10000
      batch_send_deadline: 5s
      min_backoff: 30ms
      max_backoff: 5s
```
