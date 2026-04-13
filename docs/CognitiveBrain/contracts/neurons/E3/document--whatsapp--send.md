<!-- neuron-contract:author-complete -->

# Neuron `document:whatsapp:send`

> **Status:** audit manual **2026-04-11**. **I53** este **STUB** (fără apel Graph API); returnează `queued: true` cu `note: wa-send-stub-phase-13`. Există **decalaj payload** față de job-ul enqueued din **J59** (`recipientPhone` vs `phoneNumber`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `document:whatsapp:send` |
| etapa | E3 |
| familie (v2) | `fiscal-docs` |
| contract_path | `contracts/neurons/E3/document--whatsapp--send.md` |
| ADR familie (indicativ) | [fiscal-docs](../../adr/families/e3/fiscal-docs.md) |

## Scop în context real

**v2** (L4869–4892): **MotorNeuron**, trimitere document via **WhatsApp Business API** ca mesaj media, **Non-AI**. **Repo:** `workers/e3-ai-sales/src/workers/i53-document-whatsapp-send.ts` validează **`phoneNumber`** E.164 (`E164_REGEX` L22, L49–54), loghează intenție + stub pentru PDF (`i53` L56–62), returnează succes static (`i53` L71–77). **Nu** există HTTP către Meta Graph în acest fișier (L8–15). **Înregistrare:** `main.ts` L237. **Registry:** `QUEUES.E3_DOCUMENT_WHATSAPP_SEND` (`queue-registry.ts` L300, L1000). **Catalog:** `e3:document:whatsapp-send` (`cognitive-node-catalog.ts` L1982–1990). **Producători:** include **`channelWhatsappSendProcessor`** (J59) care face `documentWaQueue.add` cu payload `recipientPhone`, `phoneId`, `messageType`, `context` (`j59-channel-whatsapp-send.ts` L105–125) — **schema diferită** de `DocumentWhatsappSendJobData` din I53 care cere `phoneNumber` (L24–31). **Teste:** `i-workers.test.ts` I53 (L768+); `j-workers.test.ts` verifică enqueue J59 cu `recipientPhone` (L650–678).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`document:whatsapp:send\`` (L4869–4892).
- `packages/shared/src/cognitive-node-catalog.ts` — L1982–1990.
- `workers/shared/src/queue-registry.ts` — L300, L1000.
- `workers/e3-ai-sales/src/main.ts` — L237.
- `workers/e3-ai-sales/src/workers/i53-document-whatsapp-send.ts`.
- `workers/e3-ai-sales/src/workers/j59-channel-whatsapp-send.ts` — delegare la I53 (L102–125).
- `workers/e3-ai-sales/src/__tests__/i-workers.test.ts` — I53.
- `workers/e3-ai-sales/src/__tests__/j-workers.test.ts` — J59 enqueue (L650+).
- `workers/shared/src/factory.ts`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L4888); I53 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:document:whatsapp-send`**, coadă **`document:whatsapp:send`** (`cognitive-node-catalog.ts` L1983–1984). `QUEUES.E3_DOCUMENT_WHATSAPP_SEND` (`queue-registry.ts` L300). | v2: același `Confirmed queue field` (L4886). | — |
| 2 | Etapă, familie, swimlane | E3; **`fiscal-execution`** (`cognitive-node-catalog.ts` L1986). | v2: fiscal-execution (L4879). | Catalog **MEDIUM** (L1989) vs v2 **MEDIUM** (L4880) — aliniat; observație: `channel:whatsapp:send` e HIGH în v2, alt neuron. |
| 3 | Rol declarat | Stub log + validare E.164 (`i53` L1–77). | v2: trimitere reală WA media (L4883–4885). | **Gap runtime:** faza 13 menționată în comentarii. |
| 4 | NeuronType + SOFAI | **`MotorNeuron`** (`cognitive-node-catalog.ts` L1985). | v2: MotorNeuron (L4877). | — |
| 5 | Criticitate | **`MEDIUM`** (`cognitive-node-catalog.ts` L1989). | v2: MEDIUM (L4880). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan`. | v2: `cognitive.e3.document.whatsapp-send` (L4891). | **Parțial aliniat.** |
| 7 | Înveliș politică | Throw pe telefon invalid (`i53` L50–54). | v2: Tier 4, HITL la eșecuri repetate (L4881, L4889). | — |
| 8 | Rutare model (dacă AI) | **N/A** — vezi N/A. | v2: Non-AI. | — |
| 9 | Guardrails | E.164; fără integrare reală API — risc funcțional documentat. | ADR-0007 țintă. | — |
| 10 | Escaladare HITL | Nu în I53. | v2 / ADR-0008. | — |
| 11 | Micro-OODA | OBSERVE — job; ORIENT — validare; DECIDE — stub; ACT — log (`i53` L44–77). | v2 OODA trimitere (L4887). | **Decalaj:** fără ACT extern real. |
| 12 | Tier + de-escaladare | Fără tier în cod. | v2 Tier 4 (L4881). | — |
| 13 | Stack (subset) | BullMQ, `@cerniq/db` session; **J59→I53:** job cu `recipientPhone` (`j59` L105–120) vs I53 așteaptă `phoneNumber` (`i53` L24–31, L45) — fără mapare în I53. | v2 §2.3 Graph API — **neimplementat** în I53. | **Decalaj payload** J59/I53: risc la execuție reală în afara mock-urilor. |

### Mapare OTel

- **v2:** `cognitive.e3.document.whatsapp-send`.
- **Cod:** `cognitive.nodeKey` **`e3:document:whatsapp-send`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
