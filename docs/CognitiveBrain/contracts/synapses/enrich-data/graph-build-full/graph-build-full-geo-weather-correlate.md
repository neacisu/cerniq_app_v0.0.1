# Sinapsă `graph-build-full-geo-weather-correlate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-build-full-geo-weather-correlate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-build-full/graph-build-full-geo-weather-correlate.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-build-full` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `graph-build-full` | **Contract:** [`../../../neurons/E5/graph--build--full.md`](../../../neurons/E5/graph--build--full.md). **Runtime (ADR-0001):** v2 `graph:build:full` — coada canonică în cod **`graph:build:relationships`** — vezi neuron. |
| Destinație (graf) | `geo-weather-correlate` | **Contract:** [`../../../neurons/E5/geo--weather--correlate.md`](../../../neurons/E5/geo--weather--correlate.md). **Runtime:** v2 `geo:weather:correlate` **fără** literal în registry; flux în cod **`alerts:weather:monitor`** / **`alerts:weather:match`** — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **graph-build-full** are dependență sintactică față de nodul **geo-weather-correlate**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie surse meteo sau reguli de corelare.

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

- **Planificare:** v2 §7 — `graph-build-full` → `geo-weather-correlate`.
- **Runtime (ADR-0001):** sursă — reconciliere **`graph:build:full`** ↔ **`graph:build:relationships`**; ținta — **fără** `geo:weather:*` în registry; echivalent documentat prin cozi **alerts** — vezi [`geo--weather--correlate.md`](../../../neurons/E5/geo--weather--correlate.md).
- **Semantic (ADR-0002):** E5 geo / alerts — vezi ADR din neuron.

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pe capătul sursă — vezi [`graph--build--full.md`](../../../neurons/E5/graph--build--full.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-build-full-geo-weather-correlate\``.
