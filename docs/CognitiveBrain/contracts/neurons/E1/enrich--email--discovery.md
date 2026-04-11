<!-- neuron-contract:author-complete -->

# Neuron `enrich:email:discovery`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:email:discovery` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--email--discovery.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** înregistrează coada canonică `enrich:email:discovery` (ToolNeuron, Non-AI, «not yet reconciled with runtime registry»). **În repo:** descoperirea pe domeniu prin **Hunter.io** rulează pe coada **`discover:email:hunter`**, procesor `hunterEmailFinderProcessor` — extrage domeniul din datele companiei, apelează `hunterDomainSearch`, upsert contact în `silverContacts` / metadata companie, log în `silverEnrichmentLog`. Orchestratorul `p1-orchestrate` enfilează **`discover:email:hunter`** când `hasDomain(company)`. Coada v2 **`enrich:email:discovery`** nu apare literal în `queue-registry.ts`; runtime = **`discover:email:hunter`** / **`e1:discover:email-hunter`** în catalog. Specificația produs (`master-specification.md`) asociază acest neuron cu Hunter.io — aliniat semantic cu implementarea G1.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:email:discovery\`` (~L2061–2081).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:discover:email-hunter` / `discover:email:hunter` (~L591–599).
- `workers/shared/src/queue-registry.ts` — `DISCOVER_EMAIL_HUNTER: "discover:email:hunter"` (~L51).
- `workers/enrichment/src/main.ts` — `"discover:email:hunter": hunterEmailFinderProcessor` (~L136).
- `workers/enrichment/src/workers/g1-hunter-email-finder.ts` — `withCognitiveSpan("e1:discover:email-hunter", …)`, `hunterDomainSearch`, upsert (~L120–229).
- `workers/enrichment/src/workers/p1-orchestrate.ts` — `addQueueJob("discover:email:hunter", …)` (~L125–127).
- `workers/enrichment/src/lib/hunter-api-client.ts` — `hunterGet("/domain-search", …)` (~L208–214).
- `workers/enrichment/src/lib/hunter-api-client.test.ts` — teste client Hunter (fără procesor BullMQ G1 dedicat la audit).
- `docs/specifications/master-specification.md` — tabel rate-limit Hunter / `enrich:email:discovery` (~L1209).

## Instanțe v2

- **Catalog (runtime):** `nodeKey` **`e1:discover:email-hunter`**, coadă **`discover:email:hunter`**.
- **OTel span name (v2 plan):** `cognitive.enrich.email.discovery`
- **Evidence status (v2):** graph-export-grounded; reconciliere registry anunțată ca nefinalizată.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI; `g1-hunter-email-finder.ts` fără apel LLM (doar API Hunter).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | ��intă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **v2_queue** `enrich:email:discovery`; literal **lipsă** în registry. Runtime: **`discover:email:hunter`**, catalog **`e1:discover:email-hunter`**. | v2 vs catalog. | v2 §2.4 până la unificare nume. |
| 2 | Etapă, familie, swimlane | E1; worker enrichment; swimlane catalog **`enrichment-external`**. | v2 E1 enrichment; metrică v2 `swimlane="enrichment"`. | Diferență etichetă swimlane v2 vs catalog. |
| 3 | Rol declarat | Catalog: «Descoperire adrese email via Hunter.io». Cod: domain-search + persist contact/metadata. | v2 operational purpose (generic enrichment text). | v2 nu menționează Hunter explicit; specificația master o face. |
| 4 | NeuronType + SOFAI | `ToolNeuron`; System1 (reactiv) conform convenției v2 §2.1 pentru ToolNeuron. | v2 ToolNeuron. | — |
| 5 | Criticitate | Catalog + v2 **MEDIUM**. | v2. | — |
| 6 | Înveliș telemetrie | **`withCognitiveSpan("e1:discover:email-hunter", …)`** (`g1-hunter-email-finder.ts` ~L121–123). Span v2 plan (`cognitive.enrich.email.discovery`) ≠ string span în cod. | ADR-0003. | Aliniere denumiri span. |
| 7 | Înveliș politică | Rate limit `hunter` în `rate-limiter.ts`; circuit breaker `hunter` în `circuit-breaker.ts`; `callExternalApi("hunter", …)` în client. Fără OPA în fișierele Hunter citate. | v2 tier 4 / policy text. | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Filtrare email generic (`isGenericEmail`); skip dacă lipsește domeniu (~L156–159). | ADR-0007. | — |
| 10 | Escaladare HITL | Fără HITL în procesor. | ADR-0008. | — |
| 11 | Micro-OODA | Citește job → rezolvă domeniu → Hunter API → upsert DB → log. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Eșec: `enrichError` / mesaj procesor (~L237+). | v2 trigger-e. | Fără test integrare BullMQ G1 la audit (doar client HTTP). |
| 13 | Stack v2 §2.3 (subset) | BullMQ, `fetch` (Hunter), Postgres, Redis, `@cerniq/worker-shared` (`withCognitiveSpan`). | v2. | — |

### Mapare OTel

- **v2 / plan:** `cognitive.enrich.email.discovery`.
- **Cod:** `withCognitiveSpan` — **`e1:discover:email-hunter`** (`g1-hunter-email-finder.ts`).
- **Stare:** **migrare planificată** (nume span / v2).
