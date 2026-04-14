# Sinapsă `contract-sign-complete-sameday-pickup-schedule`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-sign-complete-sameday-pickup-schedule` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-sign-complete/contract-sign-complete-sameday-pickup-schedule.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-sign-complete` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-sign-complete` | **Contract:** [`../../../neurons/E4/contract--sign--complete.md`](../../../neurons/E4/contract--sign--complete.md). |
| Destinație (graf) | `sameday-pickup-schedule` | **Contract:** [`../../../neurons/E4/sameday--pickup--schedule.md`](../../../neurons/E4/sameday--pickup--schedule.md). **Semantic (ADR-0002):** `e4:sameday:pickup-schedule`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **contract-sign-complete** depinde în planificare de **programarea ridicării Sameday**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie sloturi.

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

- **Runtime (ADR-0001):** vezi contract neuron destinație.
- **Semantic (ADR-0002):** E4 logistică.
- **Planificare:** v2 §7 — `contract-sign-complete` → `sameday-pickup-schedule`.

## Limite și reconcilieri

- Fără inferențe despre legătura temporală cu PDF semnat — doar graful v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-sign-complete-sameday-pickup-schedule\``.
