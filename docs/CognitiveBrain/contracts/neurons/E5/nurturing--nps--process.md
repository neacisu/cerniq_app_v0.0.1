<!-- neuron-contract:author-complete -->

# Neuron `nurturing:nps:process`

> **Status:** audit manual **2026-04-13**. **v2** (L8768–8791): coadă `nurturing:nps:process`, catalog-grounded `e5:feedback:nps-process`, `EmotionNeuron`, OTel `cognitive.e5.feedback.nps-process`. **Runtime:** coadă **`feedback:nps:process`** (nu prefix `nurturing:`) — **H44** `h44-feedback-nps-process.ts`, `withCognitiveSpan("e5:feedback:nps:process", …)` L73; registry `E5_FEEDBACK_NPS_PROCESS` (L607). **v2** descrie rutare LLM (L8785–8787); **H44** este **determinist** (clasificare 0–10, fără apel LLM în fișier). **Bootstrap E5:** H44 **nu** este în `workers/e5-nurturing/src/index.ts` (2026-04-13).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `nurturing:nps:process` |
| etapa | E5 |
| familie (v2) | `lifecycle` |
| contract_path | `contracts/neurons/E5/nurturing--nps--process.md` |
| ADR familie (indicativ) | [lifecycle](../../adr/families/e5/lifecycle.md) · [feedback](../../adr/families/e5/feedback.md) |

## Scop în context real

**Cod H44:** validează scor, clasifică DETRACTOR/PASSIVE/PROMOTER, UPDATE `goldNpsSurveys`, `goldNurturingState.npsScore`, enfilează `churn:signal:detect` sau `state:advocate:promote` (L7–17, L92+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`nurturing:nps:process\`` (L8768–8791).
- `workers/shared/src/queue-registry.ts` — L607; `E5_FEEDBACK_NPS_PROCESS`.
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:feedback:nps-process` / `feedback:nps:process` (L3161–3168); swimlane `feedback-nps`.
- `workers/e5-nurturing/src/workers/h44-feedback-nps-process.ts` — H44.
- `workers/e5-nurturing/src/lib/e5-metrics.ts` — `e5_nps_score_recorded_total` (L201+).
- `workers/e5-nurturing/src/index.ts` — fără H44 în bootstrap.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- — (familie v2 `lifecycle` vs catalog `feedback-nps` — documentat la criteriul 2.)

## N/A pe criterii

- **8 — Rutare model:** v2 prevede LLM + fallback (L8785–8787); **codul H44 nu routează LLM** — tratăm ca **N/A pentru implementarea curentă H44** cu notă de gap față de v2.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `feedback:nps:process` + `e5:feedback:nps-process`; v2 `nurturing:nps:process`. | Confirmed queue v2 (L8785). | Prefix coadă diferit. |
| 2 | Etapă, familie, swimlane | Catalog etapa 5, `feedback-nps` (L3166–3167). | v2 `lifecycle` / `feedback-nps` swimlane catalog (L8778–8779). | Familie v2 vs pachet catalog. |
| 3 | Rol declarat | Procesare NPS + downstream churn/advocate (H44). | Procesare emoțională / NPS (L8782–8784). | — |
| 4 | NeuronType + SOFAI | `EmotionNeuron` (L3165). | `EmotionNeuron` v2 (L8776). | Aliniat. |
| 5 | Criticitate | `HIGH` catalog (L3168). | `HIGH` v2 (L8780). | Aliniat. |
| 6 | Înveliș telemetrie | `cognitive:e5:feedback:nps-process`. | `cognitive.e5.feedback.nps-process` (L8790). | Aliniat semantic. |
| 7 | Înveliș politică | Fără Cedar în H44. | HITL on anomaly (L8788). | Logica H44 nu implementează prag de încredere LLM (nu există LLM). |
| 8 | Rutare model (dacă AI) | **Implementare H44:** determinist, fără LLM. | PRIMARY/FALLBACK LLM (L8787). | Gap major v2 ↔ cod. |
| 9 | Guardrails | Validare scor întreg 0–10 (H44 L78–82). | NeMo țintă ADR-0007. | — |
| 10 | Escaladare HITL | Downstream automat (churn / advocate), nu task HITL în H44. | v2 HITL anomaly (L8788). | — |
| 11 | Micro-OODA | Validare → UPDATE DB → enqueue cozi. | OODA cu analiză LLM (L8786). | Doar parte „ACT” în cod. |
| 12 | Tier + de-escaladare | — | Tier 3 v2 (L8781). | — |
| 13 | Stack (subset plan v2) | BullMQ + Drizzle. | — | H44 neînregistrat în `index.ts`. |

### Mapare OTel

- **v2:** `cognitive.e5.feedback.nps-process` (L8790).
- **Cod:** `cognitive:e5:feedback:nps-process`.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
