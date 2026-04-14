# Sinapsă `referral-consent-request-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-consent-request-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-consent-request/referral-consent-request-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-consent-request` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `referral-consent-request` | Traseu în graf; contract neuron: [`../../../neurons/E5/referral--consent--request.md`](../../../neurons/E5/referral--consent--request.md). **Triplă autoritate:** v2 **`referral:consent:request`**; **runtime (ADR-0001):** `E5_REFERRAL_CONSENT_REQUEST` — vezi neuron; **semantic (ADR-0002):** **`e5:referral:consent-request`** — vezi neuron. |
| Destinație (graf) | `e5-referral` | Agregat **familie referral** în planificare. ADR: [`../../../../adr/families/e5/referral.md`](../../../../adr/families/e5/referral.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **referral-consent-request** sub agregatul **`e5-referral`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie.

## Sinapse dependență în același traseu

[`referral-consent-request-content-drip-schedule.md`](referral-consent-request-content-drip-schedule.md), [`referral-consent-request-content-drip-send.md`](referral-consent-request-content-drip-send.md), [`referral-consent-request-content-personalize-ai.md`](referral-consent-request-content-personalize-ai.md), [`referral-consent-request-content-seasonal-generate.md`](referral-consent-request-content-seasonal-generate.md), [`referral-consent-request-email-cold-add-to-campaign.md`](referral-consent-request-email-cold-add-to-campaign.md), [`referral-consent-request-wa-send-initial.md`](referral-consent-request-wa-send-initial.md), [`referral-consent-request-wa-send-reply.md`](referral-consent-request-wa-send-reply.md).

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

- **Planificare:** v2 §7 — `referral-consent-request` → `e5-referral`.
- **Runtime / semantic:** vezi [`../../../neurons/E5/referral--consent--request.md`](../../../neurons/E5/referral--consent--request.md) (inclusiv notă GDPR / nealiniere catalog vs comentarii handler).

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Detalii operaționale E26 — în contractul neuronului, nu deduse din muchia de agregare.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-consent-request-family\``.
