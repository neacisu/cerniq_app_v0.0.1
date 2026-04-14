# Sinapsă `alert-client-account-blocked-audit-compliance-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-client-account-blocked-audit-compliance-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-client-account-blocked/alert-client-account-blocked-audit-compliance-check.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-client-account-blocked` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-client-account-blocked` | [`../../../neurons/E4/alert--client--account-blocked.md`](../../../neurons/E4/alert--client--account-blocked.md). **Runtime:** **gap** — `alert:client:account-blocked` nu apare în `queue-registry.ts` la auditul documentat; vezi cozi generice E4 în contract. |
| Destinație (graf) | `audit-compliance-check` | [`../../../neurons/E4/audit--compliance--check.md`](../../../neurons/E4/audit--compliance--check.md). **Runtime:** **gap** pentru coada v2 `audit:compliance:check`; implementare apropiată: `audit:chain:verify` (`QUEUES.E4_AUDIT_CHAIN_VERIFY`, `queue-registry.ts` L483) — **nu** echivalență 1:1; vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În planificare, verificarea de conformitate audit este dependentă de traseul alertei client. Exportul nu descrie propagarea evenimentului între cozi.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă granulară — gap; destinație nominală v2 — gap; apropiere documentată: J46 `audit:chain:verify`.
- **Semantic (ADR-0002):** `e4:audit:chain-verify` vs `audit:compliance:check` — contract neuron destinație.
- **Planificare:** v2 §7 — `alert-client-account-blocked` → `audit-compliance-check`.

## Limite și reconcilieri

- Reconciliere `audit:compliance:check` ↔ `audit:chain:verify`; sursă alertă granulară fără `QUEUES` dedicat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-client-account-blocked-audit-compliance-check\``.
