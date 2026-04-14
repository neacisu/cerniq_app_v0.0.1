# Sinapsă `referral-consent-request-wa-send-reply`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-consent-request-wa-send-reply` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-consent-request/referral-consent-request-wa-send-reply.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-consent-request` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `referral-consent-request` | **Contract:** [`../../../neurons/E5/referral--consent--request.md`](../../../neurons/E5/referral--consent--request.md). |
| Destinație (graf) | `wa-send-reply` | **Contract:** [`../../../neurons/E5/wa--send--reply.md`](../../../neurons/E5/wa--send--reply.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **referral-consent-request** are dependență sintactică față de **wa-send-reply**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau ordinea operațională între job-uri.

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

- **Planificare:** v2 §7 — `referral-consent-request` → `wa-send-reply`.
- **Runtime / semantic:** mapare **E5**; alternativă E2: [`../../../neurons/E2/wa--send--reply.md`](../../../neurons/E2/wa--send--reply.md).

## Limite și reconcilieri

- Răspuns vs inițiere — vezi neuronul destinație pentru contractul cozii.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-consent-request-wa-send-reply\``.
