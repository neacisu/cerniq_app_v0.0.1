# Sinapsă `nurturing-onboarding-complete-feedback-nps-aggregate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `nurturing-onboarding-complete-feedback-nps-aggregate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/nurturing-onboarding-complete/nurturing-onboarding-complete-feedback-nps-aggregate.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `nurturing-onboarding-complete` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `nurturing-onboarding-complete` | **Contract:** [`../../../neurons/E5/nurturing--onboarding--complete.md`](../../../neurons/E5/nurturing--onboarding--complete.md). **Triplă autoritate:** v2 `nurturing:onboarding:complete`; runtime `onboarding:complete:check` — vezi neuron. |
| Destinație (graf) | `feedback-nps-aggregate` | **Contract:** [`../../../neurons/E5/feedback--nps--aggregate.md`](../../../neurons/E5/feedback--nps--aggregate.md). Context: [`../../../../adr/families/e5/feedback.md`](../../../../adr/families/e5/feedback.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **nurturing-onboarding-complete** are dependență canonică de pipeline față de **feedback-nps-aggregate**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `nurturing-onboarding-complete` → `feedback-nps-aggregate`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L308**; țintă `feedback:nps:aggregate` la **L273** (fișier).
- **Runtime:** vezi neuronii; nu inferăm ordinea joburilor BullMQ din singurul export.

## Limite și reconcilieri

- —

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`nurturing-onboarding-complete-feedback-nps-aggregate\``.
