# Sinapsă `bronze-ingest-csv-parser-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-csv-parser-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-csv-parser/bronze-ingest-csv-parser-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-csv-parser` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `bronze-ingest-csv-parser` | Traseu în graf; contract neuron: [`../../../neurons/E1/bronze--ingest--csv-parser.md`](../../../neurons/E1/bronze--ingest--csv-parser.md). **Runtime (ADR-0001):** **`ingest:csv`** / `QUEUES.INGEST_CSV` — mapare documentată față de v2_queue `bronze:ingest:csv-parser`. **Semantic (ADR-0002):** `e1:ingest:csv`. |
| Destinație (graf) | `e1-ingest` | Agregat **familie ingest E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e1/ingest.md`](../../../adr/families/e1/ingest.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **bronze-ingest-csv-parser** sub agregatul **`e1-ingest`**. v2: **„specializează familia”**. Parsarea CSV și inserția bronze sunt detaliate în contractul neuron și în codul A1 citat acolo.

## Sinapse dependență în același traseu

[`bronze-ingest-csv-parser-silver-norm-address.md`](bronze-ingest-csv-parser-silver-norm-address.md), [`bronze-ingest-csv-parser-silver-norm-company-name.md`](bronze-ingest-csv-parser-silver-norm-company-name.md), [`bronze-ingest-csv-parser-silver-norm-email.md`](bronze-ingest-csv-parser-silver-norm-email.md), [`bronze-ingest-csv-parser-silver-norm-phone-e164.md`](bronze-ingest-csv-parser-silver-norm-phone-e164.md), [`bronze-ingest-csv-parser-bronze-anaf-enrichment.md`](bronze-ingest-csv-parser-bronze-anaf-enrichment.md).

**ROUTING runtime (cozi / idempotency):** [`../../../../runtime/synapses/enrich-data/bronze-ingest-csv-parser/ROUTING.md`](../../../../runtime/synapses/enrich-data/bronze-ingest-csv-parser/ROUTING.md).

**Nucleu cod downstream (normalize + ANAF bronze):** pachet [`@cerniq/e1-ingest-core`](../../../../../../packages/e1-ingest-core/package.json) — [`src/triggers.ts`](../../../../../../packages/e1-ingest-core/src/triggers.ts); workerii a2–a5 consumă aceleași simboluri prin re-export din `ingest-utils.ts`.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru familie; **dovadă runtime** pe muchiile membre: [`ROUTING.md`](../../../../runtime/synapses/enrich-data/bronze-ingest-csv-parser/ROUTING.md). |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `e1-ingest` agregat vs coada concretă **`ingest:csv`**.
- **Semantic (ADR-0002):** `e1:ingest:csv` + normalizări silver legate prin sinapse dependență.
- **Planificare:** v2 §7 — `bronze-ingest-csv-parser` → `e1-ingest`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Diferența **bronze:ingest:csv-parser** (v2) vs **ingest:csv** (cod) rămâne în [`../../../neurons/E1/bronze--ingest--csv-parser.md`](../../../neurons/E1/bronze--ingest--csv-parser.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-csv-parser-family\``.
