# Sinapsă `document-whatsapp-send-channel-routing-decide`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-whatsapp-send-channel-routing-decide` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-whatsapp-send/document-whatsapp-send-channel-routing-decide.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-whatsapp-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `document-whatsapp-send` | **Matrix:** `document:whatsapp:send` → [`../../../neurons/E3/document--whatsapp--send.md`](../../../neurons/E3/document--whatsapp--send.md). **Registry:** `document:whatsapp:send`. |
| Destinație (graf) | `channel-routing-decide` | **Matrix / v2:** `channel:routing:decide` → [`../../../neurons/E3/channel--routing--decide.md`](../../../neurons/E3/channel--routing--decide.md). **Runtime (ADR-0001):** **`channel:route:decide`** (`QUEUES.E3_CHANNEL_ROUTE_DECIDE`) — **denumire diferită** față de câmpul v2/Matrix; reconciliere obligatorie în contractul neuron, nu prin presupuneri. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** plasează decizia de rutare canale (`channel-routing-decide` în graf) în dependență canonică față de traseul `document-whatsapp-send`. v2 redă **„sinapsă canonică de pipeline”**; nu explică dacă documentul WhatsApp precede sau urmează decizia în runtime. În cod, J58 enfilează cozi de canal după reguli deterministe — vezi contractul destinatie (nod).

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

- **Runtime (ADR-0001):** destinatia executabila pe **`channel:route:decide`**, nu pe literalul `channel:routing:decide` din Matrix — vezi [`channel--routing--decide.md`](../../../neurons/E3/channel--routing--decide.md).
- **Semantic (ADR-0002):** `e3:channel:route-decide` în catalog vs eticheta graf `channel-routing-decide`.
- **Planificare:** dependență structurală în graf; ordinea temporală efectivă necesită audit de cod.

## Limite și reconcilieri

- **Triplă denumire:** graf slug / v2 queue / runtime queue — documentată în contractul neuron destinatie.
- Sursă stub I53 — vezi limite în [`document--whatsapp--send.md`](../../../neurons/E3/document--whatsapp--send.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-whatsapp-send-channel-routing-decide\``.
