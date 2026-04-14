# Sinapsă `bronze-ingest-csv-parser-silver-norm-phone-e164`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-csv-parser-silver-norm-phone-e164` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-csv-parser/bronze-ingest-csv-parser-silver-norm-phone-e164.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-csv-parser` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-ingest-csv-parser` | **Contract:** [`../../../neurons/E1/bronze--ingest--csv-parser.md`](../../../neurons/E1/bronze--ingest--csv-parser.md). |
| Destinație (graf) | `silver-norm-phone-e164` | **Contract (neuron):** [`../../../neurons/E1/silver--norm--phone-e164.md`](../../../neurons/E1/silver--norm--phone-e164.md). **Runtime:** neuronul documentează **două căi** procedurale E.164 — **`normalize:phone`** (B3) și **`enrich:phone:normalize`** (H1); alegerea nu face parte din câmpurile sinapsei v2. **ADR familie (indicativ):** [`../../../adr/families/e1/normalize.md`](../../../adr/families/e1/normalize.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **ingest CSV bronze** depinde de **normalizare telefon E.164 silver**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** B3 / H1 — vezi [`../../../neurons/E1/silver--norm--phone-e164.md`](../../../neurons/E1/silver--norm--phone-e164.md).
- **Semantic (ADR-0002):** normalizare telefon — catalog în neuron.
- **Planificare:** v2 §7 — `bronze-ingest-csv-parser` → `silver-norm-phone-e164`.

## Limite și reconcilieri

- Reguli E.164 și libphonenumber (dacă aplicabile) sunt în cod / neuron, nu în registrul sinapsei v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-csv-parser-silver-norm-phone-e164\``.
