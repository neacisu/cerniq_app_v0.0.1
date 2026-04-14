# Sinapsă `referral-eligibility-check-wa-send-initial`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-eligibility-check-wa-send-initial` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-eligibility-check/referral-eligibility-check-wa-send-initial.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-eligibility-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `referral-eligibility-check` | **Contract:** [`../../../neurons/E5/referral--eligibility--check.md`](../../../neurons/E5/referral--eligibility--check.md). |
| Destinație (graf) | `wa-send-initial` | **Contract:** [`../../../neurons/E5/wa--send--initial.md`](../../../neurons/E5/wa--send--initial.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **referral-eligibility-check** are dependență sintactică față de **wa-send-initial**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau ordinea operațională între job-uri.

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

- **Planificare:** v2 §7 — `referral-eligibility-check` → `wa-send-initial`.
- **Runtime / semantic:** E5 vs E2 — vezi [`../../../neurons/E2/wa--send--initial.md`](../../../neurons/E2/wa--send--initial.md).

## Limite și reconcilieri

- **Sursă:** vezi gap în neuronul eligibility.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-eligibility-check-wa-send-initial\``.
