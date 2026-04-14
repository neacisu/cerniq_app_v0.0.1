# Sinapsă `q-wa-phone-email-cold-add-to-campaign`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-phone-email-cold-add-to-campaign` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-phone/q-wa-phone-email-cold-add-to-campaign.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-phone` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-wa-phone` | **Contract:** [`../../../neurons/E2/q--wa--phone_.md`](../../../neurons/E2/q--wa--phone_.md). **Runtime:** vezi contract — cozi efective `q:wa:phone-NN`, nu literal `q:wa:phone_`. |
| Destinație (graf) | `email-cold-add-to-campaign` | **Contract:** [`../../../neurons/E2/email--cold--add-to-campaign.md`](../../../neurons/E2/email--cold--add-to-campaign.md). **Runtime (ADR-0001):** operațional `q:email:cold` (`QUEUES.EMAIL_COLD`), nu literalul nodului graf — vezi contract neuron. **Semantic (ADR-0002):** `e2:email:cold-send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **operațional WhatsApp (etichetă generică în graf)** depinde în planificare de **adăugarea lead-urilor în campania cold email**, integrând outreach WA cu subgraful cold email. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie campanie, lead sau provider.

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

- **Runtime (ADR-0001):** reconciliere obligatorie graf `email-cold-add-to-campaign` vs `q:email:cold` — vezi contract țintă.
- **Semantic (ADR-0002):** legătură între familia WhatsApp (sursă planificată) și motorii cold email.
- **Planificare:** v2 §7 — `q-wa-phone` → `email-cold-add-to-campaign`.

## Limite și reconcilieri

- Sursa `q-wa-phone` este **abstractă** față de cozile numerotate reale — nu se presupune index de telefon din sinapsă.
- Fără dovezi din export despre momentul exact al enqueue-ului către `q:email:cold`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-phone-email-cold-add-to-campaign\``.
