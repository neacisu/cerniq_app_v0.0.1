# Sinapsă `graph-centrality-calculate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-centrality-calculate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-centrality-calculate/graph-centrality-calculate-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-centrality-calculate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `graph-centrality-calculate` | Traseu în graf; contract neuron: [`../../../neurons/E5/graph--centrality--calculate.md`](../../../neurons/E5/graph--centrality--calculate.md). **Triplă autoritate:** v2 **`graph:centrality:calculate`**; runtime **`centrality:calculate`** (`E5_CENTRALITY_CALCULATE`) — vezi neuron și `queue-registry.ts`. |
| Destinație (graf) | `e5-graph-community` | Agregat **familie graph-community E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **graph-centrality-calculate** sub agregatul **`e5-graph-community`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`graph-centrality-calculate-geo-cluster-analyze.md`](graph-centrality-calculate-geo-cluster-analyze.md), [`graph-centrality-calculate-geo-delivery-optimize.md`](graph-centrality-calculate-geo-delivery-optimize.md), [`graph-centrality-calculate-geo-neighbor-find.md`](graph-centrality-calculate-geo-neighbor-find.md), [`graph-centrality-calculate-geo-territory-map.md`](graph-centrality-calculate-geo-territory-map.md), [`graph-centrality-calculate-geo-weather-correlate.md`](graph-centrality-calculate-geo-weather-correlate.md).

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

- **Runtime (ADR-0001):** `e5-graph-community` nu este cheie în `QUEUES`; coada D22 este **`centrality:calculate`** — vezi [`graph--centrality--calculate.md`](../../../neurons/E5/graph--centrality--calculate.md).
- **Semantic (ADR-0002):** `e5:centrality:calculate` — vezi catalog citat în neuron.
- **Planificare:** v2 §7 — `graph-centrality-calculate` → `e5-graph-community`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Necesită reconciliere graf ↔ registry:** prefix v2 **`graph:centrality:`** vs coada **`centrality:calculate`** — vezi neuron.
- Muchii **intrare** din alte trasee (ex. [`bronze-ingest-pdf-extractor-graph-centrality-calculate.md`](../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-centrality-calculate.md)) sunt contracte separate.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-centrality-calculate-family\``.
