# Sinapsă `geo-weather-correlate-nurturing-loyalty-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `geo-weather-correlate-nurturing-loyalty-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/geo-weather-correlate/geo-weather-correlate-nurturing-loyalty-check.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `geo-weather-correlate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `geo-weather-correlate` | **Contract:** [`../../../neurons/E5/geo--weather--correlate.md`](../../../neurons/E5/geo--weather--correlate.md). **Runtime (ADR-0001):** analog `e5:alert:weather-monitor` / `e5:alert:weather-match` — vezi neuron. |
| Destinație (graf) | `nurturing-loyalty-check` | **Contract:** [`../../../neurons/E5/nurturing--loyalty--check.md`](../../../neurons/E5/nurturing--loyalty--check.md). **Semantic:** `e5:lifecycle:state-evaluate` — vezi `NEURON_MATRIX.csv`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **geo-weather-correlate** are dependență sintactică față de **nurturing-loyalty-check**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `geo-weather-correlate` → `nurturing-loyalty-check`.
- **Runtime (ADR-0001):** vezi neuroni sursă și destinație.
- **Semantic (ADR-0002):** E5 — vezi ADR `geo` și `lifecycle`.

## Limite și reconcilieri

- **Sursă:** reconciliere weather — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`geo-weather-correlate-nurturing-loyalty-check\``.
