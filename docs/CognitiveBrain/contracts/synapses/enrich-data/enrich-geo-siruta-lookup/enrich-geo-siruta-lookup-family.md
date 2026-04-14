# Sinapsă `enrich-geo-siruta-lookup-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-geo-siruta-lookup-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-geo-siruta-lookup/enrich-geo-siruta-lookup-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-geo-siruta-lookup` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-geo-siruta-lookup` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--geo--siruta-lookup.md`](../../../neurons/E1/enrich--geo--siruta-lookup.md). **v2_queue:** `enrich:geo:siruta-lookup`. **Runtime (ADR-0001):** la audit din neuron, **lipsesc** coadă BullMQ, procesor E1 și intrare catalog pentru acest `v2_queue`; există doar piese adiacente (schemă `nomenclator_siruta`, `codSiruta` din alte fluxuri) — **reconciliere graf ↔ implementare** documentată în neuron, **fără completări fictive** aici. |
| Destinație (graf) | `e1-enrichment` | Agregat familie **enrichment** E1. [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **lookup SIRUTA** (`enrich-geo-siruta-lookup`) sub **`e1-enrichment`**. v2: **„specializează familia”**. Absența unui worker E1 dedicat pentru acest nod **nu** este rezolvată de sinapsă — vezi contract neuron pentru gap și piese adiacente.

## Sinapse dependență în același traseu

[`enrich-geo-siruta-lookup-enrich-ai-contact-parse.md`](enrich-geo-siruta-lookup-enrich-ai-contact-parse.md), [`enrich-geo-siruta-lookup-enrich-ai-industry-classify.md`](enrich-geo-siruta-lookup-enrich-ai-industry-classify.md), [`enrich-geo-siruta-lookup-enrich-ai-text-structure.md`](enrich-geo-siruta-lookup-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** agregat `e1-enrichment` vs **lipsă** coadă canonică pentru `enrich:geo:siruta-lookup` — vezi neuron.
- **Semantic (ADR-0002):** **necesită reconciliere** — fără `nodeKey` catalog la audit pentru acest `v2_queue`.
- **Planificare:** v2 §7 — `enrich-geo-siruta-lookup` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Gap implementare:** planificarea include traseul; execuția E1 dedicată **nu** este dovedită în neuron — nu se afirmă contrariul în sinapsă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-geo-siruta-lookup-family\``.
