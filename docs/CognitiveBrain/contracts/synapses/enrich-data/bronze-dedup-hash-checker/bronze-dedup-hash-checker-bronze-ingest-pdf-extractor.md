# Sinapsă `bronze-dedup-hash-checker-bronze-ingest-pdf-extractor`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-dedup-hash-checker-bronze-ingest-pdf-extractor` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-dedup-hash-checker/bronze-dedup-hash-checker-bronze-ingest-pdf-extractor.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-dedup-hash-checker` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-dedup-hash-checker` | **Contract:** [`../../../neurons/E1/bronze--dedup--hash-checker.md`](../../../neurons/E1/bronze--dedup--hash-checker.md). |
| Destinație (graf) | `bronze-ingest-pdf-extractor` | **Contract E1:** [`../../../neurons/E1/bronze--ingest--pdf-extractor.md`](../../../neurons/E1/bronze--ingest--pdf-extractor.md). **Contract E5 (PDF ingest asociații):** există și [`../../../neurons/E5/association--pdf--ingest.md`](../../../neurons/E5/association--pdf--ingest.md) — **slug diferit**; nu se confundă cu acest nod `bronze-ingest-pdf-extractor` din graf fără reconciliere explicită. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **bronze-dedup-hash-checker** depinde de **bronze-ingest-pdf-extractor**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** vezi neuroni E1 pentru PDF extractor și dedup.
- **Semantic (ADR-0002):** ingest / bronze — contracte neuron.
- **Planificare:** v2 §7 — `bronze-dedup-hash-checker` → `bronze-ingest-pdf-extractor`.

## Limite și reconcilieri

- Dacă există homonime „pdf ingest” pe E5, **nu** echivala automat cu `bronze-ingest-pdf-extractor` din acest export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-dedup-hash-checker-bronze-ingest-pdf-extractor\``.
