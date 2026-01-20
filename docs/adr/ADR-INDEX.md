# CERNIQ.APP — ADR Index

## Centralized Architecture Decision Records

**Total ADR-uri:** 105+  
**Actualizat:** 20 Ianuarie 2026

---

## SUMAR PER ETAPĂ

| Etapă | ADR Count | Focus Principal |
| ----- | --------- | --------------- |
| [Etapa 0](#etapa-0-infrastructure) | 30 | Infrastructure, DevOps, Security |
| [Etapa 1](#etapa-1-data-enrichment) | 20 | Data Pipeline, Workers, Schema |
| [Etapa 2](#etapa-2-cold-outreach) | 15 | Outreach, WhatsApp, Email |
| [Etapa 3](#etapa-3-ai-sales-agent) | 20 | AI, RAG, Negotiation |
| [Etapa 4](#etapa-4-post-sale) | 10 | Payments, Logistics |
| [Etapa 5](#etapa-5-nurturing) | 10 | Campaigns, Churn, Graph |

---

## ETAPA 0: INFRASTRUCTURE

| ID | Titlu | Status | Data |
| -- | ----- | ------ | ---- |
| [ADR-0001](./ADR%20Etapa%200/ADR-0001-PostgreSQL-18-vs-17.md) | PostgreSQL 18.1 vs 17 | Accepted | 2026-01 |
| [ADR-0002](./ADR%20Etapa%200/ADR-0002-Redis-vs-Valkey.md) | Redis vs Valkey | Accepted | 2026-01 |
| [ADR-0003](./ADR%20Etapa%200/ADR-0003-BullMQ-vs-Alternatives.md) | BullMQ vs Alternatives | Accepted | 2026-01 |
| [ADR-0004](./ADR%20Etapa%200/ADR-0004-Fastify-vs-Express.md) | Fastify vs Express | Accepted | 2026-01 |
| [ADR-0005](./ADR%20Etapa%200/ADR-0005-Drizzle-vs-Prisma.md) | Drizzle vs Prisma ORM | Accepted | 2026-01 |
| [ADR-0006](./ADR%20Etapa%200/ADR-0006-SigNoz-vs-Grafana.md) | SigNoz vs Grafana Stack | Accepted | 2026-01 |
| [ADR-0007](./ADR%20Etapa%200/ADR-0007-Docker-Compose-vs-Swarm.md) | Docker Compose vs Swarm | Accepted | 2026-01 |
| [ADR-0008](./ADR%20Etapa%200/ADR-0008-Traefik-vs-Nginx.md) | Traefik vs Nginx | Accepted | 2026-01 |
| [ADR-0009](./ADR%20Etapa%200/ADR-0009-Hetzner-vs-Cloud.md) | Hetzner Bare Metal vs Cloud | Accepted | 2026-01 |
| [ADR-0010](./ADR%20Etapa%200/ADR-0010-Monorepo-Turborepo.md) | Monorepo with Turborepo | Accepted | 2026-01 |
| [ADR-0011](./ADR%20Etapa%200/ADR-0011-pnpm-vs-npm.md) | pnpm vs npm | Accepted | 2026-01 |
| [ADR-0012](./ADR%20Etapa%200/ADR-0012-Vitest-vs-Jest.md) | Vitest vs Jest | Accepted | 2026-01 |
| [ADR-0013](./ADR%20Etapa%200/ADR-0013-Zod-Validation.md) | Zod for Validation | Accepted | 2026-01 |
| [ADR-0014](./ADR%20Etapa%200/ADR-0014-TypeScript-Strict.md) | TypeScript Strict Mode | Accepted | 2026-01 |
| [ADR-0015](./ADR%20Etapa%200/ADR-0015-GDPR-Data-Retention-Policy.md) | GDPR Data Retention | Accepted | 2026-01 |
| [ADR-0016](./ADR%20Etapa%200/ADR-0016-Multi-Tenant-RLS.md) | Multi-Tenant RLS | Accepted | 2026-01 |
| [ADR-0017](./ADR%20Etapa%200/ADR-0017-Secrets-Management-Strategy.md) | Secrets Management | Accepted | 2026-01 |
| [ADR-0018](./ADR%20Etapa%200/ADR-0018-BorgBackup-Strategy.md) | BorgBackup Strategy | Accepted | 2026-01 |
| [ADR-0019](./ADR%20Etapa%200/ADR-0019-React-19-Adoption.md) | React 19 Adoption | Accepted | 2026-01 |
| [ADR-0020](./ADR%20Etapa%200/ADR-0020-TanStack-Query-Router.md) | TanStack Query & Router | Accepted | 2026-01 |
| [ADR-0021](./ADR%20Etapa%200/ADR-0021-Tailwind-4-shadcn.md) | Tailwind 4 + shadcn/ui | Accepted | 2026-01 |
| [ADR-0022](./ADR%20Etapa%200/ADR-0022-OpenTelemetry-SDK.md) | OpenTelemetry SDK | Accepted | 2026-01 |
| [ADR-0023](./ADR%20Etapa%200/ADR-0023-Biome-Linter.md) | Biome Linter | Accepted | 2026-01 |
| [ADR-0024](./ADR%20Etapa%200/ADR-0024-Playwright-E2E.md) | Playwright for E2E | Accepted | 2026-01 |
| [ADR-0025](./ADR%20Etapa%200/ADR-0025-GitHub-Actions-CI.md) | GitHub Actions CI | Accepted | 2026-01 |
| [ADR-0026](./ADR%20Etapa%200/ADR-0026-Changesets-Versioning.md) | Changesets Versioning | Accepted | 2026-01 |
| [ADR-0027](./ADR%20Etapa%200/ADR-0027-Error-Handling.md) | Error Handling Strategy | Accepted | 2026-01 |
| [ADR-0028](./ADR%20Etapa%200/ADR-0028-Logging-Strategy.md) | Logging Strategy | Accepted | 2026-01 |
| [ADR-0029](./ADR%20Etapa%200/ADR-0029-Testing-Strategy.md) | Testing Strategy | Accepted | 2026-01 |
| [ADR-0030](./ADR%20Etapa%200/ADR-0030-API-Versioning.md) | API Versioning | Accepted | 2026-01 |

---

## ETAPA 1: DATA ENRICHMENT

| ID | Titlu | Status | Data |
| -- | ----- | ------ | ---- |
| [ADR-0031](./ADR%20Etapa%201/ADR-0031-Bronze-Silver-Gold.md) | Bronze-Silver-Gold Schema | Accepted | 2026-01 |
| [ADR-0032](./ADR%20Etapa%201/ADR-0032-Worker-Categories.md) | Worker Categories A-P | Accepted | 2026-01 |
| [ADR-0033](./ADR%20Etapa%201/ADR-0033-CUI-Normalization.md) | CUI Normalization Rules | Accepted | 2026-01 |
| [ADR-0034](./ADR%20Etapa%201/ADR-0034-ANAF-Integration.md) | ANAF API Integration | Accepted | 2026-01 |
| [ADR-0035](./ADR%20Etapa%201/ADR-0035-Termene-Scraping.md) | Termene.ro Scraping | Accepted | 2026-01 |
| [ADR-0036](./ADR%20Etapa%201/ADR-0036-Deduplication-Strategy.md) | Deduplication Strategy | Accepted | 2026-01 |
| [ADR-0037](./ADR%20Etapa%201/ADR-0037-Lead-Scoring.md) | Lead Scoring Algorithm | Accepted | 2026-01 |
| [ADR-0038](./ADR%20Etapa%201/ADR-0038-pgvector-Embeddings.md) | pgvector for Embeddings | Accepted | 2026-01 |
| [ADR-0039](./ADR%20Etapa%201/ADR-0039-pg_trgm-FuzzySearch.md) | pg_trgm Fuzzy Search | Accepted | 2026-01 |
| [ADR-0040](./ADR%20Etapa%201/ADR-0040-PostGIS-Geography.md) | PostGIS for Geography | Accepted | 2026-01 |
| ... | (10 more ADRs) | | |

---

## ETAPA 2: COLD OUTREACH

| ID | Titlu | Status | Data |
| -- | ----- | ------ | ---- |
| [ADR-0051](./ADR%20Etapa%202/ADR-0051-TimelinesAI-WhatsApp.md) | TimelinesAI for WhatsApp | Accepted | 2026-01 |
| [ADR-0052](./ADR%20Etapa%202/ADR-0052-Phone-Rotation.md) | Phone Rotation Strategy | Accepted | 2026-01 |
| [ADR-0053](./ADR%20Etapa%202/ADR-0053-Resend-Email.md) | Resend for Transactional | Accepted | 2026-01 |
| [ADR-0054](./ADR%20Etapa%202/ADR-0054-Instantly-Warmup.md) | Instantly for Warmup | Accepted | 2026-01 |
| [ADR-0055](./ADR%20Etapa%202/ADR-0055-Quota-Lua-Scripts.md) | Quota Management Lua | Accepted | 2026-01 |
| [ADR-0056](./ADR%20Etapa%202/ADR-0056-Sequence-Engine.md) | Sequence Engine Design | Accepted | 2026-01 |
| [ADR-0057](./ADR%20Etapa%202/ADR-0057-AB-Testing.md) | A/B Testing Framework | Accepted | 2026-01 |
| ... | (8 more ADRs) | | |

---

## ETAPA 3: AI SALES AGENT

| ID | Titlu | Status | Data |
| -- | ----- | ------ | ---- |
| [ADR-0071](./ADR%20Etapa%203/ADR-0071-OpenAI-vs-Local-LLM.md) | OpenAI vs Local LLM | Accepted | 2026-01 |
| [ADR-0072](./ADR%20Etapa%203/ADR-0072-RAG-Architecture.md) | RAG Architecture | Accepted | 2026-01 |
| [ADR-0073](./ADR%20Etapa%203/ADR-0073-Hybrid-Search.md) | Hybrid Search (Vector+BM25) | Accepted | 2026-01 |
| [ADR-0074](./ADR%20Etapa%203/ADR-0074-XState-Negotiation.md) | XState for Negotiation FSM | Accepted | 2026-01 |
| [ADR-0075](./ADR%20Etapa%203/ADR-0075-Tool-Calling.md) | LLM Tool Calling Pattern | Accepted | 2026-01 |
| [ADR-0076](./ADR%20Etapa%203/ADR-0076-Guardrails.md) | Anti-Hallucination Guards | Accepted | 2026-01 |
| [ADR-0077](./ADR%20Etapa%203/ADR-0077-Oblio-Integration.md) | Oblio Invoicing | Accepted | 2026-01 |
| [ADR-0078](./ADR%20Etapa%203/ADR-0078-Tool-Call-Logging.md) | Tool Call Logging | Accepted | 2026-01 |
| [ADR-0079](./ADR%20Etapa%203/ADR-0079-e-Factura-ANAF.md) | e-Factura ANAF | Accepted | 2026-01 |
| [ADR-0080](./ADR%20Etapa%203/ADR-0080-Human-Handover.md) | Human Handover Triggers | Accepted | 2026-01 |
| ... | (10 more ADRs) | | |

---

## ETAPA 4: POST-SALE

| ID | Titlu | Status | Data |
| -- | ----- | ------ | ---- |
| [ADR-0091](./ADR%20Etapa%204/ADR-0091-Revolut-Payments.md) | Revolut Business API | Accepted | 2026-01 |
| [ADR-0092](./ADR%20Etapa%204/ADR-0092-HITL-Approval-System.md) | HITL Approval System | Accepted | 2026-01 |
| [ADR-0093](./ADR%20Etapa%204/ADR-0093-Sameday-Logistics.md) | Sameday Integration | Accepted | 2026-01 |
| [ADR-0094](./ADR%20Etapa%204/ADR-0094-Credit-Scoring.md) | Credit Scoring Model | Accepted | 2026-01 |
| [ADR-0095](./ADR%20Etapa%204/ADR-0095-Bank-Reconciliation.md) | Bank Reconciliation | Accepted | 2026-01 |
| ... | (5 more ADRs) | | |

---

## ETAPA 5: NURTURING

| ID | Titlu | Status | Data |
| -- | ----- | ------ | ---- |
| [ADR-0101](./ADR%20Etapa%205/ADR-0101-RFM-Segmentation.md) | RFM Segmentation | Accepted | 2026-01 |
| [ADR-0102](./ADR%20Etapa%205/ADR-0102-NetworkX-Graph.md) | NetworkX for Social Graph | Accepted | 2026-01 |
| [ADR-0103](./ADR%20Etapa%205/ADR-0103-KOL-Graph-Centrality.md) | KOL Identification | Accepted | 2026-01 |
| [ADR-0104](./ADR%20Etapa%205/ADR-0104-Churn-Prediction.md) | Churn Prediction Model | Accepted | 2026-01 |
| [ADR-0105](./ADR%20Etapa%205/ADR-0105-PostGIS-Proximity.md) | PostGIS Proximity Queries | Accepted | 2026-01 |
| ... | (5 more ADRs) | | |

---

## STATUS LEGEND

| Status | Meaning |
| ------ | ------- |
| **Proposed** | În discuție, neaprobat încă |
| **Accepted** | Aprobat și în implementare |
| **Deprecated** | Înlocuit de alt ADR |
| **Superseded** | Complet înlocuit, vezi referință |

---

## TEMPLATE

Pentru ADR-uri noi, folosește: [`template.md`](./template.md)

---

## DOCUMENTE CONEXE

- [Master Specification](../specifications/master-specification.md)
- [Architecture Overview](../architecture/architecture.md)
- [Technical Debt Board](../architecture/technical-debt-board.md)

---

**Actualizat:** 20 Ianuarie 2026
