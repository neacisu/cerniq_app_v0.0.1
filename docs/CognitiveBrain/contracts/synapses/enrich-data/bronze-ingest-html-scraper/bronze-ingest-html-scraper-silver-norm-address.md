# Sinapsă `bronze-ingest-html-scraper-silver-norm-address`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-html-scraper-silver-norm-address` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-html-scraper/bronze-ingest-html-scraper-silver-norm-address.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-html-scraper` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-ingest-html-scraper` | **Contract:** [`../../../neurons/E1/bronze--ingest--html-scraper.md`](../../../neurons/E1/bronze--ingest--html-scraper.md). **Stare:** gap / căi adiacente — vezi neuron; **nu** presupunem coadă `bronze:ingest:html-scraper`. |
| Destinație (graf) | `silver-norm-address` | **Contract (neuron):** [`../../../neurons/E1/silver--norm--address.md`](../../../neurons/E1/silver--norm--address.md). **Runtime:** **`normalize:address`** / `NORMALIZE_ADDRESS`, `e1:normalize:address`. **ADR:** [`../../../adr/families/e1/normalize.md`](../../../adr/families/e1/normalize.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **ingest HTML bronze (scraper)** depinde de **normalizare adresă silver**. v2: **„sinapsă canonică de pipeline”**. Fără o coadă omologă sursă demonstrată, muchia rămâne **trasabilitate graf**, iar execuția efectivă a capătului sursă este **nedovedită** la nivelul din contractul neuron.

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

- **Runtime (ADR-0001):** ținta **`normalize:address`** este în registry; sursa **nu** are mapare 1:1 în același mod ca ingest CSV — vezi [`../../../neurons/E1/bronze--ingest--html-scraper.md`](../../../neurons/E1/bronze--ingest--html-scraper.md).
- **Semantic (ADR-0002):** normalizare adresă — catalog.
- **Planificare:** v2 §7 — `bronze-ingest-html-scraper` → `silver-norm-address`.

## Limite și reconcilieri

- **Risc:** topologie validă în v2, **execuție sursă** incertă;ținta este mai bine ancorată în cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-html-scraper-silver-norm-address\``.
