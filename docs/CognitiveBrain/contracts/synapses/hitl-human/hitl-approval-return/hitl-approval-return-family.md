# Sinapsă `hitl-approval-return-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `hitl-approval-return-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/hitl-approval-return/hitl-approval-return-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `hitl-approval-return` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `hitl-approval-return` | **Planificare (graf).** **Neuron (contract):** [`../../../neurons/E4/hitl--approval--return.md`](../../../neurons/E4/hitl--approval--return.md). **v2:** secțiunea NEURON pentru `hitl:approval:return` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L6976–L6996). **Runtime (ADR-0001):** v2 indică **„not yet reconciled with runtime registry”** (L6996); contractul neuron confirmă **fără** coadă în `queue-registry.ts` la audit. **ADR e4:** [`../../../../adr/families/e4/hitl.md`](../../../../adr/families/e4/hitl.md) notează `hitl:approval:return` ca posibil neînregistrat în tabelul extras. |
| Destinație (graf) | `e4-hitl` | Agregat familie **`hitl`** etapa **E4**. **v2:** [ADR-FAMILY-e4-hitl](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e4/hitl.md`](../../../../adr/families/e4/hitl.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **hitl-approval-return** sub **`e4-hitl`**. v2: **„specializează familia”**. Poziția în graf este **dovedită** de export; **execuția** ca neuron HITL cu coada `hitl:approval:return` **nu** este dovedită în registry la data auditului din contractul neuron — reconcilierea rămâne deschisă acolo, nu se închide prin textul acestei sinapse.

## Muchii planificate din alte trasee (către acest nod)

[`../../pipeline-monitor/audit-compliance-check/audit-compliance-check-hitl-approval-return.md`](../../pipeline-monitor/audit-compliance-check/audit-compliance-check-hitl-approval-return.md), [`../../pipeline-monitor/audit-data-anonymize/audit-data-anonymize-hitl-approval-return.md`](../../pipeline-monitor/audit-data-anonymize/audit-data-anonymize-hitl-approval-return.md), [`../../pipeline-monitor/audit-log-write/audit-log-write-hitl-approval-return.md`](../../pipeline-monitor/audit-log-write/audit-log-write-hitl-approval-return.md).

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
| **Runtime (ADR-0001)** | **Gap** față de v2 queue field — vezi contract neuron și ADR e4 (reconciliere). |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — rând `hitl:approval:return` fără `nodeKey`/catalog populate (`no`). |
| **Planificare (export)** | v2 §7 — `hitl-approval-return` → `e4-hitl`, tip `default`. |

## Limite și reconcilieri

- **Graf vs runtime:** nodul `hitl-approval-return` în plan **nu** implică automat un handler BullMQ omolog; verificarea în cod rămâne sursa de adevăr operațională.
- Nu se presupun payloaduri sau politici HITL din muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`hitl-approval-return-family\``.
