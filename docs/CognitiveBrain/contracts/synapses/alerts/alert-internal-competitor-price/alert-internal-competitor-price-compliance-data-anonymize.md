# Sinapsă `alert-internal-competitor-price-compliance-data-anonymize`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-competitor-price-compliance-data-anonymize` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-competitor-price/alert-internal-competitor-price-compliance-data-anonymize.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-competitor-price` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-internal-competitor-price` | [`../../../neurons/E5/alert--internal--competitor-price.md`](../../../neurons/E5/alert--internal--competitor-price.md). **Runtime:** **gap** literal în registry — vezi contract neuron. |
| Target | `compliance-data-anonymize` | [`../../../neurons/E4/compliance--data--anonymize.md`](../../../neurons/E4/compliance--data--anonymize.md). **Runtime:** **`audit:data:anonymize`** (`QUEUES.E4_AUDIT_DATA_ANONYMIZE`, L485); etichetă v2 `compliance:data:anonymize` — vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Anonimizarea declarată în graf este dependentă de traseul alertei de preț competitor. Fără detaliu de execuție din export.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap; destinație — `audit:data:anonymize`.
- **Semantic (ADR-0002):** `e4:audit:data-anonymize` — catalog.
- **Planificare:** v2 §7 — `alert-internal-competitor-price` → `compliance-data-anonymize`.

## Limite și reconcilieri

- Graf vs coadă J47 — contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-competitor-price-compliance-data-anonymize\``.
