# Sinapsă `churn-alert-escalate-campaign-cluster-launch`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-alert-escalate-campaign-cluster-launch` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-alert-escalate/churn-alert-escalate-campaign-cluster-launch.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-alert-escalate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-alert-escalate` | Contract neuron: [`../../../neurons/E5/churn--alert--escalate.md`](../../../neurons/E5/churn--alert--escalate.md). |
| Destinație (graf) | `campaign-cluster-launch` | Contract neuron: [`../../../neurons/E5/campaign--cluster--launch.md`](../../../neurons/E5/campaign--cluster--launch.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

În **planificare**, muchia **`dependency`** ordonează traseul **churn-alert-escalate** în raport cu **campaign-cluster-launch**: graful include atât escaladarea alertelor churn, cât și lansarea de clustere de campanie într-o topologie comună. **Nu** se afirmă din export cum se transmit datele între noduri.

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
| **Runtime (ADR-0001)** | Ambele capete: vezi cozi / gap-uri în contractele neuron respective. |
| **Semantic (ADR-0002)** | Sursă: mapare alertă vs risk-escalate în contract sursă. |
| **Planificare** | v2 §7 — `dependency` explicită. |

## Limite și reconcilieri

- Nu se deduce din sinapsă că fiecare escaladare declanșează un cluster launch; doar că **graful** conține dependența.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-alert-escalate-campaign-cluster-launch\``.
