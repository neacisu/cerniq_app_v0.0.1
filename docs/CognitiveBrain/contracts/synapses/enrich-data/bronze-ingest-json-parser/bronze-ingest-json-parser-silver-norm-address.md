# Sinapsă `bronze-ingest-json-parser-silver-norm-address`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-json-parser-silver-norm-address` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-json-parser/bronze-ingest-json-parser-silver-norm-address.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-json-parser` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-ingest-json-parser` | **Contract:** [`../../../neurons/E1/bronze--ingest--json-parser.md`](../../../neurons/E1/bronze--ingest--json-parser.md). **Runtime (ADR-0001):** v2 `bronze:ingest:json-parser` **fără** coadă dedicată în registry — vezi contract (inclusiv legătura parțială cu `ingest:webhook`). |
| Destinație (graf) | `silver-norm-address` | **Contract (neuron):** [`../../../neurons/E1/silver--norm--address.md`](../../../neurons/E1/silver--norm--address.md). **Traseu sinapse:** [`../silver-norm-address/`](../silver-norm-address/). **Runtime:** `normalize:address` — vezi neuron. **ADR familie:** [`../../../adr/families/e1/normalize.md`](../../../adr/families/e1/normalize.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **ingest JSON bronze** depinde de **normalizare adresă silver**. v2: **„sinapsă canonică de pipeline”**; nu specifică ordinea operațională exactă între ingest și normalizare — sensul rămâne **structural în graf**; ordinea în cod se verifică în implementare.

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

- **Runtime (ADR-0001):** sursă fără coadă literală v2 vs **`normalize:address`** la destinație — reconciliere în contracte.
- **Semantic (ADR-0002):** ingest E1 (etichetă graf) ↔ `e1:normalize:address` — vezi catalog în contracte.
- **Planificare:** v2 §7 — `bronze-ingest-json-parser` → `silver-norm-address`.

## Limite și reconcilieri

- Sensul săgeții este cel din **exportul v2**; decalajul sursă (graf) ↔ webhook/runtime este documentat în contractul sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-json-parser-silver-norm-address\``.
