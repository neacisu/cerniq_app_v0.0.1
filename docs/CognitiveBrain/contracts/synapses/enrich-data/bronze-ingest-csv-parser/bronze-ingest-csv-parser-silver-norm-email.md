# Sinapsă `bronze-ingest-csv-parser-silver-norm-email`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-csv-parser-silver-norm-email` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-csv-parser/bronze-ingest-csv-parser-silver-norm-email.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-csv-parser` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-ingest-csv-parser` | **Contract:** [`../../../neurons/E1/bronze--ingest--csv-parser.md`](../../../neurons/E1/bronze--ingest--csv-parser.md). |
| Destinație (graf) | `silver-norm-email` | **Contract (neuron):** [`../../../neurons/E1/silver--norm--email.md`](../../../neurons/E1/silver--norm--email.md). **Runtime:** **`normalize:email`** / `e1:normalize:email` — în același contract neuron. **ADR familie (indicativ):** [`../../../adr/families/e1/normalize.md`](../../../adr/families/e1/normalize.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **ingest CSV bronze** depinde de **normalizare email silver**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** vezi neuron țintă și registry pentru coada de normalizare email.
- **Semantic (ADR-0002):** `e1:normalize:email` sau echivalent din catalog — în contract neuron.
- **Planificare:** v2 §7 — `bronze-ingest-csv-parser` → `silver-norm-email`.

## Limite și reconcilieri

- Fără presupuneri despre validare SMTP; absent din câmpurile sinapsei v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-csv-parser-silver-norm-email\``.
