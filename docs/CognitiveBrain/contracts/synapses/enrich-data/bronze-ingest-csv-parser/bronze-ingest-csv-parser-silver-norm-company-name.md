# Sinapsă `bronze-ingest-csv-parser-silver-norm-company-name`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-csv-parser-silver-norm-company-name` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-csv-parser/bronze-ingest-csv-parser-silver-norm-company-name.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-csv-parser` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-ingest-csv-parser` | **Contract:** [`../../../neurons/E1/bronze--ingest--csv-parser.md`](../../../neurons/E1/bronze--ingest--csv-parser.md). |
| Destinație (graf) | `silver-norm-company-name` | **Contract (neuron):** [`../../../neurons/E1/silver--norm--company-name.md`](../../../neurons/E1/silver--norm--company-name.md). **Runtime:** **`normalize:name`** / `QUEUES.NORMALIZE_NAME`, catalog **`e1:normalize:name`** — în același contract neuron. **ADR familie (indicativ):** [`../../../adr/families/e1/normalize.md`](../../../adr/families/e1/normalize.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **ingest CSV bronze** depinde de **normalizare nume companie silver**. v2: **„sinapsă canonică de pipeline”**.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie; **dovadă runtime** (încercări/backoff bulk): [`ROUTING.md`](../../../../runtime/synapses/enrich-data/bronze-ingest-csv-parser/ROUTING.md). |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** **`normalize:name`** — vezi [`../../../neurons/E1/silver--norm--company-name.md`](../../../neurons/E1/silver--norm--company-name.md) și `queue-registry.ts`.
- **Semantic (ADR-0002):** normalizare companie — catalog în neuron.
- **Planificare:** v2 §7 — `bronze-ingest-csv-parser` → `silver-norm-company-name`.

## Limite și reconcilieri

- **Reconciliere slug:** `silver-norm-company-name` (graf) ↔ contract [`../../../neurons/E1/silver--norm--company-name.md`](../../../neurons/E1/silver--norm--company-name.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-csv-parser-silver-norm-company-name\``.
