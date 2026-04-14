# Sinapsă `negotiation-reminder-send-pricing-competitor-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `negotiation-reminder-send-pricing-competitor-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/negotiation-reminder-send/negotiation-reminder-send-pricing-competitor-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `negotiation-reminder-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `negotiation-reminder-send` | **`negotiation:reminder:send`** — `QUEUES.E3_NEGOTIATION_REMINDER_SEND`. [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md). |
| Destinație (graf) | `pricing-competitor-check` | **`pricing:competitor:check`** — `QUEUES.E3_PRICING_COMPETITOR_CHECK`. [`../../../neurons/E3/pricing--competitor--check.md`](../../../neurons/E3/pricing--competitor--check.md). |

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

- **Runtime:** sursă și țintă în `workers/shared/src/queue-registry.ts`; [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv).
- **Semantic:** contracte neuron sursă și țintă.
- **Planificare:** muchie **`dependency`**: `negotiation-reminder-send` precede `pricing-competitor-check` în export; v2: „sinapsă canonică de pipeline”.

## Limite și reconcilieri

- Slug-uri ↔ cozi `:`; fără presupuneri despre payload (absent din export).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`negotiation-reminder-send-pricing-competitor-check\``.
