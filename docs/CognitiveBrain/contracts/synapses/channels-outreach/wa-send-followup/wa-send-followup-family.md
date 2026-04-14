# Sinapsă `wa-send-followup-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-followup-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-followup/wa-send-followup-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-followup` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-send-followup` | Nod graf v2 **`wa:send:followup`** — [`../../../neurons/E2/wa--send--followup.md`](../../../neurons/E2/wa--send--followup.md). **Nu** există coadă BullMQ literală `wa:send:followup` în `queue-registry.ts`; **runtime:** cozi **`q:wa:phone-NN:followup`** (factory `getWaPhoneFollowupQueueName`) — reconciliere obligatorie în contractul neuron. |
| Destinație (graf) | `e2-whatsapp` | Agregat de planificare **whatsapp** (E2). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** ancorează traseul `wa-send-followup` în **`e2-whatsapp`**. Descrierea v2: **„specializează familia”**. Exportul nu fixează payload sau handler pentru această muchie de familie.

## Sinapse dependență în același traseu

[`wa-send-followup-email-cold-add-to-campaign.md`](wa-send-followup-email-cold-add-to-campaign.md), [`wa-send-followup-email-cold-analytics-fetch.md`](wa-send-followup-email-cold-analytics-fetch.md), [`wa-send-followup-email-cold-campaign-create.md`](wa-send-followup-email-cold-campaign-create.md), [`wa-send-followup-email-cold-campaign-pause.md`](wa-send-followup-email-cold-campaign-pause.md), [`wa-send-followup-email-cold-lead-status.md`](wa-send-followup-email-cold-lead-status.md), [`wa-send-followup-q-email-cold.md`](wa-send-followup-q-email-cold.md), [`wa-send-followup-q-email-warm.md`](wa-send-followup-q-email-warm.md) — muchii **dependency** (v2 §7).

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

- **Runtime (ADR-0001):** execuție pe pattern **`q:wa:phone-*:followup`** — vezi registry helpers / `buildWaPhoneQueues`.
- **Semantic (ADR-0002):** pattern catalog follow-up — vezi `cognitive-node-catalog.ts` în contractul neuron.
- **Planificare:** etichetă unică graf `wa-send-followup` vs **fan-out** runtime pe cozi per-telefon.

## Limite și reconcilieri

- Cititorii trebuie să separe **nodul abstract** din plan de **implementarea multi-coadă**; detalii în `wa--send--followup.md`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-followup-family\``.
