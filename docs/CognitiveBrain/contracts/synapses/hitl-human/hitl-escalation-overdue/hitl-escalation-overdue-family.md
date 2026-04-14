# Sinapsă `hitl-escalation-overdue-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `hitl-escalation-overdue-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/hitl-escalation-overdue/hitl-escalation-overdue-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `hitl-escalation-overdue` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `hitl-escalation-overdue` | **Planificare (graf).** **Neuron (contract):** [`../../../neurons/E4/hitl--escalation--overdue.md`](../../../neurons/E4/hitl--escalation--overdue.md). **v2:** secțiunea NEURON pentru `hitl:escalation:overdue` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L6998–L7021). **Runtime (ADR-0001):** `hitl:escalation:overdue` — `E4_HITL_ESCALATION_OVERDUE` (`queue-registry.ts` L503). **ADR:** [`../../../../adr/families/e4/hitl.md`](../../../../adr/families/e4/hitl.md). **Semantic (ADR-0002):** `e4:hitl:escalation-overdue`. |
| Destinație (graf) | `e4-hitl` | Agregat familie **`hitl`** etapa **E4**. **v2:** [ADR-FAMILY-e4-hitl](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e4/hitl.md`](../../../../adr/families/e4/hitl.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **hitl-escalation-overdue** sub **`e4-hitl`**. v2: **„specializează familia”** — în planificare, escaladarea la depășire SLA este clasificată în familia HITL E4. Fluxul concret (warning, `approvalService.escalate`, lanț escalateTo) este în **contractul neuron** și cod (K53), nu în câmpurile muchiei din export.

## Muchii planificate din alte trasee (către acest nod)

[`../../pipeline-monitor/audit-compliance-check/audit-compliance-check-hitl-escalation-overdue.md`](../../pipeline-monitor/audit-compliance-check/audit-compliance-check-hitl-escalation-overdue.md), [`../../pipeline-monitor/audit-data-anonymize/audit-data-anonymize-hitl-escalation-overdue.md`](../../pipeline-monitor/audit-data-anonymize/audit-data-anonymize-hitl-escalation-overdue.md), [`../../pipeline-monitor/audit-log-write/audit-log-write-hitl-escalation-overdue.md`](../../pipeline-monitor/audit-log-write/audit-log-write-hitl-escalation-overdue.md).

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | Coadă și worker E4 — vezi contract neuron. |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — `hitl:escalation:overdue`, `e4:hitl:escalation-overdue` (coloane populate). |
| **Planificare (export)** | v2 §7 — `hitl-escalation-overdue` → `e4-hitl`, tip `default`. |

## Limite și reconcilieri

- **Span vs catalog:** `e4:hitl:escalation:overdue` vs `e4:hitl:escalation-overdue` — în contractul neuron.
- Fără inventare payload/retry/safety pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`hitl-escalation-overdue-family\``.
