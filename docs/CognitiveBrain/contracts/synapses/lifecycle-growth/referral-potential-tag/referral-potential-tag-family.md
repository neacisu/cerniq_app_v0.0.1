# Sinapsă `referral-potential-tag-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-potential-tag-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-potential-tag/referral-potential-tag-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-potential-tag` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `referral-potential-tag` | Traseu în graf; contract neuron: [`../../../neurons/E5/referral--potential--tag.md`](../../../neurons/E5/referral--potential--tag.md). **Triplă autoritate:** v2 **`referral:potential:tag`**; **runtime (ADR-0001):** **nu** există coadă cu acest nume în registry — vezi neuron; **mapare parțială documentată:** **`referral:detect`** (E25) — **nu** echivalență 1:1 cu eticheta graf. |
| Destinație (graf) | `e5-referral` | Agregat **familie referral** în planificare. ADR: [`../../../../adr/families/e5/referral.md`](../../../../adr/families/e5/referral.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **referral-potential-tag** sub agregatul **`e5-referral`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie.

## Sinapse dependență în același traseu

[`referral-potential-tag-content-drip-schedule.md`](referral-potential-tag-content-drip-schedule.md), [`referral-potential-tag-content-drip-send.md`](referral-potential-tag-content-drip-send.md), [`referral-potential-tag-content-personalize-ai.md`](referral-potential-tag-content-personalize-ai.md), [`referral-potential-tag-content-seasonal-generate.md`](referral-potential-tag-content-seasonal-generate.md), [`referral-potential-tag-email-cold-add-to-campaign.md`](referral-potential-tag-email-cold-add-to-campaign.md), [`referral-potential-tag-wa-send-initial.md`](referral-potential-tag-wa-send-initial.md), [`referral-potential-tag-wa-send-reply.md`](referral-potential-tag-wa-send-reply.md).

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

- **Planificare:** v2 §7 — `referral-potential-tag` → `e5-referral`.
- **Runtime / semantic:** vezi [`../../../neurons/E5/referral--potential--tag.md`](../../../neurons/E5/referral--potential--tag.md) pentru `referral:detect` și lanț E26.

## Limite și reconcilieri

- **„Tag” în graf** ≠ job izolat cu același nume în registry; reconcilierea este în neuron, nu presupusă aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-potential-tag-family\``.
