<!-- neuron-contract:author-complete -->

# Neuron `nurturing:nps:send`

> **Status:** audit manual **2026-04-13**. **v2** (L8793–L8816): coadă `nurturing:nps:send`, catalog `e5:feedback:nps-send`, `MotorNeuron`, OTel `cognitive.e5.feedback.nps-send`. **Runtime:** **`feedback:nps:send`** — **H43** `h43-feedback-nps-send.ts`, `withCognitiveSpan("e5:feedback:nps:send", …)` (L56); registry `E5_FEEDBACK_NPS_SEND` (`queue-registry.ts` L605). **Bootstrap:** `workers/e5-nurturing/src/index.ts` **nu** înregistrează H43 (2026-04-13) — același pattern ca H44/H45.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `nurturing:nps:send` |
| etapa | E5 |
| familie (v2) | `lifecycle` |
| contract_path | `contracts/neurons/E5/nurturing--nps--send.md` |
| ADR familie (indicativ) | [lifecycle](../../adr/families/e5/lifecycle.md) · [feedback](../../adr/families/e5/feedback.md) |

## Scop în context real

**Cod H43:** cooldown 90 zile, INSERT `gold_nps_surveys`, enqueue `outreach:orchestrator:dispatch` pentru EMAIL/WHATSAPP (L7–10, L23–24). **v2:** trimitere survey post-interacțiune (L8807–L8809).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`nurturing:nps:send\`` (L8793–L8816).
- `workers/shared/src/queue-registry.ts` — `E5_FEEDBACK_NPS_SEND` (L605); concurrency (L1325).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:feedback:nps-send` / `feedback:nps:send` (L3151–L3159).
- `workers/e5-nurturing/src/workers/h43-feedback-nps-send.ts` — H43.
- `workers/e5-nurturing/src/index.ts` — fără `createFeedbackNpsSendWorker` (verificare 2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- — (familie v2 `lifecycle` vs swimlane catalog `feedback-nps`.)

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8812).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `feedback:nps:send` + `e5:feedback:nps-send`; v2 `nurturing:nps:send`. | Confirmed queue v2 (L8810). | Prefix coadă diferit. |
| 2 | Etapă, familie, swimlane | Catalog etapa 5, `feedback-nps` (L3156–L3157). | v2 E5, `lifecycle`, swimlane `feedback-nps` (L8795–L8803). | — |
| 3 | Rol declarat | Trimitere survey + orchestrator outreach (H43). | Trimitere NPS H43 (L8807–L8809). | — |
| 4 | NeuronType + SOFAI | `MotorNeuron` (L3155). | `MotorNeuron` v2 (L8801). | Aliniat. |
| 5 | Criticitate | `MEDIUM` catalog (L3158). | `MEDIUM` v2 (L8804). | Aliniat. |
| 6 | Înveliș telemetrie | Span `cognitive:e5:feedback:nps-send`. | `cognitive.e5.feedback.nps-send` (L8815). | Aliniat semantic. |
| 7 | Înveliș politică | Fără Cedar în H43 (fișier citit). | HITL repeated failure, SLA 8h (L8813). | Politica HITL din v2 neexpandată în H43. |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L8812). | — |
| 9 | Guardrails | Cooldown 90d, canale valide (H43 L11–14, L65–74). | — | — |
| 10 | Escaladare HITL | Nu explicit în H43. | v2 L8813. | — |
| 11 | Micro-OODA | Verificare → INSERT → enqueue dispatch. | OODA send/execute (L8811). | — |
| 12 | Tier + de-escaladare | — | Tier 4 v2 (L8805). | — |
| 13 | Stack (subset plan v2) | BullMQ + Drizzle. | — | H43 neconectat la bootstrap E5. |

### Mapare OTel

- **v2:** `cognitive.e5.feedback.nps-send` (L8815).
- **Cod:** `cognitive:e5:feedback:nps-send`.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
