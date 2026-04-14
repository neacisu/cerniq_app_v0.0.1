# Sinapsă `pipeline-orchestrator-start-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-orchestrator-start-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-orchestrator-start/pipeline-orchestrator-start-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-orchestrator-start` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `pipeline-orchestrator-start` | Traseu în graf; [`../../../neurons/E1/pipeline--orchestrator--start.md`](../../../neurons/E1/pipeline--orchestrator--start.md). **v2 / matrice:** `pipeline:orchestrator:start`. **Runtime (ADR-0001):** **`pipeline:orchestrate`** (`QUEUES.PIPELINE_ORCHESTRATE`, `workers/shared/src/queue-registry.ts` ~L83); semantica «start» legată de `post_validation` în procesor — vezi contractul neuron. |
| Destinație (graf) | `e1-orchestrator` | Nod agregat **familie orchestrator** E1; **nu** este o singură coadă executabilă; [`../../../adr/families/e1/orchestrator.md`](../../../adr/families/e1/orchestrator.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul **orchestrator start** sub **`e1-orchestrator`**, analog cu `pipeline-orchestrator-advance-family`, dar pentru ramura «start» din planificare. Reconcilierea cu **aceeași** coadă BullMQ ca «advance» rămâne obligatorie în lectură (vezi contractele neuron).

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `pipeline:orchestrate`; `e1-orchestrator` nu este nume `QUEUES`.
- **Semantic (ADR-0002):** `e1:pipeline:orchestrate`.
- **Planificare:** v2 §7 — `pipeline-orchestrator-start` → `e1-orchestrator`.

## Limite și reconcilieri

- **start** vs **advance** în graf vs un singur procesor — [`../../../neurons/E1/pipeline--orchestrator--start.md`](../../../neurons/E1/pipeline--orchestrator--start.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-orchestrator-start-family\``.
