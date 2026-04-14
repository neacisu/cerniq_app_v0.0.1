# Sinapsă `outreach-orchestrator-dispatch-template-spintax-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-orchestrator-dispatch-template-spintax-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-orchestrator-dispatch/outreach-orchestrator-dispatch-template-spintax-process.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-orchestrator-dispatch` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `outreach-orchestrator-dispatch` | **Contract:** [`../../../neurons/E2/outreach--orchestrator--dispatch.md`](../../../neurons/E2/outreach--orchestrator--dispatch.md). **Runtime (ADR-0001):** `QUEUES.OUTREACH_ORCHESTRATOR_DISPATCH` → `outreach:orchestrator:dispatch`. |
| Destinație (graf) | `template-spintax-process` | **Contract:** [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime:** `QUEUES.TEMPLATE_SPINTAX_PROCESS` → `template:spintax:process`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **dispatch-ul orchestratorului** și **procesarea spintax** în graful de planificare. Lanțul BullMQ concret (cine adaugă job-uri pe `template:spintax:process` după dispatch) **nu** este în câmpurile sinapsei; vezi contractele neuron și codul de orchestrare.

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

- **Runtime:** ambele cozi în registry — dovezi în contracte neuron.
- **Semantic:** `e2:outreach:orchestrator-dispatch` și `e2:template:spintax`.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- Dispatch worker-ul documentat enfilează în primă instanță `outreach:phone:allocator`; alinierea la muchia spre spintax necesită trasabilitate în cod sau muchii adiacente, nu doar în acest contract.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-orchestrator-dispatch-template-spintax-process\``.
