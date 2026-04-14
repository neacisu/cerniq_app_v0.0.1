# Sinapsă `q-wa-reply-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-reply-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-reply/q-wa-reply-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-reply` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `q-wa-reply` | Traseu în graf; [`../../../neurons/E2/q--wa--reply.md`](../../../neurons/E2/q--wa--reply.md). **Runtime (ADR-0001):** `q:wa:reply` (`LEGACY_WA_REPLY_QUEUE` / alias depreciat — vezi comentarii în `queue-registry.ts`). **Semantic (ADR-0002):** `e2:wa:reply` — **atenție:** contractul neuron documentează **divergență** între semantica „reply” din catalog și handler-ul real (status delivery, nu outbound reply). |
| Destinație (graf) | `e2-whatsapp` | Nod agregat **familie WhatsApp** E2; nu este o singură coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **`q-wa-reply`** sub agregatul **`e2-whatsapp`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; sensul operațional al cozii este în contractul neuron + cod, nu în exportul muchiei.

## Sinapse dependență în același traseu

[`q-wa-reply-email-cold-add-to-campaign.md`](q-wa-reply-email-cold-add-to-campaign.md), [`q-wa-reply-email-cold-analytics-fetch.md`](q-wa-reply-email-cold-analytics-fetch.md), [`q-wa-reply-email-cold-campaign-create.md`](q-wa-reply-email-cold-campaign-create.md), [`q-wa-reply-email-cold-campaign-pause.md`](q-wa-reply-email-cold-campaign-pause.md), [`q-wa-reply-email-cold-lead-status.md`](q-wa-reply-email-cold-lead-status.md), [`q-wa-reply-q-email-cold.md`](q-wa-reply-q-email-cold.md), [`q-wa-reply-q-email-warm.md`](q-wa-reply-q-email-warm.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** coadă legacy documentată; job-uri noi pot fi redirecționate spre `wa:delivery:status` — vezi registry.
- **Semantic (ADR-0002):** `e2:wa:reply` — cu reconciliere operațională obligatorie.
- **Planificare:** v2 §7 — `q-wa-reply` → `e2-whatsapp`.

## Limite și reconcilieri

- **Trimitere răspuns AI outbound** în cod folosește **`q:wa:phone-NN:followup`**, nu `q:wa:reply` — vezi [`../../../neurons/E2/q--wa--reply.md`](../../../neurons/E2/q--wa--reply.md). Sinapsa rămâne **export-grounded** pe nodurile din graf.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-reply-family\``.
