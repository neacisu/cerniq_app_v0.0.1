# Sinapsă `contract-sign-complete-stock-reserve-order`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-sign-complete-stock-reserve-order` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-sign-complete/contract-sign-complete-stock-reserve-order.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-sign-complete` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-sign-complete` | **Contract:** [`../../../neurons/E4/contract--sign--complete.md`](../../../neurons/E4/contract--sign--complete.md). |
| Destinație (graf) | `stock-reserve-order` | **Contract:** [`../../../neurons/E4/stock--reserve--order.md`](../../../neurons/E4/stock--reserve--order.md). **Semantic (ADR-0002):** legătură `e3:stock:reserve-create` (vezi neuron). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **contract-sign-complete** depinde în planificare de **rezervarea stocului pe comandă**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie cantități.

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
- **Semantic (ADR-0002):** E4 logistică ↔ E3 rezervări.
- **Planificare:** v2 §7 — `contract-sign-complete` → `stock-reserve-order`.

## Limite și reconcilieri

- Dependența **nu** fixează ordinea față de G36 în timp real.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-sign-complete-stock-reserve-order\``.
