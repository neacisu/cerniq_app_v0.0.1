# Sinapsă `bronze-ingest-pdf-extractor-graph-build-full`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-pdf-extractor-graph-build-full` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-build-full.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-pdf-extractor` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-ingest-pdf-extractor` | **Contract (graf E1):** [`../../../neurons/E1/bronze--ingest--pdf-extractor.md`](../../../neurons/E1/bronze--ingest--pdf-extractor.md). **Instanță v2 E5:** [`../../../neurons/E5/bronze--ingest--pdf-extractor.md`](../../../neurons/E5/bronze--ingest--pdf-extractor.md). **Runtime (ADR-0001):** fără coadă literală v2 în registry — vezi contracte. |
| Destinație (graf) | `graph-build-full` | **Contract (neuron):** [`../../../neurons/E5/graph--build--full.md`](../../../neurons/E5/graph--build--full.md). **Traseu sinapse:** [`../graph-build-full/`](../graph-build-full/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **bronze-ingest-pdf-extractor** depinde în planificare de **construire graf complet** (`graph-build-full`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie Neo4j, batch size sau versiune schemă graf.

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

- **Runtime (ADR-0001):** ingest PDF (graf) vs cozi **E5** pentru job-uri graf — vezi contract țintă.
- **Semantic (ADR-0002):** v2 plasează operații graf în **E5** — vezi catalog în contract neuron.
- **Planificare:** v2 §7 — `bronze-ingest-pdf-extractor` → `graph-build-full`.

## Limite și reconcilieri

- Dependența este **topologică în export**; nu afirma că fiecare rulare PDF declanșează rebuild complet fără dovadă în cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-pdf-extractor-graph-build-full\``.
