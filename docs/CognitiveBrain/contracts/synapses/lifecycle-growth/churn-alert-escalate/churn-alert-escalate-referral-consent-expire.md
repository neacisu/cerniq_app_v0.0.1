# Sinapsă `churn-alert-escalate-referral-consent-expire`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-alert-escalate-referral-consent-expire` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-alert-escalate/churn-alert-escalate-referral-consent-expire.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-alert-escalate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-alert-escalate` | Contract: [`../../../neurons/E5/churn--alert--escalate.md`](../../../neurons/E5/churn--alert--escalate.md). |
| Destinație (graf) | `referral-consent-expire` | Contract: [`../../../neurons/E5/referral--consent--expire.md`](../../../neurons/E5/referral--consent--expire.md). ADR referral: [`../../../adr/families/e5/referral.md`](../../../adr/families/e5/referral.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Dependența leagă în **graf** traseul escalării churn de traseul **referral-consent-expire** (expirare / consolidare consent în modelul v2). Interpretare conservatoare: planificarea prevede ambele tipuri de traseu într-o ordine topologică; **fără** schemă de mesaj din export.

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
| **Runtime (ADR-0001)** | Pentru țintă: posibil gap în registry — vezi audit neuron. |
| **Semantic (ADR-0002)** | Familii `churn` vs `referral` în v2; ambele în zona E5 în contracte. |
| **Planificare** | v2 §7 — capete și `dependency`. |

## Limite și reconcilieri

- Detaliile GDPR / retention pentru consent expire **nu** provin din câmpurile sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-alert-escalate-referral-consent-expire\``.
