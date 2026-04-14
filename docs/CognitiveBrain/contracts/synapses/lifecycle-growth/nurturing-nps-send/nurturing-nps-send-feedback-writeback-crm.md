# Sinapsă `nurturing-nps-send-feedback-writeback-crm`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `nurturing-nps-send-feedback-writeback-crm` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/nurturing-nps-send/nurturing-nps-send-feedback-writeback-crm.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `nurturing-nps-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `nurturing-nps-send` | **Contract:** [`../../../neurons/E5/nurturing--nps--send.md`](../../../neurons/E5/nurturing--nps--send.md). **Triplă autoritate:** v2 `nurturing:nps:send`; runtime `feedback:nps:send` — vezi neuron. |
| Destinație (graf) | `feedback-writeback-crm` | **Contract:** [`../../../neurons/E5/feedback--writeback--crm.md`](../../../neurons/E5/feedback--writeback--crm.md). Context: [`../../../../adr/families/e5/feedback.md`](../../../../adr/families/e5/feedback.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **nurturing-nps-send** are dependență canonică de pipeline față de **feedback-writeback-crm**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `nurturing-nps-send` → `feedback-writeback-crm`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L307**; țintă `feedback:writeback:crm` la **L275** (fișier).
- **Runtime:** vezi neuronii; nu inferăm ordinea joburilor BullMQ din singurul export.

## Limite și reconcilieri

- —

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`nurturing-nps-send-feedback-writeback-crm\``.
