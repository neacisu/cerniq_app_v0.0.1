# Sinapsă `sameday-pickup-schedule-alert-internal-return-received`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-pickup-schedule-alert-internal-return-received` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-pickup-schedule/sameday-pickup-schedule-alert-internal-return-received.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-pickup-schedule` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `sameday-pickup-schedule` | [`../../../neurons/E4/sameday--pickup--schedule.md`](../../../neurons/E4/sameday--pickup--schedule.md). v2 **`sameday:pickup:schedule`**; matrice rând **236**. |
| Destinație (graf) | `alert-internal-return-received` | [`../../../neurons/E4/alert--internal--return-received.md`](../../../neurons/E4/alert--internal--return-received.md). v2 **`alert:internal:return-received`**; matrice rând **193**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **sameday-pickup-schedule** depinde canonic de **alert-internal-return-received**. v2: **„sinapsă canonică de pipeline**”.

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

- **Planificare:** v2 §7 — `sameday-pickup-schedule` → `alert-internal-return-received`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-pickup-schedule-alert-internal-return-received\``.
