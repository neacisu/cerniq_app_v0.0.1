<!-- neuron-contract:author-complete -->

# Neuron `ai:context:build`

> **Status:** audit manual **2026-04-11**. **C13** — `aiContextBuildProcessor` în `workers/e3-ai-sales/src/workers/c13-ai-context-build.ts`: încărcare Postgres (lead, negociere, istoric mesaje, tool-uri FSM), construire `systemPrompt`, trunchiere istoric la buget ~24K tokeni estimat, enqueue **`ai:agent:orchestrate`**. **Fără apel LLM** în acest pas (LLM în C14).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `ai:context:build` |
| etapa | E3 |
| familie (v2) | `ai-core` |
| contract_path | `contracts/neurons/E3/ai--context--build.md` |
| ADR familie (indicativ) | [ai-core](../../adr/families/e3/ai-core.md) |

## Scop în context real

În **v2**, neuronul este catalogat ca **DeliberativeNeuron** cu ciclu OODA care include **raționament LLM** și prag de încredere. În **repo**, **C13** realizează doar **asamblarea deterministă** a contextului pentru agent: citește `goldCompanies`, `goldNegotiations`, până la 20 mesaje din `aiConversationMessages` (conversație legată de `aiConversations` prin `sessionId` + `negotiationId`), și `fsmStateAllowedTools` pentru starea FSM curentă; construiește un `systemPrompt` text (`buildSystemPrompt`, L213–247) și trimite către **`ai:agent:orchestrate`** cu `conversationHistory` trunchiat dacă depășește `MAX_CONTEXT_TOKENS` (24 576, estimare 1 token ≈ 4 caractere, L27–41, L170–181). **Producător API:** `POST /` în `apps/api/src/routes/negotiation.ts` (L335–340) enfilează job cu `negotiationId`, `tenantId` și câmpuri din `buildApiJobPayloadContext` (tracing/provenance), **fără** `sessionId`, `leadId`, `userMessage` cerute de `AiContextBuildJobData` (`c13-ai-context-build.ts` L32–38) — **decalaj payload** față de contractul de job al worker-ului. **Teste:** `workers/e3-ai-sales/src/__tests__/c-workers.test.ts` — suite C13 (L210+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`ai:context:build\`` (L4503–4526).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:ai:context-build` / `ai:context:build` (L1609–1618).
- `workers/shared/src/queue-registry.ts` — `E3_AI_CONTEXT_BUILD` (L227), concurrency (L901).
- `workers/e3-ai-sales/src/main.ts` — `registerCognitiveWorkerEtapa(3)` (L37), procesor L187.
- `workers/e3-ai-sales/src/workers/c13-ai-context-build.ts` — procesor, tip job, downstream queue.
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation`, `withCognitiveSpan` (L90–107).
- `apps/api/src/routes/negotiation.ts` — enqueue la creare negociere (L335–340).
- `apps/api/src/lib/http-job-tracing.ts` — `buildApiJobPayloadContext` (L53–59).
- `workers/e3-ai-sales/src/__tests__/c-workers.test.ts` — C13.

## Instanțe v2

- — (un singur bloc `### NEURON` pentru `ai:context:build` în v2 la audit).

## N/A pe criterii

- **8 — Rutare model:** N/A pentru **pasul C13**: nu există `reasoningChat` / client LLM în `c13-ai-context-build.ts`; rutarea v2 ține de **lanțul E3** (ex. C14). Motiv: absență apel model în fișierul C13.
- **9 — Guardrails (NeMo / scan LLM):** N/A în C13 (fără intrare/ieșire model); există doar reguli text în `systemPrompt` (ex. marjă minimă 8%). Motiv: același fișier.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog **`e3:ai:context-build`**, coadă **`ai:context:build`** (`cognitive-node-catalog.ts` L1611–1612). Registry `QUEUES.E3_AI_CONTEXT_BUILD` (`queue-registry.ts` L227). | v2 `Confirmed queue field`: `ai:context:build`. | — |
| 2 | Etapă, familie, swimlane | E3: `registerCognitiveWorkerEtapa(3)` (`main.ts` L37). Swimlane în catalog: **`ai-reasoning`** (`cognitive-node-catalog.ts` L1615). Familie v2: **ai-core**. | v2: E3, ai-core, swimlane `ai-reasoning`. | — |
| 3 | Rol declarat | Asamblare context + prompt sistem + handoff C14 (`c13-ai-context-build.ts` L74–208, `buildSystemPrompt` L213–247). | v2: funcție cognitivă — construcție fereastră context (lead + istoric negociere); analogie cortex prefrontal. | v2 menționează și **produse** în descriere; C13 nu încarcă explicit catalog produse în prompt — doar lead + negociere + tools. |
| 4 | NeuronType + SOFAI | **`DeliberativeNeuron`** în catalog (`cognitive-node-catalog.ts` L1614). Implementare C13: **fără LLM** (mai apropiat operațional de „pregătire context” decât de deliberare model). | v2: `DeliberativeNeuron`, System2 (clasificare din v2 §2.1). | Clasificare SOFAI din v2; nu se afirmă fapt biologic independent. |
| 5 | Criticitate | Catalog: **`CRITICAL`** (`cognitive-node-catalog.ts` L1617). | v2: `CRITICAL`. | — |
| 6 | Înveliș telemetrie | Worker BullMQ prin `createWorker` + instrumentare cognitivă: `resolveNodeKeyFromQueueNameAndEtapa` + `withCognitiveSpan(nodeKey, …)` când `job.data.tenantId` e setat (`factory.ts` L90–107). | v2 span: `cognitive.e3.ai.context-build`. | Mapare exactă nume span OTel vs `cognitive.nodeKey` în exporter: verificare runtime / ADR-0003. |
| 7 | Înveliș politică | Fără Cedar/OPA în C13; reguli comerciale în text prompt (`c13-ai-context-build.ts` L242–247). Tier autonomie nu e citit din cod în C13. | v2: Tier 2, HITL pentru acțiuni ireversibile. | Politici HITL concrete pe acest job: nu citite în C13. |
| 8 | Rutare model (dacă AI) | **N/A** — vezi secțiunea N/A. | v2: QwQ / SGLang / fallback — aplicabil **C14+**, nu C13. | — |
| 9 | Guardrails | **N/A** — vezi secțiunea N/A. | ADR-0007 — destinație (NeMo etc.). | — |
| 10 | Escaladare HITL | Nu în C13; flux continuu spre coada `ai:agent:orchestrate` (`c13-ai-context-build.ts` L70, L187–202). | v2: motor HITL transversal (ADR-0008). | — |
| 11 | Micro-OODA | **În cod:** OBSERVE — query-uri DB (lead, negociere, mesaje, tools) (`c13-ai-context-build.ts` L81–155); ORIENT/DECIDE — compunere string + trunchiere buget (L157–181); ACT — `orchestrateQueue.add` (L187–202). **Fără** LLM sau „confidence gating” în C13. | v2: OODA cu ORIENT/DECIDE pe LLM și prag 0.80 — **nu reflectă** implementarea C13. | Divergență documentată; nu presupunem comportament v2 în coloana «În cod». |
| 12 | Tier + de-escaladare | Payload downstream include `attemptNumber: 1` (`c13-ai-context-build.ts` L199); fără logică tier în C13. | v2 Tier 2 + trigger-e încredere. | Trigger-e încredere: în C14/C15, nu aici. |
| 13 | Stack (subset) | BullMQ (`createQueue`, `add`), Drizzle/Postgres (`@cerniq/db`), Redis prin worker-shared. | v2 §2.3 (BullMQ, …). | Versiuni runtime Redis/BullMQ: din lockfile / infra, nu reiterate aici. |

### Mapare OTel

- **v2 / plan:** `cognitive.e3.ai.context-build` și convenții `cognitive.neuron.*` (ADR-0003).
- **Cod:** `withCognitiveSpan` cu **`cognitive.nodeKey`** rezolvat din coadă + etapă (`factory.ts` L96–106), plus atribute context job (`tenantId`, `sessionId`, `runtimeJobKey` din `negotiationId` dacă lipsește `leadId` — `factory.ts` L60–70).
- **Stare:** **parțial aliniat** — atributele reale sunt cele din `cognitive-helpers` / fabrică; numele span v2 poate diferi de implementare până la migrare explicită.

---
*Generator inițial:* înlocuit prin audit manual.
