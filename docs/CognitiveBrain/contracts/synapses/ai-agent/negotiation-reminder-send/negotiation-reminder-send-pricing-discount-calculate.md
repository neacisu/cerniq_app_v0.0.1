# Sinapsă `negotiation-reminder-send-pricing-discount-calculate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `negotiation-reminder-send-pricing-discount-calculate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/negotiation-reminder-send/negotiation-reminder-send-pricing-discount-calculate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `negotiation-reminder-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `negotiation-reminder-send` | **`negotiation:reminder:send`** — `QUEUES.E3_NEGOTIATION_REMINDER_SEND`. [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md). |
| Destinație (graf) | `pricing-discount-calculate` | **`pricing:discount:calculate`** — `QUEUES.E3_PRICING_DISCOUNT_CALCULATE`. [`../../../neurons/E3/pricing--discount--calculate.md`](../../../neurons/E3/pricing--discount--calculate.md). |

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

- **Runtime:** `QUEUES.E3_NEGOTIATION_REMINDER_SEND` → `QUEUES.E3_PRICING_DISCOUNT_CALCULATE` — `queue-registry.ts`; matrice [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv).
- **Semantic:** `cognitive-node-catalog.ts` + contractele neuron.
- **Planificare:** muchie **`dependency`** în topologia exportată.

## Limite și reconcilieri

- Slug-uri ↔ cozi `:`; fără presupuneri despre payload (absent din export).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`negotiation-reminder-send-pricing-discount-calculate\``.
