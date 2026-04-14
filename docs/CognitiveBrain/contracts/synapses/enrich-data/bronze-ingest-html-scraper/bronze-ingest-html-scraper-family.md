# Sinapsă `bronze-ingest-html-scraper-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-html-scraper-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-html-scraper/bronze-ingest-html-scraper-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-html-scraper` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `bronze-ingest-html-scraper` | Traseu în graf; contract neuron: [`../../../neurons/E1/bronze--ingest--html-scraper.md`](../../../neurons/E1/bronze--ingest--html-scraper.md). **Runtime (ADR-0001):** la ultimul audit din neuron, **lipsește** coadă / `nodeKey` cu literal **`bronze:ingest:html-scraper`**; există căi adiacente de scraping (ex. `scrape:website:*`) — **nu** echivalent declarat 1:1. **Semantic (ADR-0002):** vezi neuron și catalog pentru instrumente scrape. |
| Destinație (graf) | `e1-ingest` | Agregat **familie ingest E1**. Vezi [`../../../adr/families/e1/ingest.md`](../../../adr/families/e1/ingest.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **bronze-ingest-html-scraper** sub **`e1-ingest`**. v2: **„specializează familia”**. **Evidență:** planificarea (graf) afirmă traseul; **implementarea** cozii omoloage este **gap / parțială** conform contractului neuron — acest contract sinapsă rămâne **export-grounded** fără a pretinde runtime complet.

## Sinapse dependență în același traseu

[`bronze-ingest-html-scraper-silver-norm-address.md`](bronze-ingest-html-scraper-silver-norm-address.md), [`bronze-ingest-html-scraper-silver-norm-company-name.md`](bronze-ingest-html-scraper-silver-norm-company-name.md), [`bronze-ingest-html-scraper-silver-norm-email.md`](bronze-ingest-html-scraper-silver-norm-email.md), [`bronze-ingest-html-scraper-silver-norm-phone-e164.md`](bronze-ingest-html-scraper-silver-norm-phone-e164.md).

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

- **Runtime (ADR-0001):** `e1-ingest` agregat vs **lipsă** omolog clar pentru sursă — vezi neuron.
- **Semantic (ADR-0002):** ingest v2 vs `ToolNeuron` scrape — în neuron.
- **Planificare:** v2 §7 — `bronze-ingest-html-scraper` → `e1-ingest`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Orice „implementare completă” a acestui traseu cere **ADR + cod**, nu completări în acest fișier.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-html-scraper-family\``.
