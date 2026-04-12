<!-- neuron-contract:author-complete -->

# Neuron `human:approve:message`

> **Status:** audit manual **2026-04-11**. Coada este în registry/catalog; **lipsește** procesor BullMQ în `workers/outreach` (și orice `add` către această coadă în cod TypeScript auditat).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `human:approve:message` |
| etapa | E2 |
| familie (v2) | `human` |
| contract_path | `contracts/neurons/E2/human--approve--message.md` |
| ADR familie (indicativ) | [human](../../adr/families/e2/human.md) |

## Scop în context real

**v2 + catalog:** `HumanNeuron`, aprobare mesaj AI înainte de trimitere, coadă `human:approve:message`, OODA cu UI și `Command(resume=...)`. **Repo:** `QUEUES.HUMAN_APPROVE_MESSAGE` în `workers/shared/src/queue-registry.ts` (L175, L844); intrare catalog `e2:human:approve-message` / `human:approve:message` în `packages/shared/src/cognitive-node-catalog.ts` (L1434–1441). **Nu** există `createWorker(QUEUES.HUMAN_APPROVE_MESSAGE)` sau înregistrare în `workers/outreach/src/index.ts` (L183–189 listează alți workeri HITL, fără approve-message). Căutare `human:approve:message` în `*.ts`: doar registry + catalog + documentație. **E3** folosește coada distinctă `human:approve` (`workers/e3-ai-sales/src/workers/n78-human-approve.ts`) — **nu** este același contract. Comportament operațional pentru `human:approve:message` = **neimplementat** la data auditului.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`human:approve:message\`` (L3392–3415).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:human:approve-message` (L1434–1441).
- `workers/shared/src/queue-registry.ts` — `HUMAN_APPROVE_MESSAGE` (L175, L844).
- `workers/outreach/src/index.ts` — absență worker dedicate (audit enumerare L142–219).
- `docs/specifications/Etapa 2/etapa2-hitl-system.md` — secțiune design worker (referință arhitecturală, nu înlocuiește lipsa handlerului).
- Grep repo: `human:approve:message` în `*.ts` (doar registry/catalog).

## Instanțe v2

- **Catalog nodeKey:** `e2:human:approve-message`
- **OTel (v2):** `cognitive.e2.human.approve-message`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI în v2.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:human:approve-message`**, coadă **`human:approve:message`** în registry; **fără** worker/procesor în outreach. | v2 queue = registry. | Implementare lipsă — v2 §2.4. |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `human-oversight`. | v2 familie `human`. | — |
| 3 | Rol declarat | *Țintă:* gate HITL pre-send; **în cod:** doar coadă statică. | v2 + catalog. | — |
| 4 | NeuronType + SOFAI | **Catalog:** `HumanNeuron`. | v2. | — |
| 5 | Criticitate | **Catalog:** `HIGH`. | v2 HIGH. | — |
| 6 | Înveliș telemetrie | Fără `withCognitiveSpan` pe coadă (fără handler). | v2 span `cognitive.e2.human.approve-message`. | **Migrare planificată** când există worker. |
| 7 | Înveliș politică | — | v2 Tier 3 + HITL policy. | Fără cod de aplicat. |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | — | ADR-0007. | Fără handler. |
| 10 | Escaladare HITL | Neuronul **este** flux HITL în v2; fără motor runtime pe această coadă. | ADR-0008 menționează coada. | — |
| 11 | Micro-OODA | v2: LangGraph + UI + resume; **cod:** absent. | v2. | **LangGraph:** fără referințe în `workers/outreach` la audit. |
| 12 | Tier + de-escaladare | — | v2. | Fără handler. |
| 13 | Stack | BullMQ (coadă înregistrată); rest neconectat. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.human.approve-message`.
- **Cod:** *n/a* până la implementare worker.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
