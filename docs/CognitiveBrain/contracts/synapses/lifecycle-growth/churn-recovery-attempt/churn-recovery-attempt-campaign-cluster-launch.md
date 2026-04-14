# Sinapsă `churn-recovery-attempt-campaign-cluster-launch`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-recovery-attempt-campaign-cluster-launch` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-recovery-attempt/churn-recovery-attempt-campaign-cluster-launch.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-recovery-attempt` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-recovery-attempt` | Contract: [`../../../neurons/E5/churn--recovery--attempt.md`](../../../neurons/E5/churn--recovery--attempt.md). |
| Destinație (graf) | `campaign-cluster-launch` | Contract: [`../../../neurons/E5/campaign--cluster--launch.md`](../../../neurons/E5/campaign--cluster--launch.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Muchia **`dependency`** ordonează **churn-recovery-attempt** față de **campaign-cluster-launch** în planificare. Fără detalii de orchestrare din export.

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | Vezi contracte. |
| **Semantic (ADR-0002)** | E5. |
| **Planificare** | v2 §7. |

## Limite și reconcilieri

- **Export-grounded.**

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-recovery-attempt-campaign-cluster-launch\``.
