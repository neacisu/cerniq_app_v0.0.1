# Sinapsă `hitl-approval-refund-large-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `hitl-approval-refund-large-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/hitl-approval-refund-large/hitl-approval-refund-large-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `hitl-approval-refund-large` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `hitl-approval-refund-large` | **Planificare (graf).** **Neuron (contract):** [`../../../neurons/E4/hitl--approval--refund-large.md`](../../../neurons/E4/hitl--approval--refund-large.md). **v2:** secțiunea NEURON pentru `hitl:approval:refund-large` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L6951–L6974). **Runtime (ADR-0001):** `hitl:approval:refund-large` — `E4_HITL_REFUND_LARGE` (`queue-registry.ts` L497). **ADR:** [`../../../../adr/families/e4/hitl.md`](../../../../adr/families/e4/hitl.md). **Semantic (ADR-0002):** `e4:hitl:refund-large`. |
| Destinație (graf) | `e4-hitl` | Agregat familie **`hitl`** etapa **E4**. **v2:** [ADR-FAMILY-e4-hitl](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e4/hitl.md`](../../../../adr/families/e4/hitl.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **hitl-approval-refund-large** sub **`e4-hitl`**. v2: **„specializează familia”**. Praguri monetare și roluri aprobator (ex. FINANCE_MANAGER în v2) sunt în **NEURON** și în cod (`k-hitl-workers.ts` / K50) — nu în câmpurile muchiei din export.

## Muchii planificate din alte trasee (către acest nod)

[`../../pipeline-monitor/audit-compliance-check/audit-compliance-check-hitl-approval-refund-large.md`](../../pipeline-monitor/audit-compliance-check/audit-compliance-check-hitl-approval-refund-large.md), [`../../pipeline-monitor/audit-data-anonymize/audit-data-anonymize-hitl-approval-refund-large.md`](../../pipeline-monitor/audit-data-anonymize/audit-data-anonymize-hitl-approval-refund-large.md), [`../../pipeline-monitor/audit-log-write/audit-log-write-hitl-approval-refund-large.md`](../../pipeline-monitor/audit-log-write/audit-log-write-hitl-approval-refund-large.md).

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
| **Runtime (ADR-0001)** | Coadă în registry; prag RON în cod — contract neuron. |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — `hitl:approval:refund-large`, `e4:hitl:refund-large`. |
| **Planificare (export)** | v2 §7 — `hitl-approval-refund-large` → `e4-hitl`, tip `default`. |

## Limite și reconcilieri

- **v2** menționează prag **>1K RON**; **cod** poate folosi constantă distinctă (ex.1000 RON) — vezi contract neuron; nu se egalizează aici fără citire handler.
- **Span vs catalog:** `e4:hitl:refund:large` vs `e4:hitl:refund-large` — în contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`hitl-approval-refund-large-family\``.
