# ADR-FAMILY-e1-ai-enrichment

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e1-ai-enrichment |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 (completare perimetru triplet `enrich:ai:*` + graf vs runtime: **2026-04-14**) |
| Etapă | E1 |
| Familie | `ai-enrichment` (graf planificare) |
| Plan master | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e1-ai-enrichment` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Familia **ai-enrichment** în exportul de graf grupează neuroni care folosesc **modele generative** pentru structurare, fuziune inteligentă și încredere asupra datelor în E1. În cod, neuronii echivalenți sunt înregistrați cu **swimlane `ai-analysis`** în catalog (nu eticheta literală `ai-enrichment`).

## Dovezi confirmate în Cerniq

### În cod și registry

- Patru intrări E1 în [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts) (secțiunea „J — AI E1”):

| nodeKey | Coadă BullMQ | Rol (extras din catalog) |
| --- | --- | --- |
| `e1:ai:structure-xai` | `ai:structure:xai` | Structurare date nestructurate cu AI xAI |
| `e1:ai:merge-xai` | `ai:merge:xai` | Fuzionare inteligentă date duplicate cu AI xAI |
| `e1:ai:score-confidence` | `ai:score:confidence` | Scoring încredere predicții AI |
| `e1:ai:fallback` | `ai:fallback` | Fallback la provider secundar la eroare |

- [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts): `AI_STRUCTURE_XAI`, `AI_MERGE_XAI`, `AI_SCORE_CONFIDENCE`, `AI_FALLBACK` cu aceleași string-uri; înregistrate cu provider `xai` unde e cazul (concurrency în `QUEUE_CONFIG`).

### În exportul de graf (plan master)

- **3** neuroni; exemple: `enrich:ai:contact-parse`, `enrich:ai:industry-classify`, `enrich:ai:text-structure`.

### Reconciliere registry / export graf

- **Număr:** catalog/runtime au **4** cozi AI E1, graful planificat menționează **3** — reconciliere necesară la nivel de inventar.
- **Prefix:** graf folosește `enrich:ai:*`; runtime folosește `ai:*` (ex. `ai:structure:xai`). **Nu** asuma egalitate fără mapare documentată.
- **Swimlane:** `ai-analysis` în catalog vs etichetă familie `ai-enrichment` în graf — păstrați ambele ca surse, cu acest ADR ca pivot semantic.

### Perimetru plan: triplet `enrich:ai:*` (graf v2) versus runtime

**Scop:** familia `ai-enrichment` din graf poate conține multe neuroni în exporturi / matrice; **documentarea reconcilierii graf ↔ cod** pentru scope-ul **„3 neuroni din planul master”** este condensată în **trei contracte** — câte unul per etichetă v2. Acest ADR **nu** afirmă că toate rândurile din `NEURON_MATRIX.csv` sunt implementate sau auditate aici; pentru triplet, sursa canonică rămâne contractele + fișierele citate în ele.

| Etichetă v2 (plan master) | Ancoră indicativă în plan | Contract neuron (perimetru exclusiv) | Runtime în repo (coadă → `nodeKey` catalog) |
| --- | --- | --- | --- |
| `enrich:ai:contact-parse` | ~L1741 | [enrich--ai--contact-parse.md](../../contracts/neurons/E1/enrich--ai--contact-parse.md) | `ai:structure:xai` → `e1:ai:structure-xai` (J1) |
| `enrich:ai:industry-classify` | ~L1763 | [enrich--ai--industry-classify.md](../../contracts/neurons/E1/enrich--ai--industry-classify.md) | J1 (`e1:ai:structure-xai`) +, când P1 enfilează agricol, `agri:culturi` → `e1:agri:culturi` (L4) |
| `enrich:ai:text-structure` | ~L1785 | [enrich--ai--text-structure.md](../../contracts/neurons/E1/enrich--ai--text-structure.md) | **Aceeași** coadă J1 ca `contact-parse`; două etichete v2 în plan, **un** procesor BullMQ pe `ai:structure:xai` |

**Reguli anti-ambiguitate (obligatorii la lectură):**

1. **Cele 4 cozi AI din catalog** (`structure-xai`, `merge-xai`, `score-confidence`, `fallback`) nu se echivalează cu „4 neuroni din triplet”: tripletul are **3** etichete v2; `merge` / `score` / `fallback` sunt **alte** intrări de familie, în afara celor trei contracte de mai sus, până la mapare explicită.
2. **Partajarea J1** între `contact-parse` și `text-structure` este **constatare de mapare**, nu „încă un neuron implementat” în plus față de cele trei poziții din plan — rămân **trei** fișiere contract, **trei** intrări în graf.
3. **`industry-classify`** nu are coadă BullMQ numită literal `enrich:ai:industry-classify`; runtime-ul documentat este **compunerea** J1 + L4 (L4 condiționat), descrisă **numai** în contractul industry-classify, fără extindere la „toți neuronii agri” din matrice.

Fiecare contract include **checklist graf (v2) față de runtime** pe cele 13 criterii self-aware, cu dovezi în repo — vezi secțiunile omoloage din cele trei fișiere.

## Decizie de guvernanță familială

1. **Proprietar:** Cognitive AI Platform + Data E1.
2. **Capabilitate:** îmbogățire și structurare prin LLM cu granițe de cost, latență și **încredere**; fallback controlat.
3. **Telemetrie:** span `cognitive:{nodeKey}` + evenimente; pentru apeluri model, aliniere treptată la convențiile OTel GenAI (vezi Research extern).
4. **Anomalii:** rate mare fallback, drift încredere, erori provider xAI.
5. **Guardrail / HITL:** severitate **HIGH** pe mai multe intrări catalog; ieșiri structurate și politici de autonomie (tier) conform planului global; nu publicare automată de câmpuri sensibile fără politică.

## Aliniere la cercetare

- [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md) recomandă **ieșiri structurate** pentru decizii neuronale. În infrastructura Cerniq, vLLM este menționat în planul master ca ancoră; documentația vLLM pentru *structured outputs* este disponibilă la `https://docs.vllm.ai/en/latest/features/structured_outputs.html` (acces verificat **2026-04-11**).
- SGLang / alte motoare: direcție de research în plan; **nu** sunt afirmate ca runtime obligatoriu fără intrare în CMDB/plan infrastructură.

## Observabilitate

- Atribute span din `cognitive-helpers.ts`: `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function`.
- Pentru GenAI, OpenTelemetry publică convenții dedicate în stadiu **Development**; index: `https://opentelemetry.io/docs/specs/semconv/gen-ai/` (acces verificat **2026-04-11**). Migrarea de la convenții vechi la cele noi este ghidată prin `OTEL_SEMCONV_STABILITY_OPT_IN` pe documentația oficială.

### Evidență implementare 2026-04-14 (fără endpoint REST per neuron)

| Decizie | Dovadă în repo |
| --- | --- |
| J1 (`ai:structure:xai`) folosește `nodeKey` catalog **`e1:ai:structure-xai`** pe `withCognitiveSpan` (nu `e1:ai:structure-infraq`). | `workers/enrichment/src/workers/j1-grok-structuring.ts` |
| Payload orchestrator → J1: `rawData` opțional; câmpuri plate (`cui`, `adresa`, `localitate`, …) din `basePayload` sunt agregate în `resolveGrokStructuringRawData`. | `j1-grok-structuring.ts`, `p1-orchestrate.ts` |
| Evenimente cognitive / SSE: workerii trec `tenantId` + `batchId` (UUID din `correlationId` când valid) la `withCognitiveSpan` → `emitCognitiveEvent` pe `cognitive:events:{batchId}`. | `workers/enrichment/src/lib/execution-correlation.ts` (`buildCognitiveWorkerEventContext`); apeluri în J1, L4, P1 |
| Flux agricol: P1 enfilează **`agri:culturi`** când `codCaenPrincipal` începe cu `01`/`02`/`03`, cu `codCaen` în job. | `p1-orchestrate.ts` |
| **ADR alias matrice:** `e1:ai:structure-infraq` din CSV rămâne etichetă de export; **nu** există a doua intrare catalog/coadă — runtime = `e1:ai:structure-xai`. | Contracte neuron `enrich--ai--text-structure.md`, `enrich--ai--contact-parse.md` |
| **Prometheus (granularitate job):** J1 — counter `cerniq_cognitive_ai_structure_outcome_total` (label **outcome**: `auto_applied`, `hitl`, `error`), histogramă `cerniq_cognitive_ai_structure_llm_seconds`. L4 — counter `cerniq_cognitive_agri_culturi_outcome_total` (label **outcome**: `success`, `not_found`, `error`). Definiții: `workers/shared/src/metrics.ts`. | `metrics.ts`, `j1-grok-structuring.ts`, `l4-culturi-classifier.ts` |
| **Evenimente cognitive / SSE:** câmp **eventType**; faze cu prefix **`phase_`**. J1 (`e1:ai:structure-xai`): `phase_llm_request`, `phase_llm_response`, `phase_validate_schema`, `phase_hitl_queued`, `phase_silver_write`. L4 (`e1:agri:culturi`): `phase_classify_start`, `phase_not_found`, `phase_metadata_persisted`. | Aceleași fișiere worker + `emitCognitiveEvent` |

**Research (reconfirmare):** OTel Gen AI — `https://opentelemetry.io/docs/specs/semconv/gen-ai/` — acces **2026-04-14**. OWASP LLM Top 10 (inclusiv LLM05 prompt injection) — `https://owasp.org/www-project-top-10-for-large-language-model-applications/` — acces **2026-04-14**. vLLM structured outputs — `https://docs.vllm.ai/en/latest/features/structured_outputs.html` — acces **2026-04-14**.

## Contracte și indexare

- **Triplet plan `enrich:ai:*` (mapare graf ↔ runtime documentată cap-coadă):**
  - [enrich--ai--contact-parse.md](../../contracts/neurons/E1/enrich--ai--contact-parse.md)
  - [enrich--ai--industry-classify.md](../../contracts/neurons/E1/enrich--ai--industry-classify.md)
  - [enrich--ai--text-structure.md](../../contracts/neurons/E1/enrich--ai--text-structure.md)
- Alte contracte / cozi AI E1: căutare `ai:structure`, `ai:merge`, `ai:score:confidence`, `ai:fallback` în [contracts/neurons/](../../contracts/neurons/).
- Sinapse: dependențe din normalizare și ingest către AI — [contracts/synapses/](../../contracts/synapses/).

## Criterii de acceptanță

- [ ] Mapare 1:1 publică între nume graf (`enrich:ai:*`) și cozi runtime **sau** ADR de depreciere a etichetelor din graf. *(Parțial: ADR + contracte documentează maparea `enrich:ai:*` → `ai:structure:xai` / `agri:culturi`; literal graf ≠ coadă.)*
- [x] Schema ieșire structurată pentru J1 (câmpuri JSON în prompt + validare CUI) — vezi `j1-grok-structuring.ts` și contracte neuron.
- [ ] Metrici/token sau echivalent expuse conform politicii OTel adoptate în monorepo. *(În progres: span + evenimente cognitive; metrici dedicate token — neafirmate fără instrumentare suplimentară.)*

## Research extern

| Sursă | Verificare |
| --- | --- |
| OpenTelemetry Gen AI conventions | `https://opentelemetry.io/docs/specs/semconv/gen-ai/` — 2026-04-11 |
| vLLM structured outputs | `https://docs.vllm.ai/en/latest/features/structured_outputs.html` — 2026-04-11 |

## Limită evidență

- Handler-ii concreți (fișiere worker, prompt-uri, contracte JSON job) nu sunt enumerați exhaustiv în acest ADR; se extrag din pachetele worker și contracte regenerate, nu din presupuneri.
- **Perimetru triplet:** pentru `enrich:ai:contact-parse`, `enrich:ai:industry-classify` și `enrich:ai:text-structure`, checklist-ul și dovezile fine-grained sunt în **contractele** respective; ADR-ul fixează pivotul familial și regulile de lectură, nu înlocuiește acele fișiere.
