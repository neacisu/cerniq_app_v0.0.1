# Sinapsă `wa-media-send-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-media-send-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-media-send/wa-media-send-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-media-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-media-send` | Traseu în graf; **runtime:** **`wa:media:send`** — [`../../../neurons/E2/wa--media--send.md`](../../../neurons/E2/wa--media--send.md); **Registry:** `WA_MEDIA_SEND` (`workers/shared/src/queue-registry.ts`). |
| Destinație (graf) | `e2-whatsapp` | Agregat de planificare pentru familia **whatsapp** (E2); fără fișier neuron unic pentru eticheta de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** ancorează traseul `wa-media-send` în **`e2-whatsapp`**. Descrierea v2: **„specializează familia”**. Exportul nu fixează payload sau handler pentru această muchie de familie.

## Sinapse dependență în același traseu

[`wa-media-send-email-cold-add-to-campaign.md`](wa-media-send-email-cold-add-to-campaign.md), [`wa-media-send-email-cold-analytics-fetch.md`](wa-media-send-email-cold-analytics-fetch.md), [`wa-media-send-email-cold-campaign-create.md`](wa-media-send-email-cold-campaign-create.md), [`wa-media-send-email-cold-campaign-pause.md`](wa-media-send-email-cold-campaign-pause.md), [`wa-media-send-email-cold-lead-status.md`](wa-media-send-email-cold-lead-status.md), [`wa-media-send-q-email-cold.md`](wa-media-send-q-email-cold.md), [`wa-media-send-q-email-warm.md`](wa-media-send-q-email-warm.md) — muchii **dependency** (v2 §7).

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

- **Runtime (ADR-0001):** **`wa:media:send`** — registry.
- **Semantic (ADR-0002):** `e2:wa:media-send`; **`e2-whatsapp`** = agregat plan.
- **Planificare:** muchie de familie.

## Limite și reconcilieri

- Payload-ul mesajului/media în execuție — contract neuron / worker, nu exportul muchiei `*-family`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-media-send-family\``.
