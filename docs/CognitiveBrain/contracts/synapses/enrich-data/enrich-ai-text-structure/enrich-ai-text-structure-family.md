# Sinapsă `enrich-ai-text-structure-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-ai-text-structure-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-ai-text-structure/enrich-ai-text-structure-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-ai-text-structure` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-ai-text-structure` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--ai--text-structure.md`](../../../neurons/E1/enrich--ai--text-structure.md). **Runtime (ADR-0001):** v2 `enrich:ai:text-structure` **absent** ca literal din registry — potrivire semantică cu `ai:structure:xai` discutată în contract, **fără** mapare formală afirmată ca identitate. |
| Destinație (graf) | `e1-ai-enrichment` | Agregat **familie AI enrichment E1** în planificare. Vezi [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-ai-text-structure** sub agregatul **`e1-ai-enrichment`**. v2: **„specializează familia”**. Structurarea text/JSON prin LLM și pragurile de încredere sunt în contractul neuron și în workerul J1 citat acolo, nu în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`enrich-ai-text-structure-silver-dedup-entity-resolve.md`](enrich-ai-text-structure-silver-dedup-entity-resolve.md), [`enrich-ai-text-structure-silver-dedup-fuzzy-match.md`](enrich-ai-text-structure-silver-dedup-fuzzy-match.md).

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

- **Runtime (ADR-0001):** agregat vs `ai:structure:xai` — vezi contract sursă și registry.
- **Semantic (ADR-0002):** familia `ai-enrichment` (v2).
- **Planificare:** v2 §7 — `enrich-ai-text-structure` → `e1-ai-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Export-grounded:** nu afirma că `enrich-ai-text-structure` **este** `ai:structure:xai` fără ADR/mapare formală — vezi contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-ai-text-structure-family\``.
