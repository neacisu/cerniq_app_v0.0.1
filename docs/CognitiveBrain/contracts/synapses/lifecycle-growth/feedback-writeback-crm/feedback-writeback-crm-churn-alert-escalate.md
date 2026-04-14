# Sinapsă `feedback-writeback-crm-churn-alert-escalate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `feedback-writeback-crm-churn-alert-escalate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/feedback-writeback-crm/feedback-writeback-crm-churn-alert-escalate.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `feedback-writeback-crm` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `feedback-writeback-crm` | **Contract:** [`../../../neurons/E5/feedback--writeback--crm.md`](../../../neurons/E5/feedback--writeback--crm.md). **Runtime:** **fără** coadă canonică 1:1 cu `feedback:writeback:crm` — vezi neuron. |
| Destinație (graf) | `churn-alert-escalate` | **Contract:** [`../../../neurons/E5/churn--alert--escalate.md`](../../../neurons/E5/churn--alert--escalate.md). Context: [`../../../../adr/families/e5/churn.md`](../../../../adr/families/e5/churn.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **feedback-writeback-crm** are dependență sintactică față de **churn-alert-escalate**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `feedback-writeback-crm` → `churn-alert-escalate`.
- **Runtime / semantic:** vezi neuronii; ținta graf `churn-alert-escalate` ↔ runtime **`churn:risk:escalate`** — vezi contractul țintă.

## Limite și reconcilieri

- Denumiri **graf vs registry** pentru churn: vezi [`../../../neurons/E5/churn--alert--escalate.md`](../../../neurons/E5/churn--alert--escalate.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`feedback-writeback-crm-churn-alert-escalate\``.
