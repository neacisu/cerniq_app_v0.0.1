# Sinapsă `bronze-dedup-hash-checker-bronze-ingest-html-scraper`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-dedup-hash-checker-bronze-ingest-html-scraper` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-dedup-hash-checker/bronze-dedup-hash-checker-bronze-ingest-html-scraper.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-dedup-hash-checker` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-dedup-hash-checker` | **Contract:** [`../../../neurons/E1/bronze--dedup--hash-checker.md`](../../../neurons/E1/bronze--dedup--hash-checker.md). **Runtime:** vezi mapare `dedup:exact` în neuron. |
| Destinație (graf) | `bronze-ingest-html-scraper` | **Contract:** [`../../../neurons/E1/bronze--ingest--html-scraper.md`](../../../neurons/E1/bronze--ingest--html-scraper.md). **Stare evidență:** neuronul documentează **lipsă implementare 1:1** pentru `bronze:ingest:html-scraper`; căi adiacente (ex. scrape website) sunt **distincte**. **Traseu sinapse:** [`../bronze-ingest-html-scraper/`](../bronze-ingest-html-scraper/). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **bronze-dedup-hash-checker** depinde structural de **bronze-ingest-html-scraper**. v2: **„sinapsă canonică de pipeline”**. Interpretarea operațională a capătului **html-scraper** cere **contractul neuron țintă** — exportul sinapsei nu rezolvă gap-ul de implementare.

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

- **Runtime (ADR-0001):** sursă reconciliată spre `dedup:exact`; ținta **nu** are coadă omologă literală la ultimul audit din neuron.
- **Semantic (ADR-0002):** vezi catalog — scrape website vs ingest v2.
- **Planificare:** v2 §7 — `bronze-dedup-hash-checker` → `bronze-ingest-html-scraper`.

## Limite și reconcilieri

- **Risc major:** muchia este **validă în graf**, dar **ținta** poate fi **nereconciliată** cu o singură coadă ingest HTML; vezi [`../../../neurons/E1/bronze--ingest--html-scraper.md`](../../../neurons/E1/bronze--ingest--html-scraper.md).
- Nu presupunem că dedup și HTML ingest partajează același volum de date sau același trigger BullMQ.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-dedup-hash-checker-bronze-ingest-html-scraper\``.
