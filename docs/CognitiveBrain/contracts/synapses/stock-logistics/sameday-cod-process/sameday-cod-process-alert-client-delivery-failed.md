# Sinapsă `sameday-cod-process-alert-client-delivery-failed`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-cod-process-alert-client-delivery-failed` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-cod-process/sameday-cod-process-alert-client-delivery-failed.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-cod-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `sameday-cod-process` | [`../../../neurons/E4/sameday--cod--process.md`](../../../neurons/E4/sameday--cod--process.md). v2 **`sameday:cod:process`**; matrice rând **235**. |
| Destinație (graf) | `alert-client-delivery-failed` | [`../../../neurons/E4/alert--client--delivery-failed.md`](../../../neurons/E4/alert--client--delivery-failed.md). v2 **`alert:client:delivery-failed`**; matrice rând **181**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **sameday-cod-process** depinde canonic de **alert-client-delivery-failed**. v2: **„sinapsă canonică de pipeline**”.

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

- **Planificare:** v2 §7 — `sameday-cod-process` → `alert-client-delivery-failed`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-cod-process-alert-client-delivery-failed\``.
