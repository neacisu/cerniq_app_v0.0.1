# Sinapsă `bronze-ingest-pdf-extractor-silver-norm-address`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-pdf-extractor-silver-norm-address` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-silver-norm-address.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-pdf-extractor` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-ingest-pdf-extractor` | **Contract (graf E1):** [`../../../neurons/E1/bronze--ingest--pdf-extractor.md`](../../../neurons/E1/bronze--ingest--pdf-extractor.md). **Instanță v2 E5:** [`../../../neurons/E5/bronze--ingest--pdf-extractor.md`](../../../neurons/E5/bronze--ingest--pdf-extractor.md). **Runtime (ADR-0001):** fără coadă literală v2 în registry — vezi contracte. |
| Destinație (graf) | `silver-norm-address` | **Contract (neuron):** [`../../../neurons/E1/silver--norm--address.md`](../../../neurons/E1/silver--norm--address.md). **Traseu sinapse:** [`../silver-norm-address/`](../silver-norm-address/). **Runtime:** `normalize:address` — vezi neuron. **ADR:** [`../../../adr/families/e1/normalize.md`](../../../adr/families/e1/normalize.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **ingest PDF bronze** depinde de **normalizare adresă silver**. v2: **„sinapsă canonică de pipeline”**; ordinea operațională rămâne de verificat în cod; muchia este **structurală** în export.

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

- **Runtime (ADR-0001):** sursă fără coadă v2 vs **`normalize:address`** — vezi contracte.
- **Semantic (ADR-0002):** ingest PDF (graf) ↔ `e1:normalize:address`.
- **Planificare:** v2 §7 — `bronze-ingest-pdf-extractor` → `silver-norm-address`.

## Limite și reconcilieri

- **E1 vs E5:** sursa este etichetă ingest; normalizarea este **E1** în contracte — tensiune de etapă/swimlane documentată prin contracte, nu rezolvată aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-pdf-extractor-silver-norm-address\``.
