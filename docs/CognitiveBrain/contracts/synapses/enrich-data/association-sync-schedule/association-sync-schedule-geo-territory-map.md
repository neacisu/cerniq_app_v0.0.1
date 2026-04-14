# Sinapsă `association-sync-schedule-geo-territory-map`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-sync-schedule-geo-territory-map` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-sync-schedule/association-sync-schedule-geo-territory-map.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-sync-schedule` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `association-sync-schedule` | **Contract:** [`../../../neurons/E5/association--sync--schedule.md`](../../../neurons/E5/association--sync--schedule.md). **Runtime:** gap documentat în neuron. |
| Destinație (graf) | `geo-territory-map` | **Contract (neuron):** [`../../../neurons/E5/geo--territory--map.md`](../../../neurons/E5/geo--territory--map.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **association-sync-schedule** depinde în planificare de **hartă teritoriu geo** (`geo-territory-map`). v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** vezi neuron destinație și registry.
- **Semantic (ADR-0002):** geo E5 — contract neuron.
- **Planificare:** v2 §7 — `association-sync-schedule` → `geo-territory-map`.

## Limite și reconcilieri

- Alte trasee `association-*` pot conecta la aceiași neuroni geo; muchia aceasta este specifică **doar** pentru `association-sync-schedule` în v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-sync-schedule-geo-territory-map\``.
