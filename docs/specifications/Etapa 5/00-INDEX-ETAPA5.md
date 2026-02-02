# CERNIQ.APP — ETAPA 5: INDEX DOCUMENTAȚIE

## Nurturing Agentic — Table of Contents

### Versiunea 1.1 | 2 Februarie 2026

---

## 📋 REZUMAT DOCUMENTAȚIE

| Categorie         | Documente | Linii Total |
|-------------------|-----------|-------------|
| Schema Database   | 5         | ~2,500      |
| Workers           | 5         | ~3,000      |
| UI/UX             | 5         | ~2,500      |
| API               | 2         | ~1,800      |
| Plan Implementare | 3         | ~2,800      |
| Standards & ADRs  | 2         | ~350        |
| Operations        | 7         | ~2,000      |
| **TOTAL**         | **30**    | **~15,000** |

---

## 📁 STRUCTURA DOCUMENTE

### 1. Database Schema

| # | Document                               | Descriere                                   |
|---|----------------------------------------|---------------------------------------------|
| 1 | `etapa5-schema-nurturing.md`           | Tabele state machine, actions, lifecycle    |
| 2 | `etapa5-schema-churn.md`               | Tabele churn signals, factors, sentiment    |
| 3 | `etapa5-schema-referrals.md`           | Tabele referrals, relationships, proximity  |
| 4 | `etapa5-schema-clusters.md`            | Tabele clusters, affiliations, associations |
| 5 | `etapa5-schema-kol-winback-feedback.md`| KOL, WinBack, NPS, Content, Weather         |

### 0. General

| # | Document             | Descriere          |
|---|----------------------|--------------------|
| 0 | `00-INDEX-ETAPA5.md` | Index documentație |

### 2. Workers

| #  | Document                     | Descriere                                |
|----|------------------------------|------------------------------------------|
| 6  | `etapa5-workers-overview.md` | Overview 58 workers, queues, rate limits |
| 7  | `etapa5-workers-A-B.md`      | State Machine (A1-A8) și Churn (B9-B14)  |
| 8  | `etapa5-workers-C-D.md`      | Geospatial (C15-C19) și Graph (D20-D24)  |
| 9  | `etapa5-workers-E-K.md`      | Referral, WinBack, Association, Feedback |
| 10 | `etapa5-workers-triggers.md` | Trigger flows între workeri              |

### 3. UI/UX

| #  | Document                         | Descriere                           |
|----|----------------------------------|-------------------------------------|
| 11 | `etapa5-ui-pages.md`             | Specificații pagini (8 pagini)      |
| 12 | `etapa5-ui-components.md`        | Componente reusable, badges, cards  |
| 13 | `etapa5-ui-tables.md`            | DataTable specifications (5 tabele) |
| 14 | `etapa5-ui-forms-dialogs.md`     | Formulare și dialoguri (6 forms)    |
| 15 | `etapa5-ui-charts-navigation.md` | Charts, grafice, navigație          |

### 4. API

| #  | Document                  | Descriere                               |
|----|---------------------------|-----------------------------------------|
| 16 | `etapa5-api-endpoints.md` | REST API complet (10 grupuri endpoints) |
| 17 | `../../api/openapi-etapa5.yaml` | OpenAPI Etapa 5                   |

### 5. Plan Implementare

| #  | Document                              | Descriere                           |
|----|---------------------------------------|-------------------------------------|
| 18 | `etapa5-plan-implementare-COMPLET.md` | Tasks 400-443 cu JSON structure     |
| 19 | `etapa5-plan-implementare-EXTINS.md`  | Tasks 444-498 (Graph, Referral, UI) |
| 20 | `etapa5-sprint-plan.md`               | **Sprint Plan: 7 sprinturi, 42 PRs** |

### 6. Standards & ADRs

| #  | Document              | Descriere                           |
|----|-----------------------|-------------------------------------|
| 21 | `etapa5-adrs.md`      | 10 Architecture Decision Records    |
| 22 | `etapa5-standards.md` | Operational standards și procedures |

### 7. Operations

| #  | Document                             | Descriere                          |
|----|--------------------------------------|------------------------------------|
| 23 | `etapa5-hitl-system.md`              | HITL unified system pentru Etapa 5 |
| 24 | `etapa5-runbook-operational.md`      | Runbook operațional                |
| 25 | `etapa5-migrations.md`               | Database migrations                |
| 26 | `etapa5-testing-strategy.md`         | Testing strategy completă          |
| 27 | `etapa5-monitoring-observability.md` | Monitoring și observability        |
| 28 | `etapa5-environment-variables.md`    | Environment configuration          |
| 29 | `etapa5-backup-procedures.md`        | Backup și disaster recovery        |

### 8. Diagrams

| #  | Document                             | Descriere                          |
|----|--------------------------------------|------------------------------------|
| 30 | `../../diagrams/c4-components-etapa5.drawio` | C4 Component Diagram (58 workers) |

---

## 🔢 TASK NUMBERING

| Fază                | Range Taskuri | Total  |
|---------------------|---------------|--------|
| 5.1 Infrastructure  | 400-407       | 8      |
| 5.2 Database Schema | 408-419       | 12     |
| 5.3 State Machine   | 420-427       | 8      |
| 5.4 Churn Detection | 428-435       | 8      |
| 5.5 Geospatial      | 436-443       | 8      |
| 5.6 Graph Analysis  | 444-451       | 8      |
| 5.7 Referral System | 452-461       | 10     |
| 5.8 Win-Back        | 462-469       | 8      |
| 5.9 Associations    | 470-477       | 8      |
| 5.10 Feedback       | 478-487       | 10     |
| 5.11 UI             | 488-495       | 8      |
| 5.12 Deploy         | 496-498       | 3      |
| **TOTAL**           | **400-498**   | **99** |

---

## 🏗️ WORKERS SUMMARY

| Categorie          | Workers | Queue                        |
|--------------------|---------|------------------------------|
| A: State Machine   | 8       | lifecycle, onboarding, state |
| B: Churn Detection | 6       | churn, sentiment, decay      |
| C: Geospatial      | 5       | geospatial                   |
| D: Graph Analysis  | 5       | graph                        |
| E: Referral        | 7       | referral                     |
| F: Win-Back        | 5       | winback                      |
| G: Associations    | 6       | association                  |
| H: Feedback        | 5       | feedback                     |
| I: Content         | 4       | content                      |
| J: Alerts          | 4       | alerts                       |
| K: Compliance      | 3       | compliance                   |
| **TOTAL**          | **58**  | **12 queues**                |

---

## 📊 DATABASE TABLES

| Schema    | Tabele | Funcție                                       |
|-----------|--------|-----------------------------------------------|
| Nurturing | 3      | State machine, actions, lifecycle             |
| Churn     | 3      | Signals, factors, sentiment                   |
| Referral  | 3      | Referrals, relationships, proximity           |
| Cluster   | 4      | Clusters, members, associations, affiliations |
| KOL       | 1      | KOL profiles                                  |
| Win-Back  | 2      | Campaigns, steps                              |
| Feedback  | 4      | NPS, content drips, competitor intel          |
| Weather   | 1      | Weather alerts                                |
| **TOTAL** | **21** |                                               |

---

## 🎯 TIMELINE

- **Durată estimată**: 14 săptămâni (7 sprinturi × 2 săptămâni)
- **Ore totale**: ~390 ore
- **Echipă**: 1-person team (vertical slice)
- **Total PRs**: 42
- **Sprint Plan**: [etapa5-sprint-plan.md](etapa5-sprint-plan.md)

---

**Document generat**: 2 Februarie 2026  
**Status**: COMPLET ✅
