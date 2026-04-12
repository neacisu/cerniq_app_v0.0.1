<!-- neuron-contract:author-complete -->

# Neuron `outreach:channel:selector`

> **Status:** audit manual **2026-04-11**. Rutare deterministă WA vs email cold/warm cu praguri ADR-0059 și porți GDPR/consimțământ.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `outreach:channel:selector` |
| etapa | E2 |
| familie (v2) | `orchestrator` |
| contract_path | `contracts/neurons/E2/outreach--channel--selector.md` |
| ADR familie (indicativ) | [orchestrator](../../adr/families/e2/orchestrator.md) |

## Scop în context real

**v2 + catalog:** selecție canal (menționează SMS în descrierea catalogului). **Repo:** `createChannelSelectorWorker` (`workers/outreach/src/workers/orchestration.ts`, L458–575) citește `lead_journey` + `gold_companies`, aplică blocare WA/email după DNC/opt-out/consimțământ, calculează index telefon pentru `getWaPhoneQueueName`, returnează `ChannelSelectorResult` (`WHATSAPP` | `EMAIL_COLD` | `EMAIL_WARM` + `targetQueue` + `score`). **Producători:** `createPhoneAllocatorWorker` enfilează job `select` cu `ChannelSelectorJobData` complet (L340–351, L265–276); `createSequenceAdvanceWorker` (`sequences.ts`, L359–368) enfilează job `route` cu `isFollowup: true` dar **fără** `currentState` / `hasPhone` cerute de interfața `ChannelSelectorJobData` — risc de comportament incorect la runtime (câmpuri `undefined`); tratat ca **Limită evidență**. Worker-ul **nu** apelează singur `targetQueue.add`; rezultatul rămâne valoarea de return BullMQ (nu s-a găsit în acest fișier lanțul care consumă `returnvalue`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`outreach:channel:selector\`` (L3742–3765).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:outreach:channel-selector` (L1045–1052).
- `workers/shared/src/queue-registry.ts` — `OUTREACH_CHANNEL_SELECTOR`.
- `workers/outreach/src/workers/orchestration.ts` — `createChannelSelectorWorker`, `CHANNEL_SCORES`, `EMAIL_*_STAGES`.
- `workers/outreach/src/workers/sequences.ts` — enqueue din `sequence:advance`.
- `workers/outreach/src/index.ts` — `createChannelSelectorWorker()` (L148).

## Instanțe v2

- **Catalog nodeKey:** `e2:outreach:channel-selector`
- **OTel (v2):** `cognitive.e2.outreach.channel-selector`

## N/A pe criterii

- **Rând 8:** **N/A** pentru cod (fără LLM); v2 declară totuși processing non-AI — aliniat.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:outreach:channel-selector`**, coadă `outreach:channel:selector`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2 orchestrator. | — |
| 3 | Rol declarat | Alegere canal + coadă țintă după reguli și consimțământ. | v2 (SMS în text catalog — **nu** în ramuri cod). | SMS: doar țintă documentară. |
| 4 | NeuronType + SOFAI | Catalog: `RulesNeuron`. | v2. | — |
| 5 | Criticitate | Catalog / v2: `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e2:outreach:channel-selector")` (L462) + strat `createWorker`. | Span v2. | Posibil span dublu imbricat cu fabrica — guard în `cognitive-helpers`. |
| 7 | Înveliș politică | Porți GDPR în SQL; fără Cedar. | v2 tier3. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Throw dacă toate canalele blocate sau nicio rută. | ADR-0059, ADR-0007 țintă. | — |
| 10 | Escaladare HITL | Nu direct. | v2. | — |
| 11 | Micro-OODA | OBSERVE DB; ORIENT reguli; DECIDE canal; ACT return struct. | v2. | — |
| 12 | Tier + de-escaladare | Eșec → throw (retry BullMQ). | v2. | — |
| 13 | Stack | BullMQ, Postgres, `getWaPhoneQueueName` (cozi per-telefon). | v2 §2.3. | Consumator `returnvalue` + payload `sequence:advance` neînchise în audit. |

### Mapare OTel

- **v2:** `cognitive.e2.outreach.channel-selector`.
- **Cod:** `withCognitiveSpan("e2:outreach:channel-selector")` — **aliniat** (nume explicit).

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
