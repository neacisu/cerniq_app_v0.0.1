# Sinapsă `q-wa-phone-01-email-cold-analytics-fetch`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-phone-01-email-cold-analytics-fetch` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-phone-01/q-wa-phone-01-email-cold-analytics-fetch.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-phone-01` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-wa-phone-01` | **Contract:** [`../../../neurons/E2/q--wa--phone_01.md`](../../../neurons/E2/q--wa--phone_01.md). **Runtime:** `q:wa:phone-01`. |
| Destinație (graf) | `email-cold-analytics-fetch` | **Contract:** [`../../../neurons/E2/email--cold--analytics--fetch.md`](../../../neurons/E2/email--cold--analytics--fetch.md). **Semantic (ADR-0002):** `e2:email:cold-analytics`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **WA linia 01** depinde în planificare de **fetch analytics cold email**. v2: **„sinapsă canonică de pipeline”**; exportul nu specifică metrici sau API.

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

- **Runtime (ADR-0001):** vezi contract neuron țintă pentru coadă.
- **Semantic (ADR-0002):** legătură WA instanță 01 ↔ analitică email.
- **Planificare:** v2 §7 — `q-wa-phone-01` → `email-cold-analytics-fetch`.

## Limite și reconcilieri

- Fără inferențe despre trigger temporal sau corelație cauzală operațională — doar structura grafului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-phone-01-email-cold-analytics-fetch\``.
