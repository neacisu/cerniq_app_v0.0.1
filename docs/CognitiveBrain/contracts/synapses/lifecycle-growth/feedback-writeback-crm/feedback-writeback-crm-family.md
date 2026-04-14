# Sinapsă `feedback-writeback-crm-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `feedback-writeback-crm-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/feedback-writeback-crm/feedback-writeback-crm-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `feedback-writeback-crm` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `feedback-writeback-crm` | Traseu în graf; contract neuron: [`../../../neurons/E5/feedback--writeback--crm.md`](../../../neurons/E5/feedback--writeback--crm.md). **Triplă autoritate:** v2 **`feedback:writeback:crm`**; **runtime (ADR-0001):** **fără** literal canonic cu acest nume în registry — vezi neuron (mapare indirectă / gap); **semantic (ADR-0002):** **necesită reconciliere** față de `nodeKey` efectiv dacă execuția este repartizată altor cozi — vezi neuron. |
| Destinație (graf) | `e5-feedback` | Agregat **familie feedback** în planificare. ADR indicativ: [`../../../../adr/families/e5/feedback.md`](../../../../adr/families/e5/feedback.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **feedback-writeback-crm** sub agregatul **`e5-feedback`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`feedback-writeback-crm-churn-alert-escalate.md`](feedback-writeback-crm-churn-alert-escalate.md), [`feedback-writeback-crm-churn-behavior-detect.md`](feedback-writeback-crm-churn-behavior-detect.md), [`feedback-writeback-crm-churn-recovery-attempt.md`](feedback-writeback-crm-churn-recovery-attempt.md), [`feedback-writeback-crm-churn-recovery-check.md`](feedback-writeback-crm-churn-recovery-check.md), [`feedback-writeback-crm-churn-sentiment-analyze.md`](feedback-writeback-crm-churn-sentiment-analyze.md), [`feedback-writeback-crm-churn-signal-create.md`](feedback-writeback-crm-churn-signal-create.md).

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

- **Planificare:** v2 §7 — `feedback-writeback-crm` → `e5-feedback`.
- **Runtime / semantic:** vezi [`../../../neurons/E5/feedback--writeback--crm.md`](../../../neurons/E5/feedback--writeback--crm.md).

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Gap runtime:** numele v2 **`feedback:writeback:crm`** nu apare ca atare în `queue-registry.ts` — vezi contractul neuronului pentru cea mai apropiată cale operațională documentată.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`feedback-writeback-crm-family\``.
