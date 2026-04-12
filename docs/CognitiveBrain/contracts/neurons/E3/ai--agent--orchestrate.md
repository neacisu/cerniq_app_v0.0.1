<!-- neuron-contract:author-complete -->

# Neuron `ai:agent:orchestrate`

> **Status:** audit manual **2026-04-11**. **C14** — `aiAgentOrchestrateProcessor` în `workers/e3-ai-sales/src/workers/c14-ai-agent-orchestrate.ts`: guard pre/post LLM, `reasoningChat` (QwQ + fallback în client), extragere `<tool_call>`, enqueue **`ai:e3:response:generate`** (C15).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `ai:agent:orchestrate` |
| etapa | E3 |
| familie (v2) | `ai-core` |
| contract_path | `contracts/neurons/E3/ai--agent--orchestrate.md` |
| ADR familie (indicativ) | [ai-core](../../adr/families/e3/ai-core.md) |

## Scop în context real

**Catalog:** `e3:ai:agent-orchestrate`, coadă `ai:agent:orchestrate` (`cognitive-node-catalog.ts`, L1620–1621). **Registry:** `QUEUES.E3_AI_AGENT_ORCHESTRATE` (`queue-registry.ts`, L228, L903). **Worker:** înregistrat în `main.ts` L188 ca `"ai:agent:orchestrate": aiAgentOrchestrateProcessor`. Payload: `AiAgentOrchestrateJobData` — `tenantId`, `sessionId`, `leadId`, `negotiationId`, `conversationId`, `systemPrompt`, `userMessage`, `conversationHistory`, `allowedTools`, opțional `attemptNumber`, `correctionNote` (`c14`, L19–31). După răspuns model: `responseGenerateQueue.add("ai:e3:response:generate", { … })` (`c14`, L148–166). **Upstream:** ex. `c13-ai-context-build.ts` creează coadă orchestrate (L70, L188). **Teste:** `workers/e3-ai-sales/src/__tests__/c-workers.test.ts` secțiune C14.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`ai:agent:orchestrate\`` (L4456–4479).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:ai:agent-orchestrate`.
- `workers/shared/src/queue-registry.ts` — `E3_AI_AGENT_ORCHESTRATE`.
- `workers/e3-ai-sales/src/main.ts` — înregistrare procesor L188.
- `workers/e3-ai-sales/src/workers/c14-ai-agent-orchestrate.ts` — procesor complet.
- `workers/e3-ai-sales/src/workers/c13-ai-context-build.ts` — producător downstream.
- `workers/e3-ai-sales/src/__tests__/c-workers.test.ts` — teste C14.

## Instanțe v2

- —

## N/A pe criterii

- — (neuron AI complet; rând 8 aplicabil)

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:ai:agent-orchestrate`** + coadă `ai:agent:orchestrate`. | v2. | — |
| 2 | Etapă, familie, swimlane | E3, worker `registerCognitiveWorkerEtapa(3)`; v2 swimlane `ai-reasoning`. | v2. | — |
| 3 | Rol declarat | Orchestrare LLM + tool_call + handoff C15. | v2 ExecutiveNeuron / orchestrare B2B. | — |
| 4 | NeuronType + SOFAI | ExecutiveNeuron (coordonare). | v2 ExecutiveNeuron. | — |
| 5 | Criticitate | — | v2 CRITICAL. | — |
| 6 | Înveliș telemetrie | `createWorker` din fabrică (etapa 3). | v2 `cognitive.e3.ai.agent-orchestrate`. | Verificare `withCognitiveSpan` în factory pentru `tenantId` în `job.data` (prezent în payload). |
| 7 | Înveliș politică | Guard pre/post; return struct `guardBlocked` fără enqueue C15 dacă blocat (`c14` L101–136). | v2 HITL irreversible — parțial acoperit de guard. | — |
| 8 | Rutare model (dacă AI) | `reasoningChat(systemPrompt, fullUserPrompt, { temperature, maxTokens, timeoutMs, tenantId })` (`c14` L116–121). | v2 QwQ-32B / SGLang — detalii în `llm-client.js`. | Versiuni exacte server: vezi `llm-client` + infra, nu numai v2. |
| 9 | Guardrails | `e3ScanPromptBeforeLlm`, `e3ScanOutputAfterLlm` (`c14` L101–136). | ADR-0007 țintă. | — |
| 10 | Escaladare HITL | Nu în C14 direct; flux negociere / human în alte cozi E3. | v2 HITL mandatory — mapare parțială. | — |
| 11 | Micro-OODA | OBSERVE: istoric + mesaj; ORIENT: guard + model; DECIDE: text + toolCalls; ACT: add C15. | v2 OODA. | v2 menționează FlowProducer DAG — în cod: enqueue simplu. |
| 12 | Tier + de-escaladare | `attemptNumber`, `correctionNote` în payload (`c14` L79–80, L96–98). | v2 Tier 2. | — |
| 13 | Stack | BullMQ, `reasoningChat`, guards, downstream `QUEUES.E3_AI_RESPONSE_GENERATE`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e3.ai.agent-orchestrate`.
- **Cod:** `cognitive.nodeKey` **`e3:ai:agent-orchestrate`** + atribute fabrică (`cognitive.etapa`, etc.) — **aliniat** cu catalog pentru coada `ai:agent:orchestrate`.

---
*Generator inițial:* înlocuit prin audit manual.
