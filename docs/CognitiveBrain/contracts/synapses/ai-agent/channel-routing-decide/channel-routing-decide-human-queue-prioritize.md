# Sinapsă `channel-routing-decide-human-queue-prioritize`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `channel-routing-decide-human-queue-prioritize` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/channel-routing-decide/channel-routing-decide-human-queue-prioritize.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `channel-routing-decide` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `channel-routing-decide` | **`channel:route:decide`** — `QUEUES.E3_CHANNEL_ROUTE_DECIDE` (v2: `channel:routing:decide`). [`../../../neurons/E3/channel--routing--decide.md`](../../../neurons/E3/channel--routing--decide.md). |
| Destinație (graf) | `human-queue-prioritize` | Contract [`../../../neurons/E3/human--queue--prioritize.md`](../../../neurons/E3/human--queue--prioritize.md): **gap runtime** pentru `human:queue:prioritize` în registry la audit. **Necesită reconciliere graf ↔ registry.** |

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

- **Runtime:** sursă: `QUEUES.E3_CHANNEL_ROUTE_DECIDE`; **Destinație:** fără coadă canonică dovedită sub `human:queue:prioritize`.
- **Semantic:** sursă: catalog `e3:channel:route-decide`; destinație: absență documentată în catalog pentru coada nominală.
- **Planificare:** muchie **`dependency`** în topologia exportată; v2 nu detaliează prioritizarea HITL în registru.

## Limite și reconcilieri

- Slug sursă ↔ **`channel:route:decide`**. Pentru **`human-queue-prioritize`**: gap explicit; nu echivalați automat cu `human:escalate` / alte cozi fără dovadă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`channel-routing-decide-human-queue-prioritize\``.
