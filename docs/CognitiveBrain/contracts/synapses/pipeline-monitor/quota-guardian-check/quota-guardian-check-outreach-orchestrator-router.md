# Sinapsă `quota-guardian-check-outreach-orchestrator-router`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `quota-guardian-check-outreach-orchestrator-router` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/quota-guardian-check/quota-guardian-check-outreach-orchestrator-router.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `quota-guardian-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `quota-guardian-check` | **Contract:** [`../../../neurons/E2/quota--guardian--check.md`](../../../neurons/E2/quota--guardian--check.md). **Triplă autoritate:** v2 **`quota:guardian:check`**; runtime **`e2:quota:guardian-check`**. |
| Destinație (graf) | `outreach-orchestrator-router` | **Contract:** [`../../../neurons/E2/outreach--orchestrator--router.md`](../../../neurons/E2/outreach--orchestrator--router.md). **Triplă autoritate:** v2 **`outreach:orchestrator:router`**; [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) rând **91**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **quota-guardian-check** depinde canonic de **outreach-orchestrator-router**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `quota-guardian-check` → `outreach-orchestrator-router`.
- **Semantic:** ambele **E2**.
- **Runtime:** vezi contractele neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`quota-guardian-check-outreach-orchestrator-router\``.
