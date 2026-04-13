<!-- neuron-contract:author-complete -->

# Neuron `negotiation:reminder:send`

> **Status:** audit manual **2026-04-11**. **D22** găsește negocieri «stale» (DISCOVERY/PROPOSAL >48h, NEGOTIATION >24h), exclude stări finale, apoi enfilează **`ai:sentiment:analyze`** cu `context: "negotiation-reminder"` — **nu** trimite email/WA direct din D22.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `negotiation:reminder:send` |
| etapa | E3 |
| familie (v2) | `negotiation` |
| contract_path | `contracts/neurons/E3/negotiation--reminder--send.md` |
| ADR familie (indicativ) | [negotiation](../../adr/families/e3/negotiation.md) (dacă există) |

## Scop în context real

**v2** (L5232–5255): **MotorNeuron**, reminder automat către lead, ACT = canal extern (L5250). **Repo:** `d22-negotiation-reminder-send.ts` — `sentimentQueue.add("ai:sentiment:analyze", { context: "negotiation-reminder", … })` (`d22` L58–77). Comentariu CRON `0 */6 * * *` (`d22` L4–5). **Înregistrare:** `main.ts` L199. **Registry:** `E3_NEGOTIATION_REMINDER_SEND` (`queue-registry.ts` L239). **Teste:** `d-workers.test.ts` D22 (L635+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5232–5255.
- `packages/shared/src/cognitive-node-catalog.ts` — L1693–1700.
- `workers/shared/src/queue-registry.ts` — L239.
- `workers/e3-ai-sales/src/main.ts` — L199.
- `workers/e3-ai-sales/src/workers/d22-negotiation-reminder-send.ts`.
- `workers/e3-ai-sales/src/__tests__/d-workers.test.ts` — D22.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A pentru **D22** — nu apelează LLM; enfilează alt neuron (`ai:sentiment:analyze` poate fi AI în alt fișier).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:negotiation:reminder-send`**, **`negotiation:reminder:send`** (`cognitive-node-catalog.ts` L1694–1695). | v2 (L5249). | — |
| 2 | Etapă, familie, swimlane | E3; **`negotiation-fsm`** (`cognitive-node-catalog.ts` L1698). | v2 (L5235–5242). | — |
| 3 | Rol declarat | Detectare stale + job sentiment (`d22` L4–6, L32–77). | v2 reminder către lead (L5246–5247). | **Divergență majoră:** nu e «send» direct; e **delegare** la `ai:sentiment:analyze`. |
| 4 | NeuronType + SOFAI | **`MotorNeuron`** (`cognitive-node-catalog.ts` L1697). | v2 MotorNeuron (L5240). | — |
| 5 | Criticitate | **`MEDIUM`** (`cognitive-node-catalog.ts` L1700). | v2 MEDIUM (L5243). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan`. | v2 `cognitive.e3.negotiation.reminder-send` (L5254). | **Parțial aliniat**. |
| 7 | Înveliș politică | Exclude `DEAD`/`PAID`/`INVOICED` (`d22` L47–48). | v2 Tier 4 (L5244). | — |
| 8 | Rutare model (dacă AI) | D22 **nu** routează modele; pasează la altă coadă. | v2 Non-AI pentru acest neuron (L5251). | Lanțul downstream `ai:sentiment:analyze` = audit separat. |
| 9 | Guardrails | Doar SQL stale + filtre stare. | ADR-0007 țintă. | — |
| 10 | Escaladare HITL | Nu în D22. | v2 (L5252). | — |
| 11 | Micro-OODA | OBSERVE — stale rows; ACT — add jobs (`d22` L32–84). | v2 send/execute (L5250). | Implementare ≠ canal direct către lead. |
| 12 | Tier + de-escaladare | Fără în D22. | v2 Tier 4 (L5244). | — |
| 13 | Stack (subset) | BullMQ, Drizzle. | v2 §2.3. | Producer CRON: antet D22 — verificare `repeat` în afara fișierului. |

### Mapare OTel

- **v2:** `cognitive.e3.negotiation.reminder-send`.
- **Cod:** `cognitive.nodeKey` **`e3:negotiation:reminder-send`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
