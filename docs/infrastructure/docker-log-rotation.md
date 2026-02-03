# Docker Log Rotation Strategy

> **Version:** 1.0.0  
> **Last Updated:** 2026-02-03  
> **References:** ADR-0015

## Overview

Cerniq.app utilizează strategia de log rotation configurată în Docker daemon pentru a preveni umplerea discului și a menține performanța sistemului.

## Configuration

### daemon.json Settings (ADR-0015)

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  }
}
```

### Explanation

| Option | Value | Description |
|--------|-------|-------------|
| `log-driver` | `json-file` | Driver de logging nativ Docker |
| `max-size` | `50m` | Dimensiune maximă per fișier de log |
| `max-file` | `5` | Număr maxim de fișiere de log păstrate |

**Capacitate maximă per container:** 50MB × 5 = **250MB**

## Storage Calculations

### Per-Service Estimates

| Service Category | Containers | Max Storage Each | Total Max |
|------------------|------------|------------------|-----------|
| API | 1 | 250MB | 250MB |
| Workers | 4 | 250MB | 1GB |
| PostgreSQL | 1 | 250MB | 250MB |
| Redis | 1 | 250MB | 250MB |
| Traefik | 1 | 250MB | 250MB |
| SigNoz Stack | 3 | 250MB | 750MB |
| **Total Maximum** | **11** | - | **2.75GB** |

### Location

Logurile Docker sunt stocate în:
```
/var/lib/docker/containers/<container-id>/<container-id>-json.log
```

## Rotation Behavior

### How It Works

1. Docker scrie loguri în `<container-id>-json.log`
2. Când fișierul atinge 50MB, Docker îl redenumește (rotație)
3. Se creează un nou fișier pentru loguri noi
4. Când există 5 fișiere, cel mai vechi este șters
5. Procesul se repetă automat

### File Naming

```
# Container logs directory
/var/lib/docker/containers/abc123.../
├── abc123...-json.log       # Current (active)
├── abc123...-json.log.1     # Previous
├── abc123...-json.log.2     # Older
├── abc123...-json.log.3     # Older
└── abc123...-json.log.4     # Oldest (will be deleted next)
```

## Per-Service Override

Servicii cu nevoi speciale de logging pot suprascrie configurația globală:

### Example: High-Volume API Service

```yaml
services:
  api:
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "10"
```

### Example: Low-Volume Utility Service

```yaml
services:
  cron:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

## Monitoring Log Usage

### Check Current Log Sizes

```bash
# All container logs sorted by size
sudo du -sh /var/lib/docker/containers/*/\*.log | sort -h

# Specific container
docker inspect --format='{{.LogPath}}' <container_name>
sudo ls -lh $(docker inspect --format='{{.LogPath}}' <container_name>)

# Total Docker disk usage
docker system df -v
```

### Script: Check Log Disk Usage

```bash
#!/bin/bash
# check-log-usage.sh

echo "=== Docker Log Disk Usage ==="
echo ""

total=0
for container in $(docker ps -q); do
    name=$(docker inspect --format='{{.Name}}' $container | tr -d '/')
    log_path=$(docker inspect --format='{{.LogPath}}' $container)
    
    if [[ -f "$log_path" ]]; then
        size=$(du -sb "$log_path" 2>/dev/null | cut -f1)
        size_mb=$((size / 1024 / 1024))
        total=$((total + size))
        printf "%-30s %5d MB\n" "$name:" "$size_mb"
    fi
done

total_mb=$((total / 1024 / 1024))
echo ""
echo "Total: ${total_mb} MB"
```

## Log Access

### View Container Logs

```bash
# Latest logs
docker logs <container_name>

# Follow logs in real-time
docker logs -f <container_name>

# Last 100 lines
docker logs --tail 100 <container_name>

# Logs from last hour
docker logs --since 1h <container_name>

# Logs with timestamps
docker logs -t <container_name>
```

### View Rotated Logs

```bash
# Find all log files for a container
sudo ls -la /var/lib/docker/containers/<container-id>/

# Read rotated log file
sudo cat /var/lib/docker/containers/<container-id>/<container-id>-json.log.1
```

## Emergency Procedures

### Clear Logs Without Restart

```bash
# Truncate current log (immediate space recovery)
sudo truncate -s 0 $(docker inspect --format='{{.LogPath}}' <container_name>)

# WARNING: This loses log data but doesn't restart container
```

### Emergency Space Recovery

```bash
# 1. Stop non-critical containers
docker stop cerniq-workers

# 2. Clear all logs
sudo find /var/lib/docker/containers -name "*-json.log" -exec truncate -s 0 {} \;

# 3. Restart containers
docker start cerniq-workers
```

## Integration with Centralized Logging

### SigNoz/OpenTelemetry

Aplicațiile Cerniq trimit loguri structurate direct la SigNoz prin OpenTelemetry, independent de log rotation Docker:

```
Application → Pino Logger → OTLP HTTP (64071) → SigNoz
                    ↓
              Docker json-file (backup)
```

Această arhitectură oferă:
- **Real-time search** prin SigNoz UI
- **Local backup** prin Docker logs
- **Redundancy** în caz de SigNoz downtime

### Log Retention Comparison

| Destination | Retention | Search | Alerting |
|-------------|-----------|--------|----------|
| Docker json-file | ~250MB/container | grep only | No |
| SigNoz | 15 days | Full-text | Yes |

## Best Practices

### DO ✅

1. **Use structured logging (JSON)** - parsare ușoară în SigNoz
2. **Set appropriate log levels** - DEBUG doar în development
3. **Include request IDs** - corelarea logurilor între servicii
4. **Monitor disk usage** - alertă la 80% capacitate

### DON'T ❌

1. **Log sensitive data** - parole, tokens, PII
2. **Use DEBUG in production** - overhead și stocare
3. **Ignore log rotation** - risc de disk full
4. **Rely only on Docker logs** - fără centralized logging

## Validation

### Test Log Rotation

```bash
# Generate test logs
docker exec <container> sh -c 'for i in $(seq 1 1000000); do echo "Test log $i"; done'

# Verify rotation occurred
sudo ls -la /var/lib/docker/containers/<container-id>/*.log*
```

### Validation Script

Use `infra/scripts/log-rotation-test.sh` to validate configuration:

```bash
./infra/scripts/log-rotation-test.sh
```

## References

- [ADR-0015: Docker Containerization Strategy](../adr/ADR%20Etapa%200/ADR-0015-Docker-Containerization-Strategy.md)
- [ADR-0023: Logging Standards with Pino](../adr/ADR%20Etapa%200/ADR-0023-Logging-Standards-cu-Pino.md)
- [Docker Logging Documentation](https://docs.docker.com/config/containers/logging/)
- [daemon.json Template](../../infra/config/docker/daemon.json)
