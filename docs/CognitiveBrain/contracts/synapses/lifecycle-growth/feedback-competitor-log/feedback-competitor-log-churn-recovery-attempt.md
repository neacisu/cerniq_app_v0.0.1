# Sinapsă `feedback-competitor-log-churn-recovery-attempt`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `feedback-competitor-log-churn-recovery-attempt` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/feedback-competitor-log/feedback-competitor-log-churn-recovery-attempt.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `feedback-competitor-log` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `feedback-competitor-log` | **Contract:** [`../../../neurons/E5/feedback--competitor--log.md`](../../../neurons/E5/feedback--competitor--log.md). **Triplă:** v2 `feedback:competitor:log` — vezi neuron pentru gap registry. |
| Destinație (graf) | `churn-recovery-attempt` | **Contract:** [`../../../neurons/E5/churn--recovery--attempt.md`](../../../neurons/E5/churn--recovery--attempt.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **feedback-competitor-log** are dependență sintactică față de **churn-recovery-attempt**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `feedback-competitor-log` → `churn-recovery-attempt`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** vezi contractele neuron pentru sursă și țintă.

## Limite și reconcilieri

- Muchia exprimă doar structura grafului exportat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`feedback-competitor-log-churn-recovery-attempt\`` (L21668–L21679).
