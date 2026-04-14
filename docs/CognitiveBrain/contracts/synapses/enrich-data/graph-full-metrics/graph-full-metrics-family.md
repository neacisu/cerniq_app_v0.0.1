# Sinapsă `graph-full-metrics-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-full-metrics-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-full-metrics/graph-full-metrics-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-full-metrics` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `graph-full-metrics` | **Planificare (graf):** nod `graph-full-metrics`. **Neuron (contract):** [`../../../neurons/E5/graph--full--metrics.md`](../../../neurons/E5/graph--full--metrics.md). **v2:** NEURON `graph:full:metrics` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L8454–L8474). **Runtime (ADR-0001):** v2 coadă `graph:full:metrics` **fără** înregistrare în `queue-registry.ts` în evidența neuron; observabilitate parțială prin metrici E5 este documentată **în contractul neuron**, nu în exportul muchiei `default`. |
| Destinație (graf) | `e5-graph-community` | Agregat de **familie** `graph-community` în etapa E5 (plan export). **v2:** [`### ADR-FAMILY-e5-graph-community`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **graph-full-metrics** sub **`e5-graph-community`**. v2 descrie destinația ca **„specializează familia”**. Această sinapsă fixează poziția în **graf**; **nu** echivalează cu existența unui worker „metrics-only” numit ca în v2 — vezi contractul sursă.

## Intrare în traseu (context)

Muchie planificată **Bronze → acest nod:** [`../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-full-metrics.md`](../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-full-metrics.md).

## Sinapse dependență în același traseu

[`graph-full-metrics-geo-cluster-analyze.md`](graph-full-metrics-geo-cluster-analyze.md), [`graph-full-metrics-geo-delivery-optimize.md`](graph-full-metrics-geo-delivery-optimize.md), [`graph-full-metrics-geo-neighbor-find.md`](graph-full-metrics-geo-neighbor-find.md), [`graph-full-metrics-geo-territory-map.md`](graph-full-metrics-geo-territory-map.md), [`graph-full-metrics-geo-weather-correlate.md`](graph-full-metrics-geo-weather-correlate.md).

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | Fără coadă `graph:full:metrics` în registry — vezi neuron; metrici histogramă/gauge în `e5-metrics.ts` sunt citate acolo. |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — intrare `graph:full:metrics`; `nodeKey`/`catalog` goale în matrice — vezi contract neuron. |
| **Planificare (export)** | v2 §7 — sursă `graph-full-metrics` → destinație `e5-graph-community`, tip `default`. |

## Limite și reconcilieri

- Nu confunda **metrici de instrumentare** existente cu neuron/coadă dedicată `graph:full:metrics` — vezi [`../../../neurons/E5/graph--full--metrics.md`](../../../neurons/E5/graph--full--metrics.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-full-metrics-family\``.
