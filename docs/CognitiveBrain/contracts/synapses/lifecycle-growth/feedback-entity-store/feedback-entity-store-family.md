# Sinapsă `feedback-entity-store-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `feedback-entity-store-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/feedback-entity-store/feedback-entity-store-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `feedback-entity-store` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `feedback-entity-store` | Traseu în graf; contract neuron: [`../../../neurons/E5/feedback--entity--store.md`](../../../neurons/E5/feedback--entity--store.md). **Triplă:** v2 **`feedback:entity:store`**; neuronul documentează **gap** — fără worker sau coadă dedicată verificată sub acest literal în repo (H45 = altă responsabilitate). |
| Destinație (graf) | `e5-feedback` | Agregat **familie feedback E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/feedback.md`](../../../../adr/families/e5/feedback.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **feedback-entity-store** sub agregatul **`e5-feedback`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`feedback-entity-store-churn-alert-escalate.md`](feedback-entity-store-churn-alert-escalate.md), [`feedback-entity-store-churn-behavior-detect.md`](feedback-entity-store-churn-behavior-detect.md), [`feedback-entity-store-churn-recovery-attempt.md`](feedback-entity-store-churn-recovery-attempt.md), [`feedback-entity-store-churn-recovery-check.md`](feedback-entity-store-churn-recovery-check.md), [`feedback-entity-store-churn-sentiment-analyze.md`](feedback-entity-store-churn-sentiment-analyze.md), [`feedback-entity-store-churn-signal-create.md`](feedback-entity-store-churn-signal-create.md).

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

- **Planificare:** v2 §7 — `feedback-entity-store` → `e5-feedback`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** **necesită reconciliere graf ↔ registry** pentru sursă — vezi neuron.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Orice echivalență cu alte cozi feedback (ex. satisfacție) rămâne **în neuron**, nu extinsă aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`feedback-entity-store-family\`` (L21902–L21913).
