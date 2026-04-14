# Sinapsă `enrich-termene-risk-score-enrich-ai-industry-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-risk-score-enrich-ai-industry-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-risk-score/enrich-termene-risk-score-enrich-ai-industry-classify.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-risk-score` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-risk-score` | Contract: [`../../../neurons/E1/enrich--termene--risk-score.md`](../../../neurons/E1/enrich--termene--risk-score.md). **v2_queue:** `enrich:termene:risk-score`. |
| Destinație (graf) | `enrich-ai-industry-classify` | Contract: [`../../../neurons/E1/enrich--ai--industry-classify.md`](../../../neurons/E1/enrich--ai--industry-classify.md). ADR: [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Muchia **`dependency`** plasează traseul riscului Termene în raport de **enrich-ai-industry-classify** în modelul exportat. Interpretare conservatoare: planificarea prevede și clasificare industrială AI în același lanț cu scorul de risc; mecanismul și datele **nu** sunt în câmpurile sinapsei.

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
| **Runtime (ADR-0001)** | Sursă: vezi `enrich:termene:risk`. Pentru destinație: vezi contract neuron și ADR ai-enrichment. |
| **Semantic (ADR-0002)** | E1. |
| **Planificare** | v2 §7 — capete și `dependency` conform exportului. |

## Limite și reconcilieri

- Fără afirmații despre ponderarea riscului pe sector; exportul nu le conține.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-risk-score-enrich-ai-industry-classify\``.
