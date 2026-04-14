# Sinapsă `enrich-anaf-tva-status-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-anaf-tva-status-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-anaf-tva-status/enrich-anaf-tva-status-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-anaf-tva-status` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-anaf-tva-status` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--anaf--tva-status.md`](../../../neurons/E1/enrich--anaf--tva-status.md). **v2_queue:** `enrich:anaf:tva-status`. **Runtime (ADR-0001):** execuție activă documentată prin **D0** / **`enrich:anaf:full`** (`tvaActive`, `anafTvaSummary` în metadata); procesor dedicat absent din `main.ts`; `d2-anaf-tva.ts` deprecat — vezi neuron. **Semantic (ADR-0002):** `e1:enrich:anaf-tva` în catalog. |
| Destinație (graf) | `e1-enrichment` | Agregat familie **enrichment** E1. [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-anaf-tva-status** sub **`e1-enrichment`**. v2: **„specializează familia”**. Datele TVA din ANAF sunt detaliate în contractul neuron (D0), nu în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`enrich-anaf-tva-status-enrich-ai-contact-parse.md`](enrich-anaf-tva-status-enrich-ai-contact-parse.md), [`enrich-anaf-tva-status-enrich-ai-industry-classify.md`](enrich-anaf-tva-status-enrich-ai-industry-classify.md), [`enrich-anaf-tva-status-enrich-ai-text-structure.md`](enrich-anaf-tva-status-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** `e1-enrichment` agregat vs `ENRICH_ANAF_TVA_STATUS` — tensiune în neuron.
- **Semantic (ADR-0002):** `e1:enrich:anaf-tva`.
- **Planificare:** v2 §7 — `enrich-anaf-tva-status` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-anaf-tva-status-family\``.
