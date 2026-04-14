# Sinapsă `channel-routing-decide-human-notification-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `channel-routing-decide-human-notification-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/channel-routing-decide/channel-routing-decide-human-notification-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `channel-routing-decide` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `channel-routing-decide` | **`channel:route:decide`** — `QUEUES.E3_CHANNEL_ROUTE_DECIDE` (v2: `channel:routing:decide`). [`../../../neurons/E3/channel--routing--decide.md`](../../../neurons/E3/channel--routing--decide.md). |
| Destinație (graf) | `human-notification-send` | Contract [`../../../neurons/E3/human--notification--send.md`](../../../neurons/E3/human--notification--send.md): **gap runtime** pentru `human:notification:send` în registry/catalog la audit. **Necesită reconciliere graf ↔ registry.** |

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

- **Runtime:** sursă ancorată în `QUEUES.E3_CHANNEL_ROUTE_DECIDE`; **țintă:** fără `QUEUES.*` dovedit pentru `human:notification:send`.
- **Semantic:** sursă: `e3:channel:route-decide`; țintă: fără `nodeKey` demonstrat în catalog pentru coada nominală (contract neuron).
- **Planificare:** muchie **`dependency`**: `channel-routing-decide` precede `human-notification-send` în export; fără semantica operațională suplimentară în v2.

## Limite și reconcilieri

- Slug **`channel-routing-decide`** ↔ execuție **`channel:route:decide`**. Pentru **`human-notification-send`**: gap explicit; fără presupuneri despre payload.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`channel-routing-decide-human-notification-send\``.
