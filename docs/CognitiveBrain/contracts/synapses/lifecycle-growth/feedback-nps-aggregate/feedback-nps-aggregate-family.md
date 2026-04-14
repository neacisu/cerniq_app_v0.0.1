# Sinapsă `feedback-nps-aggregate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `feedback-nps-aggregate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/feedback-nps-aggregate/feedback-nps-aggregate-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `feedback-nps-aggregate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `feedback-nps-aggregate` | Traseu în graf; contract neuron: [`../../../neurons/E5/feedback--nps--aggregate.md`](../../../neurons/E5/feedback--nps--aggregate.md). **Triplă autoritate:** v2 **`feedback:nps:aggregate`**; **runtime (ADR-0001):** **`feedback:report:generate`** / `E5_FEEDBACK_REPORT_GENERATE` — vezi neuron; **semantic (ADR-0002):** **`e5:feedback:report-generate`** — vezi neuron. |
| Destinație (graf) | `e5-feedback` | Agregat **familie feedback** în planificare. ADR indicativ: [`../../../../adr/families/e5/feedback.md`](../../../../adr/families/e5/feedback.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **feedback-nps-aggregate** sub agregatul **`e5-feedback`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`feedback-nps-aggregate-churn-alert-escalate.md`](feedback-nps-aggregate-churn-alert-escalate.md), [`feedback-nps-aggregate-churn-behavior-detect.md`](feedback-nps-aggregate-churn-behavior-detect.md), [`feedback-nps-aggregate-churn-recovery-attempt.md`](feedback-nps-aggregate-churn-recovery-attempt.md), [`feedback-nps-aggregate-churn-recovery-check.md`](feedback-nps-aggregate-churn-recovery-check.md), [`feedback-nps-aggregate-churn-sentiment-analyze.md`](feedback-nps-aggregate-churn-sentiment-analyze.md), [`feedback-nps-aggregate-churn-signal-create.md`](feedback-nps-aggregate-churn-signal-create.md).

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

- **Planificare:** v2 §7 — `feedback-nps-aggregate` → `e5-feedback`.
- **Runtime / semantic:** vezi [`../../../neurons/E5/feedback--nps--aggregate.md`](../../../neurons/E5/feedback--nps--aggregate.md).

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Slug-ul din graf (`feedback-nps-aggregate`) **nu** este identic cu numele cozii v2 (`feedback:nps:aggregate`); execuția canonică pentru agregare NPS în repo este documentată în contractul neuronului (H47).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`feedback-nps-aggregate-family\``.
