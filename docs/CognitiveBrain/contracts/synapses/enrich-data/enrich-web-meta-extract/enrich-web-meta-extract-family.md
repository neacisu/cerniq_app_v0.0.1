# Sinapsă `enrich-web-meta-extract-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-web-meta-extract-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-web-meta-extract/enrich-web-meta-extract-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-web-meta-extract` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-web-meta-extract` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--web--meta-extract.md`](../../../neurons/E1/enrich--web--meta-extract.md). **Triplă autoritate:** v2 **`enrich:web:meta-extract`**; la audit neuron **fără** coadă, **fără** `nodeKey` și **fără** handler dedicat pentru meta/OG — vezi neuron; `NEURON_MATRIX.csv`: fără mapare semantică în coloana raportată pentru acest rând. |
| Destinație (graf) | `e1-enrichment` | Agregat **familie enrichment E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-web-meta-extract** sub agregatul **`e1-enrichment`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`enrich-web-meta-extract-enrich-ai-contact-parse.md`](enrich-web-meta-extract-enrich-ai-contact-parse.md), [`enrich-web-meta-extract-enrich-ai-industry-classify.md`](enrich-web-meta-extract-enrich-ai-industry-classify.md), [`enrich-web-meta-extract-enrich-ai-text-structure.md`](enrich-web-meta-extract-enrich-ai-text-structure.md).

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

- **Planificare:** v2 §7 — `enrich-web-meta-extract` → `e1-enrichment`.
- **Runtime (ADR-0001):** `e1-enrichment` nu este cheie în `QUEUES`; pentru sursă vezi **gap** în neuron — nu se afirmă o coadă executabilă omologă numelui v2.
- **Semantic (ADR-0002):** fără legătură catalogică 1:1 la audit neuron — vezi `NEURON_MATRIX.csv` și contract.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs runtime:** nod planificat **meta-extract** fără implementare E1 dedicată la audit — **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-web-meta-extract-family\``.
