<!-- neuron-contract:author-complete -->

# Neuron `ai:feedback:collect`

> **Status:** audit manual **2026-04-11**. **K65** — `feedbackCollectProcessor` în `workers/e3-ai-sales/src/workers/k65-feedback-collect.ts`: validare Zod, insert `gold_negotiation_feedback`, medie NPS agregată pe negociere. **Coadă runtime:** `feedback:collect` (nu prefixul `ai:` din câmpul v2 «Confirmed queue»).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `ai:feedback:collect` |
| etapa | E3 |
| familie (v2) | `ai-core` |
| contract_path | `contracts/neurons/E3/ai--feedback--collect.md` |
| ADR familie (indicativ) | [ai-core](../../adr/families/e3/ai-core.md) |

## Scop în context real

În **v2**, neuronul este **AssociativeNeuron** cu `Confirmed queue field` **`ai:feedback:collect`** (L4545). În **repo**, același `nodeKey` catalog **`e3:feedback:collect`** este mapat la coada BullMQ **`feedback:collect`** (`cognitive-node-catalog.ts` L2095–2096; `QUEUES.E3_FEEDBACK_COLLECT` în `queue-registry.ts` L326). Worker-ul **K65** persistă feedback NPS 1–5, text liber opțional (max 2000 caractere), canal sursă opțional (`WA` | `EMAIL` | `IN_APP` | `API`), în `goldNegotiationFeedback`, apoi calculează media NPS pentru `negotiationId` (`k65` L72–107). **Fără apel LLM** în implementare. **Producător API:** nu s-a găsit `E3_FEEDBACK_COLLECT` / `feedback:collect` în `apps/api` la audit (grep pe `apps/api`). **Teste:** `workers/e3-ai-sales/src/__tests__/k-workers.test.ts` (K65, L790+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`ai:feedback:collect\`` (L4528–4551).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:feedback:collect` / `feedback:collect` (L2095–2102).
- `workers/shared/src/queue-registry.ts` — `E3_FEEDBACK_COLLECT` (L326), concurrency (L1026).
- `workers/e3-ai-sales/src/main.ts` — `"feedback:collect": feedbackCollectProcessor` (L253).
- `workers/e3-ai-sales/src/workers/k65-feedback-collect.ts` — procesor, schemă Zod, payload.
- `packages/db/src/schemas/e3.ts` — comentariu schemă K65 (L548).
- `workers/e3-ai-sales/src/__tests__/k-workers.test.ts` — teste K65.
- `workers/shared/src/factory.ts` — instrumentare cognitivă (L90–107).

## Instanțe v2

- — (un singur bloc `### NEURON` pentru `ai:feedback:collect`).

## N/A pe criterii

- **8 — Rutare model:** N/A — `k65-feedback-collect.ts` nu apelează `reasoningChat` / LLM; procesare deterministă + Postgres. Motiv: absență apel model în fișierul K65. **v2** menționează rutare vLLM — **decalaj față de implementare**.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog **`e3:feedback:collect`**, coadă **`feedback:collect`** (`cognitive-node-catalog.ts` L2095–2096). Registry `QUEUES.E3_FEEDBACK_COLLECT` → `feedback:collect` (`queue-registry.ts` L326). | v2 antet + `Confirmed queue field`: **`ai:feedback:collect`** (L4528, L4545). | **Divergență v2 ↔ runtime:** prefix `ai:` în v2, absent în cod. |
| 2 | Etapă, familie, swimlane | E3 worker; `registerCognitiveWorkerEtapa(3)` (`main.ts` L37). Swimlane catalog: **`ai-reasoning`** (`cognitive-node-catalog.ts` L2099). | v2: E3, ai-core, swimlane `ai-reasoning`. | — |
| 3 | Rol declarat | Colectare NPS + text + metadata → DB + agregat (`k65` L1–14, L72–107). | v2: feedback post-negociere pentru quality; analogie neuron asociativ. | — |
| 4 | NeuronType + SOFAI | **`AssociativeNeuron`** în catalog (`cognitive-node-catalog.ts` L2098). | v2: `AssociativeNeuron`; clasificare SOFAI din v2 §2.1. | — |
| 5 | Criticitate | Catalog: **`MEDIUM`** (`cognitive-node-catalog.ts` L2101). | v2: `MEDIUM`. | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan` când `tenantId` în job (`factory.ts` L90–107). | v2 span: `cognitive.e3.feedback.collect`. | Nume span export vs `cognitive.nodeKey`: verificare runtime (ADR-0003). |
| 7 | Înveliș politică | Fără Cedar/OPA în K65; validare numerică NPS 1–5 (`FeedbackInputSchema`, `k65` L46–54). | v2: Tier 4, HITL la eșecuri repetate. | Logică HITL „3+ erori”: nu în K65. |
| 8 | Rutare model (dacă AI) | **N/A** — vezi secțiunea N/A. | v2: vllm-fast / fallback — **nu** în cod K65. | — |
| 9 | Guardrails | Validare **Zod** pe payload (`k65` L46–64); fără NeMo/scan LLM. | ADR-0007 — destinație (NeMo etc.). | — |
| 10 | Escaladare HITL | Nu în K65. | v2 / ADR-0008 — motor transversal. | — |
| 11 | Micro-OODA | **În cod:** OBSERVE — `job.data`; ORIENT/DECIDE — `parse` Zod; ACT — insert + `AVG(nps)` (`k65` L64–107). Fără model stochastic. | v2 OODA generic + **Model routing** — parțial doar ca destinație documentată. | — |
| 12 | Tier + de-escaladare | Fără prag încredere sau tier în K65. | v2 Tier 4. | — |
| 13 | Stack (subset) | BullMQ, Zod, Drizzle/Postgres (`goldNegotiationFeedback`). | v2 §2.3. | Kafka/SGLang: destinație v2, nefolosite în K65. |

### Mapare OTel

- **v2:** `cognitive.e3.feedback.collect`; convenții `cognitive.neuron.*` (ADR-0003).
- **Cod:** `cognitive.nodeKey` rezolvat pentru coada **`feedback:collect`** + etapă 3 (`factory.ts` L96–102); atribute `tenantId`, etc. din `buildCognitiveContextFromJob`.
- **Stare:** **parțial aliniat** — implementare folosește `nodeKey` catalog, nu literalul `ai:feedback:collect` ca nume de coadă.

---
*Generator inițial:* înlocuit prin audit manual.
