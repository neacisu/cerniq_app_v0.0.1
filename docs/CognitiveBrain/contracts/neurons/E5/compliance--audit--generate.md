<!-- neuron-contract:author-complete -->

# Neuron `compliance:audit:generate`

> **Status:** audit manual **2026-04-13**. **v2** (L7716–L7736): coadă `compliance:audit:generate`, `ComplianceNeuron`, E5. **Repo:** **fără** literal `compliance:audit:generate` în `queue-registry.ts` sau workeri TS; familia operațională apropiată este **K56–K58** (`compliance:gdpr:check`, `compliance:competition:law`, `compliance:data:retention`) — vezi `docs/CognitiveBrain/adr/families/e5/compliance.md` (mapare deschisă între graf v2 și registry). **Concluzie:** neuron **documentat în v2 ca export graf**; generarea „audit trail” apare parțial în K56 (INSERT acțiuni audit la violări GDPR) și K58 (audit retenție), dar **nu** există o coadă unică cu acest nume.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `compliance:audit:generate` |
| etapa | E5 |
| familie (v2) | `compliance` |
| contract_path | `contracts/neurons/E5/compliance--audit--generate.md` |
| ADR familie (indicativ) | [compliance](../../adr/families/e5/compliance.md) |

## Scop în context real

**v2:** OODA audit — trigger → verificare reguli → log + escaladare (L7731). **Cod:** nu există procesor dedicat; funcții înrudite: **K57** (review campanii concurență), **K56/K58** (GDPR + retenție cu înregistrări în `goldNurturingActions`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7716–L7736.
- `docs/CognitiveBrain/adr/families/e5/compliance.md` — neuroni exemple vs registry.
- `workers/shared/src/queue-registry.ts` — K56–K58 (L633–L638); **fără** `audit:generate`.
- `rg` workspace: zero fișiere `workers/` cu `compliance:audit:generate`.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L7716–L7736:** `ComplianceNeuron`, coadă `compliance:audit:generate`, span `cognitive.compliance.audit.generate`, non-AI (L7732).

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 non-AI (L7732); fără worker dedicat.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Lipsă** coadă/registry cu acest literal. Apropiere: `compliance:competition:law` (K57), `compliance:gdpr:check` (K56). | v2: `compliance:audit:generate`. | Mapare semantică deschisă. |
| 2 | Etapă, familie, swimlane | K56–K58: swimlane catalog `audit-compliance` (`cognitive-node-catalog.ts` L3280, L3289, L3298). | v2: E5, `compliance`. | — |
| 3 | Rol declarat | K56: audit violări GDPR în `goldNurturingActions`; K57: review campanii; K58: retenție + audit. | v2: audit + escaladare (L7729–L7731). | Nu este un singur worker „generate audit report”. |
| 4 | NeuronType + SOFAI | `ComplianceNeuron` (K56, K57) / `MaintenanceNeuron` (K58) în catalog. | v2: `ComplianceNeuron` (L7723). | Tip diferit la K58. |
| 5 | Criticitate | K56 `CRITICAL`; K57 `HIGH`; K58 `HIGH` (catalog L3282, L3291, L3299). | v2: `MEDIUM` (L7725). | — |
| 6 | Înveliș telemetrie | K57: `withCognitiveSpan("e5:compliance:competition-law", …)` (`k57` L207). | v2: `cognitive.compliance.audit.generate` (L7735). | Span v2 fără corespondent 1:1. |
| 7 | Înveliș politică | K56 severitate CRITICAL în antet worker (`k56` L4–5). | v2 Tier 4, fără HITL obligatoriu (L7726, L7733). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 non-AI. | — |
| 9 | Guardrails | Reguli SQL / enum-uri stricte în K56–K58 (comentarii anti-halucinare în fișiere). | v2: audit log 90 zile (L7733). | — |
| 10 | Escaladare HITL | K58/K56 log + acțiuni; H46 poate ruta spre `hitl:*` în alte fluxuri — nu în acest neuron izolat. | v2: escaladare violări (L7731). | — |
| 11 | Micro-OODA | Per worker K56–K58 (SELECT → log → INSERT audit). | v2 OODA (L7731). | — |
| 12 | Tier + de-escaladare | Concurrency 1 pe cozi K (`queue-registry` metadata). | v2 Tier 4 (L7726). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5, `@cerniq/db`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.compliance.audit.generate`.
- **Cod:** nu există span cu acest nume; cele mai apropiate: `cognitive:e5:compliance:gdpr-check`, `cognitive:e5:compliance:competition-law`, `cognitive:e5:compliance:data-retention`.

---
*Audit manual 2026-04-13.*
