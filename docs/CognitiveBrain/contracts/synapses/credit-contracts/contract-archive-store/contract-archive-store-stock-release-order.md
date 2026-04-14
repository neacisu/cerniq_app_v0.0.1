# Sinapsă `contract-archive-store-stock-release-order`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-archive-store-stock-release-order` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-archive-store/contract-archive-store-stock-release-order.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-archive-store` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-archive-store` | **Contract:** [`../../../neurons/E3/contract--archive--store.md`](../../../neurons/E3/contract--archive--store.md). **Runtime:** `document:archive:store`. **Semantic:** `e3:document:archive-store`. |
| Destinație (graf) | `stock-release-order` | **Contract:** [`../../../neurons/E4/stock--release--order.md`](../../../neurons/E4/stock--release--order.md). **Runtime / catalog:** vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependență de planificare: **contract-archive-store** → **`stock-release-order`**. v2: **„sinapsă canonică de pipeline”**; fără detalii despre eliberarea rezervării pe comandă.

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

- **Runtime (ADR-0001):** vezi contracte sursă și destinație.
- **Semantic (ADR-0002):** E3 arhivare → E4 eliberare stoc comandă.
- **Planificare:** `contract-archive-store` → `stock-release-order`.

## Limite și reconcilieri

- Reconcilierea cu cozi E3 (`stock:reserve:release` etc.) poate fi necesară — vezi neuron destinație.
- Fără presupuneri despre payload sau retry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-archive-store-stock-release-order\``.
