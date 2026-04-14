# Sinapsă `channel-whatsapp-send-human-notification-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `channel-whatsapp-send-human-notification-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/channel-whatsapp-send/channel-whatsapp-send-human-notification-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `channel-whatsapp-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `channel-whatsapp-send` | **`channel:whatsapp:send`** — `QUEUES.E3_CHANNEL_WHATSAPP_SEND`. [`../../../neurons/E3/channel--whatsapp--send.md`](../../../neurons/E3/channel--whatsapp--send.md). |
| Destinație (graf) | `human-notification-send` | Contract [`../../../neurons/E3/human--notification--send.md`](../../../neurons/E3/human--notification--send.md): **gap runtime** pentru `human:notification:send`. **Necesită reconciliere graf ↔ registry.** |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime:** sursă: registry + contract channel WhatsApp; **țintă:** fără `QUEUES.*` dovedit pentru `human:notification:send`.
- **Semantic:** sursă: `e3:channel:whatsapp-send`; țintă: absență catalog documentată în contractul neuron.
- **Planificare:** muchie **`dependency`**: `channel-whatsapp-send` precede `human-notification-send` în export.

## Limite și reconcilieri

- Slug sursă ↔ **`channel:whatsapp:send`**. Pentru **`human-notification-send`**: gap explicit; fără presupuneri despre payload (absent din export).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`channel-whatsapp-send-human-notification-send\``.
