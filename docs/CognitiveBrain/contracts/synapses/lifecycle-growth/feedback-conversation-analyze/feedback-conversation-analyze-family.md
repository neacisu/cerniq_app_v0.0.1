# Sinapsă `feedback-conversation-analyze-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `feedback-conversation-analyze-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/feedback-conversation-analyze/feedback-conversation-analyze-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `feedback-conversation-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `feedback-conversation-analyze` | Traseu în graf; contract neuron: [`../../../neurons/E5/feedback--conversation--analyze.md`](../../../neurons/E5/feedback--conversation--analyze.md). **Triplă:** v2 **`feedback:conversation:analyze`**; neuronul mapează semantic apropiată la **`sentiment:analyze`** (B12) / **`e5:sentiment:analyze`** — **nu** există literal identic în registry pentru numele v2. |
| Destinație (graf) | `e5-feedback` | Agregat **familie feedback E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/feedback.md`](../../../../adr/families/e5/feedback.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **feedback-conversation-analyze** sub agregatul **`e5-feedback`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`feedback-conversation-analyze-churn-alert-escalate.md`](feedback-conversation-analyze-churn-alert-escalate.md), [`feedback-conversation-analyze-churn-behavior-detect.md`](feedback-conversation-analyze-churn-behavior-detect.md), [`feedback-conversation-analyze-churn-recovery-attempt.md`](feedback-conversation-analyze-churn-recovery-attempt.md), [`feedback-conversation-analyze-churn-recovery-check.md`](feedback-conversation-analyze-churn-recovery-check.md), [`feedback-conversation-analyze-churn-sentiment-analyze.md`](feedback-conversation-analyze-churn-sentiment-analyze.md), [`feedback-conversation-analyze-churn-signal-create.md`](feedback-conversation-analyze-churn-signal-create.md).

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

- **Planificare:** v2 §7 — `feedback-conversation-analyze` → `e5-feedback`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** vezi neuron pentru mapare la **`sentiment:analyze`**; **nu** extrapola dincolo de evidența din neuron.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`feedback-conversation-analyze-family\`` (L21811–L21822).
