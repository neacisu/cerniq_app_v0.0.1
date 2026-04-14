# Sinapsă `bronze-ingest-html-scraper-silver-norm-email`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-html-scraper-silver-norm-email` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-html-scraper/bronze-ingest-html-scraper-silver-norm-email.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-html-scraper` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-ingest-html-scraper` | **Contract:** [`../../../neurons/E1/bronze--ingest--html-scraper.md`](../../../neurons/E1/bronze--ingest--html-scraper.md). |
| Destinație (graf) | `silver-norm-email` | **Contract (neuron):** [`../../../neurons/E1/silver--norm--email.md`](../../../neurons/E1/silver--norm--email.md). **Runtime:** **`normalize:email`**, `e1:normalize:email`. **ADR:** [`../../../adr/families/e1/normalize.md`](../../../adr/families/e1/normalize.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **bronze-ingest-html-scraper** depinde de **silver-norm-email**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** `normalize:email` pentru țintă; sursă — vezi neuron HTML scraper.
- **Semantic (ADR-0002):** normalizare email — catalog.
- **Planificare:** v2 §7 — `bronze-ingest-html-scraper` → `silver-norm-email`.

## Limite și reconcilieri

- Fără extindere la validare SMTP din acest contract; vezi cod / neuron dacă e necesar.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-html-scraper-silver-norm-email\``.
