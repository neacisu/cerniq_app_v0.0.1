# Sinapsă `association-sync-schedule-geo-weather-correlate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-sync-schedule-geo-weather-correlate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-sync-schedule/association-sync-schedule-geo-weather-correlate.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-sync-schedule` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `association-sync-schedule` | **Contract:** [`../../../neurons/E5/association--sync--schedule.md`](../../../neurons/E5/association--sync--schedule.md). **Runtime:** gap documentat în neuron. |
| Destinație (graf) | `geo-weather-correlate` | **Contract (neuron):** [`../../../neurons/E5/geo--weather--correlate.md`](../../../neurons/E5/geo--weather--correlate.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **association-sync-schedule** depinde în planificare de **corelare vreme geo** (`geo-weather-correlate`). v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** vezi neuron țintă și registry.
- **Semantic (ADR-0002):** geo E5 — contract neuron.
- **Planificare:** v2 §7 — `association-sync-schedule` → `geo-weather-correlate`.

## Limite și reconcilieri

- Fără completări despre surse meteo sau SLA; exportul sinapsei nu le conține.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-sync-schedule-geo-weather-correlate\``.
