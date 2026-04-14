# Sinapsă `bronze-ingest-csv-parser-silver-norm-address`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-csv-parser-silver-norm-address` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-csv-parser/bronze-ingest-csv-parser-silver-norm-address.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-csv-parser` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-ingest-csv-parser` | **Contract:** [`../../../neurons/E1/bronze--ingest--csv-parser.md`](../../../neurons/E1/bronze--ingest--csv-parser.md). **Runtime:** `ingest:csv` — vezi neuron. |
| Destinație (graf) | `silver-norm-address` | **Contract (neuron):** [`../../../neurons/E1/silver--norm--address.md`](../../../neurons/E1/silver--norm--address.md). **Runtime:** **`normalize:address`** / `NORMALIZE_ADDRESS` — mapare față de v2 `silver:norm:address` în același neuron. **ADR familie:** [`../../../adr/families/e1/normalize.md`](../../../adr/families/e1/normalize.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, fluxul **ingest CSV bronze** depinde de **normalizare adresă silver**. v2: **„sinapsă canonică de pipeline”**; nu specifică dacă dependența este „datele trebuie normalizate înainte de ingest” sau „ingest alimentează normalizarea” — sensul exact al săgeții rămâne **structural în graf**, iar ordinea operațională se verifică în cod.

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

- **Runtime (ADR-0001):** `ingest:csv` și `normalize:address` — cozi distincte în registry.
- **Semantic (ADR-0002):** `e1:ingest:csv` și `e1:normalize:address` în catalog.
- **Planificare:** v2 §7 — `bronze-ingest-csv-parser` → `silver-norm-address`.

## Limite și reconcilieri

- Sensul săgeții **Source → Target** este cel din **exportul v2**; dacă implementarea folosește ordine inversă (enqueue), aceasta este **reconciliere graf ↔ cod**, neinventată aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-csv-parser-silver-norm-address\``.
