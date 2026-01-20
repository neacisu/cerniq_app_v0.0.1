# Audit documentatie Cerniq.app

Data: 2026-01-20 (Actualizat)
Scope: toate documentele din `docs/` (Master Spec, arc42, Etape 0-5, infra, testing, ADRs).
Obiectiv: validare coerenta, completitudine si eliminarea lacunelor logice/documentare.

## Rezumat executiv

Documentatia este ampla si bine structurata, dar nu este 100% coerenta. Exista contradictii intre documentele canonice (Master Spec) si anexe/infrastructura care pot conduce la implementari divergente. Am verificat posibile false-pozitive si le-am marcat explicit mai jos.

---

## Rezolvari recente (20 Ianuarie 2026)

### ✅ C1 REZOLVAT: HITL unificat in Etapa 5

Problema `gold_hitl_tasks_e5` a fost rezolvata. Toate fisierele E5 au fost actualizate:

- `etapa5-hitl-system.md` - Schema inlocuita cu referinte la `approval_tasks`, workers actualizati
- `etapa5-migrations.md` - Migratia 008 acum configureaza `approval_type_configs` pentru E5
- `etapa5-api-endpoints.md` - HITL API aliniat la endpoint-urile unificate
- `etapa5-runbook-operational.md` - Query-uri si proceduri de mentenanta actualizate
- `etapa5-backup-procedures.md` - Referinta actualizata la `approval_tasks`

**Modificari cheie:**
- Schema `gold_hitl_tasks_e5` marcata ca DEPRECATED si eliminata
- Toate task-urile E5 folosesc `approval_tasks` cu `pipeline_stage='E5'`
- SLA-urile definite in `approval_type_configs` pentru 6 approval types E5
- Workers si API-uri aliniati la patternul unificat

### ✅ C2 REZOLVAT: Standardizare Redis 8.4.0

Problema version drift Redis a fost rezolvată. Toată documentația folosește acum **Redis 8.4.0** (latest stable, Nov 2025):

- `master-specification.md` - Redis 8.4.0 (actualizat de la 7.4.7)
- `architecture.md`, `glossary.md`, `risks-and-technical-debt.md` - Redis 8.4.0
- `deployment-guide.md`, `docker-compose-reference.md`, `redis-high-availability.md` - redis:8.4-alpine
- Toate fișierele Etapa 0, 3, 4 - actualizate
- Testing docs - redis:8.4-alpine
- ADR-0006 - actualizat cu justificare upgrade

**Justificare upgrade la 8.4:**
- Full active support (vs security-only pentru 7.4.x până în Nov 2026)
- Improved Streams performance
- Better cluster management
- BullMQ compatibil (necesită Redis 6.2+)

---

## Metodologie

- Am verificat ierarhia de autoritate din Master Spec.
- Am comparat contractele canonice (tech stack, event contract, HITL, RLS, FSM) cu documentele de etapa si infrastructura.
- Am cautat pattern-uri de drift (versiuni, naming, surse de date).
- Am validat daca unele probleme pot fi false-pozitive (documente vechi/optionale).

## Constatari critice (blocheaza implementarea coerenta)

### ~~C1. HITL: tabele per-etapa in Etapa 5 contrazic contractul canonic~~ ✅ REZOLVAT

> **STATUS:** Rezolvat pe 20 Ianuarie 2026. Vezi sectiunea "Rezolvari recente" de mai sus.

~~Master Spec impune un singur sistem `approval_tasks`. Etapa 5 defineste `gold_hitl_tasks_e5`.~~

**Solutie implementata:** Documentatia Etapa 5 a fost actualizata pentru a folosi sistemul HITL unificat (`approval_tasks` cu `pipeline_stage='E5'`). Schema `gold_hitl_tasks_e5` a fost marcata ca DEPRECATED si eliminata din toate fluxurile active.

---

### ~~C2. Redis: versiune canonica 7.4.7 vs infrastructura 8.0~~ ✅ REZOLVAT

> **STATUS:** Rezolvat pe 20 Ianuarie 2026. Toată documentația a fost standardizată la **Redis 8.4.0** (latest stable).

~~Master Spec fixeaza Redis 7.4.7. Deployment Guide si docker compose folosesc Redis 8.0.~~

**Solutie implementata:** Toate referințele Redis au fost actualizate la versiunea 8.4.0 în:
- Master Specification
- Architecture docs (architecture.md, glossary.md, risks-and-technical-debt.md)
- Infrastructure docs (deployment-guide.md, docker-compose-reference.md, redis-high-availability.md)
- Etapa 0, 3, 4 documentation
- Testing docs
- ADR-0006

### C3. Event Contract: camelCase vs snake_case

arc42 defineste `event_id`, `event_type`, `correlation_id`, iar Master Spec impune `eventId`, `eventType`, `correlationId`.
Impact: contracte de evenimente inconsistente, testele de contract vor esua.
Surse:
```
docs/architecture/architecture.md
interface CerniqEvent { event_id, event_type, correlation_id, tenant_id, ... }
```
```
docs/specifications/master-specification.md
interface CerniqEvent { eventId, eventType, correlationId, tenantId, ... }
```

## Constatari majore (inconsistente logice/contractuale)

### M1. FSM: `current_stage` / `assigned_phone_id` vs canon `current_state` / `assigned_phone_number`

Schema DB din `schema-database.md` foloseste aliasuri deprecated in locul numelor canonice.
Impact: schema drift, implementari duale, bug-uri la mapare.
Surse:
```
docs/specifications/schema-database.md
current_stage VARCHAR(30) NOT NULL
assigned_phone_id INTEGER
```
```
docs/specifications/master-specification.md
current_state VARCHAR(30) NOT NULL
assigned_phone_number VARCHAR(20)
```

### M2. RLS: `app.current_tenant` vs `app.current_tenant_id`

Master Spec stabileste `app.current_tenant`, iar HITL foloseste `app.current_tenant_id`.
Impact: risc de scurgeri multi-tenant daca middleware foloseste doar una din chei.
Surse:
```
docs/specifications/master-specification.md
current_setting('app.current_tenant')
```
```
docs/specifications/hitl-unified-system.md
current_setting('app.current_tenant_id')
```

### M3. LLM routing: fallback OpenAI GPT-4o in Etapa 3 vs fallback canon Claude -> Groq
Etapa 3 declara OpenAI GPT-4o fallback, in timp ce Master Spec defineste un lant de fallback diferit.
Impact: costuri si comportament diferit, audit si logging inconsistent.
Surse:
```
docs/specifications/Etapa 3/00-INDEX-ETAPA3.md
LLM Provider: xAI Grok-4 (primary), OpenAI GPT-4o (fallback)
```
```
docs/specifications/master-specification.md
fallback_chain: ['xai-grok', 'anthropic-claude', 'groq']
```

### M4. Surse de date: APIA/MADR in schema vs eliminare declarata in risk register

Schema DB inca listeaza APIA/MADR, dar risk register spune ca ingestia a fost eliminata complet.
Impact: pipeline si compliance conflictual (GDPR/competitie).
Surse:
```
docs/specifications/schema-database.md
Date din APIA/MADR (Scraping PDF)
```
```
docs/architecture/risks-and-technical-debt.md
Complete removal of APIA/MADR data ingestion
```

### M5. Python runtime: 3.13 LTS in arc42 vs 3.14.2 in Master Spec

Arhitectura mentioneaza 3.13 LTS pentru workeri, dar Master Spec impune 3.14.2.
Impact: incompatibilitate librarii, drift operational.
Surse:
```
docs/architecture/architecture.md
/workers (Python 3.13 LTS)
```
```
docs/specifications/master-specification.md
Python 3.14.2
```

## Constatari medii (versiuni/tehnologii in drift)

### N1. PostGIS/pgvector: versiuni nealiniate

Docker Compose mentioneaza PostGIS 3.5 si pgvector 0.8.0, dar Master Spec cere 3.6.1 si 0.8.1.
Impact: discrepante functionale si de performanta.
Surse:
```
docs/infrastructure/docker-compose-reference.md
Extensions: pgvector 0.8.0, PostGIS 3.5
```
```
docs/specifications/master-specification.md
pgvector 0.8.1, PostGIS 3.6.1
```

### N2. Qdrant mentionat ca integrare RAG in Etapa 3

Master Spec promoveaza PostgreSQL cu extensii (pgvector) si evita DB separate. Etapa 3 mentioneaza Qdrant.
Impact: risc de abatere de la decizia arhitecturala; poate fi intentional, dar necesita clarificare.
Surse:
```
docs/specifications/Etapa 3/00-INDEX-ETAPA3.md
Integrari: ... Qdrant (RAG)
```
```
docs/architecture/architecture.md
PostgreSQL Extensions ... alternative respinse: Pinecone, MongoDB
```

## Verificare false-pozitive

- ~~HITL Etapa 5: confirmat ca tabela dedicata exista; nu este o simpla nota istorica.~~ ✅ REZOLVAT - schema actualizata la `approval_tasks`
- ~~Redis 8.0: apare in Deployment Guide, Docker Compose si Redis HA; conflict real cu Master Spec.~~ ✅ REZOLVAT - standardizat la Redis 8.4.0
- Event Contract: arc42 foloseste schema snake_case; Master Spec impune camelCase. (confirmat - nerezolvat)
- APIA/MADR: schema DB inca listeaza surse, iar risk register spune eliminare completa. (confirmat - nerezolvat)
- Qdrant: posibil optional/experimental, dar conflict cu decizia "no DB separate". (necesita decizie explicita, nu e fals-pozitiv - nerezolvat)

## Recomandari de remediere (ordine)

1. ~~Standardizeaza HITL pe `approval_tasks` si elimina `gold_hitl_tasks_e5`.~~ ✅ REZOLVAT
2. ~~Decide versiunea reala Redis si actualizeaza Master Spec sau infra (un singur adevar).~~ ✅ REZOLVAT (Redis 8.4.0)
3. Alege schema de evenimente (camelCase vs snake_case) si uniformizeaza toate documentele + testele de contract.
4. Aliniaza FSM: `current_state` si `assigned_phone_number` in toate schemele.
5. Standardizeaza cheia RLS la un singur nume de session variable.
6. Clarifica daca APIA/MADR este complet scos; daca da, elimina din schema si pipeline.
7. Clarifica daca Qdrant este folosit; daca da, actualizeaza decizia arhitecturala si Master Spec.
8. Aliniaza versiunile pgvector/PostGIS/Redis in toate documentele de infrastructura.

## Stare audit

- Documentatie: bogata, dar nu complet consistenta.
- Progres: 2 din 8 probleme critice/majore rezolvate (C1 - HITL, C2 - Redis).
- Actiuni obligatorii ramase: rezolvarea contradictiilor C3, M1-M5, N1-N2.
