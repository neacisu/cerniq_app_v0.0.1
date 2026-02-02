# CERNIQ.APP — ETAPA 3: INDEX DOCUMENTAȚIE

## AI Sales Agent Neuro-Simbolic - Documentație Completă

### Versiunea 3.0 | 01 Februarie 2026

---

## SUMAR ETAPA 3

**Scop:** Agent AI autonom pentru negociere comercială și emitere documente fiscale  
**Paradigmă:** Neuro-Simbolic (Zero Hallucination) cu Guardrails și HITL  
**Canale:** WhatsApp (TimelinesAI), Email Warm (Resend)  
**Integrări:** Oblio.eu (facturare), ANAF SPV (e-Factura), PostgreSQL + pgvector (RAG)  
**LLM Provider:** xAI Grok-4 (primary), OpenAI GPT-4o (fallback)  

---

## STATISTICI DOCUMENTAȚIE

```yaml
total_documents: 40
total_lines: ~185,000+
total_tasks: 214

sprint_plan:
  total_sprints: 12
  total_prs: 48
  numbering_format: "E3.S{sprint}.PR{pr}.{task}"
  plan_document: "etapa3-sprint-plan.md"

documentation_categories:
  architecture_decisions: 2
  database_schemas: 4
  workers: 16
  api_backend: 3
  frontend_uiux: 5
  operations: 4
  testing: 1
  implementation_plan: 2
  standards: 3
```

---

## CATALOG DOCUMENTE COMPLETE (39 DOCUMENTE)

### 1. ARCHITECTURE & DECISIONS

| #   | Document             | Descriere                        | Linii  | Status  |
| --- | -------------------- | -------------------------------- | ------ | ------- |
| 1   | `00-INDEX-ETAPA3.md` | Index și statistici              | ~500   | ✅      |
| 2   | `etapa3-adrs.md`     | 20 Architecture Decision Records | ~1,000 | ✅      |

### 2. DATABASE SCHEMAS

| #   | Document                        | Descriere                           | Linii  | Status  |
| --- | ------------------------------- | ----------------------------------- | ------ | ------- |
| 3   | `etapa3-schema-products.md`     | Schema produse, catalog, embeddings | ~900   | ✅      |
| 4   | `etapa3-schema-negotiations.md` | Schema negocieri, FSM states        | ~900   | ✅      |
| 5   | `etapa3-schema-fiscal.md`       | Schema fiscală Oblio, e-Factura     | ~1,800 | ✅      |
| 6   | `etapa3-migrations.md`          | Drizzle migrations complete         | ~1,800 | ✅      |

### 3. WORKERS DOCUMENTATION (14 Worker Files)

| #   | Document                                  | Workers          | Linii   | Status  |
| --- | ----------------------------------------- | ---------------- | ------- | ------- |
| 7   | `etapa3-workers-overview.md`              | Architecture     | ~1,300  | ✅      |
| 8   | `etapa3-workers-triggers.md`              | Trigger Patterns | ~3,300  | ✅      |
| 9   | `etapa3-workers-A-product-knowledge.md`   | #1-6             | ~2,200  | ✅      |
| 10  | `etapa3-workers-B-hybrid-search.md`       | #7-12            | ~1,500  | ✅      |
| 11  | `etapa3-workers-C-ai-agent-core.md`       | #13-18           | ~1,500  | ✅      |
| 12  | `etapa3-workers-D-negotiation-fsm.md`     | #19-26           | ~2,000  | ✅      |
| 13  | `etapa3-workers-E-pricing-discount.md`    | #27-32           | ~1,400  | ✅      |
| 14  | `etapa3-workers-F-stock-inventory.md`     | #33-38           | ~1,800  | ✅      |
| 15  | `etapa3-workers-G-oblio-integration.md`   | #39-45           | ~3,000  | ✅      |
| 16  | `etapa3-workers-H-efactura-spv.md`        | #46-50           | ~5,000  | ✅      |
| 17  | `etapa3-workers-I-document-generation.md` | #51-55           | ~5,000  | ✅      |
| 18  | `etapa3-workers-J-handover-channel.md`    | #56-60           | ~10,000 | ✅      |
| 19  | `etapa3-workers-K-sentiment-intent.md`    | #61-65           | ~18,000 | ✅      |
| 20  | `etapa3-workers-L-mcp-server.md`          | #66-70           | ~20,000 | ✅      |
| 21  | `etapa3-workers-M-guardrails.md`          | #71-75           | ~22,000 | ✅      |
| 22  | `etapa3-workers-N-human-intervention.md`  | #76-78           | ~13,000 | ✅      |

### 4. API & BACKEND

| #   | Document                        | Descriere                     | Linii   | Status  |
| --- | ------------------------------- | ----------------------------- | ------- | ------- |
| 23  | `etapa3-api-endpoints.md`       | Documentație API completă     | ~5,400  | ✅      |
| 24  | `etapa3-hitl-system.md`         | Sistem HITL complet           | ~16,000 | ✅      |
| 25  | `../../api/openapi-etapa3.yaml` | OpenAPI 3.1 Spec (60+ paths)  | ~3,200  | ✅      |

### 5. SPRINT PLAN & IMPLEMENTATION

| #   | Document                      | Descriere                         | Linii  | Status  |
| --- | ----------------------------- | --------------------------------- | ------ | ------- |
| 39  | `etapa3-sprint-plan.md`       | 12 Sprints, 48 PRs, 214 Tasks     | ~1,200 | ✅      |
| 40  | `etapa3-plan-implementare.md` | Plan original 99 task-uri (legacy)| ~2,000 | ✅      |

### 6. FRONTEND UI/UX

| #   | Document                         | Descriere                      | Linii   | Status  |
| --- | -------------------------------- | ------------------------------ | ------- | ------- |
| 26  | `etapa3-ui-pages.md`             | Pagini principale React        | ~13,000 | ✅      |
| 27  | `etapa3-ui-components.md`        | Componente React reutilizabile | ~8,000  | ✅      |
| 28  | `etapa3-ui-forms-dialogs.md`     | Formulare și dialoguri         | ~27,000 | ✅      |
| 29  | `etapa3-ui-tables.md`            | DataTables și liste            | ~10,000 | ✅      |
| 30  | `etapa3-ui-charts-navigation.md` | Grafice și navigație           | ~1,500  | ✅      |

### 7. STANDARDS & PROCEDURES

| #   | Document                         | Descriere                  | Linii  | Status  |
| --- | -------------------------------- | -------------------------- | ------ | ------- |
| 31  | `etapa3-standards.md`            | Standarde tehnice complete | ~4,000 | ✅      |
| 32  | `etapa3-standards-procedures.md` | Proceduri operaționale     | ~1,200 | ✅      |
| 33  | `etapa3-environment-variables.md`| Environment variables      | ~200   | ✅      |

### 8. OPERATIONS & MONITORING

| #   | Document                             | Descriere                   | Linii  | Status  |
| --- | ------------------------------------ | --------------------------- | ------ | ------- |
| 34  | `etapa3-monitoring-observability.md` | SigNoz, Prometheus, Grafana | ~8,700 | ✅      |
| 35  | `etapa3-runbook-operational.md`      | Runbook operațional         | ~2,400 | ✅      |
| 36  | `etapa3-runbook-monitoring.md`       | Runbook monitoring          | ~1,200 | ✅      |

### 9. TESTING

| #   | Document                     | Descriere              | Linii  | Status  |
| --- | ---------------------------- | ---------------------- | ------ | ------- |
| 37  | `etapa3-testing-strategy.md` | Vitest, Playwright, k6 | ~1,200 | ✅      |

### 10. IMPLEMENTATION PLAN & SPRINT PLAN

| #   | Document                      | Descriere                         | Linii  | Status  |
| --- | ----------------------------- | --------------------------------- | ------ | ------- |
| 38  | `etapa3-plan-implementare.md` | Plan original 99 task-uri (legacy)| ~2,000 | ✅      |
| 39  | `etapa3-sprint-plan.md`       | 12 Sprints, 48 PRs, 214 Tasks     | ~1,200 | ✅      |

---

## SUMAR TASK-URI (214 TOTAL)

```yaml
# Plan detaliat în: etapa3-sprint-plan.md
# Format numerotare: E3.S{sprint}.PR{pr}.{task}

tasks_by_phase:
  Phase_1_Foundation:
    F3.1_Database_Schema: 6         # E3.S1.PR1-2
    F3.2_Product_Knowledge: 12      # E3.S1.PR3-4
    F3.3_Hybrid_Search_RAG: 12      # E3.S2.PR5-6
    subtotal: 30
    
  Phase_2_AI_Core:
    F3.4_AI_Orchestration: 16       # E3.S3.PR9-12
    F3.5_Negotiation_FSM: 20        # E3.S4.PR13-16
    subtotal: 36
    
  Phase_3_Business_Logic:
    F3.6_Pricing_Discount: 16       # E3.S5.PR17-20
    F3.7_Stock_Inventory: 12        # E3.S5.PR21-22
    F3.8_Oblio_Integration: 12      # E3.S6.PR23-24
    F3.9_eFacura_SPV: 8             # E3.S6.PR25-26
    F3.10_Document_Generation: 12   # E3.S7.PR27-28
    subtotal: 60
    
  Phase_4_Safety_Channels:
    F3.11_Handover_Channel: 12      # E3.S7.PR29-30
    F3.12_Intent_Detection: 8       # E3.S8.PR31-32
    F3.13_MCP_Server: 8             # E3.S8.PR33-34
    F3.14_Guardrails: 12            # E3.S9.PR35-36
    F3.15_HITL_System: 12           # E3.S9.PR37-38
    subtotal: 52
    
  Phase_5_Frontend:
    F3.16_Frontend_UIUX: 20         # E3.S10.PR39-42
    subtotal: 20
    
  Phase_6_Quality:
    F3.17_Testing_QA: 8             # E3.S11.PR43-44
    F3.18_Integration_Deployment: 8 # E3.S12.PR45-48
    subtotal: 16

sprint_summary:
  E3.S1: 18 tasks (4 PRs)
  E3.S2: 12 tasks (2 PRs + 2 optional)
  E3.S3: 16 tasks (4 PRs)
  E3.S4: 20 tasks (4 PRs)
  E3.S5: 28 tasks (6 PRs)
  E3.S6: 20 tasks (4 PRs)
  E3.S7: 24 tasks (4 PRs)
  E3.S8: 16 tasks (4 PRs)
  E3.S9: 24 tasks (4 PRs)
  E3.S10: 20 tasks (4 PRs)
  E3.S11: 8 tasks (2 PRs)
  E3.S12: 8 tasks (4 PRs)

total_tasks: 214
total_prs: 48
total_sprints: 12
```

---

## LEGACY TASK MAPPING (99 → 214)

```yaml
# Mapare originală pentru referință istorică
legacy_mapping:
  F3.1_Database_Schema: "1 → 6 tasks"
  F3.2_Product_Knowledge: "6 → 12 tasks"
  F3.3_Hybrid_Search_RAG: "5 → 12 tasks"
  F3.4_AI_Orchestration: "5 → 16 tasks"
  F3.5_Negotiation_FSM: "7 → 20 tasks"
  F3.6_Pricing_Discount: "5 → 16 tasks"
  F3.7_Stock_Inventory: "3 → 12 tasks"
  F3.8_Oblio_Integration: "3 → 12 tasks"
  F3.9_eFacura_SPV: "3 → 8 tasks"
  F3.10_Document_Generation: "4 → 12 tasks"
  F3.11_Handover_Channel: "4 → 12 tasks"
  F3.12_Intent_Detection: "2 → 8 tasks"
  F3.13_MCP_Server: "2 → 8 tasks"
  F3.14_Guardrails: "3 → 12 tasks"
  F3.15_HITL_System: "3 → 12 tasks"
  F3.16_Frontend_UIUX: "20 → 20 tasks"
  F3.17_Testing_QA: "6 → 8 tasks"
  F3.18_Integration_Deployment: "8 → 8 tasks"
  
expansion_reason: "Granularitate crescută pentru PR-uri incrementale de ~200-400 LOC"
```

---

## WORKFLOW PRINCIPAL

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ETAPA 3 - AI SALES AGENT                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Contact Message                                                │
│        │                                                        │
│        ▼                                                        │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ API Gateway │───►│   BullMQ     │───►│ AI Orchestr. │       │
│  └─────────────┘    │    Queue     │    │   Worker     │       │
│                     └──────────────┘    └──────┬───────┘       │
│                                                │               │
│                                    ┌───────────┼───────────┐   │
│                                    │           │           │   │
│                                    ▼           ▼           ▼   │
│                              ┌─────────┐ ┌─────────┐ ┌─────────┐│
│                              │RAG/MCP  │ │ LLM API │ │FSM State││
│                              │ Tools   │ │ OpenAI  │ │ Machine ││
│                              └─────────┘ └─────────┘ └─────────┘│
│                                    │           │           │   │
│                                    └───────────┼───────────┘   │
│                                                │               │
│                                                ▼               │
│                                    ┌───────────────────┐       │
│                                    │   GUARDRAILS      │       │
│                                    │  (Anti-Halluc.)   │       │
│                                    └─────────┬─────────┘       │
│                                              │                 │
│                                    ┌─────────┴─────────┐       │
│                                    │                   │       │
│                                 [PASS]            [FAIL]       │
│                                    │                   │       │
│                                    ▼                   ▼       │
│                              Send Response    ┌───────────────┐│
│                              Update FSM       │  HITL System  ││
│                                              │   (Manual)    ││
│                                              └───────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## DEPENDENȚE TEHNOLOGICE

```yaml
runtime:
  node: "24.12.0 LTS"
  typescript: "5.7.x"
  
framework:
  fastify: "5.6.2"
  react: "19.x"
  bullmq: "5.x"
  drizzle: "0.39.x"
  
database:
  postgresql: "18.1"
  redis: "8.4.0"
  qdrant: "1.12.x"
  
monitoring:
  signoz: "latest"
  prometheus: "2.x"
  grafana: "11.x"
  
testing:
  vitest: "3.x"
  playwright: "1.49.x"
  k6: "0.55.x"

ai:
  openai: "gpt-4o, gpt-4o-mini"
  embeddings: "text-embedding-3-large"
```

---

## INTEGRĂRI ETAPE ANTERIOARE

```yaml
etapa1_integration:
  purpose: "Data enrichment pipeline"
  tables:
    - contacts_bronze
    - contacts_silver  
    - contacts_gold
    - company_data
  services:
    - Scoring algorithms
    - Deduplication
    - ANAF enrichment

etapa2_integration:
  purpose: "Cold outreach infrastructure"
  tables:
    - outreach_campaigns
    - outreach_messages
    - channel_configs
  services:
    - Channel orchestration
    - Template rendering
    - A/B testing
```

---

## METRICI DE SUCCES

| KPI                  | Target  | Măsurare   |
| -------------------- | ------- | ---------- |
| AI Response Time     | <8s p95 | Prometheus |
| Guardrail Pass Rate  | >95%    | Weekly     |
| HITL Escalation Rate | <10%    | Weekly     |
| Hallucination Rate   | <0.5%   | Sampled    |
| Conversion Rate      | >15%    | Monthly    |
| System Uptime        | 99.9%   | Monthly    |

---

## CHANGELOG

| Versiune | Data       | Modificări                                       |
| -------- | ---------- | ------------------------------------------------ |
| 3.0      | 2026-02-01 | Sprint plan 214 tasks, OpenAPI complet, aliniere |
| 2.0      | 2026-01-19 | Documentație completă - toate cele 37 documente  |
| 1.0      | 2026-01-18 | Versiune inițială                                |

---

**Document generat**: 2026-02-01  
**Proiect**: Cerniq App - Etapa 3 AI Sales Agent  
**Status**: COMPLET ✅  
**Total linii documentație**: ~185,000+  
**Total task-uri**: 214 (în 48 PRs, 12 Sprints)

---

*Acest index face parte din documentația completă a platformei Cerniq App pentru automatizarea vânzărilor B2B în sectorul agricol din România.*
