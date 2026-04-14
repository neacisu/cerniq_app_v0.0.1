# Sinapsă `bronze-ingest-json-parser-silver-norm-company-name`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-json-parser-silver-norm-company-name` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-json-parser/bronze-ingest-json-parser-silver-norm-company-name.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-json-parser` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-ingest-json-parser` | **Contract:** [`../../../neurons/E1/bronze--ingest--json-parser.md`](../../../neurons/E1/bronze--ingest--json-parser.md). **Runtime (ADR-0001):** v2 `bronze:ingest:json-parser` **fără** coadă dedicată în registry — vezi contract. |
| Destinație (graf) | `silver-norm-company-name` | **Contract (neuron):** [`../../../neurons/E1/silver--norm--company-name.md`](../../../neurons/E1/silver--norm--company-name.md). **Traseu sinapse:** [`../silver-norm-company-name/`](../silver-norm-company-name/). **Runtime:** vezi neuron (`normalize:company-name` / echivalent în contract). **ADR:** [`../../../adr/families/e1/normalize.md`](../../../adr/families/e1/normalize.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **ingest JSON bronze** depinde de **normalizare nume companie silver**. v2: **„sinapsă canonică de pipeline”**; ordinea operațională nu este encodată în câmpurile sinapsei.

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

- **Runtime (ADR-0001):** vezi contracte sursă și destinație — reconciliere graf vs cozi.
- **Semantic (ADR-0002):** ingest (graf) ↔ normalizare companie E1.
- **Planificare:** v2 §7 — `bronze-ingest-json-parser` → `silver-norm-company-name`.

## Limite și reconcilieri

- Prefixe `silver:norm:*` (graf) vs `normalize:*` (runtime) — vezi ADR normalize și contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-json-parser-silver-norm-company-name\``.
