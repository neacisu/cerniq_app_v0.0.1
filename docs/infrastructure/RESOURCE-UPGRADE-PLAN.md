# Resource Upgrade Plan — Cerniq.app (Infrastructura noua)

> **Status:** living doc (infra noua)  
> **Ultima actualizare:** 2026-02-15

## Context

Infrastructura Cerniq este impartita in LXC-uri dedicate, cu servicii centralizate pe orchestrator:

- `CT107` PostgreSQL nativ (shared host, configurari Cerniq aditive)
- `CT108` CI runner (self-hosted)
- `CT109` productie (Docker stack Cerniq)
- `CT110` staging (Docker stack Cerniq)

## Resurse curente (tinta Etapa 0)

- `CT109` (prod):
  - 8 cores, 32GB RAM, rootfs ~100G
- `CT110` (staging):
  - 4 cores, 16GB RAM, rootfs ~80G
- `CT107` (PostgreSQL):
  - 8 cores, 32GB RAM, rootfs ~100G (minim recomandat)

## Upgrade-uri planificate (viitor)

- `f5-13-upgrade-resurse-termen-lung`:
  - CT109: 16 cores, 64GB RAM, rootfs ~200G (doar LXC dedicat Cerniq)

## Observatii

- PostgreSQL nu mai concureaza cu app-ul pe CT109/CT110 (ruleaza pe CT107).
- Observability este centralizata pe orchestrator; pe CT-uri ruleaza doar agenti/sideload (Vector/OTEL/cAdvisor).

