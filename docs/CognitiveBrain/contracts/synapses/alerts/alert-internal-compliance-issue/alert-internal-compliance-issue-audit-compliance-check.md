# Sinapsă `alert-internal-compliance-issue-audit-compliance-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-compliance-issue-audit-compliance-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-compliance-issue/alert-internal-compliance-issue-audit-compliance-check.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-compliance-issue` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-internal-compliance-issue` | [`../../../neurons/E4/alert--internal--compliance-issue.md`](../../../neurons/E4/alert--internal--compliance-issue.md). **Runtime:** **gap** — `alert:internal:compliance-issue` nu apare în `queue-registry.ts` la auditul documentat; vezi contract neuron. |
| Target | `audit-compliance-check` | [`../../../neurons/E4/audit--compliance--check.md`](../../../neurons/E4/audit--compliance--check.md). **Runtime:** **gap** pentru coada v2 `audit:compliance:check`; apropiere documentată: **`audit:chain:verify`** (`QUEUES.E4_AUDIT_CHAIN_VERIFY`, `queue-registry.ts` L483) — **nu** echivalență 1:1; vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Verificarea de conformitate audit (nod `audit-compliance-check` în planificare) este dependentă în graf de traseul alertei interne de problemă de conformitate. Fără mecanism din export.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă granulară — gap; țintă nominală v2 — gap; apropiere: `audit:chain:verify` (J46).
- **Semantic (ADR-0002):** `e4:audit:chain-verify` vs `audit:compliance:check` — contract neuron țintă.
- **Planificare:** v2 §7 — `alert-internal-compliance-issue` → `audit-compliance-check`.

## Limite și reconcilieri

- Reconciliere compliance-check vs chain-verify; sursă alertă fără `QUEUES` dedicat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-compliance-issue-audit-compliance-check\``.
