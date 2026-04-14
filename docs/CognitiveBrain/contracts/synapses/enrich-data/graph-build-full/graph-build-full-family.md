# Sinapsă `graph-build-full-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-build-full-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-build-full/graph-build-full-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-build-full` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `graph-build-full` | Traseu în graf; contract neuron: [`../../../neurons/E5/graph--build--full.md`](../../../neurons/E5/graph--build--full.md). **Triplă autoritate:** v2 **`graph:build:full`**; runtime **`graph:build:relationships`** (`E5_GRAPH_BUILD_RELATIONSHIPS`) — vezi neuron și `queue-registry.ts`. |
| Destinație (graf) | `e5-graph-community` | Agregat **familie graph-community E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **graph-build-full** sub agregatul **`e5-graph-community`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`graph-build-full-geo-cluster-analyze.md`](graph-build-full-geo-cluster-analyze.md), [`graph-build-full-geo-delivery-optimize.md`](graph-build-full-geo-delivery-optimize.md), [`graph-build-full-geo-neighbor-find.md`](graph-build-full-geo-neighbor-find.md), [`graph-build-full-geo-territory-map.md`](graph-build-full-geo-territory-map.md), [`graph-build-full-geo-weather-correlate.md`](graph-build-full-geo-weather-correlate.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** `e5-graph-community` nu este cheie în `QUEUES`; coada operațională pentru construirea de relații este documentată în [`graph--build--full.md`](../../../neurons/E5/graph--build--full.md).
- **Semantic (ADR-0002):** `e5:graph:build-relationships` / swimlane `graph-community` — vezi catalog citat în neuron.
- **Planificare:** v2 §7 — `graph-build-full` → `e5-graph-community`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Necesită reconciliere graf ↔ registry:** sufix v2 **`full`** vs coada **`relationships`** — vezi neuron.
- Muchii **intrare** din alte trasee (ex. [`bronze-ingest-pdf-extractor-graph-build-full.md`](../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-build-full.md)) sunt contracte separate; nu înlocuiesc manifestul **`graph-build-full-family`**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-build-full-family\``.
