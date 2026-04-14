# Sinapsă `churn-alert-escalate-referral-eligibility-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-alert-escalate-referral-eligibility-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-alert-escalate/churn-alert-escalate-referral-eligibility-check.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-alert-escalate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-alert-escalate` | Contract: [`../../../neurons/E5/churn--alert--escalate.md`](../../../neurons/E5/churn--alert--escalate.md). |
| Destinație (graf) | `referral-eligibility-check` | Contract: [`../../../neurons/E5/referral--eligibility--check.md`](../../../neurons/E5/referral--eligibility--check.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

În **graf**, verificarea eligibilității referral este plasată în dependență față de traseul escalării alertelor churn: planificarea include atât intervenția pe churn, cât și controlul eligibilității în lanțul referral. **Fără** detalii operaționale din export.

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
| **Runtime (ADR-0001)** | Registry vs etichete v2 — contracte neuron. |
| **Semantic (ADR-0002)** | Noduri E5 conform fișierelor neuron. |
| **Planificare** | v2 §7 — muchie canonică. |

## Limite și reconcilieri

- Nu se afirmă că escaladarea churn blochează sau deblochează eligibility fără dovadă din altă sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-alert-escalate-referral-eligibility-check\``.
