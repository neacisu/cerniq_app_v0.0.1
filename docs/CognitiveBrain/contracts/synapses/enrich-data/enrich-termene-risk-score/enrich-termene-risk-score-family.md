# Sinapsă `enrich-termene-risk-score-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-risk-score-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-risk-score/enrich-termene-risk-score-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-risk-score` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-risk-score` | **Graf:** `enrich:termene:risk-score`. Contract neuron: [`../../../neurons/E1/enrich--termene--risk-score.md`](../../../neurons/E1/enrich--termene--risk-score.md). **Runtime:** `enrich:termene:risk` în registry — reconciliere nume v2 vs cozi. |
| Destinație (graf) | `e1-enrichment` | Agregat `enrichment` E1. v2: [`### ADR-FAMILY-e1-enrichment`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR: [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-termene-risk-score** sub **`e1-enrichment`**, descriere v2 **„specializează familia”**. În planificare, scorul de risc Termene este tratat ca neuron de îmbogățire în aceeași familie agregată cu celelalte surse externe E1. **Diferența de etichetă** «risk-score» (graf/v2) vs «risk» (registry) este documentată în contractul neuron.

## Sinapse dependență în același traseu

[`enrich-termene-risk-score-enrich-ai-contact-parse.md`](enrich-termene-risk-score-enrich-ai-contact-parse.md), [`enrich-termene-risk-score-enrich-ai-industry-classify.md`](enrich-termene-risk-score-enrich-ai-industry-classify.md), [`enrich-termene-risk-score-enrich-ai-text-structure.md`](enrich-termene-risk-score-enrich-ai-text-structure.md).

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
| **Runtime (ADR-0001)** | `ENRICH_TERMENE_RISK` / `enrich:termene:risk` — vezi `queue-registry.ts` și contract neuron. |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — intrare `enrich:termene:risk-score` la **L37** (fișier). |
| **Planificare** | v2 §7 — `enrich-termene-risk-score` → `e1-enrichment`, `default`. |

## Limite și reconcilieri

- Nu confunda agregatul `e1-enrichment` cu o coadă unică; vezi ADR-FAMILY-e1-enrichment în v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-risk-score-family\``.
