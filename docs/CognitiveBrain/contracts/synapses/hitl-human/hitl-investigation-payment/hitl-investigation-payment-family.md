# Sinapsă `hitl-investigation-payment-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `hitl-investigation-payment-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/hitl-investigation-payment/hitl-investigation-payment-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `hitl-investigation-payment` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `hitl-investigation-payment` | **Planificare (graf).** **Neuron (contract):** [`../../../neurons/E4/hitl--investigation--payment.md`](../../../neurons/E4/hitl--investigation--payment.md). **v2:** secțiunea NEURON pentru `hitl:investigation:payment` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L7023–L7046). **Runtime (ADR-0001):** `hitl:investigation:payment` — `E4_HITL_PAYMENT_INVESTIGATION` (`queue-registry.ts` L499). **ADR:** [`../../../../adr/families/e4/hitl.md`](../../../../adr/families/e4/hitl.md) (`hitl:investigation:payment` ↔ `e4:hitl:payment-investigation`). **Semantic (ADR-0002):** `e4:hitl:payment-investigation`. |
| Destinație (graf) | `e4-hitl` | Agregat familie **`hitl`** etapa **E4**. **v2:** [ADR-FAMILY-e4-hitl](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e4/hitl.md`](../../../../adr/families/e4/hitl.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **hitl-investigation-payment** sub **`e4-hitl`**. v2: **„specializează familia”** — investigarea plăților cu supraveghere umană este plasată în agregatul HITL E4. Detaliile Tier3, rol ACCOUNTING și SLA **nu** provin din muchia `default`; vezi NEURON v2 și contractul neuron (inclusiv tensiunea SLA documentată acolo).

## Muchii planificate din alte trasee (către acest nod)

[`../../pipeline-monitor/audit-compliance-check/audit-compliance-check-hitl-investigation-payment.md`](../../pipeline-monitor/audit-compliance-check/audit-compliance-check-hitl-investigation-payment.md), [`../../pipeline-monitor/audit-data-anonymize/audit-data-anonymize-hitl-investigation-payment.md`](../../pipeline-monitor/audit-data-anonymize/audit-data-anonymize-hitl-investigation-payment.md), [`../../pipeline-monitor/audit-log-write/audit-log-write-hitl-investigation-payment.md`](../../pipeline-monitor/audit-log-write/audit-log-write-hitl-investigation-payment.md).

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
| **Runtime (ADR-0001)** | K51 / registry — contract neuron. |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — `hitl:investigation:payment`, `e4:hitl:payment-investigation`. |
| **Planificare (export)** | v2 §7 — `hitl-investigation-payment` → `e4-hitl`, tip `default`. |

## Limite și reconcilieri

- **Span vs catalog:** `e4:hitl:payment:investigation` vs `e4:hitl:payment-investigation` — contract neuron.
- **SLA:** v2 (L7043) vs catalog/cod — nu se unifică aici; vezi contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`hitl-investigation-payment-family\``.
