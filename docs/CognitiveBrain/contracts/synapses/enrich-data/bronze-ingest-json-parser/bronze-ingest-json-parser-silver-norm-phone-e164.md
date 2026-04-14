# Sinapsă `bronze-ingest-json-parser-silver-norm-phone-e164`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-json-parser-silver-norm-phone-e164` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-json-parser/bronze-ingest-json-parser-silver-norm-phone-e164.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-json-parser` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-ingest-json-parser` | **Contract:** [`../../../neurons/E1/bronze--ingest--json-parser.md`](../../../neurons/E1/bronze--ingest--json-parser.md). **Runtime (ADR-0001):** v2 `bronze:ingest:json-parser` **fără** coadă dedicată în registry — vezi contract. |
| Destinație (graf) | `silver-norm-phone-e164` | **Contract (neuron):** [`../../../neurons/E1/silver--norm--phone-e164.md`](../../../neurons/E1/silver--norm--phone-e164.md). **Traseu sinapse:** [`../silver-norm-phone-e164/`](../silver-norm-phone-e164/). **Runtime:** vezi neuron. **ADR:** [`../../../adr/families/e1/normalize.md`](../../../adr/families/e1/normalize.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **ingest JSON bronze** depinde de **normalizare telefon E.164 silver**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie prefixe țară sau surse număr.

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

- **Runtime (ADR-0001):** vezi contracte sursă și destinație.
- **Semantic (ADR-0002):** ingest (graf) ↔ normalizare telefon E1.
- **Planificare:** v2 §7 — `bronze-ingest-json-parser` → `silver-norm-phone-e164`.

## Limite și reconcilieri

- Formatul E.164 și libphonenumber (dacă e cazul) sunt în implementare — vezi contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-json-parser-silver-norm-phone-e164\``.
