# Sinapsă `wa-send-initial-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-initial-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-initial/wa-send-initial-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-initial` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-send-initial` | Nod graf v2 **`wa:send:initial`** — [`../../../neurons/E2/wa--send--initial.md`](../../../neurons/E2/wa--send--initial.md). **Nu** există coadă literală `wa:send:initial` în `queue-registry.ts`; **runtime:** cozi **`q:wa:phone-01`** … **`q:wa:phone-20`** (`getWaPhoneQueueName`) — reconciliere obligatorie în contractul neuron. Există și instanță documentată **E5** pentru același antet — acest traseu sinaptic este sub `channels-outreach` (E2 conceptual). |
| Destinație (graf) | `e2-whatsapp` | Agregat de planificare **whatsapp** (E2). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** ancorează traseul `wa-send-initial` în **`e2-whatsapp`**. Descrierea v2: **„specializează familia”**. Exportul nu fixează payload sau handler pentru această muchie de familie.

## Sinapse dependență în același traseu

[`wa-send-initial-alert-client-referral-reward.md`](wa-send-initial-alert-client-referral-reward.md), [`wa-send-initial-alert-client-welcome.md`](wa-send-initial-alert-client-welcome.md), [`wa-send-initial-alert-internal-campaign-launched.md`](wa-send-initial-alert-internal-campaign-launched.md), [`wa-send-initial-alert-internal-churn-daily.md`](wa-send-initial-alert-internal-churn-daily.md), [`wa-send-initial-alert-internal-competitor-price.md`](wa-send-initial-alert-internal-competitor-price.md), [`wa-send-initial-alert-internal-delivery-cluster.md`](wa-send-initial-alert-internal-delivery-cluster.md), [`wa-send-initial-alert-internal-nps-drop.md`](wa-send-initial-alert-internal-nps-drop.md), [`wa-send-initial-email-cold-add-to-campaign.md`](wa-send-initial-email-cold-add-to-campaign.md), [`wa-send-initial-email-cold-analytics-fetch.md`](wa-send-initial-email-cold-analytics-fetch.md), [`wa-send-initial-email-cold-campaign-create.md`](wa-send-initial-email-cold-campaign-create.md), [`wa-send-initial-email-cold-campaign-pause.md`](wa-send-initial-email-cold-campaign-pause.md), [`wa-send-initial-email-cold-lead-status.md`](wa-send-initial-email-cold-lead-status.md), [`wa-send-initial-q-email-cold.md`](wa-send-initial-q-email-cold.md), [`wa-send-initial-q-email-warm.md`](wa-send-initial-q-email-warm.md), [`wa-send-initial-trigger-subsidy-calendar.md`](wa-send-initial-trigger-subsidy-calendar.md) — muchii **dependency** (v2 §7).

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

- **Runtime (ADR-0001):** fan-out **`q:wa:phone-NN`** — vezi `queue-registry.ts` / `getWaPhoneQueueName`.
- **Semantic (ADR-0002):** pattern catalog `q:wa:phone-{01..20}` — vezi neuron E2.
- **Planificare:** un nod `wa-send-initial` în graf vs **20** cozi potențiale în execuție.

## Limite și reconcilieri

- Duplicat / instanță E5 pentru `wa:send:initial` — menționat în `wa--send--initial.md`; acest contract sinaptic nu o fuzionează cu E5.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-initial-family\``.
