<!-- neuron-contract:author-complete -->

# Neuron `enrich:email:role-check`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:email:role-check` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--email--role-check.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** înregistrează `enrich:email:role-check` (ToolNeuron, Non-AI). **În repo:** fără coadă dedicată. Indicatorul **email de tip «role»** (ex. admin@, sales@) vine din Hunter **email-verifier**: câmpul boolean `role` în `HunterEmailVerifyResult` (`hunter-api-client.ts`), mapat la coloana `emailRoleBased` și inclus în log `responsePayload: result` în `g2-hunter-verifier.ts` (~L63–90). ZeroBounce citat în alte contracte nu a fost folosit ca sursă principală pentru «role» în acest audit.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:email:role-check\`` (~L2127–2147).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:discover:email-hunter-verify` / `discover:email:hunter-verify` (~L601–607).
- `workers/enrichment/src/workers/g2-hunter-verifier.ts` — `emailRoleBased: Boolean(result.role ?? false)` (~L88–90); `hunterEmailVerify` (~L53).
- `workers/enrichment/src/lib/hunter-api-client.ts` — `role: boolean` în rezultat (~L167, ~L201).

## Instanțe v2

- **OTel span name (v2 plan):** `cognitive.enrich.email.role-check`
- **Runtime:** `e1:discover:email-hunter-verify`.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru `enrich:email:role-check`. Evidență: **`e1:discover:email-hunter-verify`**, coadă **`discover:email:hunter-verify`**. | v2. | v2 §2.4 — fără coadă literală v2. |
| 2 | Etapă, familie, swimlane | E1; **`enrichment-external`** în catalog pentru Hunter verify. | v2. | — |
| 3 | Rol declarat | Cod: flag `role` / `emailRoleBased` din Hunter. | v2 text generic. | — |
| 4 | NeuronType + SOFAI | `ToolNeuron`; System1 per v2 §2.1. | v2. | — |
| 5 | Criticitate | **MEDIUM**. | v2. | — |
| 6 | Înveliș telemetrie | **`withCognitiveSpan("e1:discover:email-hunter-verify", …)`** (`g2-hunter-verifier.ts` ~L19–21). v2: `cognitive.enrich.email.role-check`. | ADR-0003. | Migrare denumiri. |
| 7 | Înveliș politică | Provider `hunter` + validare email minimă. | v2 tier 4. | OPA: destinație documentată. |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Email fără `@` → `invalid_email` (~L41–45). | ADR-0007. | — |
| 10 | Escaladare HITL | Fără HITL în procesor. | ADR-0008. | — |
| 11 | Micro-OODA | Job → Hunter verify → `emailRoleBased` + metadata. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Eșec → throw după log. | v2. | Fără test dedicat pe `role`. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Hunter HTTP, Postgres. | v2. | — |

### Mapare OTel

- **v2 / plan:** `cognitive.enrich.email.role-check`.
- **Cod:** `e1:discover:email-hunter-verify`.
- **Stare:** **migrare planificată**.
