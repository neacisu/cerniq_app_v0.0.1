# CERNIQ.APP — ETAPA 5: PLAN IMPLEMENTARE COMPLET
## Nurturing Agentic - 99 Taskuri Granulare
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Overview Implementare](#1-overview)
2. [Faza 5.1: Infrastructure](#2-faza-51)
3. [Faza 5.2: Database Schema](#3-faza-52)
4. [Faza 5.3: State Machine](#4-faza-53)
5. [Faza 5.4: Churn Detection](#5-faza-54)
6. [Faza 5.5: Geospatial (PostGIS)](#6-faza-55)
7. [Faza 5.6: Graph Analysis](#7-faza-56)
8. [Faza 5.7: Referral System](#8-faza-57)
9. [Faza 5.8: Win-Back](#9-faza-58)
10. [Faza 5.9: Associations](#10-faza-59)
11. [Faza 5.10: Feedback & Content](#11-faza-510)
12. [Faza 5.11: UI Implementation](#12-faza-511)
13. [Faza 5.12: Testing & Deploy](#13-faza-512)
14. [Rezumat Estimări](#14-rezumat)

---

## 1. Overview Implementare {#1-overview}

### Metrici Generale
- **Total Taskuri**: 99
- **Durată Estimată**: 14-16 săptămâni
- **Echipă**: 1 person team (vertical slice)
- **Task Range**: 400-498
- **Continuă de la**: Etapa 4 (Task 399)

---

## 2. Faza 5.1: Infrastructure Setup {#2-faza-51}

### Task 400-407 (8 taskuri)

```json
{
  "faza": "5.1",
  "nume": "Infrastructure Setup",
  "durata_estimata": "3 zile",
  "taskuri": [
    {
      "task_number": 400,
      "id": "E5-INF-001",
      "titlu": "Setup Redis Queues pentru Etapa 5",
      "descriere": "Configurare BullMQ queues pentru 12 categorii workers (A-K)",
      "tip": "INFRASTRUCTURE",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [399],
      "deliverables": [
        "configs/queues/etapa5-queues.ts",
        "Queue definitions pentru 58 workers"
      ]
    },
    {
      "task_number": 401,
      "id": "E5-INF-002",
      "titlu": "Setup Python Graph Service",
      "descriere": "Container Python cu NetworkX, cdlib pentru graph analysis",
      "tip": "INFRASTRUCTURE",
      "prioritate": "HIGH",
      "estimare_ore": 6,
      "dependente": [],
      "deliverables": [
        "docker/python-graph/Dockerfile",
        "python-graph/graph_service.py",
        "API endpoints pentru graph operations"
      ]
    },
    {
      "task_number": 402,
      "id": "E5-INF-003",
      "titlu": "Configure Anthropic LLM Client pentru Sentiment",
      "descriere": "Setup client LLM cu rate limiting și cost tracking",
      "tip": "INFRASTRUCTURE",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": []
    },
    {
      "task_number": 403,
      "id": "E5-INF-004",
      "titlu": "Setup PostGIS Extensions și Indexes",
      "descriere": "Configurare extensii PostGIS și indexes geospațiale",
      "tip": "INFRASTRUCTURE",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": []
    },
    {
      "task_number": 404,
      "id": "E5-INF-005",
      "titlu": "Setup PDF Extraction Service",
      "descriere": "Container Python cu tabula-py, pdfplumber pentru MADR scraping",
      "tip": "INFRASTRUCTURE",
      "prioritate": "MEDIUM",
      "estimare_ore": 5,
      "dependente": []
    },
    {
      "task_number": 405,
      "id": "E5-INF-006",
      "titlu": "Setup Cron Jobs Etapa 5",
      "descriere": "Configurare cron scheduler pentru graph analysis, churn check",
      "tip": "INFRASTRUCTURE",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [400]
    },
    {
      "task_number": 406,
      "id": "E5-INF-007",
      "titlu": "Configure ANM Weather API Integration",
      "descriere": "Client pentru alerte meteo ANM",
      "tip": "INFRASTRUCTURE",
      "prioritate": "LOW",
      "estimare_ore": 2,
      "dependente": []
    },
    {
      "task_number": 407,
      "id": "E5-INF-008",
      "titlu": "Environment Variables și Secrets Etapa 5",
      "descriere": "Definire variabile mediu pentru toate integrările",
      "tip": "INFRASTRUCTURE",
      "prioritate": "HIGH",
      "estimare_ore": 2,
      "dependente": []
    }
  ]
}
```

---

## 3. Faza 5.2: Database Schema {#3-faza-52}

### Task 408-419 (12 taskuri)

```json
{
  "faza": "5.2",
  "nume": "Database Schema Implementation",
  "durata_estimata": "4 zile",
  "taskuri": [
    {
      "task_number": 408,
      "id": "E5-DB-001",
      "titlu": "Create Etapa 5 Enums",
      "descriere": "Toate enum types pentru nurturing, churn, referrals, clusters",
      "tip": "DATABASE",
      "prioritate": "CRITICAL",
      "estimare_ore": 2,
      "dependente": []
    },
    {
      "task_number": 409,
      "id": "E5-DB-002",
      "titlu": "Create gold_nurturing_state Table",
      "descriere": "Tabel principal pentru state machine clienți",
      "tip": "DATABASE",
      "prioritate": "CRITICAL",
      "estimare_ore": 3,
      "dependente": [408]
    },
    {
      "task_number": 410,
      "id": "E5-DB-003",
      "titlu": "Create gold_nurturing_actions Table",
      "descriere": "Tabel pentru acțiuni și audit trail",
      "tip": "DATABASE",
      "prioritate": "HIGH",
      "estimare_ore": 2,
      "dependente": [409]
    },
    {
      "task_number": 411,
      "id": "E5-DB-004",
      "titlu": "Create Churn Tables",
      "descriere": "gold_churn_signals, gold_churn_factors, gold_sentiment_analysis",
      "tip": "DATABASE",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [408]
    },
    {
      "task_number": 412,
      "id": "E5-DB-005",
      "titlu": "Create Referral Tables",
      "descriere": "gold_referrals, gold_entity_relationships, gold_proximity_scores",
      "tip": "DATABASE",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [408]
    },
    {
      "task_number": 413,
      "id": "E5-DB-006",
      "titlu": "Create Cluster Tables",
      "descriere": "gold_clusters, gold_cluster_members",
      "tip": "DATABASE",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [408]
    },
    {
      "task_number": 414,
      "id": "E5-DB-007",
      "titlu": "Create Association Tables",
      "descriere": "gold_associations, gold_affiliations, gold_ouai_registry, gold_cooperatives",
      "tip": "DATABASE",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [408]
    },
    {
      "task_number": 415,
      "id": "E5-DB-008",
      "titlu": "Create KOL Tables",
      "descriere": "gold_kol_profiles",
      "tip": "DATABASE",
      "prioritate": "MEDIUM",
      "estimare_ore": 2,
      "dependente": [408]
    },
    {
      "task_number": 416,
      "id": "E5-DB-009",
      "titlu": "Create Win-Back Tables",
      "descriere": "gold_winback_campaigns",
      "tip": "DATABASE",
      "prioritate": "HIGH",
      "estimare_ore": 2,
      "dependente": [408]
    },
    {
      "task_number": 417,
      "id": "E5-DB-010",
      "titlu": "Create Feedback Tables",
      "descriere": "gold_nps_surveys, gold_content_drips, gold_competitor_intel",
      "tip": "DATABASE",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [408]
    },
    {
      "task_number": 418,
      "id": "E5-DB-011",
      "titlu": "Create GiST Spatial Indexes",
      "descriere": "Indexes PostGIS pentru toate tabelele cu locații",
      "tip": "DATABASE",
      "prioritate": "HIGH",
      "estimare_ore": 2,
      "dependente": [403, 412, 413, 414]
    },
    {
      "task_number": 419,
      "id": "E5-DB-012",
      "titlu": "Seed Initial Data",
      "descriere": "Content templates, NPS templates, association registry",
      "tip": "DATABASE",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [417]
    }
  ]
}
```

---

## 4. Faza 5.3: State Machine Workers {#4-faza-53}

### Task 420-427 (8 taskuri)

```json
{
  "faza": "5.3",
  "nume": "State Machine Workers (A1-A8)",
  "durata_estimata": "4 zile",
  "taskuri": [
    {
      "task_number": 420,
      "id": "E5-SM-001",
      "titlu": "Worker A1: lifecycle:order:completed",
      "descriere": "Trigger la order DELIVERED pentru nurturing state",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [409]
    },
    {
      "task_number": 421,
      "id": "E5-SM-002",
      "titlu": "Worker A2: lifecycle:state:evaluate",
      "descriere": "Evaluare și tranziție state bazată pe reguli",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 5,
      "dependente": [420]
    },
    {
      "task_number": 422,
      "id": "E5-SM-003",
      "titlu": "Workers A3-A5: Onboarding Sequence",
      "descriere": "Workers pentru onboarding flow",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 6,
      "dependente": [420]
    },
    {
      "task_number": 423,
      "id": "E5-SM-004",
      "titlu": "Worker A6: state:transition:execute",
      "descriere": "Execuție tranziție și side effects",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [421]
    },
    {
      "task_number": 424,
      "id": "E5-SM-005",
      "titlu": "Worker A7: state:metrics:update",
      "descriere": "Actualizare metrici client periodic",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [409]
    },
    {
      "task_number": 425,
      "id": "E5-SM-006",
      "titlu": "Worker A8: state:advocate:promote",
      "descriere": "Promovare la ADVOCATE status",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 2,
      "dependente": [421]
    },
    {
      "task_number": 426,
      "id": "E5-SM-007",
      "titlu": "State Machine Unit Tests",
      "descriere": "Tests pentru toate tranzițiile",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [421, 423]
    },
    {
      "task_number": 427,
      "id": "E5-SM-008",
      "titlu": "State Machine Integration Tests",
      "descriere": "Integration tests pentru lifecycle complet",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [426]
    }
  ]
}
```

---

## 5. Faza 5.4: Churn Detection Workers {#5-faza-54}

### Task 428-435 (8 taskuri)

```json
{
  "faza": "5.4",
  "nume": "Churn Detection Workers (B9-B14)",
  "durata_estimata": "5 zile",
  "taskuri": [
    {
      "task_number": 428,
      "id": "E5-CHR-001",
      "titlu": "Worker B9: churn:signal:detect",
      "descriere": "Detectare semnale churn din diverse surse",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 5,
      "dependente": [411]
    },
    {
      "task_number": 429,
      "id": "E5-CHR-002",
      "titlu": "Worker B10: churn:score:calculate",
      "descriere": "Calcul scor churn agregat cu weights",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 5,
      "dependente": [428]
    },
    {
      "task_number": 430,
      "id": "E5-CHR-003",
      "titlu": "Worker B11: churn:risk:escalate",
      "descriere": "Escalare clienți la risc către HITL",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [429]
    },
    {
      "task_number": 431,
      "id": "E5-CHR-004",
      "titlu": "Worker B12: sentiment:analyze",
      "descriere": "Analiză sentiment cu LLM (Claude)",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 6,
      "dependente": [402, 411]
    },
    {
      "task_number": 432,
      "id": "E5-CHR-005",
      "titlu": "Worker B13: sentiment:aggregate",
      "descriere": "Agregare sentiment pe client",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [431]
    },
    {
      "task_number": 433,
      "id": "E5-CHR-006",
      "titlu": "Worker B14: decay:behavior:detect",
      "descriere": "Detectare decay comportamental",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 4,
      "dependente": [409]
    },
    {
      "task_number": 434,
      "id": "E5-CHR-007",
      "titlu": "Churn Detection Tests",
      "descriere": "Unit tests pentru signal detection și scoring",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [429, 431]
    },
    {
      "task_number": 435,
      "id": "E5-CHR-008",
      "titlu": "Sentiment Analysis Tests",
      "descriere": "Tests pentru LLM integration",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [431]
    }
  ]
}
```

---

## 6. Faza 5.5: Geospatial Workers {#6-faza-55}

### Task 436-443 (8 taskuri)

```json
{
  "faza": "5.5",
  "nume": "Geospatial Analysis Workers (C15-C19)",
  "durata_estimata": "4 zile",
  "taskuri": [
    {
      "task_number": 436,
      "id": "E5-GEO-001",
      "titlu": "Worker C15: geo:proximity:calculate",
      "descriere": "Calcul proximitate KNN cu PostGIS",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 5,
      "dependente": [403, 412]
    },
    {
      "task_number": 437,
      "id": "E5-GEO-002",
      "titlu": "Worker C16: geo:neighbor:identify",
      "descriere": "Identificare vecini pentru referral",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [436]
    },
    {
      "task_number": 438,
      "id": "E5-GEO-003",
      "titlu": "Worker C17: geo:territory:calculate",
      "descriere": "Calcul teritoriu cluster cu Convex Hull",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [403, 413]
    },
    {
      "task_number": 439,
      "id": "E5-GEO-004",
      "titlu": "Worker C18: geo:coverage:analyze",
      "descriere": "Analiză acoperire geografică",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [438]
    },
    {
      "task_number": 440,
      "id": "E5-GEO-005",
      "titlu": "Worker C19: geo:catchment:build",
      "descriere": "Construire zone de captare",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [438]
    },
    {
      "task_number": 441,
      "id": "E5-GEO-006",
      "titlu": "PostGIS Query Optimization",
      "descriere": "Optimizare queries și indexes",
      "tip": "BACKEND",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [418, 436]
    },
    {
      "task_number": 442,
      "id": "E5-GEO-007",
      "titlu": "Geospatial Tests",
      "descriere": "Tests pentru toate queries PostGIS",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [436, 438]
    },
    {
      "task_number": 443,
      "id": "E5-GEO-008",
      "titlu": "GeoJSON API Endpoints",
      "descriere": "API pentru map display",
      "tip": "BACKEND",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [438]
    }
  ]
}
```

---

## 7-13. Faze 5.6-5.12: Remaining Tasks

```json
{
  "faza_5.6": {
    "nume": "Graph Analysis (D20-D24)",
    "taskuri": "444-451",
    "ore": 32,
    "focus": "NetworkX integration, Leiden, KOL identification"
  },
  "faza_5.7": {
    "nume": "Referral System (E25-E31)",
    "taskuri": "452-461",
    "ore": 40,
    "focus": "Consent flow, outreach, rewards"
  },
  "faza_5.8": {
    "nume": "Win-Back Campaigns (F32-F36)",
    "taskuri": "462-469",
    "ore": 28,
    "focus": "Campaign orchestration, offers"
  },
  "faza_5.9": {
    "nume": "Associations Ingestion (G37-G42)",
    "taskuri": "470-477",
    "ore": 32,
    "focus": "PDF scraping, OUAI/Cooperative registry"
  },
  "faza_5.10": {
    "nume": "Feedback, Content, Alerts (H-K)",
    "taskuri": "478-487",
    "ore": 36,
    "focus": "NPS, Content drip, Weather alerts, Compliance"
  },
  "faza_5.11": {
    "nume": "UI Implementation",
    "taskuri": "488-495",
    "ore": 48,
    "focus": "Dashboard, Churn, Referrals, Clusters, KOL, HITL pages"
  },
  "faza_5.12": {
    "nume": "Testing & Deployment",
    "taskuri": "496-498",
    "ore": 24,
    "focus": "Integration tests, E2E, Security audit, Deploy"
  }
}
```

---

## 14. Rezumat Estimări {#14-rezumat}

### Total pe Faze

| Fază | Nume | Taskuri | Ore | Zile |
|------|------|---------|-----|------|
| 5.1 | Infrastructure | 8 | 29 | 3 |
| 5.2 | Database Schema | 12 | 34 | 4 |
| 5.3 | State Machine | 8 | 32 | 4 |
| 5.4 | Churn Detection | 8 | 35 | 5 |
| 5.5 | Geospatial | 8 | 29 | 4 |
| 5.6 | Graph Analysis | 8 | 32 | 4 |
| 5.7 | Referral System | 10 | 40 | 5 |
| 5.8 | Win-Back | 8 | 28 | 4 |
| 5.9 | Associations | 8 | 32 | 4 |
| 5.10 | Feedback/Content | 10 | 36 | 5 |
| 5.11 | UI Implementation | 8 | 48 | 6 |
| 5.12 | Testing & Deploy | 3 | 24 | 3 |
| **TOTAL** | | **99** | **399** | **~51 zile** |

### Timeline: 14-16 săptămâni

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
