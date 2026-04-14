# Sinapsă `churn-sentiment-analyze-referral-consent-expire`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-sentiment-analyze-referral-consent-expire` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-sentiment-analyze/churn-sentiment-analyze-referral-consent-expire.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-sentiment-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-sentiment-analyze` | Contract: [`../../../neurons/E2/churn--sentiment--analyze.md`](../../../neurons/E2/churn--sentiment--analyze.md). |
| Destinație (graf) | `referral-consent-expire` | Contract: [`../../../neurons/E5/referral--consent--expire.md`](../../../neurons/E5/referral--consent--expire.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Dependența leagă analiza sentiment churn de **referral-consent-expire** în topologia exportată.

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
| **Runtime (ADR-0001)** | Vezi contracte E2 (sursă) și E5 (țintă). |
| **Semantic (ADR-0002)** | Etape diferite posibile între capete — normal pentru muchii cross-traseu din export. |
| **Planificare** | v2 §7. |

## Limite și reconcilieri

- **Export-grounded.**

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-sentiment-analyze-referral-consent-expire\``.
