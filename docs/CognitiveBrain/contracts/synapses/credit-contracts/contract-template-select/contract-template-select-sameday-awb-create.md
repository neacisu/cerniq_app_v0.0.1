# Sinapsă `contract-template-select-sameday-awb-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-template-select-sameday-awb-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-template-select/contract-template-select-sameday-awb-create.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-template-select` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-template-select` | **Contract:** [`../../../neurons/E4/contract--template--select.md`](../../../neurons/E4/contract--template--select.md). |
| Destinație (graf) | `sameday-awb-create` | **Contract:** [`../../../neurons/E4/sameday--awb--create.md`](../../../neurons/E4/sameday--awb--create.md). **Semantic (ADR-0002):** `e4:sameday:awb-create`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **contract-template-select** depinde în planificare de **crearea AWB Sameday**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie detalii expediere.

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

- **Runtime (ADR-0001):** vezi contract neuron țintă.
- **Semantic (ADR-0002):** E4 logistică.
- **Planificare:** v2 §7 — `contract-template-select` → `sameday-awb-create`.

## Limite și reconcilieri

- Fără presupuneri despre legătura temporală cu G33 — doar dependența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-template-select-sameday-awb-create\``.
