# Sinapsă `enrich-onrc-capital-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-onrc-capital-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-onrc-capital/enrich-onrc-capital-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-onrc-capital` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-onrc-capital` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--onrc--capital.md`](../../../neurons/E1/enrich--onrc--capital.md). **Triplă autoritate:** v2 **`enrich:onrc:capital`**; **fără** coadă dedicată în registry — apropiat semantic: **`enrich:onrc:data`** — vezi neuron. |
| Destinație (graf) | `e1-enrichment` | Agregat **familie enrichment E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-onrc-capital** sub agregatul **`e1-enrichment`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`enrich-onrc-capital-enrich-ai-contact-parse.md`](enrich-onrc-capital-enrich-ai-contact-parse.md), [`enrich-onrc-capital-enrich-ai-industry-classify.md`](enrich-onrc-capital-enrich-ai-industry-classify.md), [`enrich-onrc-capital-enrich-ai-text-structure.md`](enrich-onrc-capital-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** `e1-enrichment` nu este cheie în `QUEUES`; ONRC în runtime este enumerat în ADR **`enrich:onrc:data`** etc., nu `capital` ca nume de coadă — vezi neuron.
- **Semantic (ADR-0002):** `e1:enrich:onrc-data` pentru fluxul general ONRC — vezi neuron pentru limită față de «capital».
- **Planificare:** v2 §7 — `enrich-onrc-capital` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Nod graf **capital** vs **extracție dedicată** în cod: **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-onrc-capital-family\``.
