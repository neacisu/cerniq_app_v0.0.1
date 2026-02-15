# CERNIQ.APP — ETAPA 4: INDEX DOCUMENTAȚIE

## Monitorizare Post-Vânzare - Ghid Documentație

### Versiunea 1.1 | 2 Februarie 2026

---

## METADATA DOCUMENT

| Câmp                   | Valoare                                               |
| ---------------------- | ----------------------------------------------------- |
| **Etapă**              | E4 - Monitorizare Post-Vânzare (Payments & Logistics) |
| **Versiune**           | 1.1                                                   |
| **Data creării**       | 19 Ianuarie 2026                                      |
| **Ultima actualizare** | 2 Februarie 2026                                      |
| **Status**             | ✅ COMPLET - Audit Realizat                           |
| **Task Range**         | 301-399                                               |
| **Total Taskuri**      | 99                                                    |
| **Total Sprinturi**    | 7                                                     |
| **Total PR-uri**       | 42                                                    |
| **ADRs**               | ADR-0088 → ADR-0097 (10 total)                        |

---

## 📋 DOCUMENTAȚIE COMPLETĂ ETAPA 4

### 📅 Plan Execuție (Sprint Plan) ⭐ NEW

| Document                                                                     | Descriere                              | Status |
| ---------------------------------------------------------------------------- | -------------------------------------- | ------ |
| **[`etapa4-sprint-plan.md`](etapa4-sprint-plan.md)**                         | Plan sprint 7×2 săptămâni cu 42 PR-uri | ✅     |
| [`etapa4-plan-implementare-COMPLET.md`](etapa4-plan-implementare-COMPLET.md) | Plan detaliat cu JSON definitions      | ✅     |

### 📊 Schema Database (5 documente)

| Document                                                   | Descriere                                      | Linii | Status |
| ---------------------------------------------------------- | ---------------------------------------------- | ----- | ------ |
| [`etapa4-schema-orders.md`](etapa4-schema-orders.md)       | Tabele orders, items, payments, refunds        | ~500  | ✅     |
| [`etapa4-schema-credit.md`](etapa4-schema-credit.md)       | Tabele credit profiles, scores, reservations   | ~465  | ✅     |
| [`etapa4-schema-logistics.md`](etapa4-schema-logistics.md) | Tabele shipments, tracking, returns, addresses | ~505  | ✅     |
| [`etapa4-schema-contracts.md`](etapa4-schema-contracts.md) | Tabele contracts, templates, signatures        | ~445  | ✅     |
| [`etapa4-migrations.md`](etapa4-migrations.md)             | Drizzle migrations complete                    | ~935  | ✅     |

### 📁 General (3 documente)

| Document                                                                   | Descriere                         | Status |
| -------------------------------------------------------------------------- | --------------------------------- | ------ |
| `00-INDEX-ETAPA4.md`                                                       | Index documentație (acest fișier) | ✅     |
| [`etapa4-monitoring-observability.md`](etapa4-monitoring-observability.md) | Monitoring & Observability        | ✅     |
| [`etapa4-environment-variables.md`](etapa4-environment-variables.md)       | Environment variables             | ✅     |

### ⚙️ Workers (13 documente, 67 Workers Total)

| Document                                                                   | Descriere                            | Workers | Status |
| -------------------------------------------------------------------------- | ------------------------------------ | ------- | ------ |
| [`etapa4-workers-overview.md`](etapa4-workers-overview.md)                 | Arhitectură și inventar complet      | 67      | ✅     |
| [`etapa4-workers-A-revolut.md`](etapa4-workers-A-revolut.md)               | Revolut webhook workers (ADR-0088)   | 6       | ✅     |
| [`etapa4-workers-B-reconciliation.md`](etapa4-workers-B-reconciliation.md) | Payment reconciliation (ADR-0089)    | 6       | ✅     |
| [`etapa4-workers-C-credit-scoring.md`](etapa4-workers-C-credit-scoring.md) | Credit scoring Termene.ro (ADR-0090) | 6       | ✅     |
| [`etapa4-workers-D-credit-limits.md`](etapa4-workers-D-credit-limits.md)   | Credit limit management              | 3       | ✅     |
| [`etapa4-workers-E-sameday.md`](etapa4-workers-E-sameday.md)               | Sameday logistics (ADR-0092)         | 6       | ✅     |
| [`etapa4-workers-F-stock-sync.md`](etapa4-workers-F-stock-sync.md)         | Oblio stock sync (ADR-0097)          | 4       | ✅     |
| [`etapa4-workers-G-contracts.md`](etapa4-workers-G-contracts.md)           | Dynamic contracts (ADR-0091)         | 5       | ✅     |
| [`etapa4-workers-H-returns.md`](etapa4-workers-H-returns.md)               | Returns & RMA                        | 2       | ✅     |
| [`etapa4-workers-I-alerts.md`](etapa4-workers-I-alerts.md)                 | Alert notifications                  | 6       | ✅     |
| [`etapa4-workers-J-audit.md`](etapa4-workers-J-audit.md)                   | Audit & compliance (ADR-0095)        | 3       | ✅     |
| [`etapa4-workers-K-hitl.md`](etapa4-workers-K-hitl.md)                     | HITL approval workers (ADR-0094)     | 6       | ✅     |
| [`etapa4-workers-triggers.md`](etapa4-workers-triggers.md)                 | Trigger patterns și flows            | -       | ✅     |

### 🖥️ UI/UX (5 documente)

| Document                                                           | Descriere                              | Status |
| ------------------------------------------------------------------ | -------------------------------------- | ------ |
| [`etapa4-ui-pages.md`](etapa4-ui-pages.md)                         | Page specifications (12 pages)         | ✅     |
| [`etapa4-ui-components.md`](etapa4-ui-components.md)               | Reusable components                    | ✅     |
| [`etapa4-ui-forms-dialogs.md`](etapa4-ui-forms-dialogs.md)         | Forms și dialogs                       | ✅     |
| [`etapa4-ui-tables.md`](etapa4-ui-tables.md)                       | DataTable configurations               | ✅     |
| [`etapa4-ui-charts-dashboards.md`](etapa4-ui-charts-dashboards.md) | Charts și dashboard layouts (ADR-0096) | ✅     |

### 🔌 API & Backend (3 documente)

| Document                                                         | Descriere                              | Status |
| ---------------------------------------------------------------- | -------------------------------------- | ------ |
| [`etapa4-api-endpoints.md`](etapa4-api-endpoints.md)             | REST API specification (40+ endpoints) | ✅     |
| [`etapa4-hitl-system.md`](etapa4-hitl-system.md)                 | HITL approval system (ADR-0094)        | ✅     |
| [`../../api/openapi-etapa4.yaml`](../../api/openapi-etapa4.yaml) | OpenAPI 3.1.0 Specification            | ✅     |

### 📋 Standards & Procedures (5 documente)

| Document                                                           | Descriere                             | Status |
| ------------------------------------------------------------------ | ------------------------------------- | ------ |
| [`etapa4-standards.md`](etapa4-standards.md)                       | Operational standards                 | ✅     |
| [`etapa4-testing-strategy.md`](etapa4-testing-strategy.md)         | Testing pyramid și coverage           | ✅     |
| [`etapa4-adrs.md`](etapa4-adrs.md)                                 | Architecture Decision Records summary | ✅     |
| [`etapa4-runbook-operational.md`](etapa4-runbook-operational.md)   | Runbook operațional                   | ✅     |
| [`etapa4-standards-procedures.md`](etapa4-standards-procedures.md) | Procedures (Legacy)                   | ⚠️     |

---

## 📊 METRICI TOTALE

| Metrică                  | Valoare                  |
| ------------------------ | ------------------------ |
| **Documente**            | 37                       |
| **Linii Documentație**   | ~15,000+                 |
| **Workers Definiți**     | 67                       |
| **Tabele Database**      | 15+                      |
| **API Endpoints**        | 40+                      |
| **UI Pages**             | 12                       |
| **ADRs**                 | 10 (ADR-0088 → ADR-0097) |
| **Taskuri Implementare** | 99 (301-399)             |
| **Sprinturi**            | 7 × 2 săptămâni          |
| **PR-uri**               | 42                       |
| **Story Points**         | 340                      |

---

## 🔗 ADR TRACEABILITY

| ADR      | Titlu                       | Sprint | Documente Afectate                                              |
| -------- | --------------------------- | ------ | --------------------------------------------------------------- |
| ADR-0088 | Revolut Business API        | E4.S2  | `etapa4-workers-A-revolut.md`, `etapa4-api-endpoints.md`        |
| ADR-0089 | Three-Tier Reconciliation   | E4.S2  | `etapa4-workers-B-reconciliation.md`                            |
| ADR-0090 | Credit Scoring Termene.ro   | E4.S3  | `etapa4-workers-C-credit-scoring.md`, `etapa4-schema-credit.md` |
| ADR-0091 | Dynamic Contract Generation | E4.S4  | `etapa4-workers-G-contracts.md`, `etapa4-schema-contracts.md`   |
| ADR-0092 | Sameday Courier             | E4.S3  | `etapa4-workers-E-sameday.md`, `etapa4-schema-logistics.md`     |
| ADR-0093 | Order Lifecycle FSM         | E4.S1  | `etapa4-schema-orders.md`                                       |
| ADR-0094 | HITL Approval System        | E4.S5  | `etapa4-workers-K-hitl.md`, `etapa4-hitl-system.md`             |
| ADR-0095 | Partitioned Audit Tables    | E4.S1  | `etapa4-workers-J-audit.md`, `etapa4-migrations.md`             |
| ADR-0096 | WebSocket Dashboard         | E4.S6  | `etapa4-ui-charts-dashboards.md`                                |
| ADR-0097 | Oblio Stock Sync            | E4.S3  | `etapa4-workers-F-stock-sync.md`                                |

---

## 📦 DEPENDENȚE

Etapa 4 depinde de:

| Etapă       | Descriere                                     | Status      |
| ----------- | --------------------------------------------- | ----------- |
| **Etapa 0** | Infrastructure (Docker, PostgreSQL, Redis)    | ✅ Required |
| **Etapa 1** | Data Enrichment (Bronze/Silver/Gold schema)   | ✅ Required |
| **Etapa 2** | Cold Outreach (Communication infrastructure)  | ✅ Required |
| **Etapa 3** | AI Sales Agent (Negotiation → Order creation) | ✅ Required |

---

## 📚 CROSS-REFERENCES

### Documente Globale Relevante

| Document               | Path                                                           | Descriere               |
| ---------------------- | -------------------------------------------------------------- | ----------------------- |
| ADR Index              | [`../../adr/ADR-INDEX.md`](../../adr/ADR-INDEX.md)             | Index centralizat ADRs  |
| Master Specification   | [`../master-specification.md`](../master-specification.md)     | Spec canonical          |
| Worker Queue Inventory | [`../worker-queue-inventory.md`](../worker-queue-inventory.md) | Inventar global queues  |
| Schema Database        | [`../schema-database.md`](../schema-database.md)               | Schema globală          |
| HITL Unified System    | [`../hitl-unified-system.md`](../hitl-unified-system.md)       | Sistem HITL transversal |

### Diagrame

| Diagram               | Path                                                                                       | Status   |
| --------------------- | ------------------------------------------------------------------------------------------ | -------- |
| C4 Components Etapa 4 | [`../../diagrams/c4-components-etapa4.drawio`](../../diagrams/c4-components-etapa4.drawio) | 🟡 Draft |

---

## ⚠️ NOTE IMPORTANTE

### Tabel Deprecat

> **`gold_hitl_tasks`** este **DEPRECATED**. Utilizați **`approval_tasks`** (sistem HITL unificat transversal).
> Vezi [`../hitl-unified-system.md`](../hitl-unified-system.md) pentru detalii.

### Convenție Numerotare

Task-urile folosesc schema standardizată: `E4.S{sprint}.PR{pr}.{task}`

- Exemplu: `E4.S2.PR1.001` = Etapa 4, Sprint 2, PR 1, Task 1
- Legacy IDs (E4-INF-001, E4-REV-001, etc.) sunt mappate în [`etapa4-sprint-plan.md`](etapa4-sprint-plan.md)

---

**Document generat**: 19 Ianuarie 2026  
**Ultima actualizare**: 2 Februarie 2026  
**Status**: ✅ COMPLET - AUDIT REALIZAT
