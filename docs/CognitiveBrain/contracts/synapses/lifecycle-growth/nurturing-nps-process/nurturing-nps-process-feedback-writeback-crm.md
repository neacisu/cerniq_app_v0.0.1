# Sinapsă `nurturing-nps-process-feedback-writeback-crm`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `nurturing-nps-process-feedback-writeback-crm` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/nurturing-nps-process/nurturing-nps-process-feedback-writeback-crm.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `nurturing-nps-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `nurturing-nps-process` | **Contract:** [`../../../neurons/E5/nurturing--nps--process.md`](../../../neurons/E5/nurturing--nps--process.md). **Semantic / runtime:** vezi neuron. |
| Destinație (graf) | `feedback-writeback-crm` | **Contract:** [`../../../neurons/E5/feedback--writeback--crm.md`](../../../neurons/E5/feedback--writeback--crm.md). **Semantic:** raportat `e2:outreach:orchestrator-dispatch` în `NEURON_MATRIX.csv` — vezi neuron pentru reconciliere. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **nurturing-nps-process** are dependență sintactică față de **feedback-writeback-crm**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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

- **Planificare:** v2 §7 — `nurturing-nps-process` → `feedback-writeback-crm`.
- **Runtime (ADR-0001):** vezi neuroni sursă și destinație.
- **Semantic (ADR-0002):** contract E5; mapare semantică în CSV poate indica orchestrator E2 — **necesită reconciliere** în neuron.

## Limite și reconcilieri

- **Reconciliere:** vezi `NEURON_MATRIX.csv` vs contract neuron pentru aliniere semantică.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`nurturing-nps-process-feedback-writeback-crm\``.
