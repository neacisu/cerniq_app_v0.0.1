# CERNIQ.APP — Architecture Changelog

## Toate modificările arhitecturale ale proiectului

**Format:** [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
**Versioning:** [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

### Added

- **Testing Framework:** Documentație completă cu 66 fișiere în `docs/testing/`
  - Test Pyramid (70% Unit, 20% Integration, 10% E2E)
  - Cross-cutting tests: HITL, Security, Performance, Chaos, GDPR
  - Vezi: [Testing Overview](../testing/00-testing-overview.md)

- **GDPR Compliance:**
  - LIA (Legitimate Interest Assessment) complet: [LIA Document](../governance/gdpr-legitimate-interest-assessment.md)
  - DPO responsabilități expandate

- **Infrastructure Docs:**
  - [Backup Setup Guide](../infrastructure/backup-setup-guide.md)
  - [Redis High Availability](../infrastructure/redis-high-availability.md)
  - [Deployment Guide](../infrastructure/deployment-guide.md) — expandat complet

- **Developer Guides:**
  - [Circuit Breaker Pattern](../developer-guide/circuit-breaker-pattern.md)
  - [Worker Queue Inventory](../specifications/worker-queue-inventory.md)

- **ADR Management:**
  - [ADR Index centralizat](../adr/ADR-INDEX.md) — 105+ ADR-uri
  - [ADR-0031: Provider Abstraction](../adr/ADR%20Etapa%200/ADR-0031-Provider-Abstraction-Layer.md)

- **Technical Debt:**
  - [Technical Debt Board](./technical-debt-board.md) — tracking prioritizat

### Changed

- **SigNoz:** Standardizat la v0.107.0 în toate documentele
- **risks-and-technical-debt.md:** Appendix C cu link-uri locale (nu Google Docs)
- **testing-strategy.md:** Referințe la noua structură `docs/testing/`

### Fixed

- Inconsistență versiune SigNoz (v0.106.0 → v0.107.0) în architecture.md
- Link-uri Google Docs înlocuite cu referințe locale în risks doc

---

## [0.1.0] - 2026-01-20

### Added new documents

- **Documentation Phase Complete:**
  - Master Specification v1.2
  - Architecture Overview
  - 6 Etape documentate complet (0-5)
  - 105+ Architecture Decision Records
  - Governance policies (GDPR, Security, Testing)

- **Core Architecture Decisions:**
  - Medallion Data Architecture (Bronze → Silver → Gold)
  - 313 BullMQ Workers
  - Multi-tenant RLS
  - HITL Approval System

---

## [0.0.1] - 2026-01-12

### Added new documentation

- **Initial Architecture:**
  - Vertical Slice + Medallion Data Architecture
  - Specificații Etapele 1-5 (Enrichment, Outreach, AI Sales, Post-Sale, Nurturing)
  
- **Infrastructure:**
  - Docker Compose cu PostgreSQL 18.1, Redis 8.4.0, SigNoz
  - Hetzner bare-metal deployment plan
  
- **Frontend:**
  - React 19 + Tailwind CSS v4 + Refine v5
  - TanStack Query + Router

- **Backend:**
  - Fastify v5.6.2
  - BullMQ 5.66.5 cu 313 workeri planificați
  - Drizzle ORM

---

## ADR-uri Asociate

| Changelog Entry | ADR Reference |
| --------------- | ------------- |
| Medallion Architecture | [ADR-0033](../adr/ADR%20Etapa%201/ADR-0033-Arhitectura-Medallion-Bronze-Silver-Gold.md) |
| BullMQ Workers | [ADR-0006](../adr/ADR%20Etapa%200/ADR-0006-Redis-8-4-0-cu-BullMQ-v5.md) |
| Multi-tenant RLS | [ADR-0005](../adr/ADR%20Etapa%200/ADR-0005-Row-Level-Security-pentru-Multi-Tenancy.md) |
| SigNoz Observability | [ADR-0016](../adr/ADR%20Etapa%200/ADR-0016-SigNoz-pentru-Observability.md) |

---

**Actualizat:** 20 Ianuarie 2026
