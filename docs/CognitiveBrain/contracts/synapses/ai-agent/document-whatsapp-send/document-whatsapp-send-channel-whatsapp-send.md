# Sinapsă `document-whatsapp-send-channel-whatsapp-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-whatsapp-send-channel-whatsapp-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-whatsapp-send/document-whatsapp-send-channel-whatsapp-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-whatsapp-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `document-whatsapp-send` | **Matrix:** `document:whatsapp:send` → [`../../../neurons/E3/document--whatsapp--send.md`](../../../neurons/E3/document--whatsapp--send.md). **Registry:** `document:whatsapp:send`. |
| Destinație (graf) | `channel-whatsapp-send` | **Matrix:** `channel:whatsapp:send` (E3, `channels`) → [`../../../neurons/E3/channel--whatsapp--send.md`](../../../neurons/E3/channel--whatsapp--send.md). **Registry:** `E3_CHANNEL_WHATSAPP_SEND` → `channel:whatsapp:send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** leagă traseul **`document-whatsapp-send`** de **`channel-whatsapp-send`** în planificare. v2 confirmă **„sinapsă canonică de pipeline”**; nu distinge între trimiterea „document ca media” (I53) și trimiterea generică pe canal (J59). În repo există **delegare** documentată de la J59 către coada `document:whatsapp:send` cu posibil **decalaj de câmpuri** — vezi contractele sursa si destinatia; muchia sinaptică nu rezolvă aceste detalii.

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

- **Runtime (ADR-0001):** două cozi distincte în registry: `document:whatsapp:send` și `channel:whatsapp:send`.
- **Semantic (ADR-0002):** `e3:document:whatsapp-send` și `e3:channel:whatsapp-send` — catalog + contracte.
- **Planificare:** dependență declarată între fluxul document WhatsApp și trimiterea pe canalul WhatsApp.

## Limite și reconcilieri

- Orice inconsistență de payload între producător (ex. J59) și consumator (I53) este **în contractele neuroni**, nu în câmpurile v2 ale sinapsei.
- I53 stub — comportamentul „live” poate fi incomplet față de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-whatsapp-send-channel-whatsapp-send\``.
