# Sinapsă `churn-sentiment-analyze-campaign-cluster-launch`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-sentiment-analyze-campaign-cluster-launch` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-sentiment-analyze/churn-sentiment-analyze-campaign-cluster-launch.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-sentiment-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-sentiment-analyze` | Contract: [`../../../neurons/E2/churn--sentiment--analyze.md`](../../../neurons/E2/churn--sentiment--analyze.md). **Notă:** neuronul este documentat în **E2**; traseul rămâne sub familia churn în planificare (vezi manifest `*-family.md`). |
| Destinație (graf) | `campaign-cluster-launch` | Contract: [`../../../neurons/E5/campaign--cluster--launch.md`](../../../neurons/E5/campaign--cluster--launch.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Muchia **`dependency`** ordonează **churn-sentiment-analyze** față de **campaign-cluster-launch** în planificare. Nu se afirmă din export cum se propagă semnalul de sentiment către lansarea de cluster.

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
| **Runtime (ADR-0001)** | Sursă: vezi catalog `e2:ai:sentiment-analyze` în contract E2. Pentru destinație: gap posibil pentru `campaign:cluster:launch` — vezi contract E5. |
| **Semantic (ADR-0002)** | Capete în foldere **E2** vs **E5** — reconciliere prin graf, nu presupunere de co-locare worker. |
| **Planificare** | v2 §7 — `dependency`. |

## Limite și reconcilieri

- **Export-grounded:** fără inventarea unui payload între analiză sentiment și cluster launch.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-sentiment-analyze-campaign-cluster-launch\``.
