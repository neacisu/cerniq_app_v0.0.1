<!-- neuron-contract:author-complete -->

# Neuron `wa:send:initial`

> **Status:** audit manual **2026-04-13**. **v2** — instanță E5 „duplicat #2” (L7920–L7940): coadă `wa:send:initial`, familia `content`, `ProceduralNeuron`. **Repo:** **fără** coadă BullMQ cu acest literal. Trimiterea WA outbound în **E2** folosește cozi **per-telefon** `q:wa:phone-XX` (factory `getWaPhoneQueueName` în `queue-registry.ts` ~L662), procesate de `createWaWorker` / `whatsapp.ts` în `workers/outreach` cu `registerCognitiveWorkerEtapa(2)`. **Concluzie:** eticheta v2 E5 nu are binar E5; execuția reală este **outreach Etapa 2** pe cozi `q:wa:*`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `wa:send:initial` |
| etapa (v2 dup2) | E5 |
| familie (v2 dup2) | `content` |
| runtime (efectiv) | E2 — cozi `q:wa:phone-*`, `wa:media:send`, orchestrare |
| contract_path | `contracts/neurons/E5/wa--send--initial.md` |
| ADR familie (indicativ) | [content](../../adr/families/e5/content.md) (graf); WA operațional: specificații Etapa 2 |

## Scop în context real

Primul mesaj WA către lead: coadă per telefon + integrare TimelinesAI — vezi `workers/outreach/src/workers/whatsapp.ts` și `workers/outreach/src/index.ts`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7920–L7940 (duplicat #2).
- `workers/shared/src/queue-registry.ts` — `WA_*` cozi (L113–L119), `getWaPhoneQueueName` (L662).
- `workers/outreach/src/workers/whatsapp.ts` — worker WA E2.
- `workers/outreach/src/index.ts` — înregistrare procesoare WA.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L7920–L7940:** span `cognitive.wa.send.initial` (L7939), non-AI (L7936).

## N/A pe criterii

- **8 — Rutare model:** N/A — trimitere mesaj (v2 L7936); fără LLM obligatoriu în calea WA sender.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** `wa:send:initial`. **`q:wa:phone-NN`** + worker outreach. | v2: `wa:send:initial` (L7934). | Graf E5 vs cozi E2. |
| 2 | Etapă, familie, swimlane | **Runtime:** etapa 2 (outreach). | v2 dup2: E5 `content`. | — |
| 3 | Rol declarat | Trimitere/primire WA, status livrare, istoric — `whatsapp.ts`. | v2: execuție procedurală generică (L7932–L7933). | — |
| 4 | NeuronType + SOFAI | Nu mapat ca `ProceduralNeuron` unic în catalog pentru `q:wa:phone-*`. | v2: `ProceduralNeuron` (L7927). | — |
| 5 | Criticitate | Conform rate-limit / monitoring ADR-uri outreach. | v2: `MEDIUM` (L7930). | — |
| 6 | Înveliș telemetrie | Spanuri `cognitive:e2:…` pe workerii înregistrați (vezi factory outreach). | v2: `cognitive.wa.send.initial` (L7939). | Prefix etapă diferit. |
| 7 | Înveliș politică | Quota-guardian, ADR telefonie (vezi `phone-monitoring.ts`). | v2 Tier 4 (L7931), fără HITL obligatoriu (L7937). | — |
| 8 | Rutare model (dacă AI) | **N/A** pentru sender WA de bază. | v2 non-AI (L7936). | Răspunsuri AI pe alte cozi (`ai:*`). |
| 9 | Guardrails | Cozi separate media, read receipt, delivery status. | v2 L7937. | — |
| 10 | Escaladare HITL | Posibil prin lanț sentiment/review (E2). | v2 L7937. | — |
| 11 | Micro-OODA | Job → API TimelinesAI → log metrici. | v2 OODA scurt (L7935). | — |
| 12 | Tier + de-escaladare | Retry BullMQ + cozi `wa:message:retry`. | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Redis E2, integrare externă. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.wa.send.initial`.
- **Cod:** spanuri E2 pe cozi `q:wa:*` (vezi `createWorker` outreach); fără `cognitive.wa.send.initial` literal.

---
*Audit manual 2026-04-13.*
