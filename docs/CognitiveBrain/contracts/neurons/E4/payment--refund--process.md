<!-- neuron-contract:author-complete -->

# Neuron `payment:refund:process`

> **Status:** audit manual **2026-04-13**. **Denumire runtime:** coada BullMQ este `revolut:refund:process` (nu literal `payment:refund:process`). v2 L6352–6375 confirmă `Catalog nodeKey` `e4:revolut:refund-process` dar **Confirmed queue field** graf rămâne `payment:refund:process` — documentăm ambele.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (etichetă graf) | `payment:refund:process` |
| coadă runtime (BullMQ) | `revolut:refund:process` |
| etapa | E4 |
| familie (v2) | `cash` |
| contract_path | `contracts/neurons/E4/payment--refund--process.md` |
| ADR familie (indicativ) | [cash](../../adr/families/e4/cash.md) |

## Scop în context real

Procesare rambursare aprobată: încărcare `gold_refunds`, verificare status `APPROVED`, eligibilitate comandă și sumă, apel Revolut (POST /pay invers) cu `request_id` unic, actualizare înregistrare refund. Flux documentat în antetul workerului A4.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L6352–6375 (`Catalog nodeKey` L6359, coadă confirmată graf L6369).
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e4:revolut:refund-process` / `revolut:refund:process` (~L2263–2270).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E4_REVOLUT_REFUND_PROCESS: "revolut:refund:process"` (~L358), worker config ~L1080.
- Handler: [`workers/e4-postsale/src/workers/a4-revolut-refund-process.ts`](../../../../../workers/e4-postsale/src/workers/a4-revolut-refund-process.ts).
- Bootstrap: [`workers/e4-postsale/src/index.ts`](../../../../../workers/e4-postsale/src/index.ts) — A4 ~L158–164.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `cash` (v2 L6352–6375)

- **Catalog nodeKey:** `e4:revolut:refund-process`
- **Neuron type:** `PerceptionNeuron`
- **Swimlane:** `payment-processing`
- **Criticitate (catalog):** `HIGH` (v2 L6363 indică HIGH — consistent)
- **Autonomy tier (v2):** Tier 3 (act with oversight)
- **OODA (v2):** OBSERVE → ORIENT → DECIDE → ACT (PerceptionNeuron)
- **Model routing:** Non-AI
- **OTel span (v2):** `cognitive.e4.revolut.refund-process`
- **Evidence status:** catalog-grounded (v2 L6375)

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Runtime: `revolut:refund:process` (`queue-registry.ts` ~L358). Catalog: `e4:revolut:refund-process`. Graf v2: `payment:refund:process` (L6369). | v2 L6359 + L6369 — reconciliere explicită între etichetă și implementare. | Două string-uri de coadă; operatorul trebuie să folosească constanta registry. |
| 2 | Etapă, familie, swimlane | Catalog: etapa 4, swimlane `payment-processing` (~L2267–2268). | v2: E4, `cash`, `payment-processing`. | — |
| 3 | Rol declarat | A4: eligibilitate, Revolut API, idempotency `request_id` (fișier ~L4–12, ~L100+). | v2 L6366–6367 — „creare refund entry + notificare client”. | „Notificare client” poate fi în ramuri ulterioare webhook — verificat per apelant. |
| 4 | NeuronType + SOFAI | `PerceptionNeuron` în catalog. | v2 L6360 — PerceptionNeuron. | — |
| 5 | Criticitate | `HIGH` în catalog (~L2270). | v2 L6363 — HIGH. | — |
| 6 | Înveliș telemetrie | A4 **nu** folosește `withCognitiveSpan` în fișierul citit. | v2 L6374 — `cognitive.e4.revolut.refund-process`. | Span OTel: țintă v2; implementare span în A4 neobservată la audit. |
| 7 | Înveliș politică | Validări deterministe status refund / comandă / sumă (A4). | v2 L6372 — HITL on anomaly, prag0,80. | Legătura prag0,80 → cod A4: neexplicită în fișier. |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | Set status comenzi eligibile `REFUND_ELIGIBLE_ORDER_STATUSES` (A4 ~L29–35). | — | — |
| 10 | Escaladare HITL | Respingere controlată `ok: false` cu motiv (A4 ~L56–62, ~L90–96) — nu înscrie automat HITL. | v2 L6372. | Coadă `hitl:*` pentru refund mare: neuron separat (ex. K50). |
| 11 | Micro-OODA | Încarcă refund → verificări → apel API Revolut → update DB (A4). | v2 L6371. | — |
| 12 | Tier + de-escaladare | Fără logică încredere numerică în A4. | v2 Tier 3. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ worker E4, client Revolut (`revolut-client.js`), DB Drizzle. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.revolut.refund-process`.
- **Cod:** fără `withCognitiveSpan` pe A4 la audit; span `cognitive:${nodeKey}` ar necesita instrumentare viitoare aliniată la `getNodeByKey("e4:revolut:refund-process")`.

---
*Audit manual 2026-04-13.*
