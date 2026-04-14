# Sinapsă `bronze-ingest-pdf-extractor-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-pdf-extractor-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-pdf-extractor` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `bronze-ingest-pdf-extractor` | Traseu în graf (v2 **E1** ingest, L2765–2785); contracte: [`../../../neurons/E1/bronze--ingest--pdf-extractor.md`](../../../neurons/E1/bronze--ingest--pdf-extractor.md), instanță **v2 #2** **E5** [`../../../neurons/E5/bronze--ingest--pdf-extractor.md`](../../../neurons/E5/bronze--ingest--pdf-extractor.md). **Runtime (ADR-0001):** literal `bronze:ingest:pdf-extractor` **absent** din registry; PDF în **workeri E5** — vezi contracte. |
| Destinație (graf) | `e1-ingest` | Agregat **familie ingest E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e1/ingest.md`](../../../adr/families/e1/ingest.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **bronze-ingest-pdf-extractor** sub agregatul **`e1-ingest`**. v2: **„specializează familia”**. **Reconciliere:** același `v2_queue` apare și în **E5 / association-ingest**; execuția PDF documentată în repo nu este un neuron bronze E1 izolat — vezi contractele E1 și E5.

## Sinapse dependență în același traseu

[`bronze-ingest-pdf-extractor-association-enrich-termene.md`](bronze-ingest-pdf-extractor-association-enrich-termene.md), [`bronze-ingest-pdf-extractor-association-members-link.md`](bronze-ingest-pdf-extractor-association-members-link.md), [`bronze-ingest-pdf-extractor-association-pdf-ingest.md`](bronze-ingest-pdf-extractor-association-pdf-ingest.md), [`bronze-ingest-pdf-extractor-association-sync-schedule.md`](bronze-ingest-pdf-extractor-association-sync-schedule.md), [`bronze-ingest-pdf-extractor-association-territory-infer.md`](bronze-ingest-pdf-extractor-association-territory-infer.md), [`bronze-ingest-pdf-extractor-graph-build-full.md`](bronze-ingest-pdf-extractor-graph-build-full.md), [`bronze-ingest-pdf-extractor-graph-centrality-calculate.md`](bronze-ingest-pdf-extractor-graph-centrality-calculate.md), [`bronze-ingest-pdf-extractor-graph-communities-latest.md`](bronze-ingest-pdf-extractor-graph-communities-latest.md), [`bronze-ingest-pdf-extractor-graph-community-detect.md`](bronze-ingest-pdf-extractor-graph-community-detect.md), [`bronze-ingest-pdf-extractor-graph-full-built-at.md`](bronze-ingest-pdf-extractor-graph-full-built-at.md), [`bronze-ingest-pdf-extractor-graph-full-latest.md`](bronze-ingest-pdf-extractor-graph-full-latest.md), [`bronze-ingest-pdf-extractor-graph-full-metrics.md`](bronze-ingest-pdf-extractor-graph-full-metrics.md), [`bronze-ingest-pdf-extractor-graph-kol-identify.md`](bronze-ingest-pdf-extractor-graph-kol-identify.md), [`bronze-ingest-pdf-extractor-graph-path-find.md`](bronze-ingest-pdf-extractor-graph-path-find.md), [`bronze-ingest-pdf-extractor-graph-relationship-create.md`](bronze-ingest-pdf-extractor-graph-relationship-create.md), [`bronze-ingest-pdf-extractor-graph-relationship-infer.md`](bronze-ingest-pdf-extractor-graph-relationship-infer.md), [`bronze-ingest-pdf-extractor-silver-norm-address.md`](bronze-ingest-pdf-extractor-silver-norm-address.md), [`bronze-ingest-pdf-extractor-silver-norm-company-name.md`](bronze-ingest-pdf-extractor-silver-norm-company-name.md), [`bronze-ingest-pdf-extractor-silver-norm-email.md`](bronze-ingest-pdf-extractor-silver-norm-email.md), [`bronze-ingest-pdf-extractor-silver-norm-phone-e164.md`](bronze-ingest-pdf-extractor-silver-norm-phone-e164.md).

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

- **Runtime (ADR-0001):** `e1-ingest` agregat vs **fără** coadă literală pentru PDF bronze în registry — vezi contracte sursă.
- **Semantic (ADR-0002):** ingest (graf) + ramuri **E5** graf/asociații pentru dependențele listate — vezi contractele de destinație.
- **Planificare:** v2 §7 — `bronze-ingest-pdf-extractor` → `e1-ingest`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Dependențele către noduri **E5** (graf, asociații) nu implică automat că sursa rulează pe aceeași coadă — **triplă autoritate** obligatorie la citire.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-pdf-extractor-family\``.
