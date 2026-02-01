# CERNIQ.APP — ADR Index

## Centralized Architecture Decision Records

**Total ADR-uri:** 106  
**Actualizat:** 1 Februarie 2026

---

## SUMAR PER ETAPĂ

| Etapă | ADR Count | Focus Principal |
| ----- | --------- | --------------- |
| [Etapa 0](#etapa-0) | 31 | Infrastructure, DevOps, Security |
| [Etapa 1](#etapa-1) | 20 | Data Pipeline, Workers, Schema |
| [Etapa 2](#etapa-2) | 15 | Outreach, WhatsApp, Email |
| [Etapa 3](#etapa-3) | 20 | AI, RAG, Negotiation |
| [Etapa 4](#etapa-4) | 10 | Payments, Logistics |
| [Etapa 5](#etapa-5) | 10 | Campaigns, Churn, Graph |

---

## ETAPA 0: INFRASTRUCTURE, DEVOPS, SECURITY

| ID | Titlu | Status | Data |
| -- | ----- | ------ | ---- |
| [ADR-00XX](./ADR%20Etapa%200/ADR-00XX-Provider-Abstraction.md) | ADR-00XX: Provider Abstraction Layer | — | — |
| [ADR-0001](./ADR%20Etapa%200/ADR-0001-PNPM-ca-Package-Manager-Exclusiv.md) | PNPM ca Package Manager Exclusiv | Accepted | 2026-01-15 |
| [ADR-0002](./ADR%20Etapa%200/ADR-0002-Node-js-v24-LTS-Krypton.md) | Node.js v24 LTS "Krypton" | Accepted | 2026-01-15 |
| [ADR-0003](./ADR%20Etapa%200/ADR-0003-Python-3-14-Free-Threading-pentru-Workers.md) | Python 3.14 Free-Threading pentru Workers | Accepted | 2026-01-15 |
| [ADR-0004](./ADR%20Etapa%200/ADR-0004-PostgreSQL-18-1-cu-PostGIS.md) | PostgreSQL 18.1 cu PostGIS | Accepted | 2026-01-15 |
| [ADR-0005](./ADR%20Etapa%200/ADR-0005-Row-Level-Security-pentru-Multi-Tenancy.md) | Row-Level Security pentru Multi-Tenancy | Accepted | 2026-01-15 |
| [ADR-0006](./ADR%20Etapa%200/ADR-0006-Redis-8-4-0-cu-BullMQ-v5.md) | Redis 8.4.0 cu BullMQ v5.66.5 | Accepted (Updated) | 2026-01-15 (Updated: 2026-02-01) |
| [ADR-0007](./ADR%20Etapa%200/ADR-0007-Drizzle-ORM-pentru-Database-Access.md) | Drizzle ORM pentru Database Access | Accepted | 2026-01-15 |
| [ADR-0008](./ADR%20Etapa%200/ADR-0008-Fastify-v5-6-2-ca-API-Framework.md) | Fastify v5.6.2 ca API Framework | Accepted | 2026-01-15 |
| [ADR-0009](./ADR%20Etapa%200/ADR-0009-Zod-pentru-Validation-Strategy.md) | Zod pentru Validation Strategy | Accepted | 2026-01-15 |
| [ADR-0010](./ADR%20Etapa%200/ADR-0010-Error-Handling-Pattern-Standardizat.md) | Error Handling Pattern Standardizat | Accepted | 2026-01-15 |
| [ADR-0011](./ADR%20Etapa%200/ADR-0011-API-Versioning-Strategy.md) | API Versioning Strategy | Accepted | 2026-01-15 |
| [ADR-0012](./ADR%20Etapa%200/ADR-0012-React-19-cu-Refine-v5.md) | React 19 cu Refine v5 | Accepted | 2026-01-15 |
| [ADR-0013](./ADR%20Etapa%200/ADR-0013-Tailwind-CSS-v4-cu-Oxide-Engine.md) | Tailwind CSS v4 cu Oxide Engine | Accepted | 2026-01-15 |
| [ADR-0014](./ADR%20Etapa%200/ADR-0014-Traefik-v3-6-6-ca-Reverse-Proxy.md) | Traefik v3.6.6 ca Reverse Proxy | Accepted | 2026-01-15 |
| [ADR-0015](./ADR%20Etapa%200/ADR-0015-Docker-Containerization-Strategy.md) | Docker Containerization Strategy | Accepted | 2026-01-15 |
| [ADR-0016](./ADR%20Etapa%200/ADR-0016-SigNoz-pentru-Observability.md) | SigNoz pentru Observability | Accepted | 2026-01-15 |
| [ADR-0017](./ADR%20Etapa%200/ADR-0017-Secrets-Management-Strategy.md) | Secrets Management Strategy | Accepted | 2026-01-15 |
| [ADR-0018](./ADR%20Etapa%200/ADR-0018-Authentication-Flow-JWT-Refresh-Tokens.md) | Authentication Flow (JWT + Refresh Tokens) | Accepted | 2026-01-15 |
| [ADR-0019](./ADR%20Etapa%200/ADR-0019-CORS-Policy.md) | CORS Policy | Accepted | 2026-01-15 |
| [ADR-0020](./ADR%20Etapa%200/ADR-0020-BorgBackup-cu-Hetzner-Storage-Box.md) | BorgBackup cu Hetzner Storage Box | Accepted | 2026-01-15 |
| [ADR-0021](./ADR%20Etapa%200/ADR-0021-Naming-Conventions.md) | Naming Conventions (snake_case/camelCase) | Accepted | 2026-01-15 |
| [ADR-0022](./ADR%20Etapa%200/ADR-0022-Port-Allocation-Strategy.md) | Port Allocation Strategy | Accepted | 2026-01-14 (Updated from 2026-01-15) |
| [ADR-0023](./ADR%20Etapa%200/ADR-0023-Logging-Standards-cu-Pino.md) | Logging Standards cu Pino | Accepted | 2026-01-15 |
| [ADR-0024](./ADR%20Etapa%200/ADR-0024-Directory-Structure-Standard.md) | Directory Structure Standard | Accepted | 2026-01-15 |
| [ADR-0025](./ADR%20Etapa%200/ADR-0025-Health-Check-Patterns.md) | Health Check Patterns | Accepted | 2026-01-15 |
| [ADR-0026](./ADR%20Etapa%200/ADR-0026-Graceful-Shutdown-Strategy.md) | Graceful Shutdown Strategy | Accepted | 2026-01-15 |
| [ADR-0027](./ADR%20Etapa%200/ADR-0027-Container-Resource-Limits.md) | Container Resource Limits | Accepted | 2026-01-15 |
| [ADR-0028](./ADR%20Etapa%200/ADR-0028-Git-Branching-Strategy.md) | Git Branching Strategy | Accepted | 2026-01-15 |
| [ADR-0029](./ADR%20Etapa%200/ADR-0029-Testing-Strategy.md) | Testing Strategy | Accepted | 2026-01-15 |
| [ADR-0030](./ADR%20Etapa%200/ADR-0030-Environment-Management.md) | Environment Management (dev/staging/prod) | Accepted | 2026-01-15 |

## ETAPA 1: DATA PIPELINE, WORKERS, SCHEMA

| ID | Titlu | Status | Data |
| -- | ----- | ------ | ---- |
| [ADR-0031](./ADR%20Etapa%201/ADR-0031-Arhitectura-Medallion-Bronze-Silver-Gold.md) | Arhitectură Medallion Bronze-Silver-Gold | Accepted | 2026-01-15 |
| [ADR-0032](./ADR%20Etapa%201/ADR-0032-Strategie-Ingestie-Multi-Source.md) | Strategie Ingestie Multi-Source | Accepted | 2026-01-15 |
| [ADR-0033](./ADR%20Etapa%201/ADR-0033-Validare-CUI-cu-Modulo-11.md) | Validare CUI cu Modulo-11 | Accepted | 2026-01-15 |
| [ADR-0034](./ADR%20Etapa%201/ADR-0034-ANAF-API-Integration-Strategy.md) | ANAF API Integration Strategy | Accepted | 2026-01-15 |
| [ADR-0035](./ADR%20Etapa%201/ADR-0035-Termenero-API-Integration.md) | Termene.ro API Integration | Accepted | 2026-01-15 |
| [ADR-0036](./ADR%20Etapa%201/ADR-0036-Email-Discovery-Strategy.md) | Email Discovery Strategy | Accepted | 2026-01-15 |
| [ADR-0037](./ADR%20Etapa%201/ADR-0037-Geocoding-Strategy.md) | Geocoding Strategy | Accepted | 2026-01-15 |
| [ADR-0038](./ADR%20Etapa%201/ADR-0038-Deduplicare-Strategy.md) | Deduplicare Strategy | Accepted | 2026-01-15 |
| [ADR-0039](./ADR%20Etapa%201/ADR-0039-Quality-Scoring-Algorithm.md) | Quality Scoring Algorithm | Accepted | 2026-01-15 |
| [ADR-0040](./ADR%20Etapa%201/ADR-0040-Pipeline-Orchestration.md) | Pipeline Orchestration | Accepted | 2026-01-15 |
| [ADR-0041](./ADR%20Etapa%201/ADR-0041-HITL-Integration-Etapa-1.md) | HITL Integration Etapa 1 | Accepted | 2026-01-15 |
| [ADR-0042](./ADR%20Etapa%201/ADR-0042-Bronze-Layer-Immutability.md) | Bronze Layer Immutability | Accepted | 2026-01-15 |
| [ADR-0043](./ADR%20Etapa%201/ADR-0043-Multi-Tenant-Data-Isolation.md) | Multi-Tenant Data Isolation | Accepted | 2026-01-15 |
| [ADR-0044](./ADR%20Etapa%201/ADR-0044-Event-Sourcing-pentru-Enrichment.md) | Event Sourcing pentru Enrichment | Accepted | 2026-01-15 |
| [ADR-0045](./ADR%20Etapa%201/ADR-0045-Rate-Limiting-Architecture.md) | Rate Limiting Architecture | Accepted | 2026-01-15 |
| [ADR-0046](./ADR%20Etapa%201/ADR-0046-Web-Scraping-Strategy.md) | Web Scraping Strategy | Accepted | 2026-01-15 |
| [ADR-0047](./ADR%20Etapa%201/ADR-0047-AI-Structuring-Pipeline.md) | AI Structuring Pipeline | Accepted | 2026-01-15 |
| [ADR-0048](./ADR%20Etapa%201/ADR-0048-Enrichment-Priority-Queue.md) | Enrichment Priority Queue | Accepted | 2026-01-15 |
| [ADR-0049](./ADR%20Etapa%201/ADR-0049-Data-Retention-Policy.md) | Data Retention Policy | Accepted | 2026-01-15 |
| [ADR-0050](./ADR%20Etapa%201/ADR-0050-Observability-Stack-Etapa-1.md) | Observability Stack Etapa 1 | Accepted | 2026-01-15 |

## ETAPA 2: OUTREACH, WHATSAPP, EMAIL

| ID | Titlu | Status | Data |
| -- | ----- | ------ | ---- |
| [ADR-0051](./ADR%20Etapa%202/ADR-0051-Multi-Channel-Outreach-Strategy.md) | Multi-Channel Outreach Strategy | Accepted | 2026-01-15 |
| [ADR-0052](./ADR%20Etapa%202/ADR-0052-Quota-Guardian-Pattern.md) | Quota Guardian Pattern | Accepted | 2026-01-15 |
| [ADR-0053](./ADR%20Etapa%202/ADR-0053-Sticky-Phone-Assignment.md) | Sticky Phone Assignment | Accepted | 2026-01-15 |
| [ADR-0054](./ADR%20Etapa%202/ADR-0054-Business-Hours-Enforcement.md) | Business Hours Enforcement | Accepted | 2026-01-15 |
| [ADR-0055](./ADR%20Etapa%202/ADR-0055-Jitter-Pattern-for-Human-Behavior.md) | Jitter Pattern for Human Behavior | Accepted | 2026-01-15 |
| [ADR-0056](./ADR%20Etapa%202/ADR-0056-Spintax-for-Message-Uniqueness.md) | Spintax for Message Uniqueness | Accepted | 2026-01-15 |
| [ADR-0057](./ADR%20Etapa%202/ADR-0057-Channel-Segregation-Cold-vs-Warm.md) | Channel Segregation (Cold vs Warm) | Accepted | 2026-01-15 |
| [ADR-0058](./ADR%20Etapa%202/ADR-0058-Head-of-Line-Blocking-Prevention.md) | Head-of-Line Blocking Prevention | Accepted | 2026-01-15 |
| [ADR-0059](./ADR%20Etapa%202/ADR-0059-Webhook-Normalization-Pattern.md) | Webhook Normalization Pattern | Accepted | 2026-01-15 |
| [ADR-0060](./ADR%20Etapa%202/ADR-0060-Lead-State-Machine.md) | Lead State Machine | Accepted | 2026-01-15 |
| [ADR-0061](./ADR%20Etapa%202/ADR-0061-Sentiment-Based-Routing.md) | Sentiment-Based Routing | Accepted | 2026-01-15 |
| [ADR-0062](./ADR%20Etapa%202/ADR-0062-Human-Takeover-Protocol.md) | Human Takeover Protocol | Accepted | 2026-01-15 |
| [ADR-0063](./ADR%20Etapa%202/ADR-0063-Sequence-Based-Follow-up.md) | Sequence-Based Follow-up | Accepted | 2026-01-15 |
| [ADR-0064](./ADR%20Etapa%202/ADR-0064-Circuit-Breaker-for-Bounce-Rate.md) | Circuit Breaker for Bounce Rate | Accepted | 2026-01-15 |
| [ADR-0065](./ADR%20Etapa%202/ADR-0065-Phone-Health-Monitoring.md) | Phone Health Monitoring | Accepted | 2026-01-15 |

## ETAPA 3: AI, RAG, NEGOTIATION

| ID | Titlu | Status | Data |
| -- | ----- | ------ | ---- |
| [ADR-0066](./ADR%20Etapa%203/ADR-0066-Neuro-Symbolic-AI-Agent-Paradigm.md) | Paradigmă Neuro-Simbolică pentru AI Agent | Accepted | 2026-01-18 |
| [ADR-0067](./ADR%20Etapa%203/ADR-0067-xAI-Grok4-Primary-LLM.md) | xAI Grok-4 ca LLM Primary | Accepted | 2026-01-18 |
| [ADR-0068](./ADR%20Etapa%203/ADR-0068-MCP-Model-Context-Protocol.md) | Model Context Protocol (MCP) pentru Tool Access | Accepted | 2026-01-18 |
| [ADR-0069](./ADR%20Etapa%203/ADR-0069-Hybrid-Search-pgvector-BM25-RRF.md) | Hybrid Search cu pgvector + BM25 + RRF | Accepted | 2026-01-18 |
| [ADR-0070](./ADR%20Etapa%203/ADR-0070-Negotiation-FSM.md) | Negotiation Finite State Machine | Accepted | 2026-01-18 |
| [ADR-0071](./ADR%20Etapa%203/ADR-0071-Anti-Hallucination-Guardrails.md) | Guardrails Anti-Hallucination Obligatorii | Accepted | 2026-01-18 |
| [ADR-0072](./ADR%20Etapa%203/ADR-0072-Oblio-Invoicing.md) | Oblio.eu pentru Facturare | Accepted | 2026-01-18 |
| [ADR-0073](./ADR%20Etapa%203/ADR-0073-eFactura-Safety-Net.md) | e-Factura Safety Net la 4 Zile | Accepted | 2026-01-18 |
| [ADR-0074](./ADR%20Etapa%203/ADR-0074-Stock-Reservation-TTL.md) | Stock Reservation cu TTL | Accepted | 2026-01-18 |
| [ADR-0075](./ADR%20Etapa%203/ADR-0075-Discount-Approval-Thresholds.md) | Discount Approval Thresholds | Accepted | 2026-01-18 |
| [ADR-0076](./ADR%20Etapa%203/ADR-0076-Python-314-Free-Threading.md) | Python 3.14 Free-Threading pentru MCP | Accepted | 2026-01-18 |
| [ADR-0077](./ADR%20Etapa%203/ADR-0077-Conversation-Store-Separation.md) | Separare Conversation Store | Accepted | 2026-01-18 |
| [ADR-0078](./ADR%20Etapa%203/ADR-0078-Tool-Call-Logging.md) | Tool Call Logging Complet | Accepted | 2026-01-18 |
| [ADR-0079](./ADR%20Etapa%203/ADR-0079-Guardrail-Regeneration.md) | Regenerare Response pe Guardrail Fail | Accepted | 2026-01-18 |
| [ADR-0080](./ADR%20Etapa%203/ADR-0080-Sticky-Session.md) | Sticky Session pentru Negociere | Accepted | 2026-01-18 |
| [ADR-0081](./ADR%20Etapa%203/ADR-0081-WeasyPrint-PDF-Generation.md) | PDF Generation cu WeasyPrint | Accepted | 2026-01-18 |
| [ADR-0082](./ADR%20Etapa%203/ADR-0082-RAG-Chunking-Strategy.md) | Chunking Strategy pentru RAG | Accepted | 2026-01-18 |
| [ADR-0083](./ADR%20Etapa%203/ADR-0083-OpenAI-Embeddings.md) | Embeddings cu OpenAI text-embedding-3-small | Accepted | 2026-01-18 |
| [ADR-0084](./ADR%20Etapa%203/ADR-0084-LLM-Fallback-Strategy.md) | LLM Fallback Strategy | Accepted | 2026-01-18 |
| [ADR-0085](./ADR%20Etapa%203/ADR-0085-Hash-Chain-Audit-Trail.md) | Audit Trail cu Hash Chain | Accepted | 2026-01-18 |

## ETAPA 4: PAYMENTS, LOGISTICS

| ID | Titlu | Status | Data |
| -- | ----- | ------ | ---- |
| [ADR-0086](./ADR%20Etapa%204/ADR-0086-Revolut-Business-API.md) | Revolut Business API Integration | Accepted | 2026-01-19 |
| [ADR-0087](./ADR%20Etapa%204/ADR-0087-Three-Tier-Reconciliation.md) | Three-Tier Payment Reconciliation | Accepted | 2026-01-19 |
| [ADR-0088](./ADR%20Etapa%204/ADR-0088-Credit-Scoring-Termene.md) | Credit Scoring via Termene.ro | Accepted | 2026-01-19 |
| [ADR-0089](./ADR%20Etapa%204/ADR-0089-Dynamic-Contract-Generation.md) | Dynamic Contract Generation | Accepted | 2026-01-19 |
| [ADR-0090](./ADR%20Etapa%204/ADR-0090-Sameday-Courier.md) | Sameday Courier Integration | Accepted | 2026-01-19 |
| [ADR-0091](./ADR%20Etapa%204/ADR-0091-Order-Lifecycle-FSM.md) | Event-Driven Order Lifecycle | Accepted | 2026-01-19 |
| [ADR-0092](./ADR%20Etapa%204/ADR-0092-HITL-Approval-System.md) | HITL Approval System Design | Accepted | 2026-01-19 |
| [ADR-0093](./ADR%20Etapa%204/ADR-0093-Partitioned-Audit-Tables.md) | Partitioned Audit Tables | Accepted | 2026-01-19 |
| [ADR-0094](./ADR%20Etapa%204/ADR-0094-WebSocket-Dashboard.md) | Real-Time Dashboard via WebSocket | Accepted | 2026-01-19 |
| [ADR-0095](./ADR%20Etapa%204/ADR-0095-Oblio-Stock-Sync.md) | Oblio Stock Sync Strategy | Accepted | 2026-01-19 |

## ETAPA 5: CAMPAIGNS, CHURN, GRAPH

| ID | Titlu | Status | Data |
| -- | ----- | ------ | ---- |
| [ADR-0096](./ADR%20Etapa%205/ADR-0096-Nurturing-State-Machine.md) | Nurturing State Machine Design | Accepted | 2026-01-19 |
| [ADR-0097](./ADR%20Etapa%205/ADR-0097-Churn-Detection-AI.md) | Churn Detection via Multi-Signal AI | Accepted | 2026-01-19 |
| [ADR-0098](./ADR%20Etapa%205/ADR-0098-PostGIS-Proximity.md) | PostGIS for Geospatial Proximity | Accepted | 2026-01-19 |
| [ADR-0099](./ADR%20Etapa%205/ADR-0099-Leiden-Community-Detection.md) | NetworkX/Leiden for Community Detection | Accepted | 2026-01-19 |
| [ADR-0100](./ADR%20Etapa%205/ADR-0100-GDPR-Referral-Consent.md) | GDPR Consent-First Referral Flow | Accepted | 2026-01-19 |
| [ADR-0101](./ADR%20Etapa%205/ADR-0101-Competition-Law-Safe-Harbor.md) | Competition Law Safe Harbor for Intel | Accepted | 2026-01-19 |
| [ADR-0102](./ADR%20Etapa%205/ADR-0102-Public-Register-Scraping.md) | Association Data from Public Registers | Accepted | 2026-01-19 |
| [ADR-0103](./ADR%20Etapa%205/ADR-0103-KOL-Graph-Centrality.md) | KOL Identification via Graph Centrality | Accepted | 2026-01-19 |
| [ADR-0104](./ADR%20Etapa%205/ADR-0104-WinBack-Campaigns.md) | Win-Back Campaign Orchestration | Accepted | 2026-01-19 |
| [ADR-0105](./ADR%20Etapa%205/ADR-0105-Realtime-Sentiment.md) | Real-Time Sentiment via Streaming | Accepted | 2026-01-19 |

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

**Actualizat:** 1 Februarie 2026