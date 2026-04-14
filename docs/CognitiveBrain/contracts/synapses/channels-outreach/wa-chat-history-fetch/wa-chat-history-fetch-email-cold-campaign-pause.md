# Sinapsă `wa-chat-history-fetch-email-cold-campaign-pause`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-chat-history-fetch-email-cold-campaign-pause` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-chat-history-fetch/wa-chat-history-fetch-email-cold-campaign-pause.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-chat-history-fetch` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-chat-history-fetch` | **Runtime:** **`wa:chat:history:fetch`** — [`../../../neurons/E2/wa--chat--history--fetch.md`](../../../neurons/E2/wa--chat--history--fetch.md); **Registry:** `WA_CHAT_HISTORY_FETCH`. |
| Destinație | `email-cold-campaign-pause` | **Runtime:** **`email:cold:campaign:pause`** — [`../../../neurons/E2/email--cold--campaign--pause.md`](../../../neurons/E2/email--cold--campaign--pause.md); **Registry:** `EMAIL_COLD_CAMPAIGN_PAUSE`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** WA chat history / read path ↔ **pauză campanie cold** în graf. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie.

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

- **Runtime (ADR-0001):** `WA_CHAT_HISTORY_FETCH` → `EMAIL_COLD_CAMPAIGN_PAUSE`.
- **Semantic (ADR-0002):** vezi `NEURON_MATRIX.csv`.
- **Planificare:** export-grounded.

## Limite și reconcilieri

- Comportament pauză Instantly — contract neuron `email:cold:campaign:pause`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-chat-history-fetch-email-cold-campaign-pause\``.
