# Sinapsă `alert-client-account-blocked-audit-log-write`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-client-account-blocked-audit-log-write` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-client-account-blocked/alert-client-account-blocked-audit-log-write.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-client-account-blocked` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-client-account-blocked` | [`../../../neurons/E4/alert--client--account-blocked.md`](../../../neurons/E4/alert--client--account-blocked.md). **Runtime:** **gap** granular în `queue-registry.ts` la auditul documentat. |
| Destinație (graf) | `audit-log-write` | [`../../../neurons/E4/audit--log--write.md`](../../../neurons/E4/audit--log--write.md). **Runtime:** `audit:log:write` (`QUEUES.E4_AUDIT_LOG_WRITE`, `queue-registry.ts` L481). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Scrierea în jurnalul de audit este planificată ca dependentă de traseul alertei client. Exportul nu descrie payload sau ordinea job-urilor.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap granular; destinație — `audit:log:write`.
- **Semantic (ADR-0002):** `e4:audit:log-write` (contract neuron).
- **Planificare:** v2 §7 — `alert-client-account-blocked` → `audit-log-write`.

## Limite și reconcilieri

- Sursă alertă fără coadă dedicată în registry la auditul documentat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-client-account-blocked-audit-log-write\``.
