# Sinapsă `audit-compliance-check-hitl-approval-refund-large`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `audit-compliance-check-hitl-approval-refund-large` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/audit-compliance-check/audit-compliance-check-hitl-approval-refund-large.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `audit-compliance-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `audit-compliance-check` | **Contract:** [`../../../neurons/E4/audit--compliance--check.md`](../../../neurons/E4/audit--compliance--check.md). |
| Destinație (graf) | `hitl-approval-refund-large` | **Contract:** [`../../../neurons/E4/hitl--approval--refund-large.md`](../../../neurons/E4/hitl--approval--refund-large.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **audit-compliance-check** are dependență sintactică față de **hitl-approval-refund-large**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `audit-compliance-check` → `hitl-approval-refund-large`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** vezi contractele neuron sursă și destinație.

## Limite și reconcilieri

- Nu se deduce din această muchie singură pragul „refund large” sau regulile de business; acestea aparțin contractelor neuron / cod, nu câmpurilor sinapsei v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`audit-compliance-check-hitl-approval-refund-large\``.
