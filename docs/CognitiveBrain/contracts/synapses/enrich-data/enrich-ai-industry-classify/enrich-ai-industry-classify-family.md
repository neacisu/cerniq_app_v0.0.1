# Sinapsă `enrich-ai-industry-classify-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-ai-industry-classify-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-ai-industry-classify/enrich-ai-industry-classify-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-ai-industry-classify` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-ai-industry-classify` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--ai--industry-classify.md`](../../../neurons/E1/enrich--ai--industry-classify.md). **Runtime (ADR-0001):** v2 `enrich:ai:industry-classify` **absent** ca literal din registry — ramuri `ai:structure:xai` / `agri:culturi` discutate în contract ca apropiere semantică, fără identitate 1:1. |
| Destinație (graf) | `e1-ai-enrichment` | Agregat **familie AI enrichment E1** în planificare. Vezi [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-ai-industry-classify** sub agregatul **`e1-ai-enrichment`**. v2: **„specializează familia”**. Clasificarea sector/CAEN și distincția față de alte ramuri AI sunt în contractul neuron, nu în sinapsă.

## Sinapse dependență în același traseu

[`enrich-ai-industry-classify-silver-dedup-entity-resolve.md`](enrich-ai-industry-classify-silver-dedup-entity-resolve.md), [`enrich-ai-industry-classify-silver-dedup-fuzzy-match.md`](enrich-ai-industry-classify-silver-dedup-fuzzy-match.md).

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

- **Runtime (ADR-0001):** agregat `e1-ai-enrichment` vs cozi `ai:*` — vezi ADR.
- **Semantic (ADR-0002):** familia `ai-enrichment` (v2).
- **Planificare:** v2 §7 — `enrich-ai-industry-classify` → `e1-ai-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Necesită reconciliere graf ↔ registry** pentru numele exact al cozii care implementează clasificarea — vezi contract sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-ai-industry-classify-family\``.

## Reconciliere runtime (dovadă cod, 2026-04-14)

- **CAEN / industrie (LLM):** aceeași coadă `ai:structure:xai` / J1 — extragere `cod_caen_principal`, `is_agricol` în schema JSON.
- **Culturi (euristică):** coadă `agri:culturi` / L4 (`l4-culturi-classifier.ts`). **Trigger P1:** pentru `codCaenPrincipal` agricol (`01*`,`02*`,`03*`), `p1-orchestrate.ts` enfilează `agri:culturi` (în paralel cu `agri:apia`).
- **Telemetrie L4:** `withCognitiveSpan("e1:agri:culturi", …)` + context SSE ca la J1.
