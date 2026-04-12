<!-- neuron-contract:author-complete -->

# Neuron `ai:response:generate`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `ai:response:generate` |
| etapa | E3 |
| familie (v2) | `ai-analysis` |
| contract_path | `contracts/neurons/E3/ai--response--generate.md` |
| ADR familie (indicativ) | [ai-analysis](../../adr/families/e3/ai-analysis.md) |

## Scop în context real

În **v2**, neuronul este **DeliberativeNeuron** pe coada canonică `ai:response:generate`, cu scop declarativ de generare a răspunsului comercial AI în context de negociere (E3). În **repo**, fluxul **E3 ai-sales** implementează pasul de **post-procesare** a răspunsului deja produs de agent (C14) pe coada BullMQ **`ai:e3:response:generate`** (constantă `QUEUES.E3_AI_RESPONSE_GENERATE`), procesată de `aiResponseGenerateProcessor` în `workers/e3-ai-sales/src/workers/c15-ai-response-generate.ts`: curățare blocuri `<think>` / `<tool_call>`, detectare limbă, opțional reformatare prin `fastChat` pentru `complexity === "simple"`, apoi enqueue paralel către **`ai:response:validate`** (C16) și **`ai:conversation:store`** (C17). Enfileierea din C14 este în `c14-ai-agent-orchestrate.ts`. **Atenție:** în `cognitive-node-catalog.ts`, intrarea `e3:ai:response-generate` folosește încă `queueName` **`ai:response:generate`**, dar registry-ul runtime pentru E3 folosește **`ai:e3:response:generate`** — decalaj catalog ↔ registry. Separat, worker-ul **E2 outreach** consumă **aceeași** literă de coadă **`ai:response:generate`** (`QUEUES.AI_RESPONSE_GENERATE`) pentru răspunsuri scurte WhatsApp (`createResponseGeneratorWorker` în `workers/outreach/src/workers/ai-sentiment.ts`), cu `withCognitiveSpan("e2:ai:response-generate", …)` — alt domeniu funcțional decât C15, dar același șir canonic v2 ca etichetă de coadă.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`ai:response:generate\`` (L3098–3121).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:ai:response-generate` / `ai:response:generate` (L1322–1329); `e3:ai:response-generate` / `ai:response:generate` (L1628–1635); `resolveNodeKeyFromQueueNameAndEtapa` (L3342–3350).
- `workers/shared/src/queue-registry.ts` — `AI_RESPONSE_GENERATE: "ai:response:generate"` (L157); `E3_AI_RESPONSE_GENERATE: "ai:e3:response:generate"` (L229–230); intrări concurrency (L828, L909).
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` (L90–107).
- `workers/e3-ai-sales/src/main.ts` — `"ai:e3:response:generate": aiResponseGenerateProcessor` (L189); `registerCognitiveWorkerEtapa(3)` (L37).
- `workers/e3-ai-sales/src/workers/c15-ai-response-generate.ts` — procesor C15 (L1–178).
- `workers/e3-ai-sales/src/workers/c14-ai-agent-orchestrate.ts` — enqueue C15 (L64, L148–166).
- `workers/e3-ai-sales/src/lib/llm-client.ts` — `fastChat` pentru reformatare (folosit în C15).
- `workers/outreach/src/workers/ai-sentiment.ts` — `createResponseGeneratorWorker`, `QUEUES.AI_RESPONSE_GENERATE`, span explicit `e2:ai:response-generate` (L438–448).
- `workers/e3-ai-sales/src/__tests__/c-workers.test.ts` — teste C15 / cozi E3 (L788+).

## Instanțe v2

### Instanță 1 — `ai-analysis` (v2 ~L3098)

- **Catalog nodeKey:** `e3:ai:response-generate`
- **Confirmed queue field (v2):** `ai:response:generate`
- **Neuron type (v2):** `DeliberativeNeuron`
- **Swimlane (v2):** `ai-reasoning`
- **Criticality (v2):** `CRITICAL`
- **OTel span name (v2):** `cognitive.e3.ai.response-generate`

### Extras câmpuri v2

- OODA, model routing QwQ/SGLang, HITL 2h pentru acțiuni ireversibile — conform blocului v2.

## N/A pe criterii

Nu s-a folosit **N/A** pe rânduri: fiecare criteriu are dovadă (E3 C15 / E2 outreach) sau gap explicit față de v2.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Catalog v2 E3:** `nodeKey` **`e3:ai:response-generate`**, `queueName` **`ai:response:generate`** (L1628–1630). **Runtime E3:** coadă **`ai:e3:response:generate`**, procesor **`aiResponseGenerateProcessor`** (`c15-ai-response-generate.ts`, `main.ts` L189). **Catalog:** lipsește intrare pentru șirul `ai:e3:response:generate` la audit. **E2:** aceeași `queueName` catalog **`ai:response:generate`** → `e2:ai:response-generate` (L1323–1324), worker outreach pe coada literală `ai:response:generate`. | v2: o coadă `ai:response:generate` pentru E3. | Două binare (outreach vs e3-ai-sales) + redenumire E3 în registry; rezolvare `nodeKey` automată pentru `ai:e3:response:generate` eșuează fără intrare catalog. |
| 2 | Etapă, familie, swimlane | **Catalog E3:** `etapa: 3`, `swimlane: "ai-reasoning"` (L1633–1634). **Worker E3:** `registerCognitiveWorkerEtapa(3)`. **Catalog E2:** `etapa: 2`, același swimlane `ai-reasoning` (L1327–1328). | v2: E3, familie `ai-analysis`, swimlane `ai-reasoning`. | Familia v2 `ai-analysis` ≠ câmpul `swimlane` din catalog (`ai-reasoning`). |
| 3 | Rol declarat | **C15:** post-procesare răspuns brut din agent (curățare, limbă, reformatare opțională) + lanț C16/C17 (`c15-ai-response-generate.ts` L1–9, L120–165). **E2 worker:** generare text scurt RO pentru outreach (L438–478). **Catalog E3:** „Generare răspuns comercial AI adaptat contextului de negociere” (L1631). | v2: generare răspuns comercial adaptat; analogie corticală. | C15 nu apelează LLM „de la zero” pentru mesajul utilizatorului — primește `rawResponse` din C14; generarea principală e în lanțul upstream. |
| 4 | NeuronType + SOFAI | **Catalog E3:** `NeuronType.DeliberativeNeuron` (L1632). **Catalog E2:** la fel (L1326). | v2: `DeliberativeNeuron` / System 2. | — |
| 5 | Criticitate | **Catalog E3:** `CRITICAL` (L1635). **Catalog E2:** `HIGH` (L1329). | v2: `CRITICAL`. | Aceeași etichetă v2 pentru E3; intrarea E2 din catalog e `HIGH` pentru coada partajată. |
| 6 | Înveliș telemetrie | **E2 outreach:** `withCognitiveSpan("e2:ai:response-generate", …)` în interiorul procesorului (`ai-sentiment.ts` L448). **E3 C15:** **fără** `withCognitiveSpan` în fișier; instrumentarea automată din `createWorker` apelează `resolveNodeKeyFromQueueNameAndEtapa("ai:e3:response:generate", 3)` — **fără** potrivire în catalog pentru acest `queueName` → `nodeKey` **lipsă** → procesorul rulează **fără** span cognitiv `cognitive:${nodeKey}` (`factory.ts` L98–103). **v2 span:** `cognitive.e3.ai.response-generate`. | v2 + ADR-0003. | Gap major: coada E3 efectivă neînregistrată în catalog pentru OTel auto. |
| 7 | Înveliș politică | **C15:** nu Cedar/OPA; erori la răspuns gol după curățare → throw (`c15-ai-response-generate.ts` L116–118). **E2:** la eșec generare → enqueue `HUMAN_REVIEW_QUEUE` (`ai-sentiment.ts` L487–501). | v2: Tier 2, HITL pentru acțiuni ireversibile, SLA 2h. | Maparea exactă SLA 2h / „irreversible” nu e citită în C15. |
| 8 | Rutare model (dacă AI) | **C15:** `fastChat` doar pentru ramura `complexity === "simple"` (reformatare); altfel păstrează textul curățat (L108–111, L52–69). Modelul reasoning pentru răspunsul brut vine din **C14** (nu din C15). **E2:** `resolveOutreachLlmRouting` + `generateOutreachResponseTextWithRetries` (`ai-sentiment.ts` L474–484). | v2: QwQ-32B + SGLang structured. | Lanțul v2 descrie un singur neuron; în cod, „generare” E3 e împărțită între C14 și C15. |
| 9 | Guardrails | **C15:** curățare deterministă regex, fără NeMo în fișier. **Downstream:** C16 `ai:response:validate` (menționat în antet C15). | v2 + ADR-0007. | Guardrails principale pentru E3 sunt în C16, nu în C15. |
| 10 | Escaladare HITL | **E2:** `HUMAN_REVIEW_QUEUE` la incertitudine (`ai-sentiment.ts` L487–501). **C15:** nu enqueue direct HITL; trimite la validare C16. | v2: motor HITL unificat. | Lanțul HITL E3 depinde de C16/guardrails — neexpandat aici. |
| 11 | Micro-OODA | **C15:** Observe (job `rawResponse`), Orient (curățare + limbă), Decide (simple vs păstrare), Act (enqueue validate + store). **Fără** GraphRAG în C15. | v2 OODA + memorie episodică. | „Update episodic memory” v2 nu e literal în C15; persistența e delegată C17. |
| 12 | Tier + de-escaladare | **Nu** sunt în C15 praguri explicite 0.80 / 2σ; control calitate în C16. | v2 §2.2 Tier 2 + trigger-e. | Invariantele de încredere v2 mapate pe C14/C16, nu pe C15. |
| 13 | Stack v2 §2.3 (subset) | **Cu dovadă:** BullMQ, `fastChat`/InfraQ în C15, worker-shared `createWorker`, OTel parțial (E2 explicit, E3 auto lipsă din cauza catalog). | v2 §2.3. | Kafka/SGLang/Neo4j: neaudit pentru C15. |

### Mapare OTel

- **v2:** `cognitive.e3.ai.response-generate`.
- **Cod E2:** span explicit `cognitive:e2:ai:response-generate` (din `withCognitiveSpan` cu acel `nodeKey`).
- **Cod E3 (C15):** la **2026-04-11**, instrumentarea automată **nu** atașează span cognitiv dacă `nodeKey` nu se rezolvă pentru `ai:e3:response:generate` — **migrare necesară:** fie adăugare catalog `queueName: ai:e3:response:generate` → `e3:ai:response-generate`, fie `withCognitiveSpan` explicit în C15.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
