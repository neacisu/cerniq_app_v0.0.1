# Sinapsă `referral-request-prepare-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-request-prepare-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-request-prepare/referral-request-prepare-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-request-prepare` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `referral-request-prepare` | Traseu în graf; contract neuron: [`../../../neurons/E5/referral--request--prepare.md`](../../../neurons/E5/referral--request--prepare.md). **Triplă autoritate:** v2 **`referral:request:prepare`**; **runtime (ADR-0001):** **fără** coadă dedicată cu acest nume — vezi neuron; **mapare operațională documentată:** **`referral:outreach:prospect`**, E28, `e5:referral:outreach-prospect`. |
| Destinație (graf) | `e5-referral` | Agregat **familie referral** în planificare. ADR: [`../../../../adr/families/e5/referral.md`](../../../../adr/families/e5/referral.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **referral-request-prepare** sub agregatul **`e5-referral`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie.

## Sinapse dependență în același traseu

[`referral-request-prepare-content-drip-schedule.md`](referral-request-prepare-content-drip-schedule.md), [`referral-request-prepare-content-drip-send.md`](referral-request-prepare-content-drip-send.md), [`referral-request-prepare-content-personalize-ai.md`](referral-request-prepare-content-personalize-ai.md), [`referral-request-prepare-content-seasonal-generate.md`](referral-request-prepare-content-seasonal-generate.md), [`referral-request-prepare-email-cold-add-to-campaign.md`](referral-request-prepare-email-cold-add-to-campaign.md), [`referral-request-prepare-wa-send-initial.md`](referral-request-prepare-wa-send-initial.md), [`referral-request-prepare-wa-send-reply.md`](referral-request-prepare-wa-send-reply.md).

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

- **Planificare:** v2 §7 — `referral-request-prepare` → `e5-referral`.
- **Runtime / semantic:** v2 separă „prepare” de „send”; cod combină în E28 — vezi neuron.

## Limite și reconcilieri

- Nodul graf **referral-request-prepare** **nu** trebuie confundat cu o coadă BullMQ distinctă cu același literal fără verificare în registry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-request-prepare-family\``.
