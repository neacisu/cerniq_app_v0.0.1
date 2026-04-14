<!-- neuron-contract:author-complete -->

# Neuron `channel:whatsapp:send`

> **Status:** audit manual **2026-04-11**. **J59** validează E.164 și blackout, apoi **delegă** trimiterea efectivă la coada **`document:whatsapp:send`** (I53), nu apelează direct WhatsApp Business API în acest fișier.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `channel:whatsapp:send` |
| etapa | E3 |
| familie (v2) | `channels` |
| contract_path | `contracts/neurons/E3/channel--whatsapp--send.md` |
| ADR familie (indicativ) | [channels](../../adr/families/e3/channels.md) |

## Scop în context real

**v2** (L4769–4792): **MotorNeuron**, **HIGH**, scop trimitere mesaj WhatsApp Business (răspuns AI sau notificare comercială), **Non-AI**. **Repo:** `workers/e3-ai-sales/src/workers/j59-channel-whatsapp-send.ts` — processor pentru **notificare handover** (mesaj din J58): validare **E.164** (`E164_REGEX` L32, L80–85), **blackout** redundant 21:00–08:00 RO (`isWaBlackoutTime` L88–93), mesaj non-gol (L96–100), apoi `documentWaQueue.add` către **`QUEUES.E3_DOCUMENT_WHATSAPP_SEND`** (`document:whatsapp:send`) cu `messageType: "HANDOVER_NOTIFICATION"` (`j59` L102–125). **Producător principal:** J58 când canalul ales e WA (`j58` L213–225). **Înregistrare:** `main.ts` L245. **Registry:** `E3_CHANNEL_WHATSAPP_SEND` (`queue-registry.ts` L313, L1013). **Teste:** `j-workers.test.ts` J59 (L641+). Fără `apps/api` găsit ca producător direct al cozii la audit.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`channel:whatsapp:send\`` (L4769–4792).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:channel:whatsapp-send` (L2038–2046).
- `workers/shared/src/queue-registry.ts` — `E3_CHANNEL_WHATSAPP_SEND`, `E3_DOCUMENT_WHATSAPP_SEND`.
- `workers/e3-ai-sales/src/main.ts` — L245.
- `workers/e3-ai-sales/src/workers/j59-channel-whatsapp-send.ts` — procesor.
- `workers/e3-ai-sales/src/workers/j58-channel-route-decide.ts` — enqueue WA (L213–225).
- `workers/e3-ai-sales/src/__tests__/j-workers.test.ts` — J59.
- `packages/db/src/schemas/e3.ts` — comentariu J59 (L195).
- `workers/shared/src/factory.ts` — instrumentare cognitivă.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L4788); J59 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:channel:whatsapp-send`**, coadă **`channel:whatsapp:send`** (`cognitive-node-catalog.ts` L2039–2040). `QUEUES.E3_CHANNEL_WHATSAPP_SEND` (`queue-registry.ts` L313). | v2: același `Confirmed queue field` (L4786). | — |
| 2 | Etapă, familie, swimlane | E3; swimlane **`ai-reasoning`** (`cognitive-node-catalog.ts` L2043). | v2: E3, channels, `ai-reasoning` (L4779). | — |
| 3 | Rol declarat | Strat validare + delegare la **`document:whatsapp:send`** pentru WA API (`j59` L1–22, L102–125). | v2: trimitere mesaj WA Business (L4783–4785). | **Decalaj arhitectură:** „motor” canal vs execuție în I53. |
| 4 | NeuronType + SOFAI | **`MotorNeuron`** (`cognitive-node-catalog.ts` L2042). | v2: MotorNeuron (L4777). | — |
| 5 | Criticitate | Catalog **`HIGH`** (`cognitive-node-catalog.ts` L2045). | v2: HIGH (L4780). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan` (factory). | v2: `cognitive.e3.channel.whatsapp-send` (L4791). | **Parțial aliniat** — ADR-0003 / `cognitive.nodeKey`. |
| 7 | Înveliș politică | Blackout + validări deterministe; fără Cedar. | v2: Tier 3, HITL la anomalii încredere (L4781, L4789). | **Decalaj:** J59 nu calculează „confidence”; comentariu quota 200/zi — neimplementat ca logică explicită în J59 (L14–17). |
| 8 | Rutare model (dacă AI) | **N/A** — vezi N/A. | v2: Non-AI. | — |
| 9 | Guardrails | E.164, blackout, mesaj gol blocat (`j59` L79–100). | ADR-0007 — destinație. | — |
| 10 | Escaladare HITL | Nu în J59; HITL în J58 dacă fără contact. | v2 politică HITL (L4789). | Escaladare înainte de J59 pe fluxul handover. |
| 11 | Micro-OODA | OBSERVE — job; ORIENT — validări; DECIDE — queue sau skip; ACT — `add` pe `document:whatsapp:send` (`j59` L69–131). | v2 OODA send/defer (L4787). | ACT = enqueue, nu apel HTTP final în acest neuron. |
| 12 | Tier + de-escaladare | Fără tier în cod. | v2 Tier 3 (L4781). | — |
| 13 | Stack (subset) | BullMQ, `createQueue`, reutilizare `isWaBlackoutTime` din `j58`. | v2 §2.3. | Detalii API WA în I53 — în afara acestui fișier. |

### Mapare OTel

- **v2:** `cognitive.e3.channel.whatsapp-send`.
- **Cod:** `cognitive.nodeKey` **`e3:channel:whatsapp-send`** — **parțial aliniat** față de schema `cognitive.neuron.*` din v2.

---
*Generator inițial:* înlocuit prin audit manual.
