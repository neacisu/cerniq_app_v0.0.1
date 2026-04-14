# Sinapsă `audit-compliance-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `audit-compliance-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/audit-compliance-check/audit-compliance-check-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `audit-compliance-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `audit-compliance-check` | Nod de traseu în graf. **Matrix / neuron:** [`../../../neurons/E4/audit--compliance--check.md`](../../../neurons/E4/audit--compliance--check.md) — `audit:compliance:check` (E4, audit). Contractul neuron documentează **gap runtime:** coada nominală v2 **nu** apare în `queue-registry.ts`; există apropiere semantică cu **`audit:chain:verify`** (J46) — **nu** echivalență 1:1. |
| Destinație (graf) | `e4-audit` | Agregat **familie audit E4** în planificare; nu este o singură coadă executabilă și **nu** există un fișier neuron unic pentru eticheta agregată `e4-audit`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** leagă traseul **audit-compliance-check** de nucleul de familie **`e4-audit`**. v2 §7: descrierea confirmată este **„specializează familia”** — ancorare în familia semantică audit E4 fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei.

## Sinapse dependență în același traseu

Muchiile **`dependency`** din v2 §7 (fișiere în acest director): `audit-compliance-check-hitl-approval-contract-clause.md`, `audit-compliance-check-hitl-approval-credit-limit.md`, `audit-compliance-check-hitl-approval-credit-override.md`, `audit-compliance-check-hitl-approval-refund-large.md`, `audit-compliance-check-hitl-approval-return.md`, `audit-compliance-check-hitl-escalation-overdue.md`, `audit-compliance-check-hitl-investigation-payment.md`, `audit-compliance-check-hitl-task-call-client.md`, `audit-compliance-check-hitl-task-resolve.md`.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Planificare:** v2 §7 — `audit-compliance-check` → `e4-audit`.
- **Runtime (ADR-0001):** vezi reconcilierea din [`audit--compliance--check.md`](../../../neurons/E4/audit--compliance--check.md) (lipsă `audit:compliance:check`; proximitate J46).
- **Semantic (ADR-0002):** `e4:audit:chain-verify` și alte chei din catalog — vezi neuron și `cognitive-node-catalog.ts`; eticheta **`e4-audit`** rămâne agregat de graf.

## Limite și reconcilieri

- **Graf vs registry:** slug-ul traseului nu garantează o intrare de coadă cu același literal; reconcilierea este în contractul neuron, nu presupusă aici.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`audit-compliance-check-family\``.
