<!-- neuron-contract:author-complete -->

# Neuron `human:notification:send`

> **Status:** audit manual **2026-04-11**. **Gap runtime:** `grep` pe `human:notification:send` în `*.ts`/`*.js` → **zero** rezultate. În `queue-registry.ts` cozile E3 HITL sunt **`human:escalate`**, **`human:takeover`**, **`human:approve`** (L342–345) — **fără** `human:notification:send`. **Catalog:** fără `nodeKey` pentru această coadă (`grep` în `cognitive-node-catalog.ts`). v2: graph-export, ne-reconciliat cu registry (L5182–5183).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `human:notification:send` |
| etapa | E3 |
| familie (v2) | `human` |
| contract_path | `contracts/neurons/E3/human--notification--send.md` |
| ADR familie (indicativ) | [human](../../adr/families/e3/human.md) (dacă există) |

## Scop în context real

**v2** (L5163–5183): **HumanNeuron** inferat, **MEDIUM**, Tier 4, OODA cu LangGraph checkpoint, **Non-AI**. **Comportament în repo:** **lipsă** procesor dedicat și coadă înregistrată sub acest nume. Notificările operaționale pot fi acoperite parțial de alte căi (ex. Resend în alți workeri) — **fără** echivalență 1:1 demonstrată la audit pentru `human:notification:send`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5163–5183.
- `workers/shared/src/queue-registry.ts` — L342–345 (cozi `human:*` E3).
- `workers/e3-ai-sales/src/main.ts` — `grep` `human:` pe înregistrări procesor.
- `packages/shared/src/cognitive-node-catalog.ts` — fără potrivire `notification:send`.
- Căutare repo `human:notification:send` — zero (2026-04-11).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5179).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** — fără `nodeKey` / coadă în registry. | v2 câmp coadă (L5177). | v2 §2.4. |
| 2 | Etapă, familie, swimlane | — | E3, human; swimlane `human` în metrici (L5181). | — |
| 3 | Rol declarat | — | v2 operațional human (L5174–5176). | — |
| 4 | NeuronType + SOFAI | — | v2 HumanNeuron inferat (L5170). | — |
| 5 | Criticitate | — | v2 MEDIUM inferat (L5172). | — |
| 6 | Înveliș telemetrie | — | v2 `cognitive.human.notification.send` (L5182). | Fără worker — span neemise. |
| 7 | Înveliș politică | — | v2 fără HITL obligatoriu (L5180). | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | — | Audit90 zile (L5180). | — |
| 10 | Escaladare HITL | Cozi înrudite: `human:escalate` etc. (registry) — **alt nume**. | v2 OODA HITL task (L5178). | Nu echivalent `notification:send`. |
| 11 | Micro-OODA | — | v2 (L5178). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4 (L5173). | — |
| 13 | Stack (subset) | — | v2 §2.3; LangGraph menționat în v2 OODA. | Fără cod LangGraph pentru acest neuron la audit. |

### Mapare OTel

- **v2:** `cognitive.human.notification.send`.
- **Cod:** **neimplementat** — fără `cognitive.nodeKey`.

---
*Generator inițial:* înlocuit prin audit manual.
