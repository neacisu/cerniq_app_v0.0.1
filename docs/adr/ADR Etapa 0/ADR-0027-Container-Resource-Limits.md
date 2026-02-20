# ADR-0027: Container Resource Limits

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Pe LXC-urile dedicate Cerniq (ex: CT109 ~32GB RAM), trebuie să alocăm resurse echilibrat între servicii containerizate.

Nota: PostgreSQL ruleaza extern pe CT107 (nu este container in stack-ul Cerniq), iar observability este centralizat pe orchestrator.

## Decizie

| Serviciu               | Memory Limit | Memory Reserve | CPU Limit  | CPU Reserve |
| ---------------------- | ------------ | -------------- | ---------- | ----------- |
| API                    | 2GB          | 512MB          | 2 cores    | 0.5 cores   |
| Workers (total)        | 8GB          | 2GB            | 4 cores    | 1 core      |
| PgBouncer              | 512MB        | 256MB          | 0.5 cores  | 0.25 cores  |
| OpenBao Agents (total) | 384MB        | 128MB          | 0.5 cores  | 0.25 cores  |
| Vector                 | 512MB        | 256MB          | 0.5 cores  | 0.25 cores  |
| OTEL Collector         | 512MB        | 256MB          | 0.5 cores  | 0.25 cores  |
| cAdvisor               | 256MB        | 128MB          | 0.25 cores | 0.1 cores   |
| **Reserved for OS**    | ~4GB         | -              | -          | -           |

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 48G
          cpus: "8"
        reservations:
          memory: 32G
          cpus: "4"
```
