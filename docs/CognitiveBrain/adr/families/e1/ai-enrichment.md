# ADR-FAMILY-e1-ai-enrichment

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e1-ai-enrichment |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
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

## Contracte și indexare

- Contracte: căutare `ai:structure`, `ai:merge`, `ai:score:confidence`, `ai:fallback` în [contracts/neurons/](../../contracts/neurons/).
- Sinapse: dependențe din normalizare și ingest către AI — [contracts/synapses/](../../contracts/synapses/).

## Criterii de acceptanță

- [ ] Mapare 1:1 publică între nume graf (`enrich:ai:*`) și cozi runtime **sau** ADR de depreciere a etichetelor din graf.
- [ ] Schema ieșire structurată documentată per coadă unde se aplică.
- [ ] Metrici/token sau echivalent expuse conform politicii OTel adoptate în monorepo.

## Research extern

| Sursă | Verificare |
| --- | --- |
| OpenTelemetry Gen AI conventions | `https://opentelemetry.io/docs/specs/semconv/gen-ai/` — 2026-04-11 |
| vLLM structured outputs | `https://docs.vllm.ai/en/latest/features/structured_outputs.html` — 2026-04-11 |

## Limită evidență

- Handler-ii concreți (fișiere worker, prompt-uri, contracte JSON job) nu sunt enumerați exhaustiv în acest ADR; se extrag din pachetele worker și contracte regenerate, nu din presupuneri.
