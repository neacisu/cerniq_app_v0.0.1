<!-- neuron-contract:author-complete -->

# Neuron `churn:alert:escalate`

> **Status:** audit manual **2026-04-13**. Graf v2 **`churn:alert:escalate`** (L7578–7598) — **runtime:** **`churn:risk:escalate`**, `nodeKey` **`e5:churn:risk-escalate`**, worker B11 [`b11-churn-risk-escalate.ts`](../../../../../workers/e5-nurturing/src/workers/b11-churn-risk-escalate.ts). ADR [`e5/churn.md`](../../adr/families/e5/churn.md) documentează deja nealinierea denumirii.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `churn:alert:escalate` |
| coadă runtime | `churn:risk:escalate` |
| etapa | E5 |
| familie (v2) | `churn` |
| contract_path | `contracts/neurons/E5/churn--alert--escalate.md` |
| ADR familie (indicativ) | [churn](../../adr/families/e5/churn.md) |

## Scop în context real

Escalare risc churn CRITICAL/HIGH: creare task HITL (`hitl:churn:intervention`), SLA 2h/8h, opțional trigger `winback:campaign:create` pentru CRITICAL (comentariu B11).

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7578–7598.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e5:churn:risk-escalate` (~L2852–2859); tip **AlertNeuron** în catalog (v2 inferă PredictiveNeuron — **contradicție**).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E5_CHURN_RISK_ESCALATE` (~L534).
- Handler: [`b11-churn-risk-escalate.ts`](../../../../../workers/e5-nurturing/src/workers/b11-churn-risk-escalate.ts) — `withCognitiveSpan("e5:churn:risk-escalate", …)` (~L58).
- ADR: [`adr/families/e5/churn.md`](../../adr/families/e5/churn.md) — L36.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `churn` (v2 L7578–7598)

- **Confirmed queue field (graf):** `churn:alert:escalate`
- **Evidence status:** graph-export (L7598)
- **Model routing (v2):** LLM primary/fallback (L7594) — **nu** regăsit ca atare în ramura nominală B11 citită (B11 folosește utilitare consensus condiționat — citire completă pentru ramuri LLM).
- **OTel (v2):** `cognitive.churn.alert.escalate`

## N/A pe criterii

- — (rând 8: parțial AI în v2; verificați cod B11 pentru apeluri LLM reale).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `churn:risk:escalate` + `e5:churn:risk-escalate`. Graf: `churn:alert:escalate`. | v2 L7592. | Denumire alert vs risk. |
| 2 | Etapă, familie, swimlane | Catalog: etapa 5, `churn-detection`. | v2 E5 churn. | — |
| 3 | Rol declarat | B11 antet + logică HITL/winback (~L1–12, ~L62+). | v2 L7590–7591. | — |
| 4 | NeuronType + SOFAI | **AlertNeuron** în catalog. | v2 PredictiveNeuron inferat. | **Contradicție** tip. |
| 5 | Criticitate | **CRITICAL** în catalog. | v2 MEDIUM inferat. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:churn:risk-escalate", …)`; metrică `e5ChurnEscalationsTotal`. | v2 L7597. | Span v2 vs cod. |
| 7 | Înveliș politică | SLA din cod B11. | v2 L7595. | — |
| 8 | Rutare model (dacă AI) | Import `consensusStructuredVote` etc. — verificare ramuri LLM în fișier complet. | v2 L7594 — rutare LLM. | Dovadă parțială din antet + importuri. |
| 9 | Guardrails | Doar CRITICAL/HIGH escaladate. | — | — |
| 10 | Escaladare HITL | Cale principală B11. | v2 L7595. | — |
| 11 | Micro-OODA | Evaluare risc → enqueue HITL / winback. | v2 L7593. | — |
| 12 | Tier + de-escaladare | Prioritate numerică din `riskLevel`. | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5, cozi ad-hoc `hitl:churn:intervention`, `winback:campaign:create` în B11. | — | Aceste cozi pot fi în afara registry central — vezi comentariu B11. |

### Mapare OTel

- **v2:** `cognitive.churn.alert.escalate`.
- **Cod:** `cognitive:e5:churn:risk-escalate` — aliniat `e5:churn:risk-escalate` din catalog.

---
*Audit manual 2026-04-13.*
