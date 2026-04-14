# Sinapsă `q-wa-phone-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-phone-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-phone/q-wa-phone-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-phone` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `q-wa-phone` | Nod în graf; contract: [`../../../neurons/E2/q--wa--phone_.md`](../../../neurons/E2/q--wa--phone_.md). **Runtime (ADR-0001):** v2 **`q:wa:phone_`** (underscore) **nu** este nume de coadă în registry; execuția folosește pattern **`q:wa:phone-01` … `q:wa:phone-20`** — vezi `getWaPhoneQueueName` în `queue-registry.ts` și contractul neuron. |
| Destinație (graf) | `e2-whatsapp` | Agregat **familie E2 WhatsApp** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e2/whatsapp.md`](../../../adr/families/e2/whatsapp.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **`q-wa-phone`** (etichetă generică WA per linie în export) sub agregatul **`e2-whatsapp`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`q-wa-phone-email-cold-add-to-campaign.md`](q-wa-phone-email-cold-add-to-campaign.md), [`q-wa-phone-email-cold-analytics-fetch.md`](q-wa-phone-email-cold-analytics-fetch.md), [`q-wa-phone-email-cold-campaign-create.md`](q-wa-phone-email-cold-campaign-create.md), [`q-wa-phone-email-cold-campaign-pause.md`](q-wa-phone-email-cold-campaign-pause.md), [`q-wa-phone-email-cold-lead-status.md`](q-wa-phone-email-cold-lead-status.md), [`q-wa-phone-q-email-cold.md`](q-wa-phone-q-email-cold.md), [`q-wa-phone-q-email-warm.md`](q-wa-phone-q-email-warm.md).

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

- **Runtime (ADR-0001):** familia WA este reprezentată prin cozi numerotate, nu prin literalul `q:wa:phone_`.
- **Semantic (ADR-0002):** pattern catalog `q:wa:phone-{01..20}`; v2 neuron `q:wa:phone_` marcat ca ne-reconciliat complet cu registry în contract.
- **Planificare:** v2 §7 — `q-wa-phone` → `e2-whatsapp`.

## Limite și reconcilieri

- **`q-wa-phone` în graf** poate desemna șablonul familiei; **instanțele** per index apar în alte trasee (`q-wa-phone-01` etc.).
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-phone-family\``.
