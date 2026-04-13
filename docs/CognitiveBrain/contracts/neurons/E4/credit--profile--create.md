<!-- neuron-contract:author-complete -->

# Neuron `credit:profile:create`

> **Status:** audit manual **2026-04-13**. **C13** creează profilul și pornește **FlowProducer** cu copii C14+C15+C16; coada `credit:profile:create` este canonică în registry și catalog.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `credit:profile:create` |
| etapa | E4 |
| familie (v2) | `credit` |
| contract_path | `contracts/neurons/E4/credit--profile--create.md` |
| ADR familie (indicativ) | [credit](../../adr/families/e4/credit.md) |

## Scop în context real

**v2** (L6763–6786). **Cod:** upsert `gold_credit_profiles`, apoi fan-out Flow către cozile de fetch + parent C17 (`c13-credit-profile-create.ts` L4–15, L35+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`credit:profile:create\`` (L6763–6786).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:credit:profile-create` (L2348–2356).
- `workers/shared/src/queue-registry.ts` — `E4_CREDIT_PROFILE_CREATE` (L386).
- `workers/e4-postsale/src/index.ts` — C13 (L234–239).
- `workers/e4-postsale/src/workers/c13-credit-profile-create.ts` — `withCognitiveSpan("e4:credit:profile:create", …)` (L36–38).
- `workers/e4-postsale/src/__tests__/c-workers.test.ts` — C13 / flow.
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6782).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog: **`e4:credit:profile-create`** / `credit:profile:create` (L2349–2350). Registry L386. | v2 L6780; L6770. | Procesor folosește **`e4:credit:profile:create`** în span (L36–38) — **nu** coincide cu `nodeKey` catalog (`profile-create` vs `profile:create`). |
| 2 | Etapă, familie, swimlane | `CreditNeuron`, `credit-decision` (L2352–2353). | v2 L6773–6774. | — |
| 3 | Rol declarat | Creare profil + Flow C14–C16 (c13 L4–10). | v2 L6777–6779. | — |
| 4 | NeuronType + SOFAI | `CreditNeuron` (L2352). | v2 L6771. | — |
| 5 | Criticitate | `HIGH` (L2355). | `HIGH` v2 (L6774). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:credit:profile:create", …)` (L36–38). | v2 `cognitive.e4.credit.profile-create` (L6785). | Triplu stil: catalog cu **`-`**, span cu **`:`** între segmente, v2 cu **`.`** — risc atribute catalog lipsă. |
| 7 | Înveliș politică | — | v2 L6783. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Upsert idempotent pe (tenantId, clientId) (c13 L15). | NeMo țintă. | — |
| 10 | Escaladare HITL | — | v2 L6783. | — |
| 11 | Micro-OODA | Orchestrare Flow → copii paraleli → C17. | v2 L6781. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L6775). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ `FlowProducer`, Redis E4. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.credit.profile-create`.
- **Cod:** span `cognitive:e4:credit:profile:create`; catalog `e4:credit:profile-create`.
- **Stare:** **necesită reconciliere** așirului `nodeKey` în `withCognitiveSpan` cu catalog pentru atribute consistente.

---
*Generator inițial:* înlocuit prin audit manual.
