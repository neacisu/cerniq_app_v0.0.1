# Sinapsă `credit-release-order-contract-clause-assemble`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-release-order-contract-clause-assemble` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-release-order/credit-release-order-contract-clause-assemble.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-release-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-release-order` | **Contract:** [`../../../neurons/E4/credit--release--order.md`](../../../neurons/E4/credit--release--order.md). **Runtime (ADR-0001):** `credit:limit:release` — `E4_CREDIT_LIMIT_RELEASE` (v2: `credit:release:order`). |
| Destinație (graf) | `contract-clause-assemble` | **Contract (neuron):** [`../../../neurons/E4/contract--clause--assemble.md`](../../../neurons/E4/contract--clause--assemble.md). **Traseu sinapse:** [`../contract-clause-assemble/`](../contract-clause-assemble/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-release-order** depinde în planificare de **asamblarea clauzelor contract** — cuplare între eliberarea rezervării și construcția contractuală. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie clauze sau variante.

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

- **Runtime (ADR-0001):** vezi contracte neuron sursă și țintă.
- **Semantic (ADR-0002):** credit E4 ↔ contracte E4.
- **Planificare:** v2 §7 — `credit-release-order` → `contract-clause-assemble`.

## Limite și reconcilieri

- Dependența este structurală în graf; ordinea operațională exactă între D21 și asamblare **nu** este în câmpurile sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-release-order-contract-clause-assemble\``.
