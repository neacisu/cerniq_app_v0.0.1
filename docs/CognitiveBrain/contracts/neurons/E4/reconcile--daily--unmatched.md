<!-- neuron-contract:author-complete -->

# Neuron `reconcile:daily:unmatched`

> **Status:** audit manual **2026-04-13**. v2 L6377–6397: **evidence status** = graph-export — coadă **nu** apare în `queue-registry.ts`. În runtime, cazul „unmatched” este tratat în lanțul B7→B8→**B9** (`payment:reconcile:manual`), nu printr-un job zilnic cu acest nume.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `reconcile:daily:unmatched` |
| etapa | E4 |
| familie (v2) | `cash` |
| contract_path | `contracts/neurons/E4/reconcile--daily--unmatched.md` |
| ADR familie (indicativ) | [cash](../../adr/families/e4/cash.md) |

## Scop în context real

**Destinație conceptuală (graf):** raportare / colectare zilnică a plăților fără potrivire, spre escaladare. **Implementare Cerniq (dovadă):** nu există literal `reconcile:daily:unmatched` în registry; fluxul „no match” duce la B8 apoi B9 cu `reason: "unmatched"` când nu există candidați fuzzy (`b8-payment-reconcile-fuzzy.ts`, teste în `b-workers.test.ts`).

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L6377–6397 (swimlane `cash` în metrici v2 L6395 — nealiniat la `payment-processing` din restul cozilor E4).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `rg` fără potrivire pentru string-ul cozii (confirmat la audit).
- Lanț reconciliere: [`b7-payment-reconcile-auto.ts`](../../../../../workers/e4-postsale/src/workers/b7-payment-reconcile-auto.ts), [`b8-payment-reconcile-fuzzy.ts`](../../../../../workers/e4-postsale/src/workers/b8-payment-reconcile-fuzzy.ts), [`b9-payment-reconcile-manual.ts`](../../../../../workers/e4-postsale/src/workers/b9-payment-reconcile-manual.ts).
- ADR cash (gap): [`adr/families/e4/cash.md`](../../adr/families/e4/cash.md).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `cash` (v2 L6377–6397)

- **Tip inferat (v2):** `ReconciliationNeuron`
- **Criticitate inferată:** `MEDIUM`
- **Autonomy tier (v2):** Tier 4
- **Confirmed queue field:** `reconcile:daily:unmatched`
- **Evidence status:** graph-export — ne-reconciliat cu registry (v2 L6397)
- **OTel (v2):** `cognitive.reconcile.daily.unmatched`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI (v2).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap registry:** fără coadă cu acest nume. `nodeKey` catalog: **lipsă** pentru `reconcile:daily:unmatched`. | v2 L6391 — etichetă graf. | Contractul păstrează eticheta v2; runtime folosește alt mecanism (B9). |
| 2 | Etapă, familie, swimlane | B9: swimlane implicit `payment-processing` (aceeași familie cash ca restul plăților). | v2: E4, `cash`; metrică v2 L6395 menționează swimlane `cash` — posibilă nealiniere la catalog. | — |
| 3 | Rol declarat | B9: procesare manuală cu candidați sau `unmatched` (antet `b9-payment-reconcile-manual.ts`). | v2 L6388–6390 — descriere generică reconciliere. | „Zilnic” — neimplementat ca job separat cu acest nume. |
| 4 | NeuronType + SOFAI | B9 catalog: `ReconciliationNeuron` pentru `payment:reconcile:manual` (vecin în `cognitive-node-catalog.ts`). | v2 — ReconciliationNeuron inferat. | Mapare semantică, nu identitate v2_queue. |
| 5 | Criticitate | `payment:reconcile:manual` = HIGH în catalog. | v2 inferat MEDIUM. | Nealiniere criticitate graf vs catalog pe calea reală. |
| 6 | Înveliș telemetrie | B7/B8/B9: metrici reconciliere; fără span dedicat `cognitive.reconcile.daily.unmatched`. | v2 L6396. | Span v2 rămâne neimplementat pentru eticheta graf. |
| 7 | Înveliș politică | B9 = tier manual / HITL operațional. | v2 L6394 — fără HITL obligatoriu. | Contradicție între v2 (graf) și politica reală B9. |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | Validări în `reconciliation-engine` + idempotență plăți PENDING în B7/B8. | — | — |
| 10 | Escaladare HITL | B9 este coada manuală explicită. | v2 OODA L6392. | — |
| 11 | Micro-OODA | Observare eveniment plată → tier auto/fuzzy → manual (plan FAZA 8c în comentarii workeri). | v2 L6392. | — |
| 12 | Tier + de-escaladare | Fără prag 0,80 pe calea „unmatched” în B8 (motiv `unmatched` la0 candidați). | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ pentru `payment:reconcile:manual` etc. | — | Job „daily batch” separat: neconfirmat. |

### Mapare OTel

- **v2:** `cognitive.reconcile.daily.unmatched`.
- **Cod:** nu există handler cu acest nume; telemetrie practică pe cozile B7/B8/B9 și metricile `e4_reconciliation_*`. Migrare: fie redenumire graf, fie introducere coadă dedicată — decizie de produs.

---
*Audit manual 2026-04-13.*
