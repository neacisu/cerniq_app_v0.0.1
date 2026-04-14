# Sinapsă `winback-trigger-weather-hitl-dashboard-metrics`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `winback-trigger-weather-hitl-dashboard-metrics` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/winback-trigger-weather/winback-trigger-weather-hitl-dashboard-metrics.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `winback-trigger-weather` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `winback-trigger-weather` | **Contract:** [`../../../neurons/E5/winback--trigger--weather.md`](../../../neurons/E5/winback--trigger--weather.md). **Runtime / semantic:** vezi neuron (reconciliere cozi alerting vs etichetă winback în graf). |
| Destinație (graf) | `hitl-dashboard-metrics` | **Contract:** [`../../../neurons/E5/hitl--dashboard--metrics.md`](../../../neurons/E5/hitl--dashboard--metrics.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **winback-trigger-weather** are dependență sintactică față de **hitl-dashboard-metrics**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `winback-trigger-weather` → `hitl-dashboard-metrics`.
- **Runtime (ADR-0001):** sursă — vezi reconciliere winback/alerting în contractul sursă; ținta — vezi `hitl--dashboard--metrics.md` și `queue-registry.ts`.
- **Semantic (ADR-0002):** vezi catalogul citat în contractele celor doi neuroni.

## Limite și reconcilieri

- Muchia exprimă **structură de graf exportat**, nu un apel garantat între două cozi anume fără dovezi suplimentare din cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`winback-trigger-weather-hitl-dashboard-metrics\``.
