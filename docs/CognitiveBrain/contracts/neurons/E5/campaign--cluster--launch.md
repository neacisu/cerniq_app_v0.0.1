<!-- neuron-contract:author-complete -->

# Neuron `campaign:cluster:launch`

> **Status:** audit manual **2026-04-13**. **v2** (L8909–L8929): coadă `campaign:cluster:launch`, familie `referral`, `ProceduralNeuron`, OTel `cognitive.campaign.cluster.launch`. **Repo:** **fără** literal `campaign:cluster:launch` în `queue-registry.ts`, `cognitive-node-catalog.ts` și `workers/**/*.ts` (căutare 2026-04-13). **Proximitate:** cozi referral/campaign în E5 (ex. `referral:detect`, `winback:campaign:create`) — **nu** echivalent direct cu „cluster launch” din v2.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `campaign:cluster:launch` |
| etapa | E5 |
| familie (v2) | `referral` |
| contract_path | `contracts/neurons/E5/campaign--cluster--launch.md` |
| ADR familie (indicativ) | [referral](../../adr/families/e5/referral.md) |

## Scop în context real

**v2:** lansare campanie pe cluster (referral subgraph) (L8920–L8922). **Cod:** niciun handler identificat pentru această coadă.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`campaign:cluster:launch\`` (L8909–L8929).
- `workers/shared/src/queue-registry.ts` — fără `campaign:cluster:launch`; compară `E5_WINBACK_CAMPAIGN_CREATE` etc. (L579+).
- `packages/shared/src/cognitive-node-catalog.ts` — fără `campaign:cluster` la audit.
- Căutare `campaign:cluster:launch` în `*.ts` — **0** rezultate (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8925).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** — fără registry/worker. | Confirmed queue v2 (L8923). | v2 L8928 — nereconciliat cu registry. |
| 2 | Etapă, familie, swimlane | Neconectat. | E5, `referral`, swimlane `referral` (L8927). | — |
| 3 | Rol declarat | Lipsă handler. | Lansare cluster (L8920–L8922). | — |
| 4 | NeuronType + SOFAI | Neconectat. | `ProceduralNeuron` (L8916). | — |
| 5 | Criticitate | Neconectat. | `MEDIUM` (L8918). | — |
| 6 | Înveliș telemetrie | Lipsă. | `cognitive.campaign.cluster.launch` (L8928). | Prefix diferit de `cognitive:e5:…`. |
| 7 | Înveliș politică | — | No mandatory HITL (L8926). | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L8925). | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L8926. | — |
| 11 | Micro-OODA | — | OODA generic (L8924). | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8919). | — |
| 13 | Stack (subset plan v2) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.campaign.cluster.launch` (L8928).
- **Cod:** —

---
*Revizuire manuală:* dovezi repo 2026-04-13.
