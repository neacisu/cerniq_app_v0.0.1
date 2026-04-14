# Sinapsă `contract-archive-store-stock-reserve-order`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-archive-store-stock-reserve-order` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-archive-store/contract-archive-store-stock-reserve-order.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-archive-store` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-archive-store` | **Contract:** [`../../../neurons/E3/contract--archive--store.md`](../../../neurons/E3/contract--archive--store.md). **Runtime:** `document:archive:store`. **Semantic:** `e3:document:archive-store`. |
| Destinație (graf) | `stock-reserve-order` | **Contract:** [`../../../neurons/E4/stock--reserve--order.md`](../../../neurons/E4/stock--reserve--order.md). **Runtime / catalog:** graf E4 — contractul neuron indică **gap** registry și echivalent operațional posibil E3 `stock:reserve:create`; vezi contract. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graf, **contract-archive-store** depinde canonic de **`stock-reserve-order`**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie mecanismul de rezervare.

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

- **Runtime (ADR-0001):** **reconciliere graf E4 ↔ implementare E3** posibilă — vezi [`stock--reserve--order.md`](../../../neurons/E4/stock--reserve--order.md).
- **Semantic (ADR-0002):** etichetă logistică E4 în v2 vs operații stoc în E3.
- **Planificare:** `contract-archive-store` → `stock-reserve-order`.

## Limite și reconcilieri

- Muchia nu afirmă că există coadă literală `stock:reserve:order` în `QUEUES`; doar structura din export.
- Fără completări fictive pentru payload sau retry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-archive-store-stock-reserve-order\``.
