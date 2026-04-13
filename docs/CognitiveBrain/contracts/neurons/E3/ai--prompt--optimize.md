<!-- neuron-contract:author-complete -->

# Neuron `ai:prompt:optimize`

> **Status:** audit manual **2026-04-11**. **Gap runtime:** nu există coadă `ai:prompt:optimize` în `queue-registry.ts`, intrare în `cognitive-node-catalog.ts` sau procesor în `workers/e3-ai-sales/src/main.ts` la căutare `prompt:optimize` / `ai:prompt` în cod TypeScript worker/API.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `ai:prompt:optimize` |
| etapa | E3 |
| familie (v2) | `ai-core` |
| contract_path | `contracts/neurons/E3/ai--prompt--optimize.md` |
| ADR familie (indicativ) | [ai-core](../../adr/families/e3/ai-core.md) |

## Scop în context real

**v2** (L4578–4598) descrie un neuron **technology** / **DeliberativeNeuron** inferat, cu `Confirmed queue field` **`ai:prompt:optimize`**, OODA cu LLM și rutare QwQ/SGLang; **evidence status:** graph-export, *not yet reconciled with runtime registry*. **Repo:** la audit nu s-a identificat worker BullMQ, constantă `QUEUES` sau `nodeKey` pentru această coadă. Optimizarea efectivă de prompturi poate fi **înglobată** informal în alte pași (ex. construire `systemPrompt` în C13), dar **nu** ca neuron izolat mapat la `ai:prompt:optimize`. Specificația veche `docs/specifications/Etapa 3/etapa3-workers-C-ai-agent-core.md` nu a fost reluată ca dovadă de implementare activă în `workers/e3-ai-sales` fără fișier procesor dedicat citit.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`ai:prompt:optimize\`` (L4578–4598).
- `packages/shared/src/cognitive-node-catalog.ts` — căutare `prompt:optimize`: **fără potrivire**.
- `workers/shared/src/queue-registry.ts` — căutare `prompt:optimize`: **fără potrivire**.
- `workers/e3-ai-sales/src/main.ts` — map `processors`: **fără** cheie `ai:prompt:optimize`.
- `rg` workspace (fișiere `.ts/.tsx`): **fără** `prompt:optimize` / `ai:prompt:optimize` în cod aplicație.

## Instanțe v2

- —

## N/A pe criterii

- — (criteriile 1–13 se aplică; coloana «În cod» notează absența handler-ului unde e cazul).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Lipsă** `nodeKey` / `queueName` în `cognitive-node-catalog.ts` pentru `ai:prompt:optimize` (grep). | v2: coadă `ai:prompt:optimize`; reconciliere registry — nefinalizată în textul v2. | v2 §2.4 — comportament doar după implementare. |
| 2 | Etapă, familie, swimlane | — | v2: E3, ai-core; swimlane menționat în metrici ca `ai-core`. | Fără worker E3 pentru această coadă. |
| 3 | Rol declarat | — | v2: planificare / generare comercială (descriere generică în bloc). | Scop operațional per-neuron: sub-specificat în v2 față de cod. |
| 4 | NeuronType + SOFAI | — | v2: `DeliberativeNeuron` inferat; System2 (clasificare v2). | — |
| 5 | Criticitate | — | v2: `HIGH` inferat. | — |
| 6 | Înveliș telemetrie | — | v2: `cognitive.ai.prompt.optimize`. | Fără `withCognitiveSpan` pentru coadă inexistentă. |
| 7 | Înveliș politică | — | v2: Tier 3, HITL la anomalie încredere. | — |
| 8 | Rutare model (dacă AI) | — | v2: QwQ + SGLang + fallback. | Fără cod LLM dedicat acestei cozi. |
| 9 | Guardrails | — | v2 / ADR-0007 țintă. | — |
| 10 | Escaladare HITL | — | v2: SLA 4h; ADR-0008. | — |
| 11 | Micro-OODA | — | v2: OODA cu LLM ORIENT/DECIDE. | Nu mapat la flux BullMQ în repo. |
| 12 | Tier + de-escaladare | — | v2 Tier 3. | — |
| 13 | Stack (subset) | — | v2 §2.3. | BullMQ: **fără** coadă înregistrată pentru acest neuron. |

### Mapare OTel

- **v2:** `cognitive.ai.prompt.optimize`.
- **Cod:** fără procesor — **neaplicat**; la migrare: aliniere la `cognitive.nodeKey` + `withCognitiveSpan` (ADR-0003).

---
*Generator inițial:* înlocuit prin audit manual.
