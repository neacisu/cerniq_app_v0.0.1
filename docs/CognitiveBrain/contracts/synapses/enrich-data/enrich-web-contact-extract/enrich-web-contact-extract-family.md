# Sinapsă `enrich-web-contact-extract-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-web-contact-extract-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-web-contact-extract/enrich-web-contact-extract-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-web-contact-extract` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-web-contact-extract` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--web--contact-extract.md`](../../../neurons/E1/enrich--web--contact-extract.md). **Triplă autoritate:** v2 **`enrich:web:contact-extract`**; în runtime auditat, extracția este **`scrape:website:contact-page`** / span **`e1:scrape:website-contact`** — vezi neuron; `NEURON_MATRIX.csv`: **`e1:scrape:website-contact`**. |
| Destinație (graf) | `e1-enrichment` | Agregat **familie enrichment E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-web-contact-extract** sub agregatul **`e1-enrichment`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`enrich-web-contact-extract-enrich-ai-contact-parse.md`](enrich-web-contact-extract-enrich-ai-contact-parse.md), [`enrich-web-contact-extract-enrich-ai-industry-classify.md`](enrich-web-contact-extract-enrich-ai-industry-classify.md), [`enrich-web-contact-extract-enrich-ai-text-structure.md`](enrich-web-contact-extract-enrich-ai-text-structure.md).

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

- **Planificare:** v2 §7 — `enrich-web-contact-extract` → `e1-enrichment`.
- **Runtime (ADR-0001):** `e1-enrichment` nu este cheie în `QUEUES`; procesare raportată pe **`scrape:website:contact-page`** — vezi registry și neuron.
- **Semantic (ADR-0002):** `e1:scrape:website-contact` — vezi `NEURON_MATRIX.csv` și catalog.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs runtime:** eticheta v2 `enrich:web:contact-extract` **nu** apare ca literal de coadă în registry la audit neuron — reconciliere explicită în contractul neuronului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-web-contact-extract-family\``.
