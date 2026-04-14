# Sinapsă `stock-deduct-delivered-alert-client-shipped`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `stock-deduct-delivered-alert-client-shipped` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/stock-deduct-delivered/stock-deduct-delivered-alert-client-shipped.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `stock-deduct-delivered` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `stock-deduct-delivered` | **Contract:** [`../../../neurons/E4/stock--deduct--delivered.md`](../../../neurons/E4/stock--deduct--delivered.md). v2 **`stock:deduct:delivered`**; matrice rând **240**. **Runtime:** vezi **`stock:deduct`** în contractul neuron. |
| Destinație (graf) | `alert-client-shipped` | **Contract:** [`../../../neurons/E4/alert--client--shipped.md`](../../../neurons/E4/alert--client--shipped.md). v2 **`alert:client:shipped`**; matrice rând **186**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **stock-deduct-delivered** depinde canonic de **alert-client-shipped**. v2: **„sinapsă canonică de pipeline”**.

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

- **Planificare:** v2 §7 — `stock-deduct-delivered` → `alert-client-shipped`.
- **Semantic:** vezi matrice rând **186** și contractul neuron destinație.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`stock-deduct-delivered-alert-client-shipped\``.
