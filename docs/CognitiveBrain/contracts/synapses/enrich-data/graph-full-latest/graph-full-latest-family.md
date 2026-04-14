# Sinapsă `graph-full-latest-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-full-latest-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-full-latest/graph-full-latest-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-full-latest` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `graph-full-latest` | **Planificare (graf):** nod `graph-full-latest`. **Neuron (contract):** [`../../../neurons/E5/graph--full--latest.md`](../../../neurons/E5/graph--full--latest.md). **v2:** NEURON `graph:full:latest` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L8432–L8452). **Runtime (ADR-0001):** v2 câmp coadă `graph:full:latest` **fără** literal în `queue-registry.ts` în evidența neuron; vezi contractul sursă. |
| Destinație (graf) | `e5-graph-community` | Agregat de **familie** `graph-community` în etapa E5 (plan export). Nu este o singură coadă executabilă. **v2:** [`### ADR-FAMILY-e5-graph-community`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **graph-full-latest** sub agregatul **`e5-graph-community`**. v2 descrie destinația ca **„specializează familia”**: neuronul «full / latest» este clasificat în familia `graph-community` în planificare. Sinapsa **nu** rezolvă gap-ul runtime (lipsă coadă cu numele v2) — doar muchia din **export**.

## Intrare în traseu (context)

Muchie planificată **Bronze → acest nod:** [`../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-full-latest.md`](../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-full-latest.md).

## Sinapse dependență în același traseu

[`graph-full-latest-geo-cluster-analyze.md`](graph-full-latest-geo-cluster-analyze.md), [`graph-full-latest-geo-delivery-optimize.md`](graph-full-latest-geo-delivery-optimize.md), [`graph-full-latest-geo-neighbor-find.md`](graph-full-latest-geo-neighbor-find.md), [`graph-full-latest-geo-territory-map.md`](graph-full-latest-geo-territory-map.md), [`graph-full-latest-geo-weather-correlate.md`](graph-full-latest-geo-weather-correlate.md).

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
| **Runtime (ADR-0001)** | `graph:full:latest` (v2) vs absență literală în registry — vezi [`../../../neurons/E5/graph--full--latest.md`](../../../neurons/E5/graph--full--latest.md). |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — intrare `graph:full:latest`; `nodeKey`/`catalog` goale în matrice — vezi contract neuron, fără completări aici. |
| **Planificare (export)** | v2 §7 — sursă `graph-full-latest` → țintă `e5-graph-community`, tip `default`. |

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs runtime:** vezi contract neuron sursă pentru pattern-uri interne (fișiere, job data) vs coadă BullMQ.
- **SYNAPSE_MATRIX.csv:** traseu `graph-full-latest` — intrări `graph-full-latest-*`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-full-latest-family\``.
