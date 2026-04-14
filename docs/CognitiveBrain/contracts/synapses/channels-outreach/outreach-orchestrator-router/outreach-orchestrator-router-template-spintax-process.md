# Sinapsă `outreach-orchestrator-router-template-spintax-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-orchestrator-router-template-spintax-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-orchestrator-router/outreach-orchestrator-router-template-spintax-process.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-orchestrator-router` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `outreach-orchestrator-router` | **Contract:** [`../../../neurons/E2/outreach--orchestrator--router.md`](../../../neurons/E2/outreach--orchestrator--router.md). **Runtime (ADR-0001):** `QUEUES.OUTREACH_ORCHESTRATOR_ROUTER` → `outreach:orchestrator:router`. |
| Destinație (graf) | `template-spintax-process` | **Contract:** [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime:** `QUEUES.TEMPLATE_SPINTAX_PROCESS` → `template:spintax:process`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **router-ul orchestratorului** și **procesarea spintax**. Worker-ul router face **forward** generic; faptul că ținta din graf este `template-spintax-process` trebuie coroborat cu producători de job care setează `targetQueue` la această coadă — vezi contract neuron router.

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

- **Runtime:** cozi `outreach:orchestrator:router` și `template:spintax:process` în registry.
- **Semantic:** `e2:outreach:orchestrator-router` și `e2:template:spintax`.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- Muchia **nu** garantează că fiecare job pe router ajunge la spintax; doar că graful de planificare declară dependența structurală.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-orchestrator-router-template-spintax-process\``.
