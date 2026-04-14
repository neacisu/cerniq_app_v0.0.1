# Sinapsă `quota-guardian-increment-outreach-wa-reschedule`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `quota-guardian-increment-outreach-wa-reschedule` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/quota-guardian-increment/quota-guardian-increment-outreach-wa-reschedule.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `quota-guardian-increment` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `quota-guardian-increment` | **Contract:** [`../../../neurons/E2/quota--guardian--increment.md`](../../../neurons/E2/quota--guardian--increment.md). **Triplă autoritate:** v2 **`quota:guardian:increment`**; runtime **`e2:quota:guardian-increment`**. |
| Destinație (graf) | `outreach-wa-reschedule` | **Contract:** [`../../../neurons/E2/outreach--wa--reschedule.md`](../../../neurons/E2/outreach--wa--reschedule.md). [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) rând **94** (`queue_in_registry`: **no**). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **quota-guardian-increment** depinde canonic de **outreach-wa-reschedule**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `quota-guardian-increment` → `outreach-wa-reschedule`.
- **Semantic:** ambele **E2**.
- **Runtime:** vezi neuronul țintă pentru gap registry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`quota-guardian-increment-outreach-wa-reschedule\``.
