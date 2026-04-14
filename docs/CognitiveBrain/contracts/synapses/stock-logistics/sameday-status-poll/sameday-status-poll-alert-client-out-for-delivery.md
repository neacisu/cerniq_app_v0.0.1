# Sinapsă `sameday-status-poll-alert-client-out-for-delivery`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-status-poll-alert-client-out-for-delivery` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-status-poll/sameday-status-poll-alert-client-out-for-delivery.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-status-poll` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `sameday-status-poll` | [`../../../neurons/E4/sameday--status--poll.md`](../../../neurons/E4/sameday--status--poll.md). v2 **`sameday:status:poll`**; matrice rând **238**. |
| Destinație (graf) | `alert-client-out-for-delivery` | [`../../../neurons/E4/alert--client--out-for-delivery.md`](../../../neurons/E4/alert--client--out-for-delivery.md). v2 **`alert:client:out-for-delivery`**; matrice rând **182**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **sameday-status-poll** depinde canonic de **alert-client-out-for-delivery**. v2: **„sinapsă canonică de pipeline**”.

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

- **Planificare:** v2 §7 — `sameday-status-poll` → `alert-client-out-for-delivery`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-status-poll-alert-client-out-for-delivery\``.
