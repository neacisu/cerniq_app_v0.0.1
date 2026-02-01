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
│   ├── ADR Etapa 0/ADR-0006-Redis-8-4-0-cu-BullMQ-v5.md
│   ├── ADR Etapa 3/ADR-0066-Neuro-Symbolic-AI-Agent-Paradigm.md
│   ├── ADR Etapa 1/ADR-0031-Arhitectura-Medallion-Bronze-Silver-Gold.md
│   └── ... (~105 ADR-uri)
│
├── diagrams/                          # Diagrame vizuale
│   ├── c4-context.drawio
│   ├── c4-containers.drawio
│   ├── data-flow-medallion.drawio
│   └── ...
│
├── specifications/                    # Specificații detaliate per domeniu
│   ├── master-specification.md       # ★ SINGLE SOURCE OF TRUTH ★
│   ├── Etapa 1/etapa1-workers-overview.md # Pipeline Bronze→Silver→Gold
│   ├── Etapa 2/etapa2-workers-overview.md # Multi-canal outreach
│   ├── Etapa 3/etapa3-workers-overview.md # Agent AI neuro-simbolic
│   ├── Etapa 4/etapa4-workers-overview.md # Monitorizare și cash flow
│   ├── Etapa 5/etapa5-workers-overview.md # Nurturing agentic
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
│   ├── frontend-stack.md             # React 19.2.3, Tailwind v4, Refine v5
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

### Stack Tehnologic (Overview)

> 📖 **Sursă Canonică și Versiuni Exacte:** [`specifications/master-specification.md`](./specifications/master-specification.md) § 2.1
>
> Mai jos este un sumar high-level. Pentru development, consultați întotdeauna Master Spec.

| Componentă       | Rol                                     |
|------------------|-----------------------------------------|
| **Node.js**      | Runtime API principal (LTS)             |
| **Python**       | Workers AI/ML (Free-Threading supported)|
| **PostgreSQL**   | Database principal + pgvector + PostGIS |
| **Redis**        | Queue management & Caching              |
| **Fastify**      | Framework API de înaltă performanță     |
| **React**        | Frontend application (Server Components)|
| **Tailwind CSS** | Styling utility-first (Oxide engine)    |
| **Refine**       | Admin framework headless                |
| **Docker**       | Containerization & Orchestration        |
| **Traefik**      | Edge Router & SSL Termination           |
| **SigNoz**       | Observability & APM (OpenTelemetry)     |

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

| Etapă  | Denumire        | Focus                                | Service      |
|--------|-----------------|--------------------------------------|--------------|
| **E1** | Data Enrichment | Bronze→Silver→Gold transformation    | Worker E1    |
| **E2** | Cold Outreach   | Multi-canal (WhatsApp 20x + Email)   | Worker E2    |
| **E3** | AI Sales        | Negociere autonomă, MCP, e-Factura   | Worker E3    |
| **E4** | Post-Sale       | Cash flow, credit scoring, logistică | Worker E4    |
| **E5** | Nurturing       | PostGIS proximity, graf social, OUAI | Worker E5    |

> **Total: 5 Monolithic Python Services** (handling all 300+ queues internally) - Updated 2026-01-20

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
   - Începe cu [`specifications/Etapa 1/etapa1-workers-overview.md`](./specifications/Etapa%201/etapa1-workers-overview.md)
   - Consultă [`specifications/Etapa 2/etapa2-workers-overview.md`](./specifications/Etapa%202/etapa2-workers-overview.md)
   - Urmează: E3, E4, E5 (vezi directoarele respective)

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
| **APIA/MADR**  | [REMOVED]    | [REMOVED] per Risk R-017         |
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

### Documente Normative (Internal)

| Document                                                              | Status      | Rol                    |
|-----------------------------------------------------------------------|-------------|------------------------|
| [`master-specification.md`](./specifications/master-specification.md) | ✅ NORMATIV | Single Source of Truth |
| [`hitl-unified-system.md`](./specifications/hitl-unified-system.md)   | ✅ NORMATIV | HITL transversal       |

### Documente Strategie & Workers (per Etapă)

| Etapă       | Index Complet (Inventar)                                                | Overview Specifications                                                                 |
|-------------|-------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| **Etapa 1** | [`00-INDEX-ETAPA1.md`](./specifications/Etapa%201/00-INDEX-ETAPA1.md)   | [`etapa1-workers-overview.md`](./specifications/Etapa%201/etapa1-workers-overview.md)   |
| **Etapa 2** | [`00-INDEX-ETAPA2.md`](./specifications/Etapa%202/00-INDEX-ETAPA2.md)   | [`etapa2-workers-overview.md`](./specifications/Etapa%202/etapa2-workers-overview.md)   |
| **Etapa 3** | [`00-INDEX-ETAPA3.md`](./specifications/Etapa%203/00-INDEX-ETAPA3.md)   | [`etapa3-workers-overview.md`](./specifications/Etapa%203/etapa3-workers-overview.md)   |
| **Etapa 4** | [`00-INDEX-ETAPA4.md`](./specifications/Etapa%204/00-INDEX-ETAPA4.md)   | [`etapa4-workers-overview.md`](./specifications/Etapa%204/etapa4-workers-overview.md)   |
| **Etapa 5** | [`00-INDEX-ETAPA5.md`](./specifications/Etapa%205/00-INDEX-ETAPA5.md)   | [`etapa5-workers-overview.md`](./specifications/Etapa%205/etapa5-workers-overview.md)   |

### Documente Tehnice

| Document                                                                                 | Focus                      |
|------------------------------------------------------------------------------------------|----------------------------|
| [`architecture.md`](./architecture/architecture.md)                                      | Arhitectură Sistem         |
| [`port-matrix.md`](./specifications/Etapa%200/etapa0-port-matrix.md)                     | Alocare Porturi            |
| [`environment-variables.md`](./specifications/Etapa%200/etapa0-environment-variables.md) | Variabile Mediu            |
| [`coding-standards.md`](./developer-guide/coding-standards.md)                           | Standarde Cod              |

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
