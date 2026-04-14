# Sinapsă `nurturing-onboarding-step-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `nurturing-onboarding-step-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/nurturing-onboarding-step/nurturing-onboarding-step-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `nurturing-onboarding-step` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `nurturing-onboarding-step` | **Graf:** execuție pas onboarding. Contract neuron: [`../../../neurons/E5/nurturing--onboarding--step.md`](../../../neurons/E5/nurturing--onboarding--step.md). **Triplă autoritate:** v2 `nurturing:onboarding:step`; runtime `onboarding:step:execute` — vezi neuron. |
| Destinație (graf) | `e5-lifecycle` | Agregat **`e5-lifecycle`**. v2: [`### ADR-FAMILY-e5-lifecycle`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR: [`../../../../adr/families/e5/lifecycle.md`](../../../../adr/families/e5/lifecycle.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **nurturing-onboarding-step** sub **`e5-lifecycle`**, descriere v2 **„specializează familia”**: pașii de onboarding executați din coadă sunt, în planificare, parte a agregatului lifecycle E5.

## Sinapse dependență în același traseu

[`nurturing-onboarding-step-feedback-competitor-log.md`](nurturing-onboarding-step-feedback-competitor-log.md), [`nurturing-onboarding-step-feedback-conversation-analyze.md`](nurturing-onboarding-step-feedback-conversation-analyze.md), [`nurturing-onboarding-step-feedback-entity-store.md`](nurturing-onboarding-step-feedback-entity-store.md), [`nurturing-onboarding-step-feedback-nps-aggregate.md`](nurturing-onboarding-step-feedback-nps-aggregate.md), [`nurturing-onboarding-step-feedback-sentiment-analyze.md`](nurturing-onboarding-step-feedback-sentiment-analyze.md), [`nurturing-onboarding-step-feedback-writeback-crm.md`](nurturing-onboarding-step-feedback-writeback-crm.md).

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
| **Runtime (ADR-0001)** | `onboarding:step:execute` — vezi neuron și registry. |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `nurturing:onboarding:step` la **L310** (fișier). |
| **Planificare** | v2 §7 — `nurturing-onboarding-step` → `e5-lifecycle`. |

## Limite și reconcilieri

- Orice decalaj între eticheta de graf și `nodeKey` din catalog este tratat în contractul neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`nurturing-onboarding-step-family\``.
