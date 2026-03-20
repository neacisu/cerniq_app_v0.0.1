# CERNIQ.APP — ETAPA 1: ARCHITECTURE DECISION RECORDS

## ADR-0033 până la ADR-0052

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 📋 ADR CATALOG

| ADR ID       | Titlu                                    | Status      | Link                                                                                       |
| :----------- | :--------------------------------------- | :---------- | :----------------------------------------------------------------------------------------- |
| **ADR-0033** | Arhitectură Medallion Bronze-Silver-Gold | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0033-Arhitectura-Medallion-Bronze-Silver-Gold.md) |
| **ADR-0034** | Strategie Ingestie Multi-Source          | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0034-Strategie-Ingestie-Multi-Source.md)          |
| **ADR-0035** | Validare CUI cu Modulo-11                | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0035-Validare-CUI-cu-Modulo-11.md)                |
| **ADR-0036** | ANAF API Integration Strategy            | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0036-ANAF-API-Integration-Strategy.md)            |
| **ADR-0037** | Termene.ro API Integration               | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0037-Termenero-API-Integration.md)                |
| **ADR-0038** | Email Discovery Strategy                 | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0038-Email-Discovery-Strategy.md)                 |
| **ADR-0039** | Geocoding Strategy                       | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0039-Geocoding-Strategy.md)                       |
| **ADR-0040** | Deduplicare Strategy                     | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0040-Deduplicare-Strategy.md)                     |
| **ADR-0041** | Quality Scoring Algorithm                | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0041-Quality-Scoring-Algorithm.md)                |
| **ADR-0042** | Pipeline Orchestration                   | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0042-Pipeline-Orchestration.md)                   |
| **ADR-0043** | HITL Integration Etapa 1                 | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0043-HITL-Integration-Etapa-1.md)                 |
| **ADR-0044** | Bronze Layer Immutability                | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0044-Bronze-Layer-Immutability.md)                |
| **ADR-0045** | Multi-Tenant Data Isolation              | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0045-Multi-Tenant-Data-Isolation.md)              |
| **ADR-0046** | Event Sourcing pentru Enrichment         | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0046-Event-Sourcing-pentru-Enrichment.md)         |
| **ADR-0047** | Rate Limiting Architecture               | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0047-Rate-Limiting-Architecture.md)               |
| **ADR-0048** | Web Scraping Strategy                    | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0048-Web-Scraping-Strategy.md)                    |
| **ADR-0049** | AI Structuring Pipeline                  | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0049-AI-Structuring-Pipeline.md)                  |
| **ADR-0050** | Enrichment Priority Queue                | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0050-Enrichment-Priority-Queue.md)                |
| **ADR-0051** | Data Retention Policy                    | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0051-Data-Retention-Policy.md)                    |
| **ADR-0052** | Observability Stack Etapa 1              | ✅ Accepted | [View ADR](../../adr/ADR%20Etapa%201/ADR-0052-Observability-Stack-Etapa-1.md)              |
| **ADR-0053** | Queue Naming Convention                  | ✅ Accepted | Inline - vedere mai jos                                                                    |
| **ADR-0054** | RLS Session Variable Canonică            | ✅ Accepted | Inline - vedere mai jos                                                                    |

---

## ADR-0053: Queue Naming Convention

**Status:** Accepted  
**Data:** 19 Martie 2026

**Context:** Specificația originală folosea un prefix de layer (`bronze:ingest:csv-parser`, `silver:enrich:anaf`) pentru a indica în ce strat al Medallion Architecture operează worker-ul. Implementarea a adoptat un format mai concis fără prefixul layer-ului (`ingest:csv`, `enrich:anaf:fiscal-status`).

**Decizie:** Implementarea folosește convenția `<domeniu>:<subddomeniu>:<specificitate>` fără prefixul layer-ului. Aceasta este convenția canonică pentru codebase. Specificația va fi actualizată pentru a reflecta aceasta.

**Motive:**

- Queue-urile operează pe un singur layer deja (un worker ANAF nu procesează bronzeuri)
- Prefixul layer-ului ar fi redundant și ar face naming-ul mai lung fără beneficii clare
- Consistența cu implementarea existentă (63 queue-uri deja definite)

**Consecințe:** Toate referințele la queue names în documentație vor folosi formatul implementat (ex: `ingest:csv`, nu `bronze:ingest:csv-parser`).

---

## ADR-0054: RLS Session Variable Canonică

**Status:** Accepted  
**Data:** 19 Martie 2026

**Context:** Există un conflict potențial de naming între specificație (care menționa `app.current_tenant`) și implementare (`app.tenant_id`).

**Decizie:** Variabila canonică de sesiune PostgreSQL pentru izolarea tenant-ului este **`app.tenant_id`**. Aceasta este variabila folosită în toate politicile RLS, în `setSessionTenantId()` și în migrațiile SQL.

**Motive:**

- Consistență cu toată implementarea existentă (0005_rls_policies.sql, client.ts etc.)
- Naming clar și descriptiv
- O schimbare ar necesita migrații SQL și modificări în cod pe scară largă fără beneficiu

**Consecințe:** Specificația și orice documentație care referă `app.current_tenant` va fi actualizată pentru a folosi `app.tenant_id`.

---

**Total:** 22 Architecture Decision Records  
**Path:** `docs/adr/ADR Etapa 1/`
