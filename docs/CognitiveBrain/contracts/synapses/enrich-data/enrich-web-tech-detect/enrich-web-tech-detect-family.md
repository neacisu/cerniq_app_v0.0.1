# Sinapsă `enrich-web-tech-detect-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-web-tech-detect-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-web-tech-detect/enrich-web-tech-detect-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-web-tech-detect` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-web-tech-detect` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--web--tech-detect.md`](../../../neurons/E1/enrich--web--tech-detect.md). **Triplă autoritate:** v2 **`enrich:web:tech-detect`**; runtime / catalog — **gap** documentat în neuron (fără literal în `queue-registry.ts` / `cognitive-node-catalog.ts` la auditul din contract). |
| Destinație (graf) | `e1-enrichment` | Agregat **familie enrichment E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-web-tech-detect** sub agregatul **`e1-enrichment`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`enrich-web-tech-detect-enrich-ai-contact-parse.md`](enrich-web-tech-detect-enrich-ai-contact-parse.md), [`enrich-web-tech-detect-enrich-ai-industry-classify.md`](enrich-web-tech-detect-enrich-ai-industry-classify.md), [`enrich-web-tech-detect-enrich-ai-text-structure.md`](enrich-web-tech-detect-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** `e1-enrichment` nu este cheie în `QUEUES`; starea cozii pentru capabilitatea web tech-detect este **gap** — vezi [`enrich--web--tech-detect.md`](../../../neurons/E1/enrich--web--tech-detect.md).
- **Semantic (ADR-0002):** **fără** `nodeKey` în catalog pentru acest neuron la auditul din contract — vezi același fișier.
- **Planificare:** v2 §7 — `enrich-web-tech-detect` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Necesită reconciliere graf ↔ registry** pentru sursă: eticheta graf **`enrich-web-tech-detect`** vs lipsa unei legături operaționale demonstrate în cod pentru **`enrich:web:tech-detect`** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-web-tech-detect-family\``.
