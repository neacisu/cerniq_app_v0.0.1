# Sinapsă `feedback-sentiment-analyze-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `feedback-sentiment-analyze-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/feedback-sentiment-analyze/feedback-sentiment-analyze-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `feedback-sentiment-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `feedback-sentiment-analyze` | Traseu în graf; contract neuron: [`../../../neurons/E2/feedback--sentiment--analyze.md`](../../../neurons/E2/feedback--sentiment--analyze.md). **Triplă autoritate:** v2 **`feedback:sentiment:analyze`**; **runtime (ADR-0001):** **`ai:sentiment:analyze`** — vezi neuron; **semantic (ADR-0002):** **`e2:ai:sentiment-analyze`** — vezi neuron. |
| Destinație (graf) | `e5-feedback` | Agregat **familie feedback** în planificare. ADR indicativ: [`../../../../adr/families/e5/feedback.md`](../../../../adr/families/e5/feedback.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **feedback-sentiment-analyze** sub agregatul **`e5-feedback`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`feedback-sentiment-analyze-churn-alert-escalate.md`](feedback-sentiment-analyze-churn-alert-escalate.md), [`feedback-sentiment-analyze-churn-behavior-detect.md`](feedback-sentiment-analyze-churn-behavior-detect.md), [`feedback-sentiment-analyze-churn-recovery-attempt.md`](feedback-sentiment-analyze-churn-recovery-attempt.md), [`feedback-sentiment-analyze-churn-recovery-check.md`](feedback-sentiment-analyze-churn-recovery-check.md), [`feedback-sentiment-analyze-churn-sentiment-analyze.md`](feedback-sentiment-analyze-churn-sentiment-analyze.md), [`feedback-sentiment-analyze-churn-signal-create.md`](feedback-sentiment-analyze-churn-signal-create.md).

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

- **Planificare:** v2 §7 — `feedback-sentiment-analyze` → `e5-feedback`.
- **Runtime / semantic:** vezi [`../../../neurons/E2/feedback--sentiment--analyze.md`](../../../neurons/E2/feedback--sentiment--analyze.md).

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Neuronul este **E2** în repo, dar traseul este plasat sub agregatul **`e5-feedback`** în graf — vezi contractul neuronului pentru alias-uri v2 vs execuție.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`feedback-sentiment-analyze-family\``.
