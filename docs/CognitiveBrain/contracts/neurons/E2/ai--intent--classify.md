<!-- neuron-contract:author-complete -->

# Neuron `ai:intent:classify`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `ai:intent:classify` |
| etapa | E2 (v2); worker-ul runtime este pachetul `e3-ai-sales` cu `registerCognitiveWorkerEtapa(3)` |
| familie (v2, instanță 1) | `ai-analysis` |
| familie (v2, instanță 2 — duplicat #2) | `ai-core` |
| contract_path | `contracts/neurons/E2/ai--intent--classify.md` |
| ADR familie (indicativ) | [ai-analysis](../../adr/families/e2/ai-analysis.md) |

## Scop în context real

În **v2** (§6), neuronul este definit ca **DeliberativeNeuron** pe coada canonică `ai:intent:classify`, cu OODA centrat pe LLM structurat, prag de încredere 0.80 și span OTel `cognitive.e2.ai.intent-classify`. În **repo**, **nu** există coada BullMQ cu șirul literal `ai:intent:classify`: `workers/shared/src/queue-registry.ts` notează explicit că această coadă a fost eliminată din registry (comentariu J — AI). Clasificarea intenției pentru fluxul de negociere E3 este implementată pe coada **`intent:classify`** (constanta `QUEUES.E3_INTENT_CLASSIFY`), procesată de `intentClassifyProcessor` în `workers/e3-ai-sales/src/workers/k62-intent-classify.ts`, înregistrată în `workers/e3-ai-sales/src/main.ts` și cu concurrency20 în registry. Procesorul apelează `fastChat` (model fast InfraQ + lanț fallback frontier), validează ieșirea cu Zod și, la `HANDOVER_REQUEST`, enfilează `handover:detect` pe coada `QUEUES.E3_HANDOVER_DETECT`. Worker-ul **outreach** `ai-sentiment.ts` documentează fuziunea istorică a unui worker `ai:intent:classify` în analiza de sentiment — cale separată de K62. **Concluzie:** numele v2 și coada runtime sunt **decalate**; contractul raportează ambele.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`ai:intent:classify\`` (L3073–3096); `### NEURON \`ai:intent:classify\` — duplicat #2` (L4553–4576).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:ai:intent-classify` / `ai:intent:classify` (L1331–1338); `e3:intent:classify` / `intent:classify` (L2067–2074); `resolveNodeKeyFromQueueNameAndEtapa` (L3342–3350).
- `workers/shared/src/queue-registry.ts` — comentariu eliminare `ai:intent:classify` (L155); `E3_INTENT_CLASSIFY: "intent:classify"` (L323); intrare concurrency (L1023).
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation`, `withCognitiveSpan`, rezolvare `nodeKey` per etapă (L90–107, L209–221).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` → span `cognitive:${nodeKey}` (L215–234).
- `workers/e3-ai-sales/src/main.ts` — `registerCognitiveWorkerEtapa(3)` (L37); mapare `"intent:classify": intentClassifyProcessor` (L250).
- `workers/e3-ai-sales/src/workers/k62-intent-classify.ts` — tipuri job, prompt, `fastChat`, Zod, enqueue handover (L1–134).
- `workers/e3-ai-sales/src/lib/llm-client.ts` — `fastChat`, `INFRAQ_FAST_MODEL` via `sharedFastClient` (L83–130); re-export `fastClient` din `worker-shared`.
- `workers/shared/src/llm-client.ts` — `INFRAQ_FAST_MODEL = "Qwen/Qwen2.5-14B-Instruct-AWQ"` (L16).
- `workers/outreach/src/workers/ai-sentiment.ts` — deprecare `ai:intent:classify` unificat în sentiment (L9–10, L542–556).
- `workers/e3-ai-sales/src/__tests__/k-workers.test.ts` — `describe("K62 intentClassifyProcessor", …)` (L357+).
- `workers/outreach/src/workers/ai-sentiment.test.ts` — absență `ai:intent:classify` în registry (L620–642).

## Instanțe v2

### Instanță 1 — `ai-analysis` (v2 ~L3073)

- **Catalog nodeKey:** `e2:ai:intent-classify`
- **Confirmed queue field:** `ai:intent:classify`
- **Neuron type (v2):** `DeliberativeNeuron`
- **OTel span name (v2):** `cognitive.e2.ai.intent-classify`

### Instanță 2 — `ai-core` — duplicat #2 (v2 ~L4553)

- Același `Catalog nodeKey`, coadă și tip ca instanța 1; familie graf `ai-core` vs `ai-analysis`.

### Extras câmpuri v2 (ambele instanțe)

- **OODA / Model routing / Guardrail:** conform blocului v2 (LLM reasoning, QwQ-32B, SGLang, prag0.80, HITL 4h).

## N/A pe criterii

Nu s-a folosit **N/A** pe rânduri: fiecare criteriu are fie dovadă în cod pentru coada `intent:classify` / K62, fie formulare explicită de gap față de v2 (`ai:intent:classify` literal, tip neuron E2 vs E3 în catalog, model fast vs reasoning din v2).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **v2:** catalog `nodeKey` **`e2:ai:intent-classify`**, coadă **`ai:intent:classify`** (`cognitive-node-catalog.ts` L1331–1333). **Runtime:** coadă BullMQ **`intent:classify`**, `nodeKey` **`e3:intent:classify`** (L2067–2069); procesor K62 (`k62-intent-classify.ts`). **`ai:intent:classify` literal:** absent din `QUEUES` (comentariu registry L155). | v2: o singură coadă canonică `ai:intent:classify`. | Două intrări catalog pentru același comportament semantic cu nume de coadă diferit; migrare cutover documentată în plan. |
| 2 | Etapă, familie, swimlane | **Catalog E3:** `etapa: 3`, `swimlane: "ai-reasoning"` pentru `e3:intent:classify` (L2067–2073). **Catalog E2:** `etapa: 2`, `swimlane: "ai-analysis"` pentru `e2:ai:intent-classify` (L1331–1337). **Worker:** `registerCognitiveWorkerEtapa(3)` în `main.ts` L37 — rezolvare `nodeKey` pentru `intent:classify` → E3 (`factory.ts` L97–102). | v2: Stage **E2**, familii **ai-analysis** / **ai-core**, swimlane **ai-analysis**. | Tensiune: v2 spune E2; binarul și catalogul E3 tratează coada runtime ca etapă 3. |
| 3 | Rol declarat | **Implementare:** comentariu K62 — clasificare intenție mesaj negociere B2B cu enumerare fixă `INTENT_VALUES` (L3–14, L24–34). **Catalog E3:** „Clasificare intenție client: cumpărare, negociere…” (L2069–2070). | v2: clasificare intenție (interesat/refuz/…); analogie corticală. | Enum-ul din cod este mai granular decât formularea scurtă v2; nu se echivalează literal „refuz” cu un singur token fără mapare. |
| 4 | NeuronType + SOFAI | **Catalog E3:** `NeuronType.AssociativeNeuron` (`cognitive-node-catalog.ts` L2071). **Catalog E2 (v2):** `DeliberativeNeuron` (L1335). | v2: **DeliberativeNeuron** / System 2. | Divergență tip între intrarea E2 și E3 din catalog pentru același nume v2 vs coadă runtime. |
| 5 | Criticitate | **Ambele** intrări catalog: **HIGH** (E2 L1338, E3 L2074). | v2: **HIGH**. | — |
| 6 | Înveliș telemetrie | **Automat:** `createWorker` învelește procesorul cu `wrapProcessorWithCognitiveInstrumentation` (`factory.ts` L209–220). Pentru `intent:classify` + etapă 3 → `nodeKey` **`e3:intent:classify`**, apoi `withCognitiveSpan` → span **`cognitive:e3:intent:classify`** (`cognitive-helpers.ts` L226), atribute din catalog pentru `e3:intent:classify`. **Condiție:** `WORKER_COGNITIVE_INSTRUMENTATION` activ (implicit), `job.data.tenantId` prezent (`factory.ts` L103–106). **v2 span:** `cognitive.e2.ai.intent-classify` (notație puncte). | v2: OTel `cognitive.e2.ai.intent-classify`; ADR-0003. | Nume span și etapă din atribute nu coincid cu string-ul v2; `cognitive.neuron.*` vs `cognitive.nodeKey` — mapare în tabel. |
| 7 | Înveliș politică | **Fără** Cedar/OPA în K62. **Nu** există în K62 ramură „încredere < 0.80 → HITL” ca în v2; se returnează `confidence` în rezultat fără escaladare automată pe prag. **Parțial:** `HANDOVER_REQUEST` → job `handover:detect` (`k62-intent-classify.ts` L116–125). | v2: Tier 3, HITL la anomalii, SLA 4h. | Politica v2 nu e reprodusă numeric în K62. |
| 8 | Rutare model (dacă AI) | **`fastChat`:** primar InfraQ **`INFRAQ_FAST_MODEL`** = `Qwen/Qwen2.5-14B-Instruct-AWQ` (`llm-client.ts` worker-shared L16; apel `fastChat` K62 L101–107). **Fallback:** `withLlmFallbackChain` + pași frontier (`e3-ai-sales/llm-client.ts` L123–129). **Nu** este modelul reasoning QwQ din comentariul K62 („NU reasoning”) vs v2 (QwQ-32B). | v2: vllm-reasoning-32b + fallback la încredere < 0.80; SGLang. | Alegere explicită fast vs reasoning în K62; trigger fallback = eșec lanț, nu scor LLM. |
| 9 | Guardrails | Validare **deterministă** Zod `IntentSchema` după răspuns (`k62-intent-classify.ts` L54–57, L109–110). **Fără** NeMo/Colang în fișierul citat. | v2 + ADR-0007: NeMo + verificări deterministe. | NeMo: țintă, neobservată în K62. |
| 10 | Escaladare HITL | La intenție **`HANDOVER_REQUEST`**, enqueue **`handover:detect`** cu `triggerReason: "EXPLICIT_HANDOVER_REQUEST"` (`k62-intent-classify.ts` L118–125). | v2: escaladare la anomalii; cozi `human:*`/`hitl:*` în ADR-0008. | Nu s-a citit în acest audit handler-ul J56 complet; lanțul se oprește la enqueue. |
| 11 | Micro-OODA | **Observe:** citire `content` din job (max 800 caractere trimise LLM, L104). **Orient:** apel `fastChat` + prompt sistem. **Decide:** parsare JSON + Zod. **Act:** return rezultat + opțional enqueue handover. **Neo4j GraphRAG:** lipsă în K62. | v2 OODA + memorie episodică; GraphRAG țintă ADR-0005. | „Update episodic memory” din v2 nu apare în K62. |
| 12 | Tier + de-escaladare | **Nu** sunt în K62 trigger-e explicite „2σ” sau „schemă API neașteptată”. Retry BullMQ implicit prin `DEFAULT_JOB_OPTIONS` la eșec (ex. JSON invalid). | v2 §2.2 tier 3 + trigger-e standard. | Invariantele v2 pentru de-escaladare nu sunt implementate ca atare. |
| 13 | Stack v2 §2.3 (subset) | **Cu dovadă:** BullMQ (`Processor`, `createQueue`, registry), OpenTelemetry via `createWorker` + `withCognitiveSpan`, client LLM OpenAI-compatibil InfraQ + frontier în `worker-shared`. | v2 §2.3 + ADR-uri. | Kafka, SGLang, Neo4j: neaudit pentru acest procesor. |

### Mapare OTel

- **v2:** `cognitive.e2.ai.intent-classify` (puncte).
- **Cod (instrumentare automată):** `cognitive:e3:intent:classify` când `nodeKey` rezolvat este `e3:intent:classify` și instrumentarea cognitivă + `tenantId` sunt active.
- **Stare la 2026-04-11:** **parțial aliniat** — convenția numelui span și etapa din atribute diferă de string-ul v2; atributele `cognitive.nodeKey` / `cognitive.neuronType` / `cognitive.etapa` provin din intrarea **E3** din catalog, nu din `e2:ai:intent-classify`.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
