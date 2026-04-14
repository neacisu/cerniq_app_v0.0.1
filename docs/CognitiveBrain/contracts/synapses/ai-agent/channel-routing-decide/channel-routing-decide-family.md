# Sinapsă `channel-routing-decide-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `channel-routing-decide-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/channel-routing-decide/channel-routing-decide-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `channel-routing-decide` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `channel-routing-decide` | Slug traseu în graf. **v2 / contract neuron:** câmp confirmat **`channel:routing:decide`**. **Execuție (ADR-0001):** **`channel:route:decide`** (`QUEUES.E3_CHANNEL_ROUTE_DECIDE`) — aceeași funcție de rutare canale, **denumire de coadă diferită** față de v2; vezi [`../../../neurons/E3/channel--routing--decide.md`](../../../neurons/E3/channel--routing--decide.md) și ADR familie `channels`. |
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

- **Runtime (ADR-0001):** execuție = **`channel:route:decide`** / `QUEUES.E3_CHANNEL_ROUTE_DECIDE`; nu folosiți **`channel:routing:decide`** ca nume de coadă în worker fără a verifica registry-ul.
- **Semantic (ADR-0002):** `e3:channel:route-decide` în catalog vs etichetă v2 `channel:routing:decide` — reconciliere în contractul neuron.
- **Planificare:** muchie **default** „specializează familia”; fără detalii suplimentare în v2 §7.

## Limite și reconcilieri

- Triplă denumire: slug graf **`channel-routing-decide`** ↔ v2 **`channel:routing:decide`** ↔ runtime **`channel:route:decide`**. Pentru **execuție** prevală `queue-registry.ts`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`channel-routing-decide-family\``.
