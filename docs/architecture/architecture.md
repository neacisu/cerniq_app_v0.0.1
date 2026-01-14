# CERNIQ.APP — Documentație de Arhitectură arc42 (Vertical Slice Architecture)

## B2B Sales Automation Platform pentru Piața Agricolă Românească

**Versiune:** 1.0  
**Data:** 12 Ianuarie 2026  
**Sursă de Adevăr:** `Cerniq_Master_Spec_Normativ_Complet.md` v1.2  
**Paradigma:** 1-Person-Team (Arhitect Augmentat de AI)  
**Arhitectură:** Vertical Slice + Medallion Data Architecture + Neuro-Symbolic AI

---

## Table of Contents

1. [Introduction and Goals](#1-introduction-and-goals)
2. [Constraints](#2-constraints)
3. [Context and Scope](#3-context-and-scope)
4. [Solution Strategy](#4-solution-strategy)
5. [Building Block View](#5-building-block-view)
6. [Runtime View](#6-runtime-view)
7. [Deployment View](#7-deployment-view)
8. [Crosscutting Concepts](#8-crosscutting-concepts)
9. [Architecture Decisions](#9-architecture-decisions)
10. [Quality Requirements](#10-quality-requirements)
11. [Risks and Technical Debt](#11-risks-and-technical-debt)
12. [Glossary](#12-glossary)

---

## 1. Introduction and Goals

## 1.1 Requirements Overview

**Cerniq.app** este o platformă de automatizare a vânzărilor B2B construită specific pentru piața agricolă românească. Sistemul adresează un segment de piață de **2.86 milioane de ferme**, cooperative agricole și organizații de irigații (OUAI), cu acces la **€2.25 miliarde** în subvenții agricole și **750.000+** fermieri prin registre publice (MADR, APIA).

### Obiective Principale de Business

| Obiectiv | Descriere | Măsură de Succes |
| --- | --- | --- |
| **Automatizare Completă** | Pipeline de la primul contact la facturare | Zero intervenție umană pentru 70% din tranzacții |
| **Zero Hallucinations** | Eliminarea erorilor AI în prețuri, stocuri, date fiscale | 100% acuratețe în documente fiscale |
| **Conformitate Fiscală** | Integrare completă e-Factura/SPV ANAF | 100% conformitate în termen de 5 zile |
| **Scalabilitate Agricolă** | Suport specificitățile fermelor românești | OUAI, Cooperative, subvenții APIA integrate |

### Funcționalități Cheie (5 Etape Pipeline)

```text
ETAPA 1: Data Enrichment      → Bronze → Silver (61 workeri)
ETAPA 2: Cold Outreach        → Multi-channel outreach (52 workeri)
ETAPA 3: AI Sales Agent       → Negociere neuro-simbolică (78 workeri)
ETAPA 4: Post-Sale Monitoring → Cash flow, logistică (45 workeri)
ETAPA 5: Nurturing & Growth   → Ecosistem relațional (58 workeri)
─────────────────────────────────────────────────────────────────
TOTAL: 294+ BullMQ workeri granulari
```

## 1.2 Quality Goals

| Rang | Obiectiv de Calitate | Scenariu | Metrică Target |
| --- | --- | --- | --- |
| 1 | **Acuratețe (Zero Hallucinations)** | AI-ul nu oferă prețuri, stocuri sau date fiscale eronate | 100% fact-checked vs. database |
| 2 | **Disponibilitate** | Sistemul procesează outreach și facturi 24/7 | 99.9% uptime |
| 3 | **Performanță** | Latență acceptabilă pentru chat real-time | <500ms pentru răspunsuri LLM |
| 4 | **Conformitate** | GDPR Art.6(1)(f), e-Factura, Legea 190/2018 | 100% audit trail |
| 5 | **Mentenabilitate** | Un singur developer gestionează întregul sistem | Vertical Slice isolation |

## 1.3 Stakeholders

| Stakeholder | Rol | Expectații |
| --- | --- | --- |
| **Arhitect/Developer** | 1-Person-Team | Mentenabilitate, documentație exhaustivă |
| **Fermieri (Clienți Finali)** | Utilizatori țintă | Comunicare relevantă, prețuri corecte |
| **ANAF/SPV** | Autoritate Fiscală | e-Facturi valide, conformitate CIUS-RO |
| **Furnizori de Date** | Termene.ro, ANAF, APIA | Rate limits respectate, cost-eficiență |
| **Autoritatea pentru Protecția Datelor** | ANSPDCP | GDPR compliance, LIA documentat |

---

## 2. Constraints

## 2.1 Technical Constraints

| Constrângere | Descriere | Impact |
| --- | --- | --- |
| **Single Server Deployment** | Hetzner bare metal (20 cores, 128GB RAM) | Optimizare pentru vertical scaling |
| **No GIL pentru Python** | Python 3.14.2 Free-Threading | Necesită biblioteci compatibile |
| **PostgreSQL 18.1** | Extensii obligatorii: pgvector, PostGIS, pg_trgm | Lock pe vendor, dar performanță maximă |
| **Multi-tenant Isolation** | Toate datele partiționate per tenant_id | `UNIQUE(tenant_id, cui)` obligatoriu |

## 2.2 Organizational Constraints

| Constrângere | Descriere | Impact |
| --- | --- | --- |
| **1-Person-Team** | Un singur developer/arhitect | Documentație exhaustivă obligatorie |
| **AI-Augmented Development** | Cursor AI, Claude API | Necesită .cursorrules clare |
| **Vertical Slice Methodology** | Features complete, nu layers | Autonomie per slice |

## 2.3 Regulatory Constraints

| Regulament | Cerințe | Implementare |
| --- | --- | --- |
| **GDPR Art. 6(1)(f)** | Legitimate Interest pentru B2B prospecting | LIA documentat, opt-out facil |
| **Legea 190/2018** | DPO obligatoriu pentru CNP/CI processing | Remediere în 90 zile |
| **e-Factura (RO)** | Transmitere în 5 zile calendaristice | Safety net cron la 4 zile |
| **CIUS-RO** | Standard UBL 2.1 pentru facturile electronice | Validare XML înainte de SPV |
| **Competition Law** | Fără schimb de informații sensibile comercial | Guardrails AI pentru privacy |

## 2.4 Conventions

### Naming Conventions

| Entitate | Convenție | Exemplu |
| --- | --- | --- |
| **Tabele Bronze** | `bronze_*` | `bronze_contacts`, `bronze_webhooks` |
| **Tabele Silver** | `silver_*` | `silver_companies`, `silver_contacts` |
| **Tabele Gold** | `gold_*` | `gold_lead_journey`, `gold_negotiations` |
| **Cozi BullMQ** | `{layer}:{category}:{action}` | `enrich:anaf:fiscal-status` |
| **Events** | `{entity}.{action}.{status}` | `lead.outreach.completed` |

### Deprecated Terms (Alias Mapping)

```typescript
const LEGACY_ALIASES = {
  'shop_id': 'tenant_id',           // CANONIC: tenant_id
  'current_stage': 'current_state', // CANONIC: current_state
  'gold_hitl_tasks': 'approval_tasks', // DEPRECATED: use approval_tasks
} as const;
```

---

## 3. Context and Scope

## 3.1 Business Context

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CONTEXTUL BUSINESS                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

                        ┌───────────────────────────────┐
                        │                               │
   ┌────────────────────┤       CERNIQ.APP              ├────────────────────┐
   │                    │   (Sales Automation)          │                    │
   │                    │                               │                    │
   │                    └───────────────────────────────┘                    │
   │                                                                         │
   │                 ▲               ▲               ▲                       │
   │                 │               │               │                       │
   ▼                 ▼               ▼               ▼                       ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Fermieri │   │  ANAF    │   │Termene.ro│   │  APIA/   │   │ Oblio.eu │   │TimelinesAI│
│ (2.86M)  │   │(e-Factura│   │(Business │   │  MADR    │   │(Facturare│   │(WhatsApp  │
│          │   │  SPV)    │   │  Intel)  │   │(Subvenții│   │   ERP)   │   │  Cluster) │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
    ▲               ▲               ▲               ▲              ▲              ▲
    │               │               │               │              │              │
    │   Comunicare  │   Fiscalitate │  Enrichment   │   Date       │   Fiscal     │   Outreach
    │   Multi-canal │               │               │   Agricole   │              │
    └───────────────┴───────────────┴───────────────┴──────────────┴──────────────┘
```

### Parteneri de Comunicare

| Partner | Direcție | Protocol | Scop |
| --- | --- | --- | --- |
| **Fermieri** | Bidirectional | WhatsApp, Email, SMS | Prospectare, Negociere, Suport |
| **ANAF SPV** | Outbound | REST API + OAuth2 | Transmitere e-Facturi |
| **Termene.ro** | Inbound | REST API | Date financiare, scoruri de risc |
| **APIA/MADR** | Inbound | PDF Scraping | Subvenții, suprafețe agricole |
| **Oblio.eu** | Bidirectional | REST API | Emitere proforma, facturi |
| **TimelinesAI** | Bidirectional | Webhooks + API | WhatsApp cluster 20 numere |
| **Instantly.ai** | Outbound | REST API | Cold email campaigns |
| **Resend** | Outbound | REST API | Transactional email |

## 3.2 Technical Context

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          CONTEXTUL TEHNIC                                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

                    INTERNET (Traefik Edge Router + Let's Encrypt)
                                      │
                    ┌─────────────────┴─────────────────┐
                    │         FRONTEND NETWORK          │
                    │         (bridge, public)          │
                    └─────────────────┬─────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       │                              │                              │
       ▼                              ▼                              ▼
┌─────────────┐               ┌─────────────┐               ┌─────────────┐
│   Web App   │               │  Fastify    │               │   SigNoz    │
│ React 19 +  │               │  API v5.6.2 │               │ Observability│
│  Refine v5  │               │  (Node 24)  │               │  v0.106.0   │
└─────────────┘               └──────┬──────┘               └─────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │        BACKEND NETWORK          │
                    │        (bridge, internal)       │
                    └────────────────┬────────────────┘
                                     │
     ┌───────────────────────────────┼───────────────────────────────┐
     │                               │                               │
     ▼                               ▼                               ▼
┌─────────────┐               ┌─────────────┐               ┌─────────────┐
│ PostgreSQL  │               │   Redis     │               │   Python    │
│   18.1      │               │   7.4.7     │               │  Workers    │
│ + pgvector  │               │  (BullMQ)   │               │   3.14.2    │
│ + PostGIS   │               │             │               │Free-Thread  │
└─────────────┘               └─────────────┘               └─────────────┘
```

### Mapping Canale de Comunicare

| Canal Tehnic | Protocol | Folosit Pentru |
| --- | --- | --- |
| **HTTPS (443)** | TLS 1.3 | Web UI, REST API |
| **PostgreSQL (5432)** | Native | Conexiuni DB (intern) |
| **Redis (6379)** | Native | BullMQ queues (intern) |
| **OTLP (4317/4318)** | gRPC/HTTP | OpenTelemetry traces/metrics |

---

## 4. Solution Strategy

## 4.1 Technology Decisions

### Stack Tehnologic Canonic (Ianuarie 2026)

| Strat | Tehnologie | Versiune | Justificare |
| --- | --- | --- | --- |
| **Runtime API** | Node.js | v24.12.0 LTS "Krypton" | ESM natim, --watch, V8 Maglev JIT |
| **Framework API** | Fastify | v5.6.2 | Type Provider Zod, hook-based |
| **AI/Worker Runtime** | Python | 3.14.2 Free-Threading | True parallelism, no GIL |
| **Database** | PostgreSQL | 18.1 | JSON_TABLE, async I/O, UUIDv7 |
| **Vector Search** | pgvector | 0.8.1 | HNSW indexes, 1536 dim embeddings |
| **Geospatial** | PostGIS | 3.5.1 | KNN proximity, SIRUTA polygons |
| **Queue Manager** | BullMQ | v5.66.5 | Redis-backed, partition per phone |
| **Cache/Jobs** | Redis | 7.4.7 | AOF+RDB persistence, noeviction |
| **Frontend** | React | 19.2.3 | Server Components, useOptimistic |
| **Admin Framework** | Refine | v5 | TanStack Query v5, headless |
| **Styling** | Tailwind CSS | 4.1.x | Oxide engine (Rust), 5x faster |
| **Observability** | SigNoz | v0.106.0 | OpenTelemetry native, ClickHouse |
| **Edge Router** | Traefik | v3.6.6 | Auto Let's Encrypt, circuit breakers |

### Decizii Arhitecturale de Top

| Decizie | Motivație | Alternative Respinse |
| --- | --- | --- |
| **Vertical Slice Architecture** | 1-Person-Team, autonomie per feature | Layered architecture |
| **Medallion Data (Bronze→Silver→Gold)** | Data lineage, audit trail | Direct mutation |
| **Neuro-Symbolic AI** | Zero hallucinations în date critice | Pure LLM approach |
| **Single Server** | Cost-efficiency, simplitate | Kubernetes/cloud |
| **Unified HITL Table** | UI consistent, SLA-driven | Per-stage tables |
| **PostgreSQL Extensions** | Evitare vendor lock-in pe DB separate | Pinecone, MongoDB |

## 4.2 Decomposition Strategy: Vertical Slice Architecture

### Principii Vertical Slice

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        VERTICAL SLICE ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────────┘

TRADIȚIONAL (Layered):              VERTICAL SLICE:
┌───────────────────┐               ┌───────┬───────┬───────┬───────┬───────┐
│   Presentation    │               │ Auth  │ Leads │ Sales │Invoice│Nurture│
├───────────────────┤               │Feature│Feature│Feature│Feature│Feature│
│   Application     │               ├───────┼───────┼───────┼───────┼───────┤
├───────────────────┤               │Routes │Routes │Routes │Routes │Routes │
│     Domain        │               │Schema │Schema │Schema │Schema │Schema │
├───────────────────┤               │Service│Service│Service│Service│Service│
│  Infrastructure   │               │DB     │DB     │DB     │DB     │DB     │
└───────────────────┘               └───────┴───────┴───────┴───────┴───────┘

Cross-cutting: via shared utilities, not forced inheritance
```

### Structura Directoare Vertical Slice

```text
/root
├── /apps
│   ├── /api (Fastify v5)
│   │   └── /src/features/
│   │       ├── /auth/              # Vertical Slice: Authentication
│   │       │   ├── index.ts        # Plugin Fastify
│   │       │   ├── routes.ts       # API endpoints
│   │       │   ├── schema.ts       # Zod schemas
│   │       │   └── service.ts      # Business logic
│   │       ├── /enrichment/        # Vertical Slice: Data Enrichment
│   │       ├── /outreach/          # Vertical Slice: Cold Outreach
│   │       ├── /sales/             # Vertical Slice: AI Sales Agent
│   │       ├── /invoicing/         # Vertical Slice: Fiscal Integration
│   │       └── /nurturing/         # Vertical Slice: Post-Sale
│   └── /web (React 19 + Refine v5)
│       └── /src/features/          # Mirror API slices
├── /packages
│   ├── /db (Drizzle ORM)
│   └── /shared-types
└── /workers (Python 3.14)
    ├── /enrichment/
    ├── /outreach/
    ├── /ai-agent/
    ├── /fiscal/
    └── /nurturing/
```

## 4.3 Approaches to Achieve Quality Goals

| Quality Goal | Abordare | Implementare |
| --- | --- | --- |
| **Zero Hallucinations** | Neuro-Symbolic AI cu Guardrails | MCP Server + Symbolic validation |
| **Disponibilitate** | Graceful degradation | Circuit breakers în Traefik |
| **Performanță** | Hybrid Search (Vector + BM25) | pgvector + RRF function |
| **Conformitate** | Immutable audit logs | Hash chain cu sha256() |
| **Mentenabilitate** | Exhaustive documentation | Master Spec + arc42 |

---

## 5. Building Block View

## 5.1 Level 1: System Whitebox

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CERNIQ.APP SYSTEM                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐
│   ETAPA 1       │     │   ETAPA 2       │     │   ETAPA 3       │     │   ETAPA 4   │
│   Data          │────▶│   Cold          │────▶│   AI Sales      │────▶│   Post-Sale │
│   Enrichment    │     │   Outreach      │     │   Agent         │     │   Monitoring│
│                 │     │                 │     │                 │     │             │
│   61 Workers    │     │   52 Workers    │     │   78 Workers    │     │   45 Workers│
│   Bronze→Silver │     │   Multi-channel │     │   Neuro-Symbolic│     │   Cash/Ship │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘     └──────┬──────┘
         │                       │                       │                     │
         │                       │                       │                     │
         └───────────────────────┼───────────────────────┼─────────────────────┘
                                 │                       │
                                 ▼                       ▼
                    ┌────────────────────────────────────────────────┐
                    │                 ETAPA 5                         │
                    │           Nurturing & Ecosystems                │
                    │                                                 │
                    │   58 Workers | PostGIS | NetworkX | Churn       │
                    └────────────────────────────────────────────────┘
                                         │
                                         ▼
                    ┌────────────────────────────────────────────────┐
                    │             CROSS-CUTTING CONCERNS              │
                    │                                                 │
                    │  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
                    │  │  HITL   │  │  Audit  │  │  RBAC   │         │
                    │  │ Unified │  │  Logs   │  │ 3-Layer │         │
                    │  └─────────┘  └─────────┘  └─────────┘         │
                    └────────────────────────────────────────────────┘
```

### Contained Blackboxes

| Blackbox | Responsabilitate | Interfață |
| --- | --- | --- |
| **Etapa 1: Data Enrichment** | Ingestie, validare, îmbogățire date Bronze→Silver | API REST + BullMQ events |
| **Etapa 2: Cold Outreach** | Orchestrare campanii multi-canal | Webhooks + state machine |
| **Etapa 3: AI Sales Agent** | Negociere autonomă, ofertare, facturare | MCP Protocol + LLM |
| **Etapa 4: Post-Sale** | Monitorizare plăți, livrări, credit | Webhooks financiar/logistică |
| **Etapa 5: Nurturing** | Retenție, referrals, ecosistem | PostGIS + NetworkX |
| **Unified HITL** | Aprobări transversale toate etapele | `approval_tasks` table |

## 5.2 Level 2: Etapa 3 - AI Sales Agent (Whitebox)

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                     ETAPA 3: AI SALES AGENT (Neuro-Simbolic)                         │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                           MCP SERVER (Python 3.14)                                │
│                                                                                   │
│   ┌────────────────────────────────────────────────────────────────────────────┐ │
│   │                           RESOURCES (Read-Only)                             │ │
│   │                                                                             │ │
│   │   product://{sku}     - Golden Record produs complet                        │ │
│   │   lead://{cui}        - Profil lead cu istoric conversații                  │ │
│   │   invoice://{id}      - Factură existentă                                   │ │
│   └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│   ┌────────────────────────────────────────────────────────────────────────────┐ │
│   │                           TOOLS (Executable)                                │ │
│   │                                                                             │ │
│   │   search_products(query, filters)     - Hybrid Search (Vector+BM25)         │ │
│   │   check_realtime_stock(sku)           - Verificare stoc ERP live            │ │
│   │   calculate_discount(sku, qty, client)- Calculează discount maxim           │ │
│   │   create_proforma(client, products)   - Emite proforma Oblio                │ │
│   │   convert_to_invoice(proforma_ref)    - Convertește în factură              │ │
│   │   send_einvoice(invoice_ref)          - Trimite în SPV                      │ │
│   │   validate_client_data(cif, address)  - Validare date fiscale               │ │
│   └────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────┬──────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           AI AGENT CORE (xAI Grok-4)                              │
│                                                                                   │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐          │
│   │  Query           │    │  Tool Calling    │    │  Response        │          │
│   │  Understanding   │───▶│  + Guardrails    │───▶│  Generation      │          │
│   │                  │    │                  │    │                  │          │
│   │  Intent detect   │    │  Price Guard     │    │  Validated JSON  │          │
│   │  Entity extract  │    │  Stock Guard     │    │  Fiscal-safe     │          │
│   └──────────────────┘    │  Discount Guard  │    └──────────────────┘          │
│                           └──────────────────┘                                   │
└───────────────────────────────────────┬──────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     NEGOTIATION STATE MACHINE (PostgreSQL)                        │
│                                                                                   │
│   DISCOVERY ──▶ PROPOSAL ──▶ NEGOTIATION ──▶ CLOSING ──▶ INVOICED ──▶ PAID      │
│       │                           │                                               │
│       └───────── DEAD ◀───────────┘                                              │
│                                                                                   │
│   Tranzițiile sunt validate și logate în gold_lead_journey                       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Guardrails Anti-Halucinare (Zero-Hallucination Policy)

```typescript
const GUARDRAILS = {
  PRICE_GUARD: {
    rule: 'offered_price >= min_approved_price',
    action: 'REJECT + regenerate with correct price'
  },
  STOCK_GUARD: {
    rule: 'stock_quantity > 0 before any offer',
    action: 'REJECT + inform customer unavailable'
  },
  DISCOUNT_GUARD: {
    rule: 'discount <= max_approved_discount',
    action: 'REJECT + escalate to HITL if customer insists'
  },
  SKU_GUARD: {
    rule: 'SKU must exist in products table',
    action: 'REJECT + log hallucination attempt'
  },
  FISCAL_GUARD: {
    rule: 'CUI valid + IBAN valid + address complete',
    action: 'REQUEST missing data before invoice'
  }
};
```

## 5.3 Level 2: Unified HITL Approval System (Whitebox)

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                     UNIFIED HITL APPROVAL ENGINE                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         APPROVAL_TASKS (Single Table, Polymorphic)                   │
│                                                                                      │
│   ┌────────────────────────────────────────────────────────────────────────────────┐│
│   │  id | tenant_id | entity_type | entity_id | pipeline_stage | approval_type     ││
│   │     | status | current_level | assigned_to | priority | sla_minutes | due_at   ││
│   │     | metadata (JSONB) | decision_context (JSONB) | decided_by | decision      ││
│   └────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                      │
│   Approval Types per Stage:                                                          │
│   ┌───────────┬───────────────────┬────────────────────┬──────┬───────────────────┐ │
│   │ Stage     │ Approval Type     │ Trigger            │ SLA  │ Auto-Action       │ │
│   ├───────────┼───────────────────┼────────────────────┼──────┼───────────────────┤ │
│   │ E1        │ data_quality      │ Score < 0.7        │ 24h  │ Escalate          │ │
│   │ E2        │ content_review    │ All messages       │ 8h   │ Escalate          │ │
│   │ E3        │ pricing_approval  │ Discount > 15%     │ 4h   │ Escalate to VP    │ │
│   │ E4        │ credit_approval   │ Risk > 0.5         │ 48h  │ Reject            │ │
│   │ E5        │ campaign_approval │ All campaigns      │ 72h  │ Escalate          │ │
│   └───────────┴───────────────────┴────────────────────┴──────┴───────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         XSTATE STATE MACHINE                                         │
│                                                                                      │
│   PENDING ─▶ ASSIGNED ─▶ IN_REVIEW ─▶ APPROVED ────▶ (FINAL)                        │
│      │          │           │                                                        │
│      │          │           ├─▶ REJECTED ─────────▶ (FINAL)                         │
│      │          │           │                                                        │
│      │          └─▶ TIMEOUT ┴─▶ ESCALATED ─▶ ASSIGNED (Level+1)                     │
│      │                              │                                                │
│      │                              └─▶ MAX_ESCALATION ─▶ EXPIRED ─▶ (FINAL)        │
│      │                                                                               │
│      └─────────────────── PENDING_INFO (SLA paused) ────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 5.4 Level 2: Data Model (Medallion Architecture)

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    MEDALLION DATA ARCHITECTURE                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│      BRONZE         │     │       SILVER        │     │        GOLD         │
│   (Raw Immutable)   │────▶│  (Cleaned/Validated)│────▶│   (Operational)     │
│                     │     │                     │     │                     │
│ bronze_contacts     │     │ silver_companies    │     │ gold_companies      │
│ bronze_webhooks     │     │ silver_contacts     │     │ gold_lead_journey   │
│ bronze_imports      │     │ silver_addresses    │     │ gold_negotiations   │
│ bronze_csv_rows     │     │                     │     │ gold_affiliations   │
│                     │     │ Criteriu promovare: │     │ gold_referrals      │
│ Append-only         │     │ - CUI valid (mod11) │     │ gold_credit_profiles│
│ source_id tracked   │     │ - Email verified    │     │ gold_nurturing_state│
│ imported_at logged  │     │ - Phone HLR valid   │     │                     │
│                     │     │ - Fiscal status OK  │     │ Ready for:          │
│                     │     │                     │     │ - Outreach          │
│                     │     │ Deduplication:      │     │ - Facturare         │
│                     │     │ UNIQUE(tenant_id,   │     │ - Negociere         │
│                     │     │        cui)         │     │ - Nurturing         │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘

                    MULTI-TENANT ISOLATION
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  TOATE tabelele au:                                                                  │
│    - tenant_id UUID NOT NULL (FK → tenants.id)                                      │
│    - UNIQUE(tenant_id, cui) pentru companies                                        │
│    - RLS policies pentru isolation                                                  │
│    - Indexes pe (tenant_id, ...) pentru performanță                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Runtime View

## 6.1 Scenario: Lead Journey Complete (Cold → Converted)

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│            RUNTIME: LEAD JOURNEY (COLD → CONVERTED → INVOICED)                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

ACTOR                 ETAPA 1           ETAPA 2           ETAPA 3           ETAPA 4
(CSV Import)          (Enrichment)      (Outreach)        (AI Sales)        (Post-Sale)
    │                     │                 │                 │                 │
    │ 1. Upload CSV       │                 │                 │                 │
    ├────────────────────▶│                 │                 │                 │
    │                     │                 │                 │                 │
    │                     │ 2. bronze:ingest│                 │                 │
    │                     ├───────────────▶ │                 │                 │
    │                     │    :csv-parser  │                 │                 │
    │                     │                 │                 │                 │
    │                     │ 3. enrich:anaf:fiscal-status      │                 │
    │                     ├──────────────────────────────────▶│                 │
    │                     │                 │                 │                 │
    │                     │ 4. Promote to Silver (CUI valid)  │                 │
    │                     ├──────────────────────────────────▶│                 │
    │                     │                 │                 │                 │
    │                     │                 │ 5. outreach:    │                 │
    │                     │                 │    whatsapp:    │                 │
    │                     │                 │    send         │                 │
    │                     │                 ├────────────────▶│                 │
    │                     │                 │                 │                 │
    │                     │                 │ 6. Webhook:     │                 │
    │                     │                 │    WARM_REPLY   │                 │
    │                     │                 │◀────────────────┤                 │
    │                     │                 │                 │                 │
    │                     │                 │ 7. ai:agent:    │                 │
    │                     │                 │    conversation │                 │
    │                     │                 ├────────────────▶│                 │
    │                     │                 │                 │                 │
    │                     │                 │                 │ 8. MCP: search_ │
    │                     │                 │                 │    products()   │
    │                     │                 │                 ├────────────────▶│
    │                     │                 │                 │                 │
    │                     │                 │                 │ 9. Guardrail:   │
    │                     │                 │                 │    check_stock()│
    │                     │                 │                 ├────────────────▶│
    │                     │                 │                 │                 │
    │                     │                 │                 │ 10. create_     │
    │                     │                 │                 │     proforma()  │
    │                     │                 │                 ├────────────────▶│
    │                     │                 │                 │                 │
    │                     │                 │                 │                 │ 11. Oblio API
    │                     │                 │                 │                 ├────────────▶
    │                     │                 │                 │                 │
    │                     │                 │                 │ 12. convert_    │
    │                     │                 │                 │     to_invoice()│
    │                     │                 │                 ├────────────────▶│
    │                     │                 │                 │                 │
    │                     │                 │                 │                 │ 13. send_
    │                     │                 │                 │                 │     einvoice()
    │                     │                 │                 │                 ├────────────▶
    │                     │                 │                 │                 │    ANAF SPV
    │                     │                 │                 │                 │
    │                     │                 │                 │ 14. Update:     │
    │                     │                 │                 │     INVOICED    │
    │                     │                 │                 │◀────────────────┤
    │                     │                 │                 │                 │
```

## 6.2 Scenario: HITL Approval with Escalation

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    RUNTIME: HITL APPROVAL WITH ESCALATION                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

WORKER          BULLMQ            APPROVAL_TASKS        APPROVER         MANAGER
  │                │                    │                  │               │
  │ 1. Discount    │                    │                  │               │
  │    > 15%       │                    │                  │               │
  │────────────────▶                    │                  │               │
  │ Create approval│                    │                  │               │
  │                │ 2. INSERT          │                  │               │
  │                ├───────────────────▶│                  │               │
  │                │    status=PENDING  │                  │               │
  │                │    priority=HIGH   │                  │               │
  │                │    sla_minutes=240 │                  │               │
  │                │                    │                  │               │
  │                │ 3. Schedule        │                  │               │
  │                │    escalation job  │                  │               │
  │                ├───────────────────▶│                  │               │
  │                │    delay=4h        │                  │               │
  │                │                    │                  │               │
  │                │                    │ 4. Notify        │               │
  │                │                    ├─────────────────▶│               │
  │                │                    │    WebSocket +   │               │
  │                │                    │    Slack DM      │               │
  │                │                    │                  │               │
  │                │                    │                  │ 5. Review     │
  │                │                    │                  ├──────────────▶│
  │                │                    │                  │    (no action)│
  │                │                    │                  │               │
  │                │ 6. TIMEOUT (4h)    │                  │               │
  │                ├───────────────────▶│                  │               │
  │                │                    │                  │               │
  │                │                    │ 7. ESCALATE      │               │
  │                │                    ├──────────────────┼──────────────▶│
  │                │                    │    level=2       │               │
  │                │                    │    assigned_to=  │               │
  │                │                    │    manager_uuid  │               │
  │                │                    │                  │               │
  │                │                    │                  │               │ 8. APPROVE
  │                │                    │◀─────────────────┼───────────────┤
  │                │                    │                  │               │
  │                │ 9. Resume BullMQ   │                  │               │
  │◀───────────────┤    job with        │                  │               │
  │                │    approved data   │                  │               │
  │                │                    │                  │               │
  │ 10. Continue   │                    │                  │               │
  │     workflow   │                    │                  │               │
  ├───────────────▶│                    │                  │               │
```

## 6.3 Scenario: Hybrid Search (RAG) în Etapa 3

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    RUNTIME: HYBRID SEARCH (Vector + BM25 + RRF)                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

CUSTOMER MESSAGE: "Am nevoie de ceva ieftin și bun pentru porumb, sub 5000 lei"

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Step 1: QUERY UNDERSTANDING (LLM mic)                                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Extrage:                                                                             │
│   - semantic_query: "produse pentru cultura de porumb"                              │
│   - structured_filters: { price < 5000, stock > 0 }                                 │
│   - keywords: ["porumb", "ieftin"]                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│ VECTOR SEARCH         │ │ LEXICAL SEARCH        │ │ STRUCTURED FILTER     │
│ (pgvector + Cosine)   │ │ (tsvector + BM25)     │ │ (SQL WHERE clause)    │
│                       │ │                       │ │                       │
│ Embedding query       │ │ plainto_tsquery()     │ │ WHERE price < 5000    │
│ → top 50 by           │ │ → ts_rank_cd()        │ │   AND stock > 0       │
│    cosine similarity  │ │ → top 50 by BM25      │ │   AND category =      │
│                       │ │                       │ │       'AGRICULTURE'   │
└───────────┬───────────┘ └───────────┬───────────┘ └───────────┬───────────┘
            │                         │                         │
            └───────────┬─────────────┴─────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Step 2: RECIPROCAL RANK FUSION (RRF)                                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   Score(doc) = Σ  1 / (k + rank(doc, ranker))    where k = 60                       │
│              r∈R                                                                     │
│                                                                                      │
│   Combină rangurile din Vector + Lexical, filtrate de SQL                           │
│   → Top 10 results ordered by RRF score                                             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Step 3: GUARDRAILS VALIDATION                                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│   FOR EACH result IN top_10:                                                         │
│     ✓ check_realtime_stock(result.sku)  → ERP live query                            │
│     ✓ validate_price(result.price)      → Price within margin                       │
│     ✓ check_availability_zone()         → Can ship to customer                      │
│                                                                                      │
│   FILTER OUT failed validations                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Step 4: RESPONSE GENERATION (xAI Grok-4)                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│   Context: Validated products with real stock and prices                             │
│   Output: Natural language recommendation with:                                      │
│     - Product names and SKUs (from DB, not invented)                                │
│     - Actual prices (validated)                                                      │
│     - Real stock quantities (live)                                                  │
│     - Discount limits (calculated by calculate_discount())                          │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Deployment View

## 7.1 Infrastructure Overview

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT: HETZNER BARE METAL                                    │
│                    (20 cores Intel, 128GB RAM, NVMe SSD)                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         HOST OS (Ubuntu 24.04 LTS)                                   │
│                                                                                      │
│   Reserved: ~10-15% RAM for OS ≈ 15GB                                               │
│   Allocatable to containers: ~110GB                                                  │
│                                                                                      │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │                     DOCKER ENGINE 28.x/29.x                                  │   │
│   │                                                                              │   │
│   │   daemon.json:                                                               │   │
│   │   - storage-driver: overlay2                                                 │   │
│   │   - live-restore: true                                                       │   │
│   │   - log-opts: max-size=50m, max-file=5                                      │   │
│   │   - default-ulimits: nofile 65536                                           │   │
│   │                                                                              │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │                         DOCKER NETWORKS                                      │   │
│   │                                                                              │   │
│   │   ┌───────────────────────┐   ┌───────────────────────┐                     │   │
│   │   │   FRONTEND NETWORK    │   │   BACKEND NETWORK     │                     │   │
│   │   │   (bridge, public)    │   │   (bridge, internal)  │                     │   │
│   │   │                       │   │                       │                     │   │
│   │   │   - Traefik           │   │   - PostgreSQL        │                     │   │
│   │   │   - Web App           │   │   - Redis             │                     │   │
│   │   │   - Fastify API ────────────── API (dual-homed)   │                     │   │
│   │   │   - SigNoz UI         │   │   - Python Workers    │                     │   │
│   │   │                       │   │                       │                     │   │
│   │   └───────────────────────┘   └───────────────────────┘                     │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 7.2 Container Resource Allocation

| Container | CPU | Memory | Storage | Notes |
| --- | --- | --- | --- | --- |
| **PostgreSQL 18.1** | 4 cores | 40GB | 500GB NVMe | shared_buffers=32GB |
| **Redis 7.4.7** | 2 cores | 80GB | 50GB AOF | maxmemory=80gb, noeviction |
| **Fastify API** | 4 cores | 8GB | - | Node.js 24 cluster |
| **Python Workers** | 8 cores | 16GB | - | Free-threading, parallel |
| **React Web** | 1 core | 2GB | - | Static build served by Nginx |
| **Traefik** | 1 core | 512MB | - | Edge router + TLS |
| **SigNoz Stack** | 4 cores | 12GB | 100GB | ClickHouse + Collector |

### PostgreSQL 18.1 Memory Tuning

```ini
# postgresql.conf optimized for 128GB system
shared_buffers = 32GB           # 25% of RAM
effective_cache_size = 96GB     # 75% of RAM
work_mem = 256MB                # Conservative per-operation
maintenance_work_mem = 4GB      # ~3% for VACUUM/INDEX
wal_buffers = 64MB              # Write-heavy optimization
max_connections = 200           # PgBouncer handles pooling

# Parallelization (20-core system)
max_parallel_workers_per_gather = 8
max_parallel_workers = 16
max_worker_processes = 20

# SSD Optimization
random_page_cost = 1.1
effective_io_concurrency = 200
```

### Redis 7.4.7 Configuration

```ini
# redis.conf for BullMQ workloads
maxmemory 80gb
maxmemory-policy noeviction     # CRITICAL: jobs are not evictable

# Lazy freeing (prevent blocking on large deletes)
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
activedefrag yes

# Persistence (hybrid AOF+RDB)
aof-use-rdb-preamble yes
appendfsync everysec            # Max 1-second data loss

# BullMQ requirement
notify-keyspace-events Ex

# Security
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG ""
```

## 7.3 Traefik Edge Router Configuration

```yaml
# traefik.yml
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@cerniq.app
      storage: /acme.json
      caServer: "https://acme-v02.api.letsencrypt.org/directory"
      httpChallenge:
        entryPoint: web

middlewares:
  rate-limit:
    rateLimit:
      average: 100
      burst: 50
      
  circuit-breaker:
    circuitBreaker:
      expression: "ResponseCodeRatio(500, 600, 0, 600) > 0.25"
      
  security-headers:
    headers:
      stsSeconds: 31536000
      stsIncludeSubdomains: true
      contentTypeNosniff: true
      
providers:
  docker:
    exposedByDefault: false     # Explicit routing only
```

## 7.4 Backup Strategy

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         BACKUP TO HETZNER STORAGE BOX                                │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────┐          SSH (port 23)           ┌───────────────────┐
│  Production       │ ─────────────────────────────▶   │  Hetzner          │
│  Server           │         rsync + encryption       │  Storage Box      │
│                   │                                   │                   │
│  pg_dumpall       │         Daily: 7 days            │  /backups/        │
│  + gzip           │         Weekly: 4 weeks          │    postgresql/    │
│                   │         Monthly: 3 months        │    redis/         │
│  Redis BGSAVE     │                                   │    configs/       │
└───────────────────┘                                   └───────────────────┘
```

---

## 8. Crosscutting Concepts

## 8.1 Domain Model

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           DOMAIN MODEL CORE                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   TENANT    │──────▶│   COMPANY   │──────▶│   CONTACT   │
│             │ 1:N   │  (Fermă)    │ 1:N   │  (Persoană) │
│ tenant_id   │       │             │       │             │
│ name        │       │ cui         │       │ email       │
│ settings    │       │ denumire    │       │ telefon     │
└─────────────┘       │ adresa      │       │ rol         │
                      │ status_anaf │       └─────────────┘
                      └──────┬──────┘              │
                             │                     │
                      ┌──────┴──────┐              │
                      │             │              │
               ┌──────▼──────┐ ┌────▼────┐  ┌──────▼──────┐
               │ LEAD_JOURNEY│ │ PRODUCT │  │ NEGOTIATION │
               │             │ │         │  │             │
               │ current_    │ │ sku     │  │ proforma_id │
               │   state     │ │ name    │  │ invoice_id  │
               │ assigned_   │ │ price   │  │ status      │
               │   phone     │ │ stock   │  │ discount    │
               │ lead_score  │ │ embed-  │  │ total_value │
               └─────────────┘ │   ding  │  └─────────────┘
                               └─────────┘
                                    │
                      ┌─────────────┼─────────────┐
                      │             │             │
               ┌──────▼──────┐ ┌────▼────┐ ┌──────▼──────┐
               │ AFFILIATION │ │ CLUSTER │ │  REFERRAL   │
               │             │ │         │ │             │
               │ ouai_id     │ │ name    │ │ referrer_id │
               │ coop_id     │ │ center  │ │ referee_id  │
               │ grup_prod   │ │ dominant│ │ status      │
               │             │ │  _crop  │ │ reward      │
               └─────────────┘ └─────────┘ └─────────────┘
```

## 8.2 Authentication & Authorization

### Three-Layer RBAC

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         THREE-LAYER AUTH ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: AUTHENTICATION                                                            │
│                                                                                     │
│   JWT (Access Token) în HttpOnly Cookie + Refresh Token Rotation                   │
│   - SameSite=Strict                                                                │
│   - Secure=true                                                                    │
│   - Access Token: 15 min                                                           │
│   - Refresh Token: 7 days (rotated on use)                                         │
└───────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: AUTHORIZATION (RBAC)                                                      │
│                                                                                     │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│   │   ADMIN     │   │   MANAGER   │   │  APPROVER   │   │   VIEWER    │           │
│   │             │   │             │   │             │   │             │           │
│   │ all:*       │   │ tenant:*    │   │ approval:*  │   │ read:*      │           │
│   │             │   │ users:*     │   │ leads:read  │   │             │           │
│   │             │   │ leads:*     │   │             │   │             │           │
│   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘           │
│                                                                                     │
│   Refine CanAccess: <CanAccess resource="leads" action="delete">                   │
└───────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: ROW-LEVEL SECURITY (RLS)                                                  │
│                                                                                     │
│   CREATE POLICY tenant_isolation ON gold_companies                                  │
│     USING (tenant_id = current_setting('app.current_tenant')::UUID);               │
│                                                                                     │
│   SET LOCAL app.current_tenant = 'uuid-here';  -- Set per request                  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

## 8.3 Observability (SigNoz v0.106.0)

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                      OBSERVABILITY STACK (OpenTelemetry Native)                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│   Application     │     │   OTel Collector  │     │     SigNoz        │
│   Instrumentation │────▶│                   │────▶│                   │
│                   │     │   4317 (gRPC)     │     │   Query Service   │
│   - Node.js       │     │   4318 (HTTP)     │     │   + ClickHouse    │
│   - Python        │     │                   │     │                   │
│   - PostgreSQL    │     │   Processors:     │     │   Dashboards:     │
│   - Redis         │     │   - batch         │     │   - APM           │
│                   │     │   - memory_limiter│     │   - Logs          │
└───────────────────┘     └───────────────────┘     │   - Traces        │
                                                     │   - Alerts        │
                                                     └───────────────────┘

TRACE CORRELATION:
- correlation_id propagat în toate job-urile BullMQ
- Span context în toate cererile HTTP
- W3C Trace Context standard
```

### Logging Contract

```typescript
// Standardized log format
interface LogEntry {
  timestamp: string;          // ISO 8601
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  service: string;            // 'api' | 'worker-enrichment' | etc.
  correlation_id: string;     // UUID propagat
  tenant_id?: string;         // Pentru multi-tenant
  message: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack: string;
  };
}
```

## 8.4 Event-Driven Architecture

### Event Contract

```typescript
// Canonical event schema
interface CerniqEvent<T = unknown> {
  event_id: string;           // UUID v7 (timestamp-ordered)
  event_type: string;         // {entity}.{action}.{status}
  event_version: '1.0';
  timestamp: string;          // ISO 8601
  correlation_id: string;     // For tracing
  tenant_id: string;
  source: string;             // 'worker-enrichment' | 'api' | etc.
  payload: T;
  metadata: {
    idempotency_key: string;  // For deduplication
    retry_count?: number;
    original_event_id?: string; // For replay
  };
}

// Event examples
'lead.enrichment.completed'
'outreach.message.delivered'
'negotiation.proforma.created'
'invoice.einvoice.submitted'
'approval.task.escalated'
```

### Idempotency Contract

```typescript
// Redis-based idempotency
const IDEMPOTENCY_TTL = 7 * 24 * 60 * 60; // 7 days

async function ensureIdempotent(key: string): Promise<boolean> {
  const result = await redis.set(
    `idempotency:${key}`,
    Date.now(),
    'NX',           // Only set if not exists
    'EX',           // With expiry
    IDEMPOTENCY_TTL
  );
  return result === 'OK'; // true = first time, proceed
}
```

## 8.5 Error Handling Strategy

### Retry Policies

| Categorie Eroare | Retry Strategy | Max Attempts | Backoff |
| --- | --- | --- | --- |
| **Network Timeout** | Exponential | 5 | 1s, 2s, 4s, 8s, 16s |
| **Rate Limit (429)** | Fixed delay | 10 | Respect Retry-After |
| **Server Error (5xx)** | Exponential | 3 | 5s, 25s, 125s |
| **Validation Error (4xx)** | No retry | 1 | Move to DLQ |
| **Database Error** | Immediate | 3 | 100ms |

### Dead Letter Queue (DLQ) Pattern

```typescript
// BullMQ DLQ configuration
const queueOptions = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: { age: 86400 },  // 24h
    removeOnFail: false                 // Keep for inspection
  }
};

// Failed jobs go to: {queue-name}:failed
// Manual intervention required for DLQ processing
```

## 8.6 LLM Routing Policy

### Provider Selection

| Use Case | Primary Provider | Fallback Chain | Rate Limit |
| --- | --- | --- | --- |
| **Structured Outputs** | xAI Grok-4 | Claude → Groq | 60 RPM |
| **Agent Orchestration** | xAI Grok-4 | Claude | 60 RPM |
| **Embeddings** | OpenAI | - | 3000 RPM |
| **Real-time Chat** | Groq (Llama 3) | - | 100 RPM |
| **Sensitive Data** | Ollama (local) | - | Unlimited |

### Cost Controls

```typescript
const COST_CAPS = {
  small_tenant: 10.00,    // $10/day
  medium_tenant: 50.00,   // $50/day
  enterprise: 500.00      // $500/day
};

// Redis counter per tenant
const checkBudget = async (tenantId: string, cost: number) => {
  const key = `llm:cost:${tenantId}:${today()}`;
  const current = await redis.incrbyfloat(key, cost);
  if (current > COST_CAPS[getTenantTier(tenantId)]) {
    throw new BudgetExceededError(tenantId);
  }
};
```

---

## 9. Architecture Decisions

## ADR-001: Vertical Slice Architecture

**Status:** Accepted  
**Context:** 1-Person-Team development model requires maximum autonomy per feature  
**Decision:** Adopt Vertical Slice over Layered Architecture  
**Consequences:**

- ✅ Features can be developed/deployed independently
- ✅ Reduced coupling between features
- ✅ Each slice contains full stack (routes, schema, service, DB)
- ⚠️ Some code duplication acceptable
- ⚠️ Cross-cutting concerns require careful management

## ADR-002: Single PostgreSQL with Extensions

**Status:** Accepted  
**Context:** Need vector search, geospatial, and relational in one system  
**Decision:** Use PostgreSQL 18.1 + pgvector + PostGIS instead of separate databases  
**Consequences:**

- ✅ Atomic transactions across all data types
- ✅ No data sync issues between systems
- ✅ Reduced operational complexity
- ⚠️ Single point of failure (mitigated by backups)
- ⚠️ Requires PostgreSQL expertise

## ADR-003: Unified HITL Approval Table

**Status:** Accepted  
**Context:** 300+ workers across 5 stages need human approvals  
**Decision:** Single `approval_tasks` table with polymorphic entity references  
**Consequences:**

- ✅ Consistent UI/UX across all approval types
- ✅ Unified SLA management and escalation
- ✅ Single audit trail
- ⚠️ `gold_hitl_tasks` and similar tables deprecated

## ADR-004: Neuro-Symbolic AI for Sales Agent

**Status:** Accepted  
**Context:** AI hallucinations in prices/stock are unacceptable  
**Decision:** MCP Server + Guardrails + Symbolic Validation  
**Consequences:**

- ✅ Zero hallucinations in critical data
- ✅ LLM generates natural language, symbols validate facts
- ✅ Audit trail for all AI decisions
- ⚠️ Additional latency for validation steps
- ⚠️ More complex implementation than pure LLM

## ADR-005: Python 3.14 Free-Threading for Workers

**Status:** Accepted  
**Context:** Heavy parallel processing needed for RAG, graph analysis  
**Decision:** Use Python 3.14.2 with Free-Threading (no GIL)  
**Consequences:**

- ✅ True parallelism for CPU-bound tasks
- ✅ 3-4x speedup for multi-threaded workloads
- ✅ Shared memory access (no IPC overhead)
- ⚠️ Some libraries may not be compatible
- ⚠️ 5-10% overhead in single-threaded mode

## ADR-006: Multi-Tenant Isolation via tenant_id

**Status:** Accepted  
**Context:** SaaS model requires strict data isolation  
**Decision:** All tables have `tenant_id`, enforced via RLS + application checks  
**Consequences:**

- ✅ Complete data isolation
- ✅ `UNIQUE(tenant_id, cui)` prevents cross-tenant conflicts
- ⚠️ Every query must include tenant context
- ⚠️ Migrations must include tenant_id in all constraints

---

## 10. Quality Requirements

## 10.1 Quality Tree

```text
                              QUALITY
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
   RELIABILITY              PERFORMANCE              SECURITY
        │                        │                        │
   ┌────┴────┐              ┌────┴────┐              ┌────┴────┐
   │         │              │         │              │         │
Accuracy  Availability   Latency  Throughput     Compliance  Privacy
   │         │              │         │              │         │
Zero     99.9%          <500ms   1000        GDPR    Multi-
Halluc.  uptime         LLM      leads/h     e-Fact  tenant
                        response              ura    RLS
```

## 10.2 Quality Scenarios

### QS-1: Zero Hallucinations (Accuracy)

| Aspect | Detaliu |
| --- | --- |
| **Stimulus** | LLM generează un preț pentru un produs |
| **Source** | xAI Grok-4 în conversație de vânzare |
| **Environment** | Normal operation |
| **Artifact** | AI Sales Agent (Etapa 3) |
| **Response** | Guardrail `calculate_discount()` verifică prețul vs. marjă minimă |
| **Measure** | 100% din prețurile oferite sunt validate simbolic înainte de afișare |

### QS-2: High Availability (Reliability)

| Aspect | Detaliu |
| --- | --- |
| **Stimulus** | Server reboot/crash |
| **Source** | Hardware failure sau update OS |
| **Environment** | Production |
| **Artifact** | BullMQ jobs in Redis |
| **Response** | Redis AOF persistance + live-restore |
| **Measure** | <30 secunde downtime, 0 jobs pierdute |

### QS-3: Real-time Response (Performance)

| Aspect | Detaliu |
| --- | --- |
| **Stimulus** | Customer message pe WhatsApp |
| **Source** | TimelinesAI webhook |
| **Environment** | Peak load (100 mesaje/minut) |
| **Artifact** | AI Agent + MCP Server |
| **Response** | Intent detection + RAG search + Response generation |
| **Measure** | <500ms time-to-first-token, <3s complete response |

### QS-4: GDPR Compliance (Security)

| Aspect | Detaliu |
| --- | --- |
| **Stimulus** | Data subject requests deletion |
| **Source** | Customer via email/form |
| **Environment** | Normal operation |
| **Artifact** | All personal data stores |
| **Response** | GDPR anonymization function executed |
| **Measure** | <30 days complete erasure, audit log preserved (anonymized) |

### QS-5: e-Factura Deadline (Compliance)

| Aspect | Detaliu |
| --- | --- |
| **Stimulus** | Factură emisă în sistem |
| **Source** | Oblio API integration |
| **Environment** | Production |
| **Artifact** | e-Factura SPV worker |
| **Response** | Safety net cron la 4 zile verifică și forțează trimiterea |
| **Measure** | 100% facturi trimise în SPV < 5 zile calendaristice |

---

## 11. Risks and Technical Debt

## 11.1 Identified Risks

| Risk | Probabilitate | Impact | Mitigare |
| --- | --- | --- | --- |
| **Single Server Failure** | Medium | High | Daily backups to Hetzner Storage Box, PITR capability |
| **LLM Provider Outage** | Medium | Medium | Fallback chain (xAI → Claude → Groq) |
| **Rate Limit Exceeded** | High | Medium | Circuit breakers, exponential backoff, quota guardian |
| **Python 3.14 Library Incompatibility** | Medium | Medium | Thorough testing, fallback to 3.13 for critical libs |
| **e-Factura API Changes** | Low | High | CIUS-RO version tracking, XML schema validation |
| **GDPR Complaint** | Low | Very High | LIA documented, DPO assigned, 90-day remediation budget |

## 11.2 Technical Debt Register

| Item | Severity | Description | Remediation Plan |
| --- | --- | --- | --- |
| **Legacy `shop_id` alias** | Low | Some code still uses `shop_id` instead of `tenant_id` | Gradual replacement during feature work |
| **`gold_hitl_tasks` migration** | Medium | Old per-stage tables still exist in some docs | Delete after `approval_tasks` fully operational |
| **Missing contract tests E4-E5** | Medium | Etapa 4-5 workers lack contract tests | Sprint dedicated to test coverage |
| **SigNoz dashboard customization** | Low | Default dashboards, not optimized for Cerniq | Create custom dashboards post-launch |
| **React Server Components adoption** | Low | Currently mostly client components | Gradual migration for data-heavy views |

---

## 12. Glossary

## 12.1 Business Terms

| Term | Definition |
| --- | --- |
| **Bronze** | Strat de date brute, nevalidate, append-only și imuabil |
| **Silver** | Date curățate, validate și normalizate |
| **Gold** | Contacte complet îmbogățite, ready-for-outreach |
| **CUI** | Cod Unic de Identificare - identificator fiscal unic românesc |
| **OUAI** | Organizație de Utilizatori de Apă pentru Irigații |
| **APIA** | Agenția de Plăți și Intervenție pentru Agricultură |
| **MADR** | Ministerul Agriculturii și Dezvoltării Rurale |
| **e-Factura** | Sistem electronic facturare obligatoriu ANAF |
| **CIUS-RO** | Core Invoice Usage Specification România (UBL 2.1) |
| **SPV** | Spațiul Privat Virtual ANAF |
| **LIA** | Legitimate Interest Assessment (GDPR) |

## 12.2 Technical Terms

| Term | Definition |
| --- | --- |
| **Vertical Slice** | Arhitectură unde fiecare feature conține toate layer-urile (UI, API, DB) |
| **Medallion Architecture** | Pattern de data lake cu nivele Bronze → Silver → Gold |
| **MCP** | Model Context Protocol - standard deschis pentru integrarea LLM cu tools |
| **HITL** | Human-in-the-Loop - sistem de aprobare manuală |
| **FSM** | Finite State Machine - model de stări pentru lead journey |
| **RRF** | Reciprocal Rank Fusion - algoritm de combinare a rezultatelor de search |
| **Neuro-Symbolic AI** | Arhitectură hibridă: rețele neurale + sisteme simbolice |
| **Guardrails** | Validări deterministe care previn halucinațiile LLM |
| **BullMQ** | Bibliotecă Node.js pentru job queues bazată pe Redis |
| **pgvector** | Extensie PostgreSQL pentru căutare vectorială |
| **PostGIS** | Extensie PostgreSQL pentru date geospațiale |
| **RLS** | Row-Level Security - izolare date la nivel de rând în PostgreSQL |

## 12.3 Naming Conventions Quick Reference

| Context | Pattern | Example |
| --- | --- | --- |
| **Tables Bronze** | `bronze_{entity}` | `bronze_contacts` |
| **Tables Silver** | `silver_{entity}` | `silver_companies` |
| **Tables Gold** | `gold_{entity}` | `gold_lead_journey` |
| **BullMQ Queues** | `{layer}:{category}:{action}` | `enrich:anaf:fiscal-status` |
| **Events** | `{entity}.{action}.{status}` | `lead.enrichment.completed` |
| **API Endpoints** | `/api/v1/{resource}` | `/api/v1/leads` |
| **Feature Dirs** | `/features/{feature-name}/` | `/features/enrichment/` |

---

## Appendix A: Document Hierarchy

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         DOCUMENT AUTHORITY HIERARCHY                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘

Nivel 1 (NORMATIV - Câștigă Întotdeauna):
└── Cerniq_Master_Spec_Normativ_Complet.md (v1.2+)

Nivel 2 (Normativ Transversal):
└── Unified_HITL_Approval_System.md

Nivel 3 (Strategie per Domeniu):
├── Etapa_1_-_Strategie_Data_Enrichment.rtf
├── Etapa_2_-_Optimizare_Strategie_Cold_Outreach.rtf
├── Etapa_3_-_Strategie_Generala_Ofertare.rtf
├── Etapa_4__Monitorizare_Vanzare.rtf
└── Etapa_5_-_Strategie_Nurturing_Leads.rtf

Nivel 4 (Procedural/Implementare):
├── __Etapa_1_-_Documentare_workers.md
├── __Etapa_2_-_Complete-workers-cold-outreach.md
├── cerniq-workers-etapa3-ai-sales-agent.md
├── cerniq-workers-etapa4-monitorizare.md
└── cerniq-workers-etapa5-nurturing.md

Nivel 5 (Anexe Data Model):
└── __Schema_contacte_bronze_silver_gold_CORRECTED.md
```

---

## Appendix B: Technology Version Matrix

| Technology | Version | Release Date | EOL Date | Notes |
| --- | --- | --- | --- | --- |
| Node.js | 24.12.0 | Oct 2025 | Apr 2028 | LTS "Krypton" |
| Python | 3.14.2 | Dec 2025 | Oct 2029 | Free-Threading stable |
| PostgreSQL | 18.1 | Nov 2025 | Nov 2030 | Async I/O, UUIDv7 |
| Redis | 7.4.7 | Nov 2025 | - | Stable 7.x |
| React | 19.2.3 | Dec 2025 | - | Server Components stable |
| Fastify | 5.6.2 | Nov 2025 | - | v4 EOL Jun 2025 |
| Tailwind CSS | 4.1.x | Jan 2025 | - | Oxide engine |
| Refine | 5.x | Oct 2025 | - | TanStack Query v5 |
| BullMQ | 5.66.5 | Jan 2026 | - | - |
| Traefik | 3.6.6 | Dec 2025 | - | - |
| SigNoz | 0.106.0 | Jan 2026 | - | - |
| Docker Engine | 28.x/29.x | 2025 | - | - |

---

**Document Version:** 1.0  
**Creation Date:** 12 Ianuarie 2026  
**Based On:** Cerniq_Master_Spec_Normativ_Complet.md v1.2  
**Arc42 Template Version:** 8.2  
**Author:** Claude AI Assistant

---

END OF ARCHITECTURE DOCUMENTATION
