# Sinapsă `sameday-awb-create-alert-client-shipped`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-awb-create-alert-client-shipped` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-awb-create/sameday-awb-create-alert-client-shipped.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-awb-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `sameday-awb-create` | **Contract:** [`../../../neurons/E4/sameday--awb--create.md`](../../../neurons/E4/sameday--awb--create.md). v2 **`sameday:awb:create`**; matrice rând **234**. |
| Destinație (graf) | `alert-client-shipped` | **Contract:** [`../../../neurons/E4/alert--client--shipped.md`](../../../neurons/E4/alert--client--shipped.md). v2 **`alert:client:shipped`**; matrice rând **186**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **sameday-awb-create** depinde canonic de **alert-client-shipped**. v2: **„sinapsă canonică de pipeline**”.

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

- **Planificare:** v2 §7 — `sameday-awb-create` → `alert-client-shipped`.
- **Semantic:** matrice rând **186**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-awb-create-alert-client-shipped\``.
