<!-- neuron-contract:author-complete -->

# Neuron `feedback:writeback:crm`

> **Status:** audit manual **2026-04-13**. **v2** (L8077–L8097): coadă `feedback:writeback:crm`, `EmotionNeuron`, LLM (L8092–L8093). **Repo:** **fără** literal `feedback:writeback:crm` sau `crm:writeback` în `queue-registry.ts`. **H46** `feedback:complaint:route` enfilează **`outreach:orchestrator:dispatch`** pentru rute moderate (`h46-feedback-complaint-route.ts` L33, L10–11) — propagare către stratul de outreach, nu un CRM writeback dedicat. **Concluzie:** „writeback CRM” din v2 **nu** are coadă canonică; există doar **lanț indirect** prin orchestrator / acțiuni nurturing.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `feedback:writeback:crm` |
| etapa | E5 |
| familie (v2) | `feedback` |
| contract_path | `contracts/neurons/E5/feedback--writeback--crm.md` |
| ADR familie (indicativ) | [feedback](../../adr/families/e5/feedback.md) |

## Scop în context real

**v2:** sincronizare rezultate feedback către CRM (L8088–L8091). **Cod:** rutare plângere → orchestrator (H46) sau alte acțiuni `goldNurturingActions`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L8077–L8097.
- `workers/shared/src/queue-registry.ts` — **fără** `writeback`/`crm` în nume.
- `workers/e5-nurturing/src/workers/h46-feedback-complaint-route.ts` — `QUEUE_OUTREACH_DISPATCH` = `outreach:orchestrator:dispatch` (L33).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L8077–L8097:** span `cognitive.feedback.writeback.crm` (L8096).

## N/A pe criterii

- **8 — Rutare model:** N/A pentru H46 (rutare deterministă); v2 presupune LLM (L8092–L8093) — **divergență**.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Lipsă** coadă `feedback:writeback:crm`. Lanț: **H46** → `outreach:orchestrator:dispatch`. | v2: `feedback:writeback:crm` (L8091). | Mapare indirectă. |
| 2 | Etapă, familie, swimlane | H46: `feedback-nps` (catalog L3184). | v2: `feedback` E5 (L8080). | — |
| 3 | Rol declarat | Rutare reclamație NPS (`h46` L7–10). | v2: writeback CRM (L8088–L8090). | Semantică parțială. |
| 4 | NeuronType + SOFAI | H46: `ReflexNeuron` (catalog L3183). | v2: `EmotionNeuron` (L8084). | — |
| 5 | Criticitate | H46: `HIGH` (L3186). | v2: `MEDIUM` (L8086). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:feedback:complaint:route", …)` (`h46` L70). | v2 span (L8096). | — |
| 7 | Înveliș politică | — | v2 Tier 4 (L8087), fără HITL obligatoriu (L8094). | — |
| 8 | Rutare model (dacă AI) | H46 fără LLM. | v2: vllm-fast (L8092–L8093). | — |
| 9 | Guardrails | Enum canal IN_APP pentru HITL (`h46` L13–14). | v2 L8094. | — |
| 10 | Escaladare HITL | H46: `hitl:complaint:review` pentru sever (`h46` L8–9). | v2 L8094. | — |
| 11 | Micro-OODA | Scor NPS → rută AUTO/HITL → enqueue. | v2 OODA (L8092). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5 + outreach. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.feedback.writeback.crm`.
- **Cod (cea mai apropiată cale):** `cognitive:e5:feedback:complaint:route` + downstream orchestrator.

---
*Audit manual 2026-04-13.*
