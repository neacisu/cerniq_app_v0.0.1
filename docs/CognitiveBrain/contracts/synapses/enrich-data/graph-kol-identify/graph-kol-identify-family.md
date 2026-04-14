# Sinapsă `graph-kol-identify-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-kol-identify-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-kol-identify/graph-kol-identify-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-kol-identify` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `graph-kol-identify` | **Planificare (graf):** nod `graph-kol-identify`. **Neuron (contract):** [`../../../neurons/E5/graph--kol--identify.md`](../../../neurons/E5/graph--kol--identify.md). **v2:** NEURON `graph:kol:identify` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L8476–L8499); **Catalog nodeKey:** `e5:kol:identify` (în v2 pentru acest neuron). **Runtime (ADR-0001):** în [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md) apare maparea `e5:kol:identify` → **`kol:identify`**; reconciliere v2 `graph:kol:identify` ↔ literal registry în contractul neuron (inclusiv diferențe LLM v2 vs implementare D23 citite acolo). |
| Destinație (graf) | `e5-graph-community` | Agregat **familie** `graph-community`, etapa E5. **v2:** [`### ADR-FAMILY-e5-graph-community`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **graph-kol-identify** sub **`e5-graph-community`**. v2 descrie destinația ca **„specializează familia”**. Semantica KOL (scoruri, praguri, tier-uri) este **în afara** câmpurilor muchiei `default` din export; vezi v2 pentru neuron și contractul neuron pentru audit cod.

## Intrare în traseu (context)

Muchie planificată **Bronze → acest nod:** [`../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-kol-identify.md`](../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-kol-identify.md).

## Sinapse dependență în același traseu

[`graph-kol-identify-geo-cluster-analyze.md`](graph-kol-identify-geo-cluster-analyze.md), [`graph-kol-identify-geo-delivery-optimize.md`](graph-kol-identify-geo-delivery-optimize.md), [`graph-kol-identify-geo-neighbor-find.md`](graph-kol-identify-geo-neighbor-find.md), [`graph-kol-identify-geo-territory-map.md`](graph-kol-identify-geo-territory-map.md), [`graph-kol-identify-geo-weather-correlate.md`](graph-kol-identify-geo-weather-correlate.md).

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
| **Runtime (ADR-0001)** | `kol:identify` în registry — vezi ADR `graph-community` și [`../../../neurons/E5/graph--kol--identify.md`](../../../neurons/E5/graph--kol--identify.md). |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — `graph:kol:identify` / `e5:kol:identify` (coloane populate); detalii în [`../../../neurons/E5/graph--kol--identify.md`](../../../neurons/E5/graph--kol--identify.md). |
| **Planificare (export)** | v2 §7 — sursă `graph-kol-identify` → țintă `e5-graph-community`, tip `default`. |

## Limite și reconcilieri

- **v2 vs D23:** rutare LLM și praguri în v2 nu trebuie confundate cu implementarea citită în worker — explicit în contractul neuron; această sinapsă nu le unifică.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-kol-identify-family\``.
