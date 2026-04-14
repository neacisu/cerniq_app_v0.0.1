# Sinapsă `churn-alert-escalate-referral-consent-request`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-alert-escalate-referral-consent-request` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-alert-escalate/churn-alert-escalate-referral-consent-request.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-alert-escalate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-alert-escalate` | Contract: [`../../../neurons/E5/churn--alert--escalate.md`](../../../neurons/E5/churn--alert--escalate.md). |
| Destinație (graf) | `referral-consent-request` | Contract: [`../../../neurons/E5/referral--consent--request.md`](../../../neurons/E5/referral--consent--request.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Muchia **`dependency`** plasează traseul escalării churn în dependență de **referral-consent-request** în modelul exportat: solicitarea de consent referral coexiste topologic cu fluxul de alertă churn. Ordinea efectivă și datele **nu** sunt codificate în sinapsă.

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
| **Runtime (ADR-0001)** | Vezi contracte neuron pentru cozi concrete. |
| **Semantic (ADR-0002)** | E5 — ambele trasee în contracte sub `contracts/neurons/E5/`. |
| **Planificare** | v2 §7 — `dependency`. |

## Limite și reconcilieri

- **Export-grounded:** fără inventarea unui contract de mesaj între alertă churn și consent request.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-alert-escalate-referral-consent-request\``.
