# Sinapsă `alert-internal-contract-signed-audit-log-write`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-contract-signed-audit-log-write` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-contract-signed/alert-internal-contract-signed-audit-log-write.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-contract-signed` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-internal-contract-signed` | [`../../../neurons/E4/alert--internal--contract-signed.md`](../../../neurons/E4/alert--internal--contract-signed.md). **Runtime:** **gap** literal granular — vezi contract neuron. |
| Target | `audit-log-write` | [`../../../neurons/E4/audit--log--write.md`](../../../neurons/E4/audit--log--write.md). **Runtime:** **`audit:log:write`** (`QUEUES.E4_AUDIT_LOG_WRITE`, `queue-registry.ts` L481), worker J45 — vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Scrierea în jurnalul audit este dependentă în graf de traseul alertei „contract semnat”. Fără detaliu de conținut din export.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap; destinație — `audit:log:write` (J45).
- **Semantic (ADR-0002):** `e4:audit:log-write` — catalog; vezi contract neuron pentru span vs catalog.
- **Planificare:** v2 §7 — `alert-internal-contract-signed` → `audit-log-write`.

## Limite și reconcilieri

- Granular alertă vs infrastructură `alert:*` generică — contract neuron sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-contract-signed-audit-log-write\``.
