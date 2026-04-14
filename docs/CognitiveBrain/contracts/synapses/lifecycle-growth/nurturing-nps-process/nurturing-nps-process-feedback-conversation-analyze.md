# Sinapsă `nurturing-nps-process-feedback-conversation-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `nurturing-nps-process-feedback-conversation-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/nurturing-nps-process/nurturing-nps-process-feedback-conversation-analyze.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `nurturing-nps-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `nurturing-nps-process` | **Contract:** [`../../../neurons/E5/nurturing--nps--process.md`](../../../neurons/E5/nurturing--nps--process.md). **Semantic / runtime:** vezi neuron. |
| Destinație (graf) | `feedback-conversation-analyze` | **Contract:** [`../../../neurons/E5/feedback--conversation--analyze.md`](../../../neurons/E5/feedback--conversation--analyze.md). **Semantic:** `e5:sentiment:analyze` — vezi `NEURON_MATRIX.csv`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **nurturing-nps-process** are dependență sintactică față de **feedback-conversation-analyze**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `nurturing-nps-process` → `feedback-conversation-analyze`.
- **Runtime (ADR-0001):** vezi neuroni sursă și țintă.
- **Semantic (ADR-0002):** E5 — vezi catalog.

## Limite și reconcilieri

- —

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`nurturing-nps-process-feedback-conversation-analyze\``.
