# Sinapsă `wa-chat-history-fetch-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-chat-history-fetch-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-chat-history-fetch/wa-chat-history-fetch-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-chat-history-fetch` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-chat-history-fetch` | Traseu în graf; **runtime:** coadă **`wa:chat:history:fetch`** — [`../../../neurons/E2/wa--chat--history--fetch.md`](../../../neurons/E2/wa--chat--history--fetch.md); **Registry:** `WA_CHAT_HISTORY_FETCH` (`workers/shared/src/queue-registry.ts`). **Notă:** contractul neuron documentează divergență posibilă între numele cozii și handlerul efectiv (read receipt / engagement). |
| Destinație (graf) | `e2-whatsapp` | Agregat de planificare pentru familia **whatsapp** (E2), nu o singură coadă BullMQ; fără fișier neuron unic pentru această etichetă de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** ancorează traseul `wa-chat-history-fetch` în nucleul **`e2-whatsapp`**. Descrierea v2: **„specializează familia”**. Exportul nu fixează payload sau handler pentru această muchie de familie.

## Sinapse dependență în același traseu

[`wa-chat-history-fetch-email-cold-add-to-campaign.md`](wa-chat-history-fetch-email-cold-add-to-campaign.md), [`wa-chat-history-fetch-email-cold-analytics-fetch.md`](wa-chat-history-fetch-email-cold-analytics-fetch.md), [`wa-chat-history-fetch-email-cold-campaign-create.md`](wa-chat-history-fetch-email-cold-campaign-create.md), [`wa-chat-history-fetch-email-cold-campaign-pause.md`](wa-chat-history-fetch-email-cold-campaign-pause.md), [`wa-chat-history-fetch-email-cold-lead-status.md`](wa-chat-history-fetch-email-cold-lead-status.md), [`wa-chat-history-fetch-q-email-cold.md`](wa-chat-history-fetch-q-email-cold.md), [`wa-chat-history-fetch-q-email-warm.md`](wa-chat-history-fetch-q-email-warm.md) — muchii **dependency** (v2 §7).

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

- **Runtime (ADR-0001):** execuție pe **`wa:chat:history:fetch`** — vezi registry.
- **Semantic (ADR-0002):** `e2:wa:chat-history` (`NEURON_MATRIX.csv` / catalog); **`e2-whatsapp`** = agregat plan.
- **Planificare:** muchie de familie; nu enumeră toate cozile per-telefon sau email din swimlane.

## Limite și reconcilieri

- Interpretarea capătului sursă în execuție depinde de contractul neuron (handler real vs etichetă „history fetch”).
- Nu inventa payload / retry / safety / telemetrie dincolo de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-chat-history-fetch-family\``.
