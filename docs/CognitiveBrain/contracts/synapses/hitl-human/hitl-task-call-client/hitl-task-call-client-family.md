# Sinapsă `hitl-task-call-client-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `hitl-task-call-client-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/hitl-task-call-client/hitl-task-call-client-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `hitl-task-call-client` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `hitl-task-call-client` | **Planificare (graf).** **Neuron (contract):** [`../../../neurons/E4/hitl--task--call-client.md`](../../../neurons/E4/hitl--task--call-client.md). **v2:** secțiunea NEURON pentru `hitl:task:call-client` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L7048–L7068); **Contract evidence** (L7068): graph-export-grounded, **not yet reconciled** cu registry. **Runtime (ADR-0001):** contractul neuron: **fără** coadă `hitl:task:call-client` în registry; există **`hitl:task:resolve`** (K52) — **alt** literal. **NEURON_MATRIX.csv** leagă rândul de `e4:hitl:task-resolve` — reconciliere semantică **necesară**, documentată în contractul neuron, **nu** echivalată aici cu „call client”. |
| Destinație (graf) | `e4-hitl` | Agregat familie **`hitl`** etapa **E4**. **v2:** [ADR-FAMILY-e4-hitl](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e4/hitl.md`](../../../../adr/families/e4/hitl.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **hitl-task-call-client** sub **`e4-hitl`**. v2: **„specializează familia”**. Poziția în graf este **dovedită** de export; **maparea** la o coadă executabilă cu același nume **nu** este dovedită în evidența citită în contractul neuron — rămâne export-grounded cu gap explicit.

## Muchii planificate din alte trasee (către acest nod)

[`../../pipeline-monitor/audit-compliance-check/audit-compliance-check-hitl-task-call-client.md`](../../pipeline-monitor/audit-compliance-check/audit-compliance-check-hitl-task-call-client.md), [`../../pipeline-monitor/audit-data-anonymize/audit-data-anonymize-hitl-task-call-client.md`](../../pipeline-monitor/audit-data-anonymize/audit-data-anonymize-hitl-task-call-client.md), [`../../pipeline-monitor/audit-log-write/audit-log-write-hitl-task-call-client.md`](../../pipeline-monitor/audit-log-write/audit-log-write-hitl-task-call-client.md).

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
| **Runtime (ADR-0001)** | Gap pentru `hitl:task:call-client`; `hitl:task:resolve` în registry — vezi contract neuron. |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — rând `hitl:task:call-client` cu `e4:hitl:task-resolve` în coloane catalog; interpretare **numai** prin contract neuron. |
| **Planificare (export)** | v2 §7 — `hitl-task-call-client` → `e4-hitl`, tip `default`. |

## Limite și reconcilieri

- **Graf vs runtime:** confundarea `hitl-task-call-client` cu handlerul `hitl:task:resolve` **este interzisă** fără dovadă suplimentară — vezi contract neuron.
- Fără completări despre apeluri sau canale din muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`hitl-task-call-client-family\``.
