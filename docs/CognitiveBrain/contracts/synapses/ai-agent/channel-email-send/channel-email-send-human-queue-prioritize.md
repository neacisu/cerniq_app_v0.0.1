# Sinapsă `channel-email-send-human-queue-prioritize`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `channel-email-send-human-queue-prioritize` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/channel-email-send/channel-email-send-human-queue-prioritize.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `channel-email-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `channel-email-send` | **`channel:email:send`** — `QUEUES.E3_CHANNEL_EMAIL_SEND`. [`../../../neurons/E3/channel--email--send.md`](../../../neurons/E3/channel--email--send.md). |
| Destinație (graf) | `human-queue-prioritize` | Nod planificat; contract [`../../../neurons/E3/human--queue--prioritize.md`](../../../neurons/E3/human--queue--prioritize.md) documentează **gap runtime** (coada `human:queue:prioritize` negăsită în `queue-registry.ts` la audit). **Necesită reconciliere graf ↔ registry.** |

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

- **Runtime:** sursă ancorată în registry; **țintă:** fără coadă canonică dovedită sub numele `human:queue:prioritize` — vezi contractul neuron.
- **Semantic:** sursă: contract channel email; țintă: fără intrare catalog demonstrată pentru această coadă la auditul din contract.
- **Planificare:** muchie **`dependency`**: `channel-email-send` precede `human-queue-prioritize` în graful exportat; v2 nu detaliază prioritizarea în registru.

## Limite și reconcilieri

- Slug sursă ↔ **`channel:email:send`**. Pentru **`human-queue-prioritize`**: gap explicit; orice rută alternativă (ex. alte cozi `human:*`) nu se echivalează automat fără dovadă în cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`channel-email-send-human-queue-prioritize\``.
