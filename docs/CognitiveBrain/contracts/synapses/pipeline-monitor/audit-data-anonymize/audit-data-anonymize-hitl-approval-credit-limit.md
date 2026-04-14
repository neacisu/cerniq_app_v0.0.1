# Sinapsă `audit-data-anonymize-hitl-approval-credit-limit`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `audit-data-anonymize-hitl-approval-credit-limit` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/audit-data-anonymize/audit-data-anonymize-hitl-approval-credit-limit.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `audit-data-anonymize` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `audit-data-anonymize` | **Contract:** [`../../../neurons/E4/audit--data--anonymize.md`](../../../neurons/E4/audit--data--anonymize.md). |
| Destinație (graf) | `hitl-approval-credit-limit` | **Contract:** [`../../../neurons/E4/hitl--approval--credit-limit.md`](../../../neurons/E4/hitl--approval--credit-limit.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **audit-data-anonymize** are dependență sintactică față de **hitl-approval-credit-limit**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `audit-data-anonymize` → `hitl-approval-credit-limit`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** vezi contractele neuron sursă și destinație.

## Limite și reconcilieri

- Muchia este **structurală** în registrul sinapse; regulile de credit sunt în domeniul HITL / business, nu în câmpurile v2 ale sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`audit-data-anonymize-hitl-approval-credit-limit\``.
