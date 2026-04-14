# Sinapsă `feedback-competitor-log-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `feedback-competitor-log-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/feedback-competitor-log/feedback-competitor-log-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `feedback-competitor-log` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `feedback-competitor-log` | Traseu în graf; contract neuron: [`../../../neurons/E5/feedback--competitor--log.md`](../../../neurons/E5/feedback--competitor--log.md). **Triplă:** v2 **`feedback:competitor:log`**; neuronul documentează **lipsă** de mapare verificată în `queue-registry.ts` pentru acest literal — vezi ADR [`../../../../adr/families/e5/feedback.md`](../../../../adr/families/e5/feedback.md). |
| Destinație (graf) | `e5-feedback` | Agregat **familie feedback E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/feedback.md`](../../../../adr/families/e5/feedback.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **feedback-competitor-log** sub agregatul **`e5-feedback`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`feedback-competitor-log-churn-alert-escalate.md`](feedback-competitor-log-churn-alert-escalate.md), [`feedback-competitor-log-churn-behavior-detect.md`](feedback-competitor-log-churn-behavior-detect.md), [`feedback-competitor-log-churn-recovery-attempt.md`](feedback-competitor-log-churn-recovery-attempt.md), [`feedback-competitor-log-churn-recovery-check.md`](feedback-competitor-log-churn-recovery-check.md), [`feedback-competitor-log-churn-sentiment-analyze.md`](feedback-competitor-log-churn-sentiment-analyze.md), [`feedback-competitor-log-churn-signal-create.md`](feedback-competitor-log-churn-signal-create.md).

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

- **Planificare:** v2 §7 — `feedback-competitor-log` → `e5-feedback`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** **necesită reconciliere graf ↔ registry** pentru sursă — vezi neuron (fără implementare dedicată verificată sub numele v2).

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- ADR **feedback** notează cozi suplimentare în graf față de registry — nu infera mapări neconsemnate în neuron/ADR.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`feedback-competitor-log-family\`` (L21720–L21731).
