<!-- neuron-contract:author-complete -->

# Neuron `audit:compliance:check`

> **Status:** audit manual **2026-04-13**. **v2** (L6255–L6275) definește coadă `audit:compliance:check`, `ComplianceNeuron`, criticitate `CRITICAL`, OTel `cognitive.audit.compliance.check`. **Repo:** **nu** există `audit:compliance:check` în `queue-registry.ts`, `cognitive-node-catalog.ts` sau `workers/**/*.{ts,tsx}` (`rg -F`). **Există** însă **J46** — coadă `audit:chain:verify` — verificare deterministă integritate hash-chain audit (`j46-audit-chain-verify.ts`), aliniată semantic la „conformitate tehnică” a jurnalului, dar **cu identificator de coadă și nume OTel diferite** față de neuronul v2.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `audit:compliance:check` |
| etapa | E4 |
| familie (v2) | `audit` |
| contract_path | `contracts/neurons/E4/audit--compliance--check.md` |
| ADR familie (indicativ) | [audit](../../adr/families/e4/audit.md) |

## Scop în context real

**v2:** declanșare audit, orientare reguli, decizie compliant/violation, acțiune log + escaladare (L6270). **Repo:** nu există implementare pentru coada nominală v2. **Cel mai apropiat flux implementat:** J46 recalculează hash-uri pe `gold_audit_logs_etapa4`, setează `e4AuditChainIntegrityGauge`, loghează breach (L68–90 în sursa citită). **Nu** echivalență 1:1: reconcilierea v2 ↔ J46 necesită decizie de catalog (fuziune neuroni sau redenumire coadă).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`audit:compliance:check\`` (L6255–L6275).
- `workers/shared/src/queue-registry.ts` — **fără** `audit:compliance:check`; **există** `E4_AUDIT_CHAIN_VERIFY: "audit:chain:verify"` (L482–483); config worker concurrency (L1202–L1203).
- `packages/shared/src/cognitive-node-catalog.ts` — **fără** `audit:compliance:check`; **există** `e4:audit:chain-verify` / `audit:chain:verify` (L2659–L2667).
- `workers/e4-postsale/src/workers/j46-audit-chain-verify.ts` — `withCognitiveSpan("e4:audit:chain:verify", …)` (L43–45).
- `workers/e4-postsale/src/index.ts` — worker J46 (L507–513); cron (L655–664).
- `workers/shared/src/cognitive-helpers.ts` — span activ `cognitive:${nodeKey}` (L226).
- Căutare `audit:compliance:check` în `*.{ts,tsx,js,mjs}` — **0** rezultate (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- — (un singur bloc NEURON în v2 pentru această coadă; fără instanță duplicată în secțiunea citită).

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6271).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru `audit:compliance:check`; runtime: `audit:chain:verify` + `e4:audit:chain-verify`. | v2 queue L6269. | Două nume; reconciliere deschisă. |
| 2 | Etapă, familie, swimlane | Catalog J46: etapă `4`, swimlane `audit-compliance` (L2663–L2664). | v2 familie `audit`, metrică `swimlane="audit"` (L6273). | Etichetă swimlane metrică v2 vs catalog. |
| 3 | Rol declarat | J46: verificare lanț hash read-only (header `j46-audit-chain-verify.ts` L4–19). | Conformitate + escaladare (v2 L6268–L6270). | v2 mai larg decât hash-chain. |
| 4 | NeuronType + SOFAI | `ComplianceNeuron` în catalog pentru J46 (L2663). | v2 `ComplianceNeuron` L6262. | — |
| 5 | Criticitate | Catalog J46: `CRITICAL` (L2665). | v2 `CRITICAL` L6264. | — |
| 6 | Înveliș telemetrie | Span efectiv: `cognitive:e4:audit:chain:verify` (L43–45 + `cognitive-helpers` L226). | v2 `cognitive.audit.compliance.check` (L6274). | Convenție nume diferită. |
| 7 | Înveliș politică | Nu extras Cedar/OPA din J46 în această citire. | HITL mandatory, SLA 2h (L6272). | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI L6271. | — |
| 9 | Guardrails | Verificare deterministă + gauge integritate. | — | — |
| 10 | Escaladare HITL | Gauge + log la breach (J46); cozi `hitl:*` separate în registry. | v2 L6272. | — |
| 11 | Micro-OODA | J46: citire lanț, comparare hash, setare gauge. | v2 OODA generic (L6270). | — |
| 12 | Tier + de-escaladare | — | Tier 2 (L6265). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + cron J46 (`index.ts` L655–664). | — | — |

### Mapare OTel

- **v2:** `cognitive.audit.compliance.check` (L6274).
- **Cod:** `cognitive:e4:audit:chain:verify` pentru J46. **Nu** există handler care să emită exact spanul nominal v2.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
