# Sinapsă `template-spintax-process-wa-chat-history-fetch`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `template-spintax-process-wa-chat-history-fetch` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/template-spintax-process/template-spintax-process-wa-chat-history-fetch.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `template-spintax-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `template-spintax-process` | **Contract:** [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime (ADR-0001):** `template:spintax:process`. |
| Destinație (graf) | `wa-chat-history-fetch` | **Contract:** [`../../../neurons/E2/wa--chat--history--fetch.md`](../../../neurons/E2/wa--chat--history--fetch.md). **Runtime (ADR-0001):** `wa:chat:history:fetch` (`QUEUES.WA_CHAT_HISTORY_FETCH`) — **atenție:** contractul neuron documentează decalaj față de numele antetului (procesator partajat cu alt flux); vezi fișier neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Spintax** depinde în planificare de **nodul `wa-chat-history-fetch`** din graful WhatsApp. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie cum istoricul conversației alimentează variabilele spintax.

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

- **Runtime (ADR-0001):** vezi registry + contract neuron pentru comportament efectiv.
- **Semantic (ADR-0002):** vezi catalog — contract neuron.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Nu presupune că antetul „history fetch” implică apel API de istoric — vezi audit din [`../../../neurons/E2/wa--chat--history--fetch.md`](../../../neurons/E2/wa--chat--history--fetch.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`template-spintax-process-wa-chat-history-fetch\``.
