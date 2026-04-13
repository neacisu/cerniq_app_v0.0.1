<!-- neuron-contract:author-complete -->

# Neuron `winback:campaign:enroll`

> **Status:** audit manual **2026-04-13**. Graf v2 **`winback:campaign:enroll`** (L9132–9152) — **fără** literal în [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts). **Mapare semantică:** crearea și activarea campaniei winback în cod este **`winback:campaign:create`** — F32 [`f32-winback-campaign-create.ts`](../../../../../workers/e5-nurturing/src/workers/f32-winback-campaign-create.ts), `withCognitiveSpan("e5:winback:campaign-create", …)`, catalog `e5:winback:campaign-create`. „Enroll” în v2 corespunde operațional intrării clientului într-o campanie nou creată (INSERT + enqueue F33/F36).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `winback:campaign:enroll` |
| coadă runtime (semantic) | `winback:campaign:create` |
| etapa | E5 |
| familie (v2) | `winback` |
| contract_path | `contracts/neurons/E5/winback--campaign--enroll.md` |
| ADR familie (indicativ) | [winback](../../adr/families/e5/winback.md) |

## Scop în context real

Inițiere campanie winback (strategie pe revenue), persistență pași, pornire execuție sau escaladare HITL.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L9132–9152.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e5:winback:campaign-create` (~L3050+).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E5_WINBACK_CAMPAIGN_CREATE` (~L581).
- Producător exemplu: [`a6-state-transition-execute.ts`](../../../../../workers/e5-nurturing/src/workers/a6-state-transition-execute.ts) — enqueue `winback:campaign:create` la `CHURNED`.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `winback` (L9132–9152)

- **Evidence status:** graph-export (L9152)
- **OTel (v2):** `cognitive.winback.campaign.enroll`
- **Model routing (v2):** LLM (L9149) — **nu** regăsit în F32 citit (F32 e logică deterministă pe threshold-uri).

## N/A pe criterii

- **8:** v2 marchează LLM; **cod F32** — verificare completă fișier pentru apeluri LLM (antet: fără LLM).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `enroll` graf vs `create` registry. | v2 L9146. | ADR winback L34. |
| 2 | Etapă, familie, swimlane | Catalog: `winback-campaigns`. | v2 E5 `winback`. | — |
| 3 | Rol declarat | F32: strategie, INSERT campanie, enqueue pasuri. | v2 L9143–9145. | — |
| 4 | NeuronType + SOFAI | ExecutiveNeuron inferat v2; catalog F32 — verificare. | v2 ExecutiveNeuron. | — |
| 5 | Criticitate | — | MEDIUM inferat. | — |
| 6 | Înveliș telemetrie | `e5:winback:campaign-create`. | v2 L9151. | — |
| 7 | Înveliș politică | Praguri revenue → strategie + `requiresHitl`. | v2 L9148. | — |
| 8 | Rutare model (dacă AI) | F32 antet: procesare deterministă. | v2 LLM routing. | **Contradicție** v2 vs implementare citită. |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | `winback:escalate:hitl` din F32 când cazul o cere. | v2 fără HITL obligatoriu. | — |
| 11 | Micro-OODA | Job → DB → F33 sau escaladare. | v2 OODA orchestrare. | — |
| 12 | Tier + de-escaladare | — | Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ DB 5. | — | — |

### Mapare OTel

- **v2:** `cognitive.winback.campaign.enroll`.
- **Cod:** `cognitive:e5:winback:campaign-create`.

---
*Audit manual 2026-04-13.*
