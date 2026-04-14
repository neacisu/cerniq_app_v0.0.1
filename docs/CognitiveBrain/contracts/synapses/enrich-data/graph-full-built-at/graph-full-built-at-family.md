# Sinapsă `graph-full-built-at-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-full-built-at-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-full-built-at/graph-full-built-at-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-full-built-at` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `graph-full-built-at` | **Planificare (graf):** nod `graph-full-built-at`. **Neuron (contract):** [`../../../neurons/E5/graph--full--built_at.md`](../../../neurons/E5/graph--full--built_at.md). **v2:** NEURON `graph:full:built_at` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L8410–L8430). **Runtime (ADR-0001):** v2 notează câmp coadă `graph:full:built_at` **nereconciliat** cu registry; contractul neuron documentează absența literalului în `queue-registry.ts`. |
| Destinație (graf) | `e5-graph-community` | Agregat de **familie** `graph-community` în etapa E5 (plan export). Nu este o singură coadă executabilă. **v2:** [`### ADR-FAMILY-e5-graph-community`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **graph-full-built-at** sub agregatul **`e5-graph-community`**. v2 descrie destinația ca **„specializează familia”**: în planificare, neuronul «full / built at» este clasificat în familia `graph-community`, cu politicile de guvernanță E5 pentru acel agregat. Această sinapsă **nu** închide gap-ul runtime (coadă dedicată) din contractul sursă — fixează doar muchia din **export**.

## Intrare în traseu (context)

Muchie planificată **Bronze → acest nod:** [`../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-full-built-at.md`](../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-full-built-at.md).

## Sinapse dependență în același traseu

[`graph-full-built-at-geo-cluster-analyze.md`](graph-full-built-at-geo-cluster-analyze.md), [`graph-full-built-at-geo-delivery-optimize.md`](graph-full-built-at-geo-delivery-optimize.md), [`graph-full-built-at-geo-neighbor-find.md`](graph-full-built-at-geo-neighbor-find.md), [`graph-full-built-at-geo-territory-map.md`](graph-full-built-at-geo-territory-map.md), [`graph-full-built-at-geo-weather-correlate.md`](graph-full-built-at-geo-weather-correlate.md).

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
| **Runtime (ADR-0001)** | `graph:full:built_at` (v2) vs absență în `queue-registry.ts` — vezi [`../../../neurons/E5/graph--full--built_at.md`](../../../neurons/E5/graph--full--built_at.md) și [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — intrare `graph:full:built_at` → același contract neuron; coloanele `nodeKey`/`catalog` goale în matrice pentru acest rând reflectă gap-ul semantic față de catalog, nu se completează aici. |
| **Planificare (export)** | v2 §7 — sursă `graph-full-built-at` → țintă `e5-graph-community`, tip `default`. |

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs runtime:** eticheta `graph-full-built-at` **nu** implică o coadă activă cu același șir — vezi contractul neuron sursă.
- **NEURON_MATRIX.csv / SYNAPSE_MATRIX.csv:** traseu `graph-full-built-at` — rânduri `graph-full-built-at-*` în [`../../../../SYNAPSE_MATRIX.csv`](../../../../SYNAPSE_MATRIX.csv).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-full-built-at-family\``.
