# Sinapsă `alert-internal-compliance-issue-audit-data-anonymize`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-compliance-issue-audit-data-anonymize` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-compliance-issue/alert-internal-compliance-issue-audit-data-anonymize.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-compliance-issue` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-internal-compliance-issue` | [`../../../neurons/E4/alert--internal--compliance-issue.md`](../../../neurons/E4/alert--internal--compliance-issue.md). **Runtime:** **gap** literal granular — vezi contract neuron. |
| Target | `audit-data-anonymize` | [`../../../neurons/E4/audit--data--anonymize.md`](../../../neurons/E4/audit--data--anonymize.md). **Runtime:** **`audit:data:anonymize`** (`QUEUES.E4_AUDIT_DATA_ANONYMIZE`, `queue-registry.ts` L485), worker J47 — vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Anonimizarea jurnalului audit (nod `audit-data-anonymize`) este dependentă în graf de traseul alertei de problemă de conformitate. Exportul nu specifică payload sau declanșator operațional.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap; țintă — `audit:data:anonymize` (J47).
- **Semantic (ADR-0002):** `e4:audit:data-anonymize` — catalog; atenție la nealiniere span vs catalog în implementare — vezi contract neuron.
- **Planificare:** v2 §7 — `alert-internal-compliance-issue` → `audit-data-anonymize`.

## Limite și reconcilieri

- Sursă planificare fără coadă dedicată vs țintă cu coadă canonică — documentat în contractele neuroni.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-compliance-issue-audit-data-anonymize\``.
