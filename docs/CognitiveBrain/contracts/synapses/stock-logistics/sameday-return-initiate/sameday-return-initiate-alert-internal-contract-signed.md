# Sinapsă `sameday-return-initiate-alert-internal-contract-signed`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-return-initiate-alert-internal-contract-signed` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-return-initiate/sameday-return-initiate-alert-internal-contract-signed.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-return-initiate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `sameday-return-initiate` | [`../../../neurons/E4/sameday--return--initiate.md`](../../../neurons/E4/sameday--return--initiate.md). v2 **`sameday:return:initiate`**; matrice rând **237**. |
| Destinație (graf) | `alert-internal-contract-signed` | [`../../../neurons/E4/alert--internal--contract-signed.md`](../../../neurons/E4/alert--internal--contract-signed.md). v2 **`alert:internal:contract-signed`**; matrice rând **188**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **sameday-return-initiate** depinde canonic de **alert-internal-contract-signed**. v2: **„sinapsă canonică de pipeline**”.

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

- **Planificare:** v2 §7 — `sameday-return-initiate` → `alert-internal-contract-signed`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-return-initiate-alert-internal-contract-signed\``.
