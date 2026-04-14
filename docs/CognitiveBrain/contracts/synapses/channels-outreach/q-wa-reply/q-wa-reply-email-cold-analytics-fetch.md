# Sinapsă `q-wa-reply-email-cold-analytics-fetch`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-reply-email-cold-analytics-fetch` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-reply/q-wa-reply-email-cold-analytics-fetch.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-reply` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-wa-reply` | **Contract:** [`../../../neurons/E2/q--wa--reply.md`](../../../neurons/E2/q--wa--reply.md). **Runtime:** `q:wa:reply` — vezi contract neuron. |
| Destinație (graf) | `email-cold-analytics-fetch` | **Contract:** [`../../../neurons/E2/email--cold--analytics--fetch.md`](../../../neurons/E2/email--cold--analytics--fetch.md). **Runtime (ADR-0001):** `email:cold:analytics:fetch`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Traseul `q-wa-reply`** depinde în planificare de **analytics cold email**. v2: **„sinapsă canonică de pipeline”**; exportul nu leagă explicit livrarea/status WA de agregările din `email:cold:analytics:fetch`.

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

- **Runtime (ADR-0001):** vezi registry pentru ambele capete.
- **Semantic (ADR-0002):** vezi contracte.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Muchia este structurală; cauzalitatea operațională nu este în exportul v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-reply-email-cold-analytics-fetch\``.
