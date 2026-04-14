# Sinapsă `bronze-ingest-pdf-extractor-association-pdf-ingest`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-pdf-extractor-association-pdf-ingest` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-association-pdf-ingest.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-pdf-extractor` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-ingest-pdf-extractor` | **Contract (graf E1):** [`../../../neurons/E1/bronze--ingest--pdf-extractor.md`](../../../neurons/E1/bronze--ingest--pdf-extractor.md). **Instanță v2 E5:** [`../../../neurons/E5/bronze--ingest--pdf-extractor.md`](../../../neurons/E5/bronze--ingest--pdf-extractor.md). **Runtime (ADR-0001):** fără coadă literală v2 în registry — vezi contracte. |
| Destinație (graf) | `association-pdf-ingest` | **Contract (neuron):** [`../../../neurons/E5/association--pdf--ingest.md`](../../../neurons/E5/association--pdf--ingest.md). **Traseu sinapse:** [`../association-pdf-ingest/`](../association-pdf-ingest/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **bronze-ingest-pdf-extractor** depinde în planificare de **ingest PDF** în fluxul asociațiilor (`association-pdf-ingest`). v2: **„sinapsă canonică de pipeline”**; exportul nu distinge stocare obiect vs text extras.

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

- **Runtime (ADR-0001):** două etichete „PDF” în graf (bronze vs association) — reconciliere în contracte, nu identitate automată.
- **Semantic (ADR-0002):** ingest bronze (graf) ↔ ingest PDF asociații E5.
- **Planificare:** v2 §7 — `bronze-ingest-pdf-extractor` → `association-pdf-ingest`.

## Limite și reconcilieri

- Suprapunerea semantică PDF este documentată în contractele **E1** și **E5** pentru `bronze:ingest:pdf-extractor` — fără fuziune forțată a cozilor.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-pdf-extractor-association-pdf-ingest\``.
