# Sinapsă `enrich-ai-contact-parse-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-ai-contact-parse-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-ai-contact-parse/enrich-ai-contact-parse-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-ai-contact-parse` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-ai-contact-parse` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--ai--contact-parse.md`](../../../neurons/E1/enrich--ai--contact-parse.md). **Runtime (ADR-0001):** v2 `enrich:ai:contact-parse` **absent** din registry ca literal — potrivire semantică discutată în contract (ex. `ai:structure:xai`). **Semantic (ADR-0002):** vezi catalog / ADR. |
| Destinație (graf) | `e1-ai-enrichment` | Agregat **familie AI enrichment E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-ai-contact-parse** sub agregatul **`e1-ai-enrichment`**. v2: **„specializează familia”**. Maparea exactă la cozi `ai:*` și pragurile de încredere rămân în contractul neuron și în ADR, nu în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`enrich-ai-contact-parse-silver-dedup-entity-resolve.md`](enrich-ai-contact-parse-silver-dedup-entity-resolve.md), [`enrich-ai-contact-parse-silver-dedup-fuzzy-match.md`](enrich-ai-contact-parse-silver-dedup-fuzzy-match.md).

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

- **Runtime (ADR-0001):** `e1-ai-enrichment` agregat vs cozi concrete `ai:*` / absență literală v2 — vezi ADR și contract sursă.
- **Semantic (ADR-0002):** familia `ai-enrichment` (v2).
- **Planificare:** v2 §7 — `enrich-ai-contact-parse` → `e1-ai-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs runtime:** eticheta `enrich:ai:contact-parse` **nu** implică automat un worker cu același nume — vezi contract neuron.

## Reconciliere runtime (dovadă cod, 2026-04-14)

- **Coadă executabilă:** `ai:structure:xai` → `grokStructuringProcessor` (`workers/enrichment/src/workers/j1-grok-structuring.ts`).
- **Enqueue:** `p1-orchestrate.ts` (`handlePostValidation`) trimite `basePayload`; J1 acceptă `rawData` sau câmpuri plate (vezi `resolveGrokStructuringRawData`).
- **OTel:** span `cognitive:e1:ai:structure-xai`; evenimente cognitive cu `batchId` când `correlationId` este UUID valid pentru contractul `emitCognitiveEvent` (`buildCognitiveWorkerEventContext`).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-ai-contact-parse-family\``.
