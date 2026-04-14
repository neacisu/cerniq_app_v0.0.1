# Sinapsă `referral-response-process-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-response-process-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-response-process/referral-response-process-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-response-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `referral-response-process` | Traseu în graf; contract neuron: [`../../../neurons/E5/referral--response--process.md`](../../../neurons/E5/referral--response--process.md). **Triplă autoritate:** v2 **`referral:response:process`**; **runtime (ADR-0001):** **`referral:consent:confirm`** (E27), `nodeKey` **`e5:referral:consent-confirm`** — vezi neuron și registry; **nu** există coadă cu literalul graf `referral-response-process`. |
| Destinație (graf) | `e5-referral` | Agregat **familie referral** în planificare. ADR: [`../../../../adr/families/e5/referral.md`](../../../../adr/families/e5/referral.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **referral-response-process** sub agregatul **`e5-referral`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie.

## Sinapse dependență în același traseu

[`referral-response-process-content-drip-schedule.md`](referral-response-process-content-drip-schedule.md), [`referral-response-process-content-drip-send.md`](referral-response-process-content-drip-send.md), [`referral-response-process-content-personalize-ai.md`](referral-response-process-content-personalize-ai.md), [`referral-response-process-content-seasonal-generate.md`](referral-response-process-content-seasonal-generate.md), [`referral-response-process-email-cold-add-to-campaign.md`](referral-response-process-email-cold-add-to-campaign.md), [`referral-response-process-wa-send-initial.md`](referral-response-process-wa-send-initial.md), [`referral-response-process-wa-send-reply.md`](referral-response-process-wa-send-reply.md).

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

- **Planificare:** v2 §7 — `referral-response-process` → `e5-referral`.
- **Semantic / runtime:** procesare răspuns consimțământ (E27) — detalii în contractul neuronului; slug graf ≠ nume coadă.

## Limite și reconcilieri

- **Graf vs registry:** nodul `referral-response-process` este abstractizare planificare; execuția documentată este **`referral:consent:confirm`**, nu un job cu același slug ca în export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-response-process-family\``.
