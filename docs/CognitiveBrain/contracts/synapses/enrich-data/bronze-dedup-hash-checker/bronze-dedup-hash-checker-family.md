# Sinapsă `bronze-dedup-hash-checker-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-dedup-hash-checker-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-dedup-hash-checker/bronze-dedup-hash-checker-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-dedup-hash-checker` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `bronze-dedup-hash-checker` | Traseu în graf; contract neuron: [`../../../neurons/E1/bronze--dedup--hash-checker.md`](../../../neurons/E1/bronze--dedup--hash-checker.md). **Runtime (ADR-0001):** v2_queue **`bronze:dedup:hash-checker`** **nu** apare ca literal în `queue-registry.ts`; mapare documentată către **`dedup:exact`** / `QUEUES.DEDUP_EXACT` în același contract neuron. **Semantic (ADR-0002):** `e1:dedup:exact` (catalog) — vezi neuron. |
| Destinație (graf) | `e1-bronze-dedup` | Agregat **familie bronze-dedup E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e1/bronze-dedup.md`](../../../adr/families/e1/bronze-dedup.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **bronze-dedup-hash-checker** sub agregatul **`e1-bronze-dedup`**. v2: **„specializează familia”**. Rolul operațional de deduplicare este detaliat în contractul neuron (inclusiv tensiunea dintre numele v2 și coada `dedup:exact`).

## Sinapse dependență în același traseu

[`bronze-dedup-hash-checker-bronze-ingest-csv-parser.md`](bronze-dedup-hash-checker-bronze-ingest-csv-parser.md), [`bronze-dedup-hash-checker-bronze-ingest-html-scraper.md`](bronze-dedup-hash-checker-bronze-ingest-html-scraper.md), [`bronze-dedup-hash-checker-bronze-ingest-json-parser.md`](bronze-dedup-hash-checker-bronze-ingest-json-parser.md), [`bronze-dedup-hash-checker-bronze-ingest-pdf-extractor.md`](bronze-dedup-hash-checker-bronze-ingest-pdf-extractor.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** execuția efectivă urmează **`dedup:exact`** dacă maparea din neuron rămâne valabilă; `e1-bronze-dedup` rămâne etichetă de **planificare**.
- **Semantic (ADR-0002):** `e1:dedup:exact` + familia ingest legată prin sinapse dependență.
- **Planificare:** v2 §7 — `bronze-dedup-hash-checker` → `e1-bronze-dedup`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Hash-checker** (v2) vs **dedup exact** (cod): tensiune explicită în [`../../../neurons/E1/bronze--dedup--hash-checker.md`](../../../neurons/E1/bronze--dedup--hash-checker.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-dedup-hash-checker-family\``.
