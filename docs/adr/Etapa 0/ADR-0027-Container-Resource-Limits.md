# ADR-0027: Container Resource Limits

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Pe server de 128GB RAM și 20 cores, trebuie să alocăm resurse echilibrat între servicii.

## Decizie

| Serviciu | Memory Limit | Memory Reserve | CPU Limit | CPU Reserve |
| -------- | ------------ | -------------- | --------- | ----------- |
| PostgreSQL | 48GB | 32GB | 8 cores | 4 cores |
| Redis | 12GB | 8GB | 2 cores | 1 core |
| API | 8GB | 4GB | 4 cores | 2 cores |
| Workers (total) | 16GB | 8GB | 4 cores | 2 cores |
| SigNoz Stack | 16GB | 8GB | 2 cores | 1 core |
| Traefik | 512MB | 256MB | 0.5 cores | 0.25 cores |
| **Reserved for OS** | ~16GB | - | - | - |

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 48G
          cpus: '8'
        reservations:
          memory: 32G
          cpus: '4'
```
