# Sinapsă `email-cold-add-to-campaign-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-add-to-campaign-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-add-to-campaign/email-cold-add-to-campaign-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-add-to-campaign` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-cold-add-to-campaign` | Traseu în graf; [`../../../neurons/E2/email--cold--add-to-campaign.md`](../../../neurons/E2/email--cold--add-to-campaign.md). **Runtime (ADR-0001):** operațional `q:email:cold` (`QUEUES.EMAIL_COLD`); v2 folosește etichetă `email:cold:add-to-campaign` — reconciliere în contract neuron. **Semantic (ADR-0002):** `e2:email:cold-send`. |
| Destinație (graf) | `e2-email-cold` | Nod agregat **familie email-cold** E2 în planificare; nu este o singură coadă executabilă; vezi ADR / catalog familie `email-cold`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **adăugare lead cold în campanie** sub agregatul **`e2-email-cold`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; operațiile Instantly, gărzi ADR și logging sunt în contractul neuron și cod, nu în exportul muchiei.

## Sinapse dependență în același traseu

[`email-cold-add-to-campaign-alert-client-referral-reward.md`](email-cold-add-to-campaign-alert-client-referral-reward.md), [`email-cold-add-to-campaign-alert-client-welcome.md`](email-cold-add-to-campaign-alert-client-welcome.md), [`email-cold-add-to-campaign-alert-internal-campaign-launched.md`](email-cold-add-to-campaign-alert-internal-campaign-launched.md), [`email-cold-add-to-campaign-alert-internal-churn-daily.md`](email-cold-add-to-campaign-alert-internal-churn-daily.md), [`email-cold-add-to-campaign-alert-internal-competitor-price.md`](email-cold-add-to-campaign-alert-internal-competitor-price.md), [`email-cold-add-to-campaign-alert-internal-delivery-cluster.md`](email-cold-add-to-campaign-alert-internal-delivery-cluster.md), [`email-cold-add-to-campaign-alert-internal-nps-drop.md`](email-cold-add-to-campaign-alert-internal-nps-drop.md), [`email-cold-add-to-campaign-email-warm-document.md`](email-cold-add-to-campaign-email-warm-document.md), [`email-cold-add-to-campaign-email-warm-proforma.md`](email-cold-add-to-campaign-email-warm-proforma.md), [`email-cold-add-to-campaign-email-warm-send.md`](email-cold-add-to-campaign-email-warm-send.md), [`email-cold-add-to-campaign-trigger-subsidy-calendar.md`](email-cold-add-to-campaign-trigger-subsidy-calendar.md).

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

- **Runtime (ADR-0001):** `e2-email-cold` nu este cheie în `QUEUES`; traseul operațional trece prin `q:email:cold` — vezi contract neuron.
- **Semantic (ADR-0002):** familie `email-cold` în v2 neuron; catalog `e2:email:cold-send`.
- **Planificare:** v2 §7 — `email-cold-add-to-campaign` → `e2-email-cold`.

## Limite și reconcilieri

- Denumire graf vs registry — obligatoriu [`../../../neurons/E2/email--cold--add-to-campaign.md`](../../../neurons/E2/email--cold--add-to-campaign.md).
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-add-to-campaign-family\``.
