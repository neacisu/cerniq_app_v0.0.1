# CERNIQ.APP — Documentation Hub

> **B2B Sales Automation Platform pentru Piața Agricolă Românească**

- [![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./architecture/changelog.md)
- [![Status](https://img.shields.io/badge/status-in_development-orange.svg)]
- [![License](https://img.shields.io/badge/license-proprietary-red.svg)]

---

## 🎯 Ce este Cerniq.app?

**Cerniq.app** este o platformă de automatizare a vânzărilor B2B construită specific pentru piața agricolă românească, targetând:

- **2.86 milioane** de ferme și exploatații agricole
- **29.000+** ferme comerciale (peste 50 ha)
- **25.000+** entități juridice agricole
- **€2.25 miliarde** în subvenții APIA distribuite anual
- **475+ OUAI** (Organizații de Îmbunătățiri Funciare)
- **2.526** cooperative agricole active

### Viziune

Transformarea procesului de vânzare B2B agricol dintr-un proces manual, fragmentat și ineficient într-un **pipeline complet automatizat**, de la descoperirea prospectului până la emiterea facturii și nurturing-ul post-vânzare.

---

## 📚 Cum să Navighezi Documentația

### Principiul Ierarhiei Documentelor

```text
                    ┌────────────────────────────────────────┐
                    │     MASTER SPECIFICATION (NORMATIV)    │
                    │   ★ Single Source of Truth ★           │
                    │   specifications/master-specification  │
                    └────────────────────┬───────────────────┘
                                         │
          ┌──────────────────────────────┼──────────────────────────────┐
          ▼                              ▼                              ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   ARCHITECTURE      │     │   SPECIFICATIONS    │     │   ADR               │
│   (arc42 format)    │     │   (Etape 1-5)       │     │   (Decizii)         │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
          │                              │                              │
          └──────────────────────────────┼──────────────────────────────┘
                                         ▼
                            ┌─────────────────────┐
                            │  IMPLEMENTATION     │
                            │  (api, ui-ux, infra)│
                            └─────────────────────┘
```

> **REGULĂ FUNDAMENTALĂ:** În caz de conflict între documente, **Master Specification câștigă întotdeauna**.

---

## 📂 Structura Documentației

```text
docs/
│
├── README.md                          ← 📍 EȘTI AICI
│
├── architecture/                      # Documentație arhitecturală (arc42)
│   ├── architecture.md               # Cele 12 secțiuni arc42
│   ├── changelog.md                  # Istoric modificări arhitectură
│   ├── glossary.md                   # Termeni: Golden Contact, HITL, Medallion
│   ├── risks-and-technical-debt.md   # Riscuri și debt tehnic
│   └── references.md                 # Link-uri către resurse externe
│
├── adr/                               # Architecture Decision Records
│   ├── template.md                   # Template ADR standard
│   ├── ADR-001-bullmq-granular-workers.md
│   ├── ADR-002-neuro-symbolic-ai.md
│   ├── ADR-003-medallion-architecture.md
│   └── ... (15-20 ADR-uri)
│
├── diagrams/                          # Diagrame vizuale
│   ├── c4-context.drawio
│   ├── c4-containers.drawio
│   ├── data-flow-medallion.drawio
│   └── ...
│
├── specifications/                    # Specificații detaliate per domeniu
│   ├── master-specification.md       # ★ SINGLE SOURCE OF TRUTH ★
│   ├── etapa1-enrichment.md          # Pipeline Bronze→Silver→Gold
│   ├── etapa2-cold-outreach.md       # Multi-canal outreach
│   ├── etapa3-ai-sales.md            # Agent AI neuro-simbolic
│   ├── etapa4-post-sale.md           # Monitorizare și cash flow
│   ├── etapa5-nurturing.md           # Nurturing agentic
│   ├── schema-database.md            # Schema Medallion completă
│   └── hitl-unified-system.md        # Sistem HITL transversal
│
├── api/                               # Documentație API
│   ├── openapi.yaml                  # Spec OpenAPI/Swagger
│   ├── webhooks.md                   # Webhooks externe
│   └── rate-limits-external.md       # Rate limits API-uri terțe
│
├── infrastructure/                    # DevOps & Deployment
│   ├── docker-compose-reference.md   # Configurații Docker
│   ├── deployment-guide.md           # Deploy pe Hetzner
│   ├── observability-signoz.md       # Monitoring SigNoz
│   └── backup-strategy.md            # Backup și restore
│
├── ui-ux/                             # Frontend documentation
│   ├── frontend-stack.md             # React 19, Tailwind v4, Refine v5
│   ├── components-list.md            # Lista componentelor UI
│   └── design-tokens.md              # Design system tokens
│
├── governance/                        # Conformitate și procese
│   ├── gdpr-compliance.md            # GDPR Art.6(1)(f), Legea 190/2018
│   ├── security-policy.md            # Politici securitate
│   ├── testing-strategy.md           # Strategia de testare
│   └── release-process.md            # Workflow release
│
└── developer-guide/                   # Ghid pentru dezvoltatori
    ├── getting-started.md            # Quick start
    ├── coding-standards.md           # Convenții de cod
    └── troubleshooting.md            # Probleme comune
```

---

## 🏗️ Arhitectura Sistemului

### Stack Tehnologic (Ianuarie 2026)

| Componentă       | Versiune               | Rol                                     |
|------------------|------------------------|-----------------------------------------|
| **Node.js**      | v24.12.0 LTS "Krypton" | Runtime API principal                   |
| **Python**       | 3.14.1 Free-Threading  | Workers AI/ML                           |
| **PostgreSQL**   | 18.1                   | Database principal + pgvector + PostGIS |
| **Redis**        | 7.4.7                  | BullMQ queues                           |
| **Fastify**      | v5.6.2                 | Framework API                           |
| **React**        | 19.2.3                 | Frontend framework                      |
| **Tailwind CSS** | v4.1+                  | Styling (Oxide engine)                  |
| **Refine**       | v5                     | Admin framework headless                |
| **Docker**       | 28.x                   | Container runtime                       |
| **Traefik**      | v3.6.6                 | Edge router + SSL                       |
| **SigNoz**       | v0.104.0               | Observability (OTEL)                    |

### Arhitectura Medallion (Bronze → Silver → Gold)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                           DATA PIPELINE                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ╔═══════════════════╗      ╔═══════════════════╗      ╔═══════════════════╗ |
│  ║   BRONZE LAYER    ║      ║   SILVER LAYER    ║      ║   GOLDEN LAYER    ║ |
│  ║   (Raw Ingestion) ║  →   ║   (Validated)     ║  →   ║   (Operational)   ║ |
│  ╠═══════════════════╣      ╠═══════════════════╣      ╠═══════════════════╣ |
│  ║ • Append-only     ║      ║ • Deduplicated    ║      ║ • 200+ câmpuri    ║ |
│  ║ • Imuabil         ║      ║ • Normalized      ║      ║ • Geocoded        ║ |
│  ║ • Source of truth ║      ║ • Entity resolved ║      ║ • Lead scored     ║ |
│  ║ • Multi-source    ║      ║ • CUI validated   ║      ║ • Ready outreach  ║ |
│  ╚═══════════════════╝      ╚═══════════════════╝      ╚═══════════════════╝ |
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Cele 5 Etape ale Pipeline-ului

| Etapă  | Denumire        | Focus                                | Workers     |
|--------|-----------------|--------------------------------------|-------------|
| **E1** | Data Enrichment | Bronze→Silver→Gold transformation    | ~61 workers |
| **E2** | Cold Outreach   | Multi-canal (WhatsApp 20x + Email)   | ~45 workers |
| **E3** | AI Sales        | Negociere autonomă, MCP, e-Factura   | ~55 workers |
| **E4** | Post-Sale       | Cash flow, credit scoring, logistică | ~40 workers |
| **E5** | Nurturing       | PostGIS proximity, graf social, OUAI | ~50 workers |

> **Total estimat: ~250+ BullMQ workers granulari**

---

## 🔑 Concepte Cheie

### Glossar Rapid

| Termen             | Definiție                                                              |
|--------------------|------------------------------------------------------------------------|
| **Golden Contact** | Contact complet îmbogățit, validat pe multiple axe, ready-for-outreach |
| **HITL**           | Human-in-the-Loop — sistem de aprobare manuală transversal             |
| **Medallion**      | Arhitectură date în 3 straturi: Bronze → Silver → Gold                 |
| **CUI**            | Cod Unic de Identificare (identificator fiscal românesc)               |
| **OUAI**           | Organizație de Utilizatori de Apă pentru Irigații                      |
| **e-Factura**      | Sistem electronic de facturare obligatoriu ANAF                        |
| **LIA**            | Legitimate Interest Assessment (evaluare GDPR)                         |
| **FSM**            | Finite State Machine — model stări lead journey                        |

### Progresia Lead Journey

```text
COLD → CONTACTED_WA → WARM_REPLY → NEGOTIATION → PROPOSAL → CLOSING → CONVERTED
                ↘                                              ↓
         CONTACTED_EMAIL ──────────────────────────────→ NURTURING → LOYAL_ADVOCATE
                                                              ↓
                                                          AT_RISK → DEAD
```

---

## 🚀 Ghid Rapid de Start

### Pentru Dezvoltatori

1. **Citește mai întâi:**
   - [`specifications/master-specification.md`](./specifications/master-specification.md) — Contractele canonice
   - [`architecture/glossary.md`](./architecture/glossary.md) — Terminologie
   - [`developer-guide/getting-started.md`](./developer-guide/getting-started.md) — Setup local

2. **Înțelege arhitectura:**
   - [`architecture/architecture.md`](./architecture/architecture.md) — Viziune arc42
   - [`diagrams/`](./diagrams/) — Diagrame C4

3. **Implementează pe etape:**
   - Începe cu `specifications/etapa1-enrichment.md`
   - Urmează ordinea: E1 → E2 → E3 → E4 → E5

### Pentru Product Owners / Business

1. **Overview:**
   - Acest README — pentru context general
   - [`specifications/master-specification.md`](./specifications/master-specification.md) secțiunile 0-1

2. **Funcționalități per etapă:**
   - `specifications/etapa[1-5]-*.md` — Ce face fiecare etapă

---

## 📋 Integrări Românești

### Surse de Date

| Sursă          | Tip          | Date Obținute                    |
|----------------|--------------|----------------------------------|
| **ANAF API**   | Gratuit      | CUI, TVA, e-Factura status, CAEN |
| **Termene.ro** | Plătit       | Bilanțuri, scoring risc, dosare  |
| **APIA/MADR**  | PDF scraping | Subvenții, suprafețe, OUAI       |
| **Hunter.io**  | Plătit       | Email discovery                  |
| **ZeroBounce** | Plătit       | Email verification               |

### Integrări Operaționale

| Serviciu             | Rol                  | Rate Limit                |
|----------------------|----------------------|---------------------------|
| **TimelinesAI**      | WhatsApp (20 numere) | 200 contacte NOI/zi/număr |
| **Instantly.ai**     | Email cold outreach  | Unlimited (warmup)        |
| **Resend**           | Email transacțional  | 100/sec                   |
| **Oblio.eu**         | e-Factura generation | ~1000 req/min             |
| **Sameday**          | Logistică AWB        | Standard API              |
| **Revolut Business** | Payment webhooks     | N/A                       |

---

## ⚖️ Conformitate

### GDPR (Art. 6(1)(f) — Interes Legitim)

- **Temei legal:** Prospectare B2B pe bază de interes legitim
- **Recital 47:** Marketing direct = interes legitim acceptat
- **LIA obligatoriu:** Documentat pentru fiecare tip de procesare
- **Legea 190/2018 România:** Penalități 1.000-200.000 RON

### e-Factura

- **Obligatoriu B2B:** Din iulie 2024
- **Format:** XML UBL 2.1 conform CIUS-RO 1.0.9
- **Termen:** 5 zile calendaristice de la emitere
- **Penalități:** 15% din valoarea facturii pentru non-conformitate

---

## 📊 Inventory Documente Existente

### Documente Normative (din librărie)

| Document                                                   | Size | Status      | Rol                     |
|------------------------------------------------------------|------|-------------|-------------------------|
| `__Cerniq_Master_Spec_Normativ_Complet.md`                 | 166K | ✅ NORMATIV | Single Source of Truth  |
| `Unified_HITL_Approval_System_for_B2B_Sales_Automation.md` | 29K  | ✅ NORMATIV | HITL transversal        |
| `__Schema_contacte_bronze_silver_gold.md`                  | 53K  | 📋 Anexă    | Data model complet      |

### Documente Strategie (per Etapă)

| Document                                                       | Focus                  |
|----------------------------------------------------------------|------------------------|
| `Etapa_1_-_Strategie_Data_Enrichment_Prospecti_Romania.rtf`    | Strategie enrichment   |
| `Etapa_2_-_Optimizare_Strategie_Cold_Outreach_Multi-Canal.rtf` | Cold outreach strategy |
| `Etapa_3_-_Strategie_Generala_Ofertare_Vânzare_AI.rtf`         | AI sales strategy      |
| `Etapa_4__Monitorizare_Vânzare___Post-Vân___.rtf`              | Post-sale monitoring   |
| `Etapa_5_-_Strategie_Nurturing_Leads___Post-Vânzare.rtf`       | Nurturing strategy     |

### Documente Implementare (Workers)

| Document                                             | Size  | Workers         |
|------------------------------------------------------|-------|-----------------|
| `__Etapa_1_-_Documentare_workers_cerniq-workers.md`  | 100K  | ~61 workers E1  |
| `__Etapa_2_-_Complete-workers-cold-outreach.md`      | 89K   | Workers E2      |
| `cerniq-workers-etapa3-ai-sales-agent.md`            | 104K  | Workers E3      |
| `cerniq-workers-etapa4-monitorizare-post-vanzare.md` | 202K  | Workers E4      |
| `cerniq-workers-etapa5-nurturing-post-vanzare.md`    | 293K  | Workers E5      |

### Documente Tehnice

| Document                                                     | Focus                      |
|--------------------------------------------------------------|----------------------------|
| `Tehnologii_Active_Ianuarie_2026.rtf`                        | Versiuni stack validate    |
| `__Docker_Infrastructure_Technical_Reference_for_Cerniq.rtf` | Docker configs             |
| `__Etapa_1_-_Frontend_strategy___tech_stack.md`              | Frontend architecture      |
| `Roadmap_Paralel_Vanzari_AI_-_Cerniq_app.rtf`                | Vertical Slice methodology |
| `TOC_Plan_Dezvoltare_Cerniq_App.rtf`                         | Table of Contents complet  |

---

## 🔄 Workflow de Dezvoltare

### Metodologie: Vertical Slice Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        VERTICAL SLICE METHODOLOGY                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    Etapă (E1-E5)                                                        │
│        └── Sprint (E1.S1, E1.S2, ...)                                   │
│               └── PR/Branch (E1.S1.PR1, E1.S1.PR2, ...)                 │
│                      └── Task (E1.S1.PR1.001, E1.S1.PR1.002, ...)       │
│                                                                         │
│    Format Task ID: Ex.Sx.PRx.xxx                                        │
│    Exemplu: E1.S1.PR1.003 = Etapa 1, Sprint 1, PR 1, Task 003           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Estimări per Etapă

| Etapă                | Sprinturi | PRs       | Tasks Est.  | Durată            |
|----------------------|-----------|-----------|-------------|-------------------|
| E1 - Data Enrichment | 4         | 8-12      | 40-60       | 2 săptămâni       |
| E2 - Cold Outreach   | 4         | 10-15     | 50-75       | 2 săptămâni       |
| E3 - Ofertare AI     | 6         | 15-20     | 80-100      | 3 săptămâni       |
| E4 - Post-Vânzare    | 4         | 10-14     | 50-70       | 2 săptămâni       |
| E5 - Nurturing       | 6         | 12-18     | 60-90       | 3 săptămâni       |
| **TOTAL**            | **24**    | **55-79** | **280-395** | **~12 săptămâni** |

---

## 📝 Convenții Documentație

### Când să Actualizezi Ce

| Schimbare                   | Document de Actualizat                            |
|-----------------------------|---------------------------------------------------|
| Decizie arhitecturală nouă  | `adr/ADR-xxx-*.md`                                |
| Schimbare API contract      | `specifications/master-specification.md`          |
| Schimbare schema DB         | `specifications/schema-database.md` + Master Spec |
| Bug fix / improvement minor | Doar cod + PR description                         |
| Schimbare infrastruc­tură    | `infrastructure/*.md`                             |
| Schimbare UI major          | `ui-ux/components-list.md`                        |

### Template ADR

```markdown
# ADR-XXX: [Titlu Scurt]

## Status
[proposed | accepted | deprecated | superseded]

## Context
[Ce problemă rezolvăm?]

## Decision
[Ce am decis?]

## Consequences
[Ce implicații are decizia?]
```

---

## 🔗 Link-uri Utile

### Resurse Externe

- [ANAF e-Factura Portal](https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/strategii_anaf/proiecte_digitalizare/e.factura)
- [Termene.ro API Docs](https://termene.ro/api)
- [Oblio.eu Documentation](https://www.oblio.eu/docs)
- [TimelinesAI API](https://timelinesai.com/api)
- [Instantly.ai Docs](https://developer.instantly.ai/)

### Framework Documentation

- [React 19 Docs](https://react.dev/)
- [Fastify v5 Docs](https://fastify.dev/)
- [Refine v5 Docs](https://refine.dev/docs/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [BullMQ Docs](https://docs.bullmq.io/)
- [Drizzle ORM](https://orm.drizzle.team/)

---

## 📞 Contact & Suport

**Project Owner:** Alexandru Neacișu  
**Repository:** [github.com/neacisu/cerniq_app_v0.0.1](https://github.com/neacisu/cerniq_app_v0.0.1)

---

## 📅 Changelog Documentație

| Data       | Versiune | Schimbări                           |
|------------|----------|-------------------------------------|
| 2026-01-11 | 1.0.0    | Inițializare structură documentație |

---

> **Notă:** Această documentație este în continuă dezvoltare. Pentru ultima versiune a contractelor canonice, consultă întotdeauna `specifications/master-specification.md`.
