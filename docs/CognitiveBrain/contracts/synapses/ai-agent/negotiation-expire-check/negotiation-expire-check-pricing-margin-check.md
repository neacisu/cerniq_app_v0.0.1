# Sinapsă `negotiation-expire-check-pricing-margin-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `negotiation-expire-check-pricing-margin-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/negotiation-expire-check/negotiation-expire-check-pricing-margin-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `negotiation-expire-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `negotiation-expire-check` | **`negotiation:expire:check`** — `QUEUES.E3_NEGOTIATION_EXPIRE_CHECK`. [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md). |
| Destinație (graf) | `pricing-margin-check` | **`pricing:margin:check`** — `QUEUES.E3_PRICING_MARGIN_CHECK`. [`../../../neurons/E3/pricing--margin--check.md`](../../../neurons/E3/pricing--margin--check.md). |

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

- **Runtime:** `QUEUES.E3_NEGOTIATION_EXPIRE_CHECK` → `QUEUES.E3_PRICING_MARGIN_CHECK`; vezi `workers/shared/src/queue-registry.ts` și [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv).
- **Semantic:** contracte neuron sursă și țintă (linkuri în tabel).
- **Planificare:** muchie **`dependency`**: `negotiation-expire-check` precede `pricing-margin-check` în export; fără semantica operațională suplimentară în v2.

## Limite și reconcilieri

- Slug-uri ↔ cozi `:`; fără presupuneri despre payload (absent din export).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`negotiation-expire-check-pricing-margin-check\``.
