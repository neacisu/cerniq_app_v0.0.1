# Sinapsă `channel-whatsapp-send-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `channel-whatsapp-send-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/channel-whatsapp-send/channel-whatsapp-send-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `channel-whatsapp-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `channel-whatsapp-send` | Slug traseu în graf. **Execuție (ADR-0001):** **`channel:whatsapp:send`** (`QUEUES.E3_CHANNEL_WHATSAPP_SEND`). Flux real include delegare către **`document:whatsapp:send`** pentru trimitere efectivă — vezi [`../../../neurons/E3/channel--whatsapp--send.md`](../../../neurons/E3/channel--whatsapp--send.md). |
| Destinație (graf) | `e3-channels` | Agregat de planificare pentru familia **channels** (E3); nu este o singură coadă BullMQ. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** **`channel:whatsapp:send`** înregistrată în registry; lanțul către `document:whatsapp:send` este documentat în contractul neuron, nu inventat aici.
- **Semantic (ADR-0002):** `e3:channel:whatsapp-send` — catalog + contract.
- **Planificare:** muchie **default** „specializează familia”; fără detalii suplimentare în v2 §7.

## Limite și reconcilieri

- Slug **`channel-whatsapp-send`** ↔ coadă **`channel:whatsapp:send`**. Muchia de familie din graf **nu** înlocuiește lectura contractului neuron pentru delegarea la document WhatsApp.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`channel-whatsapp-send-family\``.
