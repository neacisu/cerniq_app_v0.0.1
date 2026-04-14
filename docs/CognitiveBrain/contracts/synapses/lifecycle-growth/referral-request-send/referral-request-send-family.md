# Sinapsă `referral-request-send-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-request-send-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-request-send/referral-request-send-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-request-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `referral-request-send` | Traseu în graf; contract neuron: [`../../../neurons/E5/referral--request--send.md`](../../../neurons/E5/referral--request--send.md). **Triplă autoritate:** v2 **`referral:request:send`**; **runtime (ADR-0001):** **fără** coadă separată cu acest nume — vezi neuron; **execuție documentată:** **`referral:outreach:prospect`**, E28, `e5:referral:outreach-prospect` (același traseu ca prepare). |
| Destinație (graf) | `e5-referral` | Agregat **familie referral** în planificare. ADR: [`../../../../adr/families/e5/referral.md`](../../../../adr/families/e5/referral.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **referral-request-send** sub agregatul **`e5-referral`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie.

## Sinapse dependență în același traseu

[`referral-request-send-content-drip-schedule.md`](referral-request-send-content-drip-schedule.md), [`referral-request-send-content-drip-send.md`](referral-request-send-content-drip-send.md), [`referral-request-send-content-personalize-ai.md`](referral-request-send-content-personalize-ai.md), [`referral-request-send-content-seasonal-generate.md`](referral-request-send-content-seasonal-generate.md), [`referral-request-send-email-cold-add-to-campaign.md`](referral-request-send-email-cold-add-to-campaign.md), [`referral-request-send-wa-send-initial.md`](referral-request-send-wa-send-initial.md), [`referral-request-send-wa-send-reply.md`](referral-request-send-wa-send-reply.md).

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

- **Planificare:** v2 §7 — `referral-request-send` → `e5-referral`.
- **Runtime / semantic:** „send” nu este job distinct de „prepare” în cod — vezi neuron și E28.

## Limite și reconcilieri

- Două noduri graf (**prepare** / **send**) pot mapa pe **aceeași** coadă runtime — documentat în neuroni, nu presupus din muchiile de export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-request-send-family\``.
