# Sinapsă `wa-send-reply-alert-internal-churn-daily`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-reply-alert-internal-churn-daily` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-reply/wa-send-reply-alert-internal-churn-daily.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-reply` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `wa-send-reply` | **Contract:** [`../../../neurons/E2/wa--send--reply.md`](../../../neurons/E2/wa--send--reply.md). |
| Destinație (graf) | `alert-internal-churn-daily` | **Contract:** [`../../../neurons/E5/alert--internal--churn-daily.md`](../../../neurons/E5/alert--internal--churn-daily.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **reply WA** și **alertă internă churn zilnic** în modelul de graf.

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

- **Runtime / Semantic:** contracte neuron + ADR-0001/0002.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- Alertă „daily” poate avea producători multipli; muchia declară doar legătura structurală din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-reply-alert-internal-churn-daily\``.
