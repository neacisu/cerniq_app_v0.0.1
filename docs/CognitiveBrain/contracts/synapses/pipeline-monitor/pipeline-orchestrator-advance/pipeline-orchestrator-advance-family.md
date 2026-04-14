# Sinapsă `pipeline-orchestrator-advance-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-orchestrator-advance-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-orchestrator-advance/pipeline-orchestrator-advance-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-orchestrator-advance` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `pipeline-orchestrator-advance` | Traseu în graf; [`../../../neurons/E1/pipeline--orchestrator--advance.md`](../../../neurons/E1/pipeline--orchestrator--advance.md). **v2 / matrice:** `pipeline:orchestrator:advance`. **Runtime (ADR-0001):** **`pipeline:orchestrate`** (`QUEUES.PIPELINE_ORCHESTRATE`, `workers/shared/src/queue-registry.ts` ~L83); semantica «advance» = etape `post_enrichment` / `post_scoring` în procesorul comun — vezi contractul neuron. |
| Destinație (graf) | `e1-orchestrator` | Nod agregat **familie orchestrator** E1 în planificare; **nu** este o singură coadă executabilă; [`../../../adr/families/e1/orchestrator.md`](../../../adr/families/e1/orchestrator.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Muchia **`default`** atașează traseul **orchestrator advance** de agregatul **`e1-orchestrator`** în graful de planificare. Nu presupunem din export cum se diferențiază «advance» față de «start» la nivel de cozi — reconcilierea este «un singur `pipeline:orchestrate` în cod» vs două noduri în graf, documentată în contractele neuron `pipeline--orchestrator--advance.md` / `pipeline--orchestrator--start.md`.

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
- **Semantic (ADR-0002):** `e1:pipeline:orchestrate` (catalog — vezi contract neuron).
- **Planificare:** v2 §7 — `pipeline-orchestrator-advance` → `e1-orchestrator`.

## Limite și reconcilieri

- **Graf:** două trasee `start` / `advance`; **cod:** aceeași coadă — vezi [`../../../neurons/E1/pipeline--orchestrator--advance.md`](../../../neurons/E1/pipeline--orchestrator--advance.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-orchestrator-advance-family\``.
