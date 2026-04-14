# Sinapsă `wa-chat-history-fetch-email-cold-add-to-campaign`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-chat-history-fetch-email-cold-add-to-campaign` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-chat-history-fetch/wa-chat-history-fetch-email-cold-add-to-campaign.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-chat-history-fetch` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-chat-history-fetch` | **Runtime:** **`wa:chat:history:fetch`** — [`../../../neurons/E2/wa--chat--history--fetch.md`](../../../neurons/E2/wa--chat--history--fetch.md); **Registry:** `WA_CHAT_HISTORY_FETCH`. |
| Destinație | `email-cold-add-to-campaign` | Nod graf; **semantic v2** `email:cold:add-to-campaign` — [`../../../neurons/E2/email--cold--add-to-campaign.md`](../../../neurons/E2/email--cold--add-to-campaign.md). **Execuție operațională** pentru add lead / cold send: coada **`q:email:cold`**, **`EMAIL_COLD`** — reconciliere explicită în contractul neuron, nu în exportul muchiei. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

În graful de planificare, traseul **istoric/read-receipt WA** (`wa-chat-history-fetch`) este legat prin **dependency** de traseul **cold „add-to-campaign”**, plasând acțiunile email cold în DAG relativ la canalul WhatsApp. **Dovadă muchie:** v2 §7. **Nedovedit de export:** payload, retry, safety, telemetrie.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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

- **Runtime (ADR-0001):** capete traduse prin cozile din registry / contracte neuron de mai sus.
- **Semantic (ADR-0002):** `e2:wa:chat-history` → `e2:email:cold-send` (add/cold — vezi neuron).
- **Planificare:** noduri `wa-chat-history-fetch`, `email-cold-add-to-campaign`.

## Limite și reconcilieri

- Slug graf `email-cold-add-to-campaign` ≠ numele unic al cozii BullMQ pentru operația efectivă; prevală neuron + registry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-chat-history-fetch-email-cold-add-to-campaign\``.
