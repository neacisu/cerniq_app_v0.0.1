# Sinapsă `enrich-termene-risk-score-enrich-ai-text-structure`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-risk-score-enrich-ai-text-structure` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-risk-score/enrich-termene-risk-score-enrich-ai-text-structure.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-risk-score` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-risk-score` | Contract: [`../../../neurons/E1/enrich--termene--risk-score.md`](../../../neurons/E1/enrich--termene--risk-score.md). **v2_queue:** `enrich:termene:risk-score`. |
| Destinație (graf) | `enrich-ai-text-structure` | Contract: [`../../../neurons/E1/enrich--ai--text-structure.md`](../../../neurons/E1/enrich--ai--text-structure.md). ADR: [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Dependența **`dependency`** conectează traseul «risk-score» de **enrich-ai-text-structure** în graful planificat: structurarea AI este inclusă în același desen topologic cu nodul de risc Termene. Execuția (ex. mapare la J1) este în contractele neuron țintă, nu dedusă din sinapsă.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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
| **Runtime (ADR-0001)** | Risc Termene: coadă `enrich:termene:risk`. Structurare: posibil `ai:structure:xai` — vezi contract țintă. |
| **Semantic (ADR-0002)** | E1. |
| **Planificare** | v2 §7 — muchie canonică de pipeline. |

## Limite și reconcilieri

- **Export-grounded:** nu completăm payload sau ordinea efectivă a job-urilor.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-risk-score-enrich-ai-text-structure\``.
