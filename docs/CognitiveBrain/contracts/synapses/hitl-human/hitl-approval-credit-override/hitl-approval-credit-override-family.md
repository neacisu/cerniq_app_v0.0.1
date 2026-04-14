# Sinapsă `hitl-approval-credit-override-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `hitl-approval-credit-override-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/hitl-approval-credit-override/hitl-approval-credit-override-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `hitl-approval-credit-override` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `hitl-approval-credit-override` | **Planificare (graf).** **Neuron (contract):** [`../../../neurons/E4/hitl--approval--credit-override.md`](../../../neurons/E4/hitl--approval--credit-override.md). **v2:** secțiunea NEURON pentru `hitl:approval:credit-override` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L6926–L6949). **Runtime (ADR-0001):** `hitl:approval:credit-override` — `E4_HITL_CREDIT_OVERRIDE` în `queue-registry.ts` (L493); mapare explicită în [`../../../../adr/families/e4/hitl.md`](../../../../adr/families/e4/hitl.md). **Semantic (ADR-0002):** `e4:hitl:credit-override` — vezi catalog în contractul neuron. |
| Destinație (graf) | `e4-hitl` | Agregat de **familie** `hitl` în etapa **E4** (plan export). Nu este o singură coadă executabilă. **v2:** [ADR-FAMILY-e4-hitl](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e4/hitl.md`](../../../../adr/families/e4/hitl.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **hitl-approval-credit-override** sub agregatul **`e4-hitl`**. v2 descrie destinația ca **„specializează familia”**: în planificare, neuronul HITL pentru override de credit este clasificat în familia `hitl` E4, cu politicile de guvernanță și HITL ale acelui agregat. Semantica aprobării (roluri, SLA, payload task) **nu** este codificată în această muchie — vezi **NEURON** v2 și contractul neuron + handlerii K48.

## Muchii planificate din alte trasee (către acest nod)

Dependențe **pipeline-monitor →** `hitl-approval-credit-override` (v2 §7): [`../../pipeline-monitor/audit-compliance-check/audit-compliance-check-hitl-approval-credit-override.md`](../../pipeline-monitor/audit-compliance-check/audit-compliance-check-hitl-approval-credit-override.md), [`../../pipeline-monitor/audit-data-anonymize/audit-data-anonymize-hitl-approval-credit-override.md`](../../pipeline-monitor/audit-data-anonymize/audit-data-anonymize-hitl-approval-credit-override.md), [`../../pipeline-monitor/audit-log-write/audit-log-write-hitl-approval-credit-override.md`](../../pipeline-monitor/audit-log-write/audit-log-write-hitl-approval-credit-override.md).

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
| **Runtime (ADR-0001)** | Coadă `hitl:approval:credit-override` înregistrată; worker E4 — vezi contract neuron. |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — `hitl:approval:credit-override`, `e4:hitl:credit-override` complet. |
| **Planificare (export)** | v2 §7 — sursă `hitl-approval-credit-override` → țintă `e4-hitl`, tip `default`. |

## Limite și reconcilieri

- **Span vs catalog:** `withCognitiveSpan("e4:hitl:credit:override")` vs `e4:hitl:credit-override` — documentat în contractul neuron; această sinapsă nu unifică naming-ul.
- Fără inventare de payload/retry/safety pentru muchia `default` din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`hitl-approval-credit-override-family\``.
