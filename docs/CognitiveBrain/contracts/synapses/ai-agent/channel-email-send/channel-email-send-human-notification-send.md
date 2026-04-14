# Sinapsă `channel-email-send-human-notification-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `channel-email-send-human-notification-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/channel-email-send/channel-email-send-human-notification-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `channel-email-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `channel-email-send` | **`channel:email:send`** — `QUEUES.E3_CHANNEL_EMAIL_SEND`. [`../../../neurons/E3/channel--email--send.md`](../../../neurons/E3/channel--email--send.md). |
| Destinație (graf) | `human-notification-send` | Nod planificat; contract [`../../../neurons/E3/human--notification--send.md`](../../../neurons/E3/human--notification--send.md) documentează **gap runtime** (coada `human:notification:send` negăsită în `queue-registry.ts` / fără `nodeKey` în catalog la audit). **Necesită reconciliere graf ↔ registry** înainte de a afirma execuție. |

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

- **Runtime:** sursă ancorată în registry; **țintă:** fără `QUEUES.*` dovedit pentru `human:notification:send` — vezi contractul neuron țintă.
- **Semantic:** sursă: catalog + contract channel email; țintă: **nu** inventați `nodeKey` unde contractul marchează absență.
- **Planificare:** muchie **`dependency`**: în topologia exportată, `channel-email-send` precede `human-notification-send`; v2 nu precizează mecanismul HITL dincolo de descrierea canonică de pipeline.

## Limite și reconcilieri

- Slug **`channel-email-send`** ↔ **`channel:email:send`**. Pentru **`human-notification-send`** / `human:notification:send`: gap explicit față de implementarea documentată în contractul neuron; fără presupuneri despre payload (absent din export).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`channel-email-send-human-notification-send\``.
