# Sinapsă `referral-eligibility-check-email-cold-add-to-campaign`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-eligibility-check-email-cold-add-to-campaign` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-eligibility-check/referral-eligibility-check-email-cold-add-to-campaign.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-eligibility-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `referral-eligibility-check` | **Contract:** [`../../../neurons/E5/referral--eligibility--check.md`](../../../neurons/E5/referral--eligibility--check.md). |
| Destinație (graf) | `email-cold-add-to-campaign` | **Contract:** [`../../../neurons/E5/email--cold--add-to-campaign.md`](../../../neurons/E5/email--cold--add-to-campaign.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **referral-eligibility-check** are dependență sintactică față de **email-cold-add-to-campaign**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau ordinea operațională între job-uri.

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

- **Planificare:** v2 §7 — `referral-eligibility-check` → `email-cold-add-to-campaign`.
- **Runtime / semantic:** ținta — E5; alternativă E2: [`../../../neurons/E2/email--cold--add-to-campaign.md`](../../../neurons/E2/email--cold--add-to-campaign.md).

## Limite și reconcilieri

- **Sursă:** reconciliere eligibility ↔ registry — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-eligibility-check-email-cold-add-to-campaign\``.
