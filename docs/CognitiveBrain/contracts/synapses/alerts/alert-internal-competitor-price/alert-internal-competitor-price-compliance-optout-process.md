# Sinapsă `alert-internal-competitor-price-compliance-optout-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-competitor-price-compliance-optout-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-competitor-price/alert-internal-competitor-price-compliance-optout-process.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-competitor-price` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-internal-competitor-price` | [`../../../neurons/E5/alert--internal--competitor-price.md`](../../../neurons/E5/alert--internal--competitor-price.md). **Runtime:** **gap** literal în registry — vezi contract neuron. |
| Target | `compliance-optout-process` | [`../../../neurons/E5/compliance--optout--process.md`](../../../neurons/E5/compliance--optout--process.md). **Runtime:** **gap** `compliance:optout:process`; vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Procesarea opt-out din graf este dependentă de traseul alertei de preț competitor. Exportul nu descrie integrarea.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap; țintă — gap.
- **Semantic (ADR-0002):** vezi contracte neuroni.
- **Planificare:** v2 §7 — `alert-internal-competitor-price` → `compliance-optout-process`.

## Limite și reconcilieri

- Opt-out dispersat vs nod unic — contract neuron țintă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-competitor-price-compliance-optout-process\``.
