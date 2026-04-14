<!-- neuron-contract:author-complete -->

# Neuron `geo:weather:correlate`

> **Status:** audit manual **2026-04-13**. **v2** coadă `geo:weather:correlate` (L8187–8207), familie `geo`. **Cod:** **nu** există `geo:weather:*` în registry. Flux echivalent: **`alerts:weather:monitor`** (J52) → **`alerts:weather:match`** (J53) (`queue-registry.ts` L625–627). Procesori în `workers/e5-nurturing/src/workers/j52-*.ts`, `j53-*.ts`. **`index.ts`** nu le înregistrează în `bootstrap()` (ultimul `push` este C19, L91).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `geo:weather:correlate` |
| etapa | E5 |
| familie (v2) | `geo` |
| contract_path | `contracts/neurons/E5/geo--weather--correlate.md` |
| ADR familie (indicativ) | [geo](../../adr/families/e5/geo.md); alerte: [alerts](../../adr/families/e5/alerts.md) |

## Scop în context real

**v2:** corelare date geo / meteo, Non-AI. **Cod:** J52 citește alerte ANM (severități filtrate); J53 potrivește județul cu `goldCompanies.judet` și enfilează campanii (antete `j52` L7–10, `j53` L7–14).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`geo:weather:correlate\`` (L8187–8207).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:alert:weather-monitor` (L3237–3244); `e5:alert:weather-match` (L3246–3253); swimlane **`alerts-weather`**.
- `workers/shared/src/queue-registry.ts` — `E5_ALERT_WEATHER_MONITOR`, `E5_ALERT_WEATHER_MATCH` (L625–627).
- `workers/e5-nurturing/src/workers/j52-alert-weather-monitor.ts` — `withCognitiveSpan("e5:alert:weather-monitor", …)` (L66).
- `workers/e5-nurturing/src/workers/j53-alert-weather-match.ts` — `withCognitiveSpan("e5:alert:weather-match", …)` (L53).
- `workers/e5-nurturing/src/index.ts` — fără import J52/J53; `push` se oprește la C19 (L36–40, L86–91).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8203).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** `geo:weather:correlate`. Runtime: **`alerts:weather:monitor`**, **`alerts:weather:match`**. | v2 coadă (L8201). | Prefix `geo:` vs `alerts:`. |
| 2 | Etapă, familie, swimlane | Catalog: etapa 5, swimlane **`alerts-weather`** (L3242, L3251). | v2 familie `geo` (L8190–8191). | Familie v2 ≠ swimlane cod. |
| 3 | Rol declarat | ANM → match clienți → trigger campanie (antete J52/J53). | v2 descriere geo generică (L8198–8200). | — |
| 4 | NeuronType + SOFAI | J52: **`AlertNeuron`** (L3241); J53: **`AssociativeNeuron`** (L3250). | v2 `AssociativeNeuron` (L8194). | J52 ≠ tip v2. |
| 5 | Criticitate | Ambele **`HIGH`** în catalog (L3244, L3253). | v2 **`MEDIUM`** (L8196). | Divergență. |
| 6 | Înveliș telemetrie | `e5:alert:weather-monitor` / `e5:alert:weather-match`. | v2 `cognitive.geo.weather.correlate` (L8206). | Prefix `alert` vs `geo` în OTel. |
| 7 | Înveliș politică | — | v2 L8203–8204. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Severități YELLOW+ (J52 L24–25); `judet` schema (J53 antet). | NeMo destinație ADR-0007. | — |
| 10 | Escaladare HITL | — | v2 L8204. | — |
| 11 | Micro-OODA | Monitor → match → enqueue. | v2 L8200. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8197). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + HTTP + Drizzle. | — | — |

### Mapare OTel

- **v2:** `cognitive.geo.weather.correlate`.
- **Cod:** `e5:alert:weather-monitor`, `e5:alert:weather-match`.

---
*Audit manual 2026-04-13; surse verificate în repo.*
