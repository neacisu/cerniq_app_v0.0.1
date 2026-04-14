# Sinapsă `credit-check-order-contract-template-select`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-check-order-contract-template-select` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-check-order/credit-check-order-contract-template-select.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-check-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-check-order` | **Contract:** [`../../../neurons/E4/credit--check--order.md`](../../../neurons/E4/credit--check--order.md). |
| Destinație (graf) | `contract-template-select` | **Contract (neuron):** [`../../../neurons/E4/contract--template--select.md`](../../../neurons/E4/contract--template--select.md). **Traseu sinapse:** [`../contract-template-select/`](../contract-template-select/). **Runtime:** vezi neuron — graf `contract:template:select` vs coadă `contract:clauses:select`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-check-order** depinde în planificare de **selecția șablonului / clauzelor** (`contract-template-select`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie `riskTier` sau coduri clauză.

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

- **Runtime (ADR-0001):** D19 sursă vs G33 țintă — vezi contracte.
- **Semantic (ADR-0002):** credit E4 ↔ clauses-select E4.
- **Planificare:** v2 §7 — `credit-check-order` → `contract-template-select`.

## Limite și reconcilieri

- Reconciliere denumiri coadă: obligatoriu [`../../../neurons/E4/contract--template--select.md`](../../../neurons/E4/contract--template--select.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-check-order-contract-template-select\``.
