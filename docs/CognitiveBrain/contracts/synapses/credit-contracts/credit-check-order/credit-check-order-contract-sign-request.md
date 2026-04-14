# Sinapsă `credit-check-order-contract-sign-request`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-check-order-contract-sign-request` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-check-order/credit-check-order-contract-sign-request.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-check-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-check-order` | **Contract:** [`../../../neurons/E4/credit--check--order.md`](../../../neurons/E4/credit--check--order.md). |
| Destinație (graf) | `contract-sign-request` | **Contract (neuron):** [`../../../neurons/E4/contract--sign--request.md`](../../../neurons/E4/contract--sign--request.md). **Traseu sinapse:** [`../contract-sign-request/`](../contract-sign-request/). **Runtime:** vezi neuron — `contract:docusign:send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-check-order** depinde în planificare de **cererea de semnare DocuSign** (`contract-sign-request`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie envelope sau semnatari.

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

- **Runtime (ADR-0001):** D19 sursă vs G34 țintă — vezi contracte.
- **Semantic (ADR-0002):** credit E4 ↔ DocuSign send E4.
- **Planificare:** v2 §7 — `credit-check-order` → `contract-sign-request`.

## Limite și reconcilieri

- Ordinea față de G33 clauze: în cod (`contract--template--select.md`), nu în această sinapsă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-check-order-contract-sign-request\``.
