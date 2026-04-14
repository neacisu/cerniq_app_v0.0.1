# Sinapsă `channel-email-send-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `channel-email-send-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/channel-email-send/channel-email-send-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `channel-email-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `channel-email-send` | Slug traseu în graf. **Execuție (ADR-0001):** **`channel:email:send`** (`QUEUES.E3_CHANNEL_EMAIL_SEND` în `workers/shared/src/queue-registry.ts`). Detaliu comportament (ex. handover / Resend): [`../../../neurons/E3/channel--email--send.md`](../../../neurons/E3/channel--email--send.md). |
| Destinație (graf) | `e3-channels` | Agregat de planificare pentru familia **channels** (E3); nu este o singură coadă BullMQ. Nu există un contract neuron unic pentru eticheta `e3-channels`. |

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

- **Runtime (ADR-0001):** capăt operațional sursă = **`channel:email:send`**. Destinația `e3-channels` rămâne agregat de graf; pentru neuroni `channels` concreți, folosiți [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv).
- **Semantic (ADR-0002):** `e3:channel:email-send` — `cognitive-node-catalog.ts` + contract neuron.
- **Planificare:** muchie **default** „specializează familia”; fără semantica operațională suplimentară în câmpurile v2 §7 pentru această muchie.

## Limite și reconcilieri

- Slug **`channel-email-send`** ↔ coadă **`channel:email:send`**. Nu reduceți `e3-channels` la un singur `nodeKey` fără dovezi din catalog.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`channel-email-send-family\``.
