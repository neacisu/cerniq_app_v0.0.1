# Sinapsă `payment-reconcile-auto-credit-check-order`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `payment-reconcile-auto-credit-check-order` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/payment-reconcile-auto/payment-reconcile-auto-credit-check-order.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `payment-reconcile-auto` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `payment-reconcile-auto` | **Registry:** `QUEUES.E4_PAYMENT_RECONCILE_AUTO` → **`payment:reconcile:auto`**. **Contract:** [`../../../neurons/E4/payment--reconcile--auto.md`](../../../neurons/E4/payment--reconcile--auto.md). |
| Destinație (graf) | `credit-check-order` | **Registry:** **`credit:check:order`**. **Contract:** [`../../../neurons/E4/credit--check--order.md`](../../../neurons/E4/credit--check--order.md). **Matrix:** reconciliere `catalog_nodekey` vs cozi — vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf că **reconcilierea automată a plăților** este ordonată canonic față de **verificarea creditului la comandă** (`credit-check-order`). v2: **„sinapsă canonică de pipeline”** — fără detalii despre când anume B7 enfilează acest neuron sau ce câmpuri traversează muchia.

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

- **Runtime (ADR-0001):** ambele cozi apar în `queue-registry.ts` — verificați constantele exacte în sursă.
- **Semantic (ADR-0002):** `e4:payment:reconcile-auto` →țintă conform catalogului din contractul `credit--check--order.md`.
- **Planificare:** dependență cash → credit în topologia exportată.

## Limite și reconcilieri

- Maparea **graf ↔ registry ↔ catalog** pentru `credit-check-order` poate implica aliasuri — nu presupuneți un singur `nodeKey` fără contractul neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`payment-reconcile-auto-credit-check-order\``.
