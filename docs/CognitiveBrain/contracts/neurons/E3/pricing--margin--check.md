<!-- neuron-contract:author-complete -->

# Neuron `pricing:margin:check`

> **Status:** audit manual **2026-04-13**. **v2:** `GuardrailNeuron`, **CRITICAL**, Tier 2, Non-AI, NeMo în OODA. **Cod:** guardrail **determinist** — marjă minimă **8%** hard-coded; fără NeMo în fișier. **Atenție integrare:** singurul producător de job-uri găsit în repo (`d21-negotiation-items-update.ts`) trimite **`discountPct`** în payload, iar procesorul citește **`proposedDiscountPct`** — vezi „Scop” și rândul 3 din tabel.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pricing:margin:check` |
| etapa | E3 |
| familie (v2) | `pricing` |
| contract_path | `contracts/neurons/E3/pricing--margin--check.md` |
| ADR familie (indicativ) | [pricing](../../adr/families/e3/pricing.md) |

## Scop în context real

**v2** (L5508–5531): verificare marjă minimă, `GuardrailNeuron`, **CRITICAL**, Tier 2, OODA cu NeMo + verificări deterministe. **Cod:** calculează `marginPct` din `unitPrice`, `proposedDiscountPct`, `costPrice` opțional; dacă `costPrice` lipsește sau 0, `marginPct=null` și **nu** blochează; dacă `marginPct < 8`, aruncă `MARGIN_VIOLATION`. Constanta `MIN_MARGIN_PCT = 8` (e30 L13).

**Integrare D21 → E30 (dovadă):** `negotiationItemsUpdateProcessor` deschide coada și face `.add("pricing:margin:check", { tenantId, productId, unitPrice, discountPct: item.discountPct })` (`d21-negotiation-items-update.ts` L86–88, L104–110). Procesorul extrage `proposedDiscountPct` din `job.data` (e30 L36). **Nu** există mapare `discountPct` → `proposedDiscountPct` în fișierele citite. Pentru job-urile produse de D21, `proposedDiscountPct` rămâne `undefined`, deci `sellingPrice` devine `NaN` în expresia curentă — comportament **defect** față de intenția guardrail-ului; testele din `e-workers.test.ts` folosesc payload corect (`proposedDiscountPct`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`pricing:margin:check\`` (L5508–5531).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:pricing:margin-check` / `pricing:margin:check` (L1767–1775).
- `workers/shared/src/queue-registry.ts` — `E3_PRICING_MARGIN_CHECK` (L249).
- `workers/e3-ai-sales/src/main.ts` — `processors["pricing:margin:check"]` (L210).
- `workers/e3-ai-sales/src/workers/e30-pricing-margin-check.ts` — procesor (formulă L40–42, prag L48–51).
- `workers/e3-ai-sales/src/workers/d21-negotiation-items-update.ts` — `createQueue("pricing:margin:check")` + `.add` cu `discountPct` în payload (L86–88, L104–110).
- `workers/e3-ai-sales/src/__tests__/e-workers.test.ts` — `E30 — pricingMarginCheckProcessor` (L723+); `makeE30Job` folosește `proposedDiscountPct` (L711–720).
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` / atribute span (L226–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 «Non-AI neuron — deterministic processing» (L5527).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e3:pricing:margin-check` (catalog L1768); registry L249; `main.ts` L210. | `pricing:margin:check` (v2 L5525). | — |
| 2 | Etapă, familie, swimlane | Catalog etapa 3, swimlane `pricing-engine` (L1772). | v2 familie `pricing`, swimlane `pricing-engine` (L5511, L5518). | — |
| 3 | Rol declarat | Formula marjă + prag 8% + throw la încălcare (e30 L40–51). | Guardrail preț sub cost (v2 L5522–5524). | Fără cost → nu se verifică marjă (e30 L41–42). **Plus:** producător D21 trimite `discountPct`, nu `proposedDiscountPct` (d21 L105–109 vs e30 L36) — contract job-data nealiniat pentru traseul negociere. |
| 4 | NeuronType + SOFAI | Catalog **`GuardrailNeuron`** (L1771). | v2 `GuardrailNeuron` (L5516). | — |
| 5 | Criticitate | Catalog **`CRITICAL`** (L1774). | `CRITICAL` (v2 L5519). | — |
| 6 | Înveliș telemetrie | Factory + `withCognitiveSpan` → `cognitive:e3:pricing:margin-check`. | v2 `cognitive.e3.pricing.margin-check` (L5530). | Convenție denumire ca la ceilalți. |
| 7 | Înveliș politică | Gating prin excepție; fără OPA în fișier. | Tier 2; HITL obligatoriu acțiuni ireversibile (v2 L5520, L5528). | Legătura HITL **nu** e în e30; poate fi în fluxul negocierii — neaudit complet aici. |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI (L5527). | — |
| 9 | Guardrails | Verificare deterministă marjă; **fără** apel NeMo în e30. | NeMo în OODA v2 (L5526). | **Divergență:** NeMo menționat în v2, absent în procesor. |
| 10 | Escaladare HITL | Eșec = throw către BullMQ retries; fără `human:escalate` în e30. | HITL + SLA 2h (v2 L5528). | — |
| 11 | Micro-OODA | Observare payload job → calcul marjă → decizie allow/violation. | OODA cu NeMo + checks (v2 L5526). | NeMo: lipsă în cod citit. |
| 12 | Tier + de-escaladare | Prag fix 8%; fără încredere model. | Tier 2; trigger confidență în alte neuroni v2 (L5520). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + calcule locale. | NeMo ca strat v2 (L5526). | NeMo **neinvocat** în e30. |

### Mapare OTel

- **v2:** `cognitive.e3.pricing.margin-check`.
- **Cod:** `cognitive:e3:pricing:margin-check` + atribute catalog.
- **Stare:** instrumentare factory; denumire față de v2 ca la ceilalți.

---
*Generator inițial:* înlocuit prin audit manual.
