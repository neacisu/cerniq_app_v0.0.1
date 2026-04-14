# Sinapsă `graph-path-find-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-path-find-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-path-find/graph-path-find-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-path-find` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `graph-path-find` | **Planificare (graf):** nod `graph-path-find`. **Neuron (contract):** [`../../../neurons/E5/graph--path--find.md`](../../../neurons/E5/graph--path--find.md). **v2:** NEURON `graph:path:find` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L8501–L8521). **Runtime (ADR-0001):** v2 coadă `graph:path:find` **fără** literal în `queue-registry.ts` în evidența neuron; vezi contractul sursă. |
| Destinație (graf) | `e5-graph-community` | Agregat **familie** `graph-community`, etapa E5. **v2:** [`### ADR-FAMILY-e5-graph-community`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **graph-path-find** sub **`e5-graph-community`**. v2 descrie destinația ca **„specializează familia”**. Sinapsa documentează **doar** poziția în graf; algoritmii sau limitele căutării de drum **nu** sunt în export.

## Intrare în traseu (context)

Muchie planificată **Bronze → acest nod:** [`../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-path-find.md`](../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-path-find.md).

## Sinapse dependență în același traseu

[`graph-path-find-geo-cluster-analyze.md`](graph-path-find-geo-cluster-analyze.md), [`graph-path-find-geo-delivery-optimize.md`](graph-path-find-geo-delivery-optimize.md), [`graph-path-find-geo-neighbor-find.md`](graph-path-find-geo-neighbor-find.md), [`graph-path-find-geo-territory-map.md`](graph-path-find-geo-territory-map.md), [`graph-path-find-geo-weather-correlate.md`](graph-path-find-geo-weather-correlate.md).

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
| **Runtime (ADR-0001)** | Gap documentat pentru `graph:path:find` — vezi [`../../../neurons/E5/graph--path--find.md`](../../../neurons/E5/graph--path--find.md). |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — intrare `graph:path:find`; `nodeKey`/`catalog` goale în matrice — vezi contract neuron. |
| **Planificare (export)** | v2 §7 — sursă `graph-path-find` → țintă `e5-graph-community`, tip `default`. |

## Limite și reconcilieri

- Nu afirma existența unui worker E5 pentru path-find fără dovada din cod — vezi contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-path-find-family\``.
