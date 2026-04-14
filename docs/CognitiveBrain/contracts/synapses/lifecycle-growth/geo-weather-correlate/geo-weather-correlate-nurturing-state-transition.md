# Sinapsă `geo-weather-correlate-nurturing-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `geo-weather-correlate-nurturing-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/geo-weather-correlate/geo-weather-correlate-nurturing-state-transition.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `geo-weather-correlate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `geo-weather-correlate` | **Contract:** [`../../../neurons/E5/geo--weather--correlate.md`](../../../neurons/E5/geo--weather--correlate.md). **Runtime (ADR-0001):** analog `e5:alert:weather-monitor` / `e5:alert:weather-match` — vezi neuron. |
| Destinație (graf) | `nurturing-state-transition` | **Contract:** [`../../../neurons/E2/nurturing--state--transition.md`](../../../neurons/E2/nurturing--state--transition.md). **Semantic:** `e2:lead:state-transition` — vezi `NEURON_MATRIX.csv` (neuron **E2**). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **geo-weather-correlate** are dependență sintactică față de **nurturing-state-transition**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `geo-weather-correlate` → `nurturing-state-transition`.
- **Runtime (ADR-0001):** sursă E5; destinație **E2** — vezi contractul destinație.
- **Semantic (ADR-0002):** traversare **E5 → E2** — **necesită reconciliere** explicită; vezi ADR `lifecycle` și contract E2.

## Limite și reconcilieri

- **Destinație (etapă E2):** diferă de celelalte ținte `nurturing-*` E5 din același fan-out — vezi `NEURON_MATRIX.csv`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`geo-weather-correlate-nurturing-state-transition\``.
