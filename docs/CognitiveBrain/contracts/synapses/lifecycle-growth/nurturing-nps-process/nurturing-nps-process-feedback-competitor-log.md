# Sinapsă `nurturing-nps-process-feedback-competitor-log`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `nurturing-nps-process-feedback-competitor-log` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/nurturing-nps-process/nurturing-nps-process-feedback-competitor-log.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `nurturing-nps-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `nurturing-nps-process` | **Contract:** [`../../../neurons/E5/nurturing--nps--process.md`](../../../neurons/E5/nurturing--nps--process.md). **Semantic / runtime:** vezi neuron; `e5:feedback:nps-process` în `NEURON_MATRIX.csv`. |
| Destinație (graf) | `feedback-competitor-log` | **Contract:** [`../../../neurons/E5/feedback--competitor--log.md`](../../../neurons/E5/feedback--competitor--log.md). **v2:** `feedback:competitor:log` — vezi neuron (gap implementare raportat). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **nurturing-nps-process** are dependență sintactică față de **feedback-competitor-log**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `nurturing-nps-process` → `feedback-competitor-log`.
- **Runtime (ADR-0001):** ambele capete — vezi contractele neuronilor; **necesită reconciliere** graf ↔ cozi unde neuronul raportează gap.
- **Semantic (ADR-0002):** E5 lifecycle → E5 feedback — vezi ADR [`lifecycle`](../../../../adr/families/e5/lifecycle.md) și [`feedback`](../../../../adr/families/e5/feedback.md).

## Limite și reconcilieri

- **Reconciliere:** implementare dedicată pentru `feedback:competitor:log` nedovedită în cod la audit neuron — vezi contract.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`nurturing-nps-process-feedback-competitor-log\``.
