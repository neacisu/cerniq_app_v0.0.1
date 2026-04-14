# Sinapsă `alert-client-referral-reward-compliance-data-anonymize`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-client-referral-reward-compliance-data-anonymize` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-client-referral-reward/alert-client-referral-reward-compliance-data-anonymize.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-client-referral-reward` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-client-referral-reward` | **Matrix:** `alert:client:referral-reward` — [`../../../neurons/E5/alert--client--referral-reward.md`](../../../neurons/E5/alert--client--referral-reward.md). **Gap** registry pentru coada granulară. |
| Destinație (graf) | `compliance-data-anonymize` | **Matrix:** `compliance:data:anonymize` (contract [`../../../neurons/E4/compliance--data--anonymize.md`](../../../neurons/E4/compliance--data--anonymize.md)). **Coadă executabilă în registry:** `audit:data:anonymize` (`E4_AUDIT_DATA_ANONYMIZE`, ex. `queue-registry.ts` L485) — **nealiniere** nume v2 `compliance:*` vs `audit:*` documentată în neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graf, alerta E5 pentru **recompensă referral** depinde canonic de **anonimizarea datelor** asociată familiei compliance (nod `compliance-data-anonymize`). v2: **„sinapsă canonică de pipeline”**. **Ținta** este executabilă la E4 sub coada `audit:data:anonymize`; muchia **nu** pretinde că sursa granulară E5 enfilează acel job.

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

- **Runtime (ADR-0001):** J47 + `audit:data:anonymize` verificabile; sursa alertă E5 — gap pentru literal graf.
- **Semantic (ADR-0002):** `e4:audit:data-anonymize` — vezi contractul mirror `audit--data--anonymize.md`.
- **Planificare:** muchie cross-etapă (E5 → nod catalog E4) conform exportului; nu o „coadă unică” end-to-end.

## Limite și reconcilieri

- Etapa sursă (E5) vs etapa destinație (E4) în Matrix; reconcilierea este semantică în graf, nu o garanție de ordonare runtime.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-client-referral-reward-compliance-data-anonymize\``.
