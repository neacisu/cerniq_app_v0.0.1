# CERNIQ.APP — ETAPA 1: INDEX DOCUMENTAȚIE

## Data Enrichment Pipeline - Complete Documentation Set

### Versiunea 2.0 | 15 Ianuarie 2026

---

## 📁 DOCUMENT CATALOG

### 🏗️ ARCHITECTURE & DECISIONS

| # | Document | Description | Status |
| --- | ---------- | ------------- | -------- |
| 1 | `00-INDEX-ETAPA1.md` | Index documentație | ✅ Complete |
| 2 | `etapa1-adrs.md` | 20 Architecture Decision Records | ✅ Complete |
| 3 | `etapa1-plan-implementare-COMPLET.md` | Implementation plan with 126 tasks | ✅ Complete |

### 📊 DATABASE SCHEMAS

| # | Document | Description | Status |
| --- | ---------- | ------------- | -------- |
| 3 | `etapa1-schema-bronze.md` | Bronze layer tables & indexes | ✅ Complete |
| 4 | `etapa1-schema-silver.md` | Silver layer tables (120+ columns) | ✅ Complete |
| 5 | `etapa1-schema-gold.md` | Gold layer + lead management | ✅ Complete |
| 6 | `etapa1-migrations.md` | Complete Drizzle migrations | ✅ Complete |

### ⚙️ WORKERS

| # | Document | Description | Status |
| --- | ---------- | ------------- | -------- |
| 7 | `etapa1-workers-overview.md` | Worker architecture overview | ✅ Complete |
| 8 | `etapa1-workers-A-ingestie.md` | CSV/Excel/API/Webhook/Manual ingest | ✅ Complete |
| 9 | `etapa1-workers-B-C-normalizare-validare.md` | Normalization & CUI validation | ✅ Complete |
| 10 | `etapa1-workers-D-E-anaf-termene.md` | ANAF & Termene.ro enrichment | ✅ Complete |
| 11 | `etapa1-workers-F-H-onrc-email-phone.md` | ONRC, Email, Phone workers | ✅ Complete |
| 12 | `etapa1-workers-I-L-scraping-ai-geo-agri.md` | Scraping, AI, Geo, Agricultural | ✅ Complete |
| 13 | `etapa1-workers-M-P-dedup-score-pipeline.md` | Dedup, Scoring, Pipeline mgmt | ✅ Complete |
| 14 | `etapa1-workers-triggers.md` | Inter-worker trigger rules | ✅ Complete |

### 🖥️ FRONTEND / UI

| # | Document | Description | Status |
| --- | ---------- | ------------- | -------- |
| 15 | `etapa1-ui-components.md` | Base UI components library | ✅ Complete |
| 16 | `etapa1-ui-tables.md` | Data tables with filters | ✅ Complete |
| 17 | `etapa1-ui-pages.md` | All page layouts & routing | ✅ Complete |
| 18 | `etapa1-ui-forms-dialogs.md` | Forms, dialogs, validation | ✅ Complete |
| 19 | `etapa1-ui-charts-navigation.md` | Charts, sidebar, navigation | ✅ Complete |

### 🔌 BACKEND / API

| # | Document | Description | Status |
| --- | ---------- | ------------- | -------- |
| 20 | `etapa1-api-endpoints.md` | All REST API endpoints | ✅ Complete |
| 21 | `etapa1-api-schemas-auth.md` | Zod schemas & JWT auth | ✅ Complete |

### ✅ HITL (Human-in-the-Loop)

| # | Document | Description | Status |
| --- | ---------- | ------------- | -------- |
| 22 | `etapa1-hitl-system.md` | Complete HITL architecture | ✅ Complete |

### 📋 OPERATIONS

| # | Document | Description | Status |
| --- | ---------- | ------------- | -------- |
| 23 | `etapa1-runbook-monitoring.md` | Runbook & monitoring setup | ✅ Complete |
| 24 | `etapa1-testing-strategy.md` | Test pyramid & automation | ✅ Complete |

---

## 📈 STATISTICS

### Document Totals

- **Total Documents:** 25
- **Total Lines:** ~15,000+
- **Workers Documented:** 58
- **API Endpoints:** 35+
- **Database Tables:** 12
- **UI Components:** 50+

### Worker Categories (58 total)

| Category | Count | Queue Prefix |
| --- | --- | --- |
| A: Ingestie | 5 | `bronze:ingest:*` |
| B: Normalizare | 4 | `bronze:normalize:*` |
| C: Validare CUI | 2 | `bronze:validate:*` |
| D: ANAF | 5 | `silver:enrich:anaf-*` |
| E: Termene.ro | 4 | `silver:enrich:termene-*` |
| F: ONRC | 3 | `silver:enrich:onrc-*` |
| G: Email | 5 | `silver:enrich:*-email-*` |
| H: Phone | 3 | `silver:enrich:*-phone-*` |
| I: Scraping | 4 | `silver:enrich:*-scraper` |
| J: AI | 4 | `silver:enrich:ai-*` |
| K: Geocoding | 3 | `silver:enrich:*-geo*` |
| L: Agricultural | 5 | `silver:enrich:*-agri*` |
| M: Dedup | 2 | `silver:dedup:*` |
| N: Scoring | 3 | `silver:score:*` |
| O: Aggregation | 2 | `silver:aggregate:*` |
| P: Pipeline | 4 | `pipeline:*` |

### Pipeline Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ETAPA 1 PIPELINE FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│  │  INPUT  │──▶│ BRONZE  │──▶│ SILVER  │──▶│  GOLD   │        │
│  │  (5)    │   │  (11)   │   │  (32)   │   │  (4)    │        │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘        │
│      │              │             │              │              │
│   Ingest      Normalize     Enrich         Promote           │
│   Validate    Dedupe        Score          Lead Mgmt         │
│               Promote                                         │
│                                                                 │
│                         HITL                                    │
│                    ┌─────────┐                                 │
│                    │ REVIEW  │◀── Dedup, Quality, AI          │
│                    │ APPROVE │                                 │
│                    └─────────┘                                 │
│                    └─────────────────────────────────────────────────────────────────┘
```

### Quality Scoring Formula

```text
totalQualityScore = (completeness × 0.40) + (accuracy × 0.35) + (freshness × 0.25)
```

- **≥70:** Auto-promote to Gold
- **40-70:** HITL review required
- **<40:** Blocked from promotion

---

## 🔗 CROSS-REFERENCES

### Related Etapa 0 Documents

- `etapa0-plan-implementare-COMPLET-v2.md` - Infrastructure setup
- `etapa0-docker-compose-complete.yaml` - Docker configuration
- `etapa0-environment-variables.md` - Environment config

### Master Documents

- `__Cerniq_Master_Spec_Normativ_Complet.md` - Source of truth
- `Cerniq_App_Architecture_arc42_Vertical_Slice.md` - Architecture
- `Unified_HITL_Approval_System_for_B2B_Sales_Automation.md` - HITL spec

---

## 🚀 QUICK START

1. **Read First:**
    - `etapa1-adrs.md` - Understand decisions
    - `etapa1-workers-overview.md` - Pipeline concept

2. **Implement Database:**
    - `etapa1-migrations.md` - Run migrations
    - `etapa1-schema-*.md` - Reference schemas

3. **Build Workers:**
    - Start with `etapa1-workers-A-ingestie.md`
    - Follow trigger rules in `etapa1-workers-triggers.md`

4. **Build API:**
    - `etapa1-api-endpoints.md` - Endpoints spec
    - `etapa1-api-schemas-auth.md` - Validation & auth

5. **Build UI:**
    - `etapa1-ui-components.md` - Component library
    - `etapa1-ui-pages.md` - Page layouts

6. **Setup HITL:**
    - `etapa1-hitl-system.md` - Full HITL setup

7. **Operations:**
    - `etapa1-runbook-monitoring.md` - Troubleshooting
    - `etapa1-testing-strategy.md` - Test setup

---

**Document generat:** 15 Ianuarie 2026
**Actualizare:** Index complet cu toate documentele
**Conformitate:** Master Spec v1.2
