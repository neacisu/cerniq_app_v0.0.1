<!-- neuron-contract:author-complete -->

# Neuron `referral:consent:request`

> **Status:** audit manual **2026-04-13**. Graf v2 **`referral:consent:request`** (L8953–8976) — **runtime aliniat:** coadă în [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) (`E5_REFERRAL_CONSENT_REQUEST`), catalog `e5:referral:consent-request`, worker E26 [`e26-referral-consent-request.ts`](../../../../../workers/e5-nurturing/src/workers/e26-referral-consent-request.ts), `withCognitiveSpan("e5:referral:consent-request", …)`. **Notă GDPR:** codul E26 trimite cererea către **referrer** (nu către prospect); descrierea din catalog (`cognitive-node-catalog.ts`) menționează „candidat referit” — **nealiniere** față de comentariile din handler.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `referral:consent:request` |
| etapa | E5 |
| familie (v2) | `referral` |
| contract_path | `contracts/neurons/E5/referral--consent--request.md` |
| ADR familie (indicativ) | [referral](../../adr/families/e5/referral.md) |

## Scop în context real

După detectare referral (E25), cerere de consimțământ către referrer, înregistrare acțiune, programare E27 cu delay 24h pentru expirare automată.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L8953–8976.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e5:referral:consent-request` (~L2993–3001).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E5_REFERRAL_CONSENT_REQUEST` (~L568).
- Handler: [`e26-referral-consent-request.ts`](../../../../../workers/e5-nurturing/src/workers/e26-referral-consent-request.ts).
- Producător: [`e25-referral-detect.ts`](../../../../../workers/e5-nurturing/src/workers/e25-referral-detect.ts) (enqueue E26).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `referral` (L8953–8976)

- **Catalog nodeKey:** `e5:referral:consent-request`
- **Neuron type:** ProceduralNeuron
- **Swimlane:** `referral-management`
- **Criticitate:** HIGH
- **OTel (v2):** `cognitive.e5.referral.consent-request`
- **Evidence status:** catalog-grounded (L8976)

## N/A pe criterii

- **8 — Rutare model:** N/A — E26 este procesare deterministă (fără LLM în E26; E25 folosește LLM separat).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă + catalog + span `e5:referral:consent-request`. | v2 L8970. | — |
| 2 | Etapă, familie, swimlane | Etapa 5, `referral-management`. | v2 E5 `referral`. | — |
| 3 | Rol declarat | Antet E26 + flux GDPR referrer-only. | v2 L8967–8968. | Catalog vs cod (destinatar). |
| 4 | NeuronType + SOFAI | ProceduralNeuron în catalog. | v2 L8961. | — |
| 5 | Criticitate | HIGH. | v2 L8964. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:referral:consent-request", …)` (~L69). | v2 L8975–8976. | — |
| 7 | Înveliș politică | Delay 24h → E27; guard status `PENDING_CONSENT`. | v2 Tier 3 + HITL policy. | — |
| 8 | Rutare model (dacă AI) | **N/A** în E26. | Non-AI în v2. | LLM în lanț: E25. |
| 9 | Guardrails | Skip idempotent dacă status nu mai e `PENDING_CONSENT`. | — | — |
| 10 | Escaladare HITL | Nu în E26 direct. | v2 anomalii încredere. | — |
| 11 | Micro-OODA | Payload job → DB → enqueue E27 delayed. | v2 OODA L8971. | — |
| 12 | Tier + de-escaladare | Tier 3 în v2. | — | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ Redis DB 5, Drizzle. | — | — |

### Mapare OTel

- **v2:** `cognitive.e5.referral.consent-request`.
- **Cod:** `cognitive:e5:referral:consent-request` — concordant cu `withCognitiveSpan`.

---
*Audit manual 2026-04-13.*
