# Sinapsă `graph-communities-latest-geo-weather-correlate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-communities-latest-geo-weather-correlate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-communities-latest/graph-communities-latest-geo-weather-correlate.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-communities-latest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `graph-communities-latest` | **Contract:** [`../../../neurons/E5/graph--communities--latest.md`](../../../neurons/E5/graph--communities--latest.md). **Runtime (ADR-0001):** v2 `graph:communities:latest` — **fără** literal în registry la auditul din contract — vezi neuron. |
| Destinație (graf) | `geo-weather-correlate` | **Contract:** [`../../../neurons/E5/geo--weather--correlate.md`](../../../neurons/E5/geo--weather--correlate.md). **Runtime:** v2 `geo:weather:correlate` **fără** literal în registry; flux în cod **`alerts:weather:monitor`** / **`alerts:weather:match`** — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **graph-communities-latest** are dependență sintactică față de nodul **geo-weather-correlate**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie surse meteo sau reguli de corelare.

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

- **Planificare:** v2 §7 — `graph-communities-latest` → `geo-weather-correlate`.
- **Runtime (ADR-0001):** sursă — **gap** nume `graph:communities:latest` în registry; ținta — **fără** `geo:weather:*` în registry; echivalent documentat prin cozi **alerts** — vezi [`geo--weather--correlate.md`](../../../neurons/E5/geo--weather--correlate.md).
- **Semantic (ADR-0002):** E5 geo / alerts — vezi ADR din neuron.

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pe capătul sursă — vezi [`graph--communities--latest.md`](../../../neurons/E5/graph--communities--latest.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-communities-latest-geo-weather-correlate\``.
