# Sinapsă `feedback-sentiment-analyze-churn-recovery-attempt`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `feedback-sentiment-analyze-churn-recovery-attempt` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/feedback-sentiment-analyze/feedback-sentiment-analyze-churn-recovery-attempt.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `feedback-sentiment-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `feedback-sentiment-analyze` | **Contract:** [`../../../neurons/E2/feedback--sentiment--analyze.md`](../../../neurons/E2/feedback--sentiment--analyze.md). **Runtime:** **`ai:sentiment:analyze`** — vezi neuron față de `feedback:sentiment:analyze` din v2. |
| Destinație (graf) | `churn-recovery-attempt` | **Contract:** [`../../../neurons/E5/churn--recovery--attempt.md`](../../../neurons/E5/churn--recovery--attempt.md). Context: [`../../../../adr/families/e5/churn.md`](../../../../adr/families/e5/churn.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **feedback-sentiment-analyze** are dependență sintactică față de **churn-recovery-attempt**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `feedback-sentiment-analyze` → `churn-recovery-attempt`.
- **Runtime / semantic:** vezi neuronii.

## Limite și reconcilieri

- —

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`feedback-sentiment-analyze-churn-recovery-attempt\``.
