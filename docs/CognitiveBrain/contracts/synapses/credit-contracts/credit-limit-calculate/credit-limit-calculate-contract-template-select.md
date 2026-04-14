# Sinapsă `credit-limit-calculate-contract-template-select`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-limit-calculate-contract-template-select` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-limit-calculate/credit-limit-calculate-contract-template-select.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-limit-calculate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-limit-calculate` | **Contract:** [`../../../neurons/E4/credit--limit--calculate.md`](../../../neurons/E4/credit--limit--calculate.md). **Runtime (ADR-0001):** `credit:limit:calculate` — `E4_CREDIT_LIMIT_CALCULATE` în `workers/shared/src/queue-registry.ts`. |
| Destinație (graf) | `contract-template-select` | **Contract (neuron):** [`../../../neurons/E4/contract--template--select.md`](../../../neurons/E4/contract--template--select.md). **Traseu sinapse:** [`../contract-template-select/`](../contract-template-select/). **Runtime:** vezi neuron — reconciliere graf vs coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-limit-calculate** (în v2: calcul limită de credit; criticitate **CRITICAL** la nivel neuron) depinde în planificare de **selecția șablonului / clauzelor** (`contract-template-select`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie praguri RON, `riskTier` sau coduri clauză — acestea sunt în blocul neuron / cod, nu în câmpurile sinapsei.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** vezi contracte neuron sursă și destinație — cozi distincte unde sunt declarate în registry.
- **Semantic (ADR-0002):** `e4:credit:limit-calculate` ↔ etapa contracte E4 pentru selecție șablon — vezi catalog în contracte.
- **Planificare:** v2 §7 — `credit-limit-calculate` → `contract-template-select`.

## Limite și reconcilieri

- Reconciliere denumiri coadă la destinație: obligatoriu [`../../../neurons/E4/contract--template--select.md`](../../../neurons/E4/contract--template--select.md).
- Praguri HITL și SLA din v2 neuron **nu** se extrapolează ca atribute ale acestei muchii — vezi contract sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-limit-calculate-contract-template-select\``.
