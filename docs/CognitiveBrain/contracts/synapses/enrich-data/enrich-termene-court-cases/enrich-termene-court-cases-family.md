# Sinapsă `enrich-termene-court-cases-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-court-cases-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-court-cases/enrich-termene-court-cases-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-court-cases` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-court-cases` | **Graf:** nod pentru `enrich:termene:court-cases`. Contract neuron: [`../../../neurons/E1/enrich--termene--court-cases.md`](../../../neurons/E1/enrich--termene--court-cases.md). **Runtime:** mapare documentată spre `enrich:termene:dosare` (nu literal «court-cases» în registry). |
| Destinație (graf) | `e1-enrichment` | Familie agregată E1 `enrichment`. v2: [`### ADR-FAMILY-e1-enrichment`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR: [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** atașează traseul **enrich-termene-court-cases** de agregatul **`e1-enrichment`**. În v2, descrierea confirmată este **„specializează familia”**: planificarea tratează dosarele judiciare Termene ca parte a aceluiași subgraph de îmbogățire E1 ca celelalte surse externe. **Reconcilierea numelor** (`court-cases` v2 vs `dosare` runtime) este în contractul neuron, nu în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`enrich-termene-court-cases-enrich-ai-contact-parse.md`](enrich-termene-court-cases-enrich-ai-contact-parse.md), [`enrich-termene-court-cases-enrich-ai-industry-classify.md`](enrich-termene-court-cases-enrich-ai-industry-classify.md), [`enrich-termene-court-cases-enrich-ai-text-structure.md`](enrich-termene-court-cases-enrich-ai-text-structure.md).

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | Execuție dosare: `ENRICH_TERMENE_DOSARE` / `enrich:termene:dosare` — vezi contract neuron și registry. |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — intrare `enrich:termene:court-cases` la **L34** (fișier). |
| **Planificare** | v2 §7 — `enrich-termene-court-cases` → `e1-enrichment`, `default`. |

## Limite și reconcilieri

- Nu extrapola payload sau ordinea job-urilor din muchia `default`.
- **Graf vs runtime:** identificatorul de nod din export **nu** este obligatoriu egal cu `queueName` din BullMQ.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-court-cases-family\``.
