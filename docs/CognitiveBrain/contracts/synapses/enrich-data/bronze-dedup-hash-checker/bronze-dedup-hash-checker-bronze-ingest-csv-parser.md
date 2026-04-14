# Sinapsă `bronze-dedup-hash-checker-bronze-ingest-csv-parser`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-dedup-hash-checker-bronze-ingest-csv-parser` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-dedup-hash-checker/bronze-dedup-hash-checker-bronze-ingest-csv-parser.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-dedup-hash-checker` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-dedup-hash-checker` | **Contract:** [`../../../neurons/E1/bronze--dedup--hash-checker.md`](../../../neurons/E1/bronze--dedup--hash-checker.md). **Runtime:** mapare v2 ↔ **`dedup:exact`** documentată în neuron (nu literal `bronze:dedup:hash-checker` în registry). |
| Destinație (graf) | `bronze-ingest-csv-parser` | **Contract:** [`../../../neurons/E1/bronze--ingest--csv-parser.md`](../../../neurons/E1/bronze--ingest--csv-parser.md). **Runtime:** **`ingest:csv`** / `e1:ingest:csv` — în același contract neuron. **Traseu sinapse consumator:** [`../bronze-ingest-csv-parser/`](../bronze-ingest-csv-parser/). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graful de planificare, traseul **deduplicare bronze (hash-checker în v2)** are o dependență structurală către **ingest CSV bronze**. v2: **„sinapsă canonică de pipeline”**; **nu** descrie dacă muchia reflectă ordine strictă de execuție, declanșare condiționată sau doar legătură de proiectare între familii.

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

- **Runtime (ADR-0001):** cozi **`dedup:exact`** și **`ingest:csv`** sunt distincte în registry — vezi neuroni.
- **Semantic (ADR-0002):** `e1:dedup:exact` și `e1:ingest:csv` în catalog.
- **Planificare:** v2 §7 — `bronze-dedup-hash-checker` → `bronze-ingest-csv-parser`.

## Limite și reconcilieri

- Ambele capete au **denumiri v2** diferite de `queueName` runtime; reconcilierea este în contractele neuron, nu aici.
- Nu afirma faptul că ingest CSV **apare mereu după** dedup în runtime fără dovadă din codul apelant.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-dedup-hash-checker-bronze-ingest-csv-parser\``.
