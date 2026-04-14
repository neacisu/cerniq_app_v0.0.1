# Sinapsă `enrich-madr-cooperative-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-madr-cooperative-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-madr-cooperative/enrich-madr-cooperative-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-madr-cooperative` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-madr-cooperative` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--madr--cooperative.md`](../../../neurons/E1/enrich--madr--cooperative.md). **Triplă autoritate:** v2 **`enrich:madr:cooperative`**; runtime apropiat documentat: **`agri:cooperative`** — vezi neuron pentru reconciliere. |
| Destinație (graf) | `e1-enrichment` | Agregat **familie enrichment E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-madr-cooperative** sub agregatul **`e1-enrichment`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`enrich-madr-cooperative-enrich-ai-contact-parse.md`](enrich-madr-cooperative-enrich-ai-contact-parse.md), [`enrich-madr-cooperative-enrich-ai-industry-classify.md`](enrich-madr-cooperative-enrich-ai-industry-classify.md), [`enrich-madr-cooperative-enrich-ai-text-structure.md`](enrich-madr-cooperative-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** `e1-enrichment` nu este cheie în `QUEUES`; traseul se ancorează în cozi E1 prin [`enrich--madr--cooperative.md`](../../../neurons/E1/enrich--madr--cooperative.md).
- **Semantic (ADR-0002):** `e1:agri:cooperative` (dovadă în neuron) vs etichetă v2 — vezi neuron.
- **Planificare:** v2 §7 — `enrich-madr-cooperative` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Slug graf **`enrich-madr-cooperative`** vs **`enrich:madr:cooperative`** / **`agri:cooperative`**: **necesită reconciliere graf ↔ registry** — vezi neuron și ADR.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-madr-cooperative-family\``.
