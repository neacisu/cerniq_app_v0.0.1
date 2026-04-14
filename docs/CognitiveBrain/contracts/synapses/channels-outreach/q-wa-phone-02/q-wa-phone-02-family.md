# Sinapsă `q-wa-phone-02-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-phone-02-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-phone-02/q-wa-phone-02-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-phone-02` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `q-wa-phone-02` | Nod în graf; contract: [`../../../neurons/E2/q--wa--phone_02.md`](../../../neurons/E2/q--wa--phone_02.md). **Runtime (ADR-0001):** coada efectivă pentru index **02** este `q:wa:phone-02` (conform `getWaPhoneQueueName`); v2 **Confirmed queue field** `q:wa:phone_02` folosește separator diferit față de Redis — vezi contract neuron. |
| Destinație (graf) | `e2-whatsapp` | Agregat **familie E2 WhatsApp** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e2/whatsapp.md`](../../../adr/families/e2/whatsapp.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **`q-wa-phone-02`** (WA linia 02 în model) sub agregatul **`e2-whatsapp`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`q-wa-phone-02-email-cold-add-to-campaign.md`](q-wa-phone-02-email-cold-add-to-campaign.md), [`q-wa-phone-02-email-cold-analytics-fetch.md`](q-wa-phone-02-email-cold-analytics-fetch.md), [`q-wa-phone-02-email-cold-campaign-create.md`](q-wa-phone-02-email-cold-campaign-create.md), [`q-wa-phone-02-email-cold-campaign-pause.md`](q-wa-phone-02-email-cold-campaign-pause.md), [`q-wa-phone-02-email-cold-lead-status.md`](q-wa-phone-02-email-cold-lead-status.md), [`q-wa-phone-02-q-email-cold.md`](q-wa-phone-02-q-email-cold.md), [`q-wa-phone-02-q-email-warm.md`](q-wa-phone-02-q-email-warm.md).

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

- **Runtime (ADR-0001):** `q:wa:phone-02` în registry vs `q:wa:phone_02` în antet v2 — reconciliere în contract neuron.
- **Semantic (ADR-0002):** instanță în familia `whatsapp`, etapă E2.
- **Planificare:** v2 §7 — `q-wa-phone-02` → `e2-whatsapp`.

## Limite și reconcilieri

- Traseul **`q-wa-phone-02`** este **instanță numerotată**; contracte paralele există pentru alte indexuri în subdirectoare separate.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-phone-02-family\``.
