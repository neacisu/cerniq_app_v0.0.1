# Sinapsă `nurturing-loyalty-check-feedback-nps-aggregate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `nurturing-loyalty-check-feedback-nps-aggregate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/nurturing-loyalty-check/nurturing-loyalty-check-feedback-nps-aggregate.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `nurturing-loyalty-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `nurturing-loyalty-check` | **Contract:** [`../../../neurons/E5/nurturing--loyalty--check.md`](../../../neurons/E5/nurturing--loyalty--check.md). **Semantic / runtime:** vezi neuron. |
| Destinație (graf) | `feedback-nps-aggregate` | **Contract:** [`../../../neurons/E5/feedback--nps--aggregate.md`](../../../neurons/E5/feedback--nps--aggregate.md). **Semantic:** `e5:feedback:report-generate` — vezi `NEURON_MATRIX.csv`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **nurturing-loyalty-check** are dependență sintactică față de **feedback-nps-aggregate**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `nurturing-loyalty-check` → `feedback-nps-aggregate`.
- **Runtime (ADR-0001):** vezi neuroni sursă și țintă.
- **Semantic (ADR-0002):** E5 — vezi catalog.

## Limite și reconcilieri

- —

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`nurturing-loyalty-check-feedback-nps-aggregate\``.
