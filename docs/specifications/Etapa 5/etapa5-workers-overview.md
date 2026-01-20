# CERNIQ.APP — ETAPA 5: WORKERS OVERVIEW
## 58 Workers pentru Nurturing Agentic
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Arhitectură Generală](#1-arhitectura)
2. [Inventar Complet](#2-inventar)
3. [Queue Configuration](#3-queues)
4. [Rate Limits](#4-rate-limits)

---

## 1. Arhitectură Generală {#1-arhitectura}

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ETAPA 5 - 58 WORKERS ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CATEGORIA A: Nurturing State Machine (8 workers)                      │  │
│  │ A1-A8: lifecycle:*, onboarding:*, state:*                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CATEGORIA B: Churn Detection (6 workers)                              │  │
│  │ B9-B14: churn:*, sentiment:*, decay:*                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CATEGORIA C: Geospatial Analysis - PostGIS (5 workers)                │  │
│  │ C15-C19: geo:proximity:*, geo:neighbor:*, geo:territory:*            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CATEGORIA D: Graph Analysis - NetworkX (5 workers)                    │  │
│  │ D20-D24: graph:*, community:*, centrality:*                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CATEGORIA E: Referral System (7 workers)                              │  │
│  │ E25-E31: referral:*, consent:*, reward:*                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CATEGORIA F: Win-Back Campaigns (5 workers)                           │  │
│  │ F32-F36: winback:*, reactivation:*                                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CATEGORIA G: Association Data Ingestion (6 workers)                   │  │
│  │ G37-G42: ingest:ouai:*, ingest:cooperative:*, ingest:madr:*          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CATEGORIA H: Feedback & Zero-Party Data (5 workers)                   │  │
│  │ H43-H47: feedback:*, nps:*, conversation:extract:*                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CATEGORIA I: Content & Educational (4 workers)                        │  │
│  │ I48-I51: content:drip:*, content:generate:*, content:personalize:*   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CATEGORIA J: Alert & Trigger (4 workers)                              │  │
│  │ J52-J55: alert:weather:*, alert:subsidy:*, trigger:seasonal:*        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CATEGORIA K: Compliance & Governance (3 workers)                      │  │
│  │ K56-K58: compliance:gdpr:*, compliance:competition:*, audit:*        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Inventar Complet {#2-inventar}

### Categoria A: Nurturing State Machine (8 workers)

| # | Worker Name | Queue | Descriere |
|---|-------------|-------|-----------|
| A1 | lifecycle:order:completed | lifecycle | Trigger la order DELIVERED |
| A2 | lifecycle:state:evaluate | lifecycle | Evaluează și tranziționează state |
| A3 | onboarding:sequence:start | onboarding | Inițiază secvență onboarding |
| A4 | onboarding:step:execute | onboarding | Execută pas din onboarding |
| A5 | onboarding:complete:check | onboarding | Verifică completare onboarding |
| A6 | state:transition:execute | state | Execută tranziție de state |
| A7 | state:metrics:update | state | Actualizează metrici client |
| A8 | state:advocate:promote | state | Promovează la ADVOCATE status |

### Categoria B: Churn Detection (6 workers)

| # | Worker Name | Queue | Descriere |
|---|-------------|-------|-----------|
| B9 | churn:signal:detect | churn | Detectează semnale churn |
| B10 | churn:score:calculate | churn | Calculează scor churn agregat |
| B11 | churn:risk:escalate | churn | Escaladează clienți la risc |
| B12 | sentiment:analyze | sentiment | Analiză sentiment cu LLM |
| B13 | sentiment:aggregate | sentiment | Agregează sentiment pe client |
| B14 | decay:behavior:detect | decay | Detectează decay comportamental |

### Categoria C: Geospatial Analysis (5 workers)

| # | Worker Name | Queue | Descriere |
|---|-------------|-------|-----------|
| C15 | geo:proximity:calculate | geospatial | Calculează proximitate KNN |
| C16 | geo:neighbor:identify | geospatial | Identifică vecini pentru referral |
| C17 | geo:territory:calculate | geospatial | Calculează teritoriu cluster/OUAI |
| C18 | geo:coverage:analyze | geospatial | Analiză acoperire geografică |
| C19 | geo:catchment:build | geospatial | Construiește zone captare |

### Categoria D: Graph Analysis (5 workers)

| # | Worker Name | Queue | Descriere |
|---|-------------|-------|-----------|
| D20 | graph:build:relationships | graph | Construiește graf relații |
| D21 | community:detect:leiden | graph | Detectează comunități Leiden |
| D22 | centrality:calculate | graph | Calculează centralitate noduri |
| D23 | kol:identify | graph | Identifică Key Opinion Leaders |
| D24 | cluster:implicit:detect | graph | Detectează clustere implicite |

### Categoria E: Referral System (7 workers)

| # | Worker Name | Queue | Descriere |
|---|-------------|-------|-----------|
| E25 | referral:detect:mention | referral | Detectează mențiuni în conversații |
| E26 | referral:request:send | referral | Trimite cerere referral |
| E27 | referral:consent:process | referral | Procesează consimțământ |
| E28 | referral:outreach:execute | referral | Execută outreach la prospect |
| E29 | referral:conversion:track | referral | Tracking conversie |
| E30 | referral:reward:calculate | referral | Calculează reward |
| E31 | referral:reward:process | referral | Procesează plată reward |

### Categoria F: Win-Back Campaigns (5 workers)

| # | Worker Name | Queue | Descriere |
|---|-------------|-------|-----------|
| F32 | winback:campaign:create | winback | Creează campanie win-back |
| F33 | winback:step:execute | winback | Execută pas din campanie |
| F34 | winback:response:process | winback | Procesează răspuns |
| F35 | winback:conversion:track | winback | Tracking conversie |
| F36 | reactivation:complete | winback | Finalizare reactivare |

### Categoria G: Association Data Ingestion (6 workers)

| # | Worker Name | Queue | Descriere |
|---|-------------|-------|-----------|
| G37 | ingest:ouai:scrape | association | Scraping PDF-uri OUAI/MADR |
| G38 | ingest:ouai:parse | association | Parsare date extrase |
| G39 | ingest:cooperative:scrape | association | Scraping cooperative |
| G40 | ingest:cooperative:parse | association | Parsare date cooperative |
| G41 | ingest:madr:sync | association | Sincronizare registre MADR |
| G42 | ingest:affiliation:match | association | Matching membru-asociație |

### Categoria H: Feedback & Zero-Party Data (5 workers)

| # | Worker Name | Queue | Descriere |
|---|-------------|-------|-----------|
| H43 | feedback:nps:send | feedback | Trimite NPS survey |
| H44 | feedback:nps:process | feedback | Procesează răspuns NPS |
| H45 | feedback:extract:entities | feedback | Extrage entități din conversații |
| H46 | feedback:competitor:detect | feedback | Detectează menții competitori |
| H47 | feedback:crm:writeback | feedback | Scrie date înapoi în CRM |

### Categoria I: Content & Educational (4 workers)

| # | Worker Name | Queue | Descriere |
|---|-------------|-------|-----------|
| I48 | content:drip:schedule | content | Programează content drip |
| I49 | content:drip:execute | content | Execută trimitere content |
| I50 | content:generate:personalize | content | Generează content personalizat |
| I51 | content:engagement:track | content | Tracking engagement |

### Categoria J: Alert & Trigger (4 workers)

| # | Worker Name | Queue | Descriere |
|---|-------------|-------|-----------|
| J52 | alert:weather:monitor | alerts | Monitorizează alerte ANM |
| J53 | alert:weather:campaign | alerts | Declanșează campanii meteo |
| J54 | alert:subsidy:monitor | alerts | Monitorizează calendar subvenții |
| J55 | trigger:seasonal:execute | alerts | Executare triggere sezoniere |

### Categoria K: Compliance & Governance (3 workers)

| # | Worker Name | Queue | Descriere |
|---|-------------|-------|-----------|
| K56 | compliance:consent:verify | compliance | Verifică consimțăminte GDPR |
| K57 | compliance:competition:check | compliance | Verifică Legea Concurenței |
| K58 | audit:trail:record | compliance | Înregistrare audit trail |

---

## 3. Queue Configuration {#3-queues}

```typescript
// configs/queues/etapa5-queues.ts
export const ETAPA5_QUEUES = {
  // State Machine
  lifecycle: {
    name: 'lifecycle',
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    }
  },
  onboarding: {
    name: 'onboarding',
    defaultJobOptions: { attempts: 3 }
  },
  state: {
    name: 'state',
    defaultJobOptions: { attempts: 3 }
  },
  
  // Churn
  churn: {
    name: 'churn',
    defaultJobOptions: { attempts: 2 }
  },
  sentiment: {
    name: 'sentiment',
    defaultJobOptions: {
      attempts: 2,
      rateLimiter: { max: 100, duration: 60000 } // LLM rate limit
    }
  },
  decay: {
    name: 'decay',
    defaultJobOptions: { attempts: 2 }
  },
  
  // Geospatial
  geospatial: {
    name: 'geospatial',
    defaultJobOptions: {
      attempts: 2,
      timeout: 300000 // 5 min for heavy PostGIS queries
    }
  },
  
  // Graph
  graph: {
    name: 'graph',
    defaultJobOptions: {
      attempts: 2,
      timeout: 600000 // 10 min for graph algorithms
    }
  },
  
  // Referral
  referral: {
    name: 'referral',
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 }
    }
  },
  
  // Win-Back
  winback: {
    name: 'winback',
    defaultJobOptions: { attempts: 3 }
  },
  
  // Association
  association: {
    name: 'association',
    defaultJobOptions: {
      attempts: 2,
      timeout: 600000 // PDF processing
    }
  },
  
  // Feedback
  feedback: {
    name: 'feedback',
    defaultJobOptions: { attempts: 3 }
  },
  
  // Content
  content: {
    name: 'content',
    defaultJobOptions: {
      attempts: 3,
      rateLimiter: { max: 50, duration: 60000 }
    }
  },
  
  // Alerts
  alerts: {
    name: 'alerts',
    defaultJobOptions: { attempts: 2 }
  },
  
  // Compliance
  compliance: {
    name: 'compliance',
    defaultJobOptions: { attempts: 3 }
  }
};
```

---

## 4. Rate Limits {#4-rate-limits}

| Queue | Rate Limit | Reason |
|-------|------------|--------|
| sentiment | 100/min | LLM API cost |
| content | 50/min | WhatsApp/Email limits |
| geospatial | 20/min | PostGIS query load |
| graph | 10/min | CPU intensive |
| association | 5/min | PDF scraping courtesy |

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
