# Sinapsă `quota-business-hours-check-outreach-phone-allocator`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `quota-business-hours-check-outreach-phone-allocator` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/quota-business-hours-check/quota-business-hours-check-outreach-phone-allocator.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `quota-business-hours-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `quota-business-hours-check` | **Contract:** [`../../../neurons/E2/quota--business-hours--check.md`](../../../neurons/E2/quota--business-hours--check.md). **Triplă autoritate:** v2 **`quota:business-hours:check`**; runtime **`e2:quota:business-hours`**. |
| Destinație (graf) | `outreach-phone-allocator` | **Contract:** [`../../../neurons/E2/outreach--phone--allocator.md`](../../../neurons/E2/outreach--phone--allocator.md). **Triplă autoritate:** v2 **`outreach:phone:allocator`**; [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) rând **92**; `nodeKey` **`e2:outreach:phone-allocator`**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **quota-business-hours-check** depinde canonic de **outreach-phone-allocator** (alocare linie telefon în fluxul outreach). v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `quota-business-hours-check` → `outreach-phone-allocator`.
- **Semantic:** ambele **E2**.
- **Runtime:** vezi contractele neuron.

## Limite și reconcilieri

- Fără deducere din graf a ordinii relative față de alte muchii quota→outreach din același traseu.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`quota-business-hours-check-outreach-phone-allocator\``.
