# Sinapsă `bronze-ingest-pdf-extractor-graph-relationship-infer`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-pdf-extractor-graph-relationship-infer` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-graph-relationship-infer.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-pdf-extractor` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-ingest-pdf-extractor` | **Contract (graf E1):** [`../../../neurons/E1/bronze--ingest--pdf-extractor.md`](../../../neurons/E1/bronze--ingest--pdf-extractor.md). **Instanță v2 E5:** [`../../../neurons/E5/bronze--ingest--pdf-extractor.md`](../../../neurons/E5/bronze--ingest--pdf-extractor.md). **Runtime (ADR-0001):** fără coadă literală v2 în registry — vezi contracte. |
| Destinație (graf) | `graph-relationship-infer` | **Contract (neuron):** [`../../../neurons/E5/graph--relationship--infer.md`](../../../neurons/E5/graph--relationship--infer.md). **Traseu sinapse:** [`../graph-relationship-infer/`](../graph-relationship-infer/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **bronze-ingest-pdf-extractor** depinde în planificare de **inferență relații** în graf (`graph-relationship-infer`). v2: **„sinapsă canonică de pipeline”**; exportul nu precizează dacă inferența este euristică sau model-based.

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

- **Runtime (ADR-0001):** vezi contracte sursă și țintă.
- **Semantic (ADR-0002):** ingest PDF (graf) ↔ inferență topologie E5.
- **Planificare:** v2 §7 — `bronze-ingest-pdf-extractor` → `graph-relationship-infer`.

## Limite și reconcilieri

- Încrederea în relațiile inferate și revizuirea umană (dacă există) sunt în contract neuron / ADR, nu aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-pdf-extractor-graph-relationship-infer\``.
