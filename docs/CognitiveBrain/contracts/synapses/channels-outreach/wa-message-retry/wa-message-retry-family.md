# Sinapsă `wa-message-retry-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-message-retry-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-message-retry/wa-message-retry-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-message-retry` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-message-retry` | Traseu în graf; **runtime:** **`wa:message:retry`** — [`../../../neurons/E2/wa--message--retry.md`](../../../neurons/E2/wa--message--retry.md); **Registry:** `WA_MESSAGE_RETRY`. Contractul neuron documentează **payloadeterogen** posibil pe aceeași coadă (orchestrator vs enqueue din livrare). |
| Destinație (graf) | `e2-whatsapp` | Agregat de planificare **whatsapp** (E2); fără neuron unic pentru eticheta de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** ancorează traseul `wa-message-retry` în **`e2-whatsapp`**. Descrierea v2: **„specializează familia”**. Exportul nu fixează payload sau handler pentru această muchie de familie.

## Sinapse dependență în același traseu

[`wa-message-retry-email-cold-add-to-campaign.md`](wa-message-retry-email-cold-add-to-campaign.md), [`wa-message-retry-email-cold-analytics-fetch.md`](wa-message-retry-email-cold-analytics-fetch.md), [`wa-message-retry-email-cold-campaign-create.md`](wa-message-retry-email-cold-campaign-create.md), [`wa-message-retry-email-cold-campaign-pause.md`](wa-message-retry-email-cold-campaign-pause.md), [`wa-message-retry-email-cold-lead-status.md`](wa-message-retry-email-cold-lead-status.md), [`wa-message-retry-q-email-cold.md`](wa-message-retry-q-email-cold.md), [`wa-message-retry-q-email-warm.md`](wa-message-retry-q-email-warm.md) — muchii **dependency** (v2 §7).

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

- **Runtime (ADR-0001):** **`wa:message:retry`** — registry.
- **Semantic (ADR-0002):** `e2:wa:message-retry`; **`e2-whatsapp`** = agregat plan.
- **Planificare:** muchie de familie.

## Limite și reconcilieri

- Risc operațional (scheme job diferite pe aceeași coadă) — vezi contract neuron; **nu** este codificat în exportul muchiei `*-family`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-message-retry-family\``.
