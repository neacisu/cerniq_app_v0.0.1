# Sinapsă `negotiation-summary-generate-pricing-competitor-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `negotiation-summary-generate-pricing-competitor-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/negotiation-summary-generate/negotiation-summary-generate-pricing-competitor-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `negotiation-summary-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `negotiation-summary-generate` | Nod planificat; [`../../../neurons/E3/negotiation--summary--generate.md`](../../../neurons/E3/negotiation--summary--generate.md): **gap runtime** pentru `negotiation:summary:generate` în registry/catalog la audit. **Necesită reconciliere graf ↔ registry** pentru sursă. |
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

- **Runtime:** **destinație** ancorată în `QUEUES.E3_PRICING_COMPETITOR_CHECK`; **sursă:** fără `QUEUES.*` dovedit pentru `negotiation:summary:generate` — contract neuron.
- **Semantic:** destinație: catalog + contract pricing; sursă: **nu** inventați `nodeKey` unde contractul marchează absență.
- **Planificare:** muchie **`dependency`**: `negotiation-summary-generate` precede `pricing-competitor-check` în export; v2: „sinapsă canonică de pipeline”.

## Limite și reconcilieri

- Muchia leagă în **plan** două noduri; execuția capătului sursă rămâne **nedovedită** în registry la data contractului neuron. Pentru **destinație**: slug `pricing-competitor-check` ↔ **`pricing:competitor:check`**. Fără presupuneri despre payload (absent din export).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`negotiation-summary-generate-pricing-competitor-check\``.
