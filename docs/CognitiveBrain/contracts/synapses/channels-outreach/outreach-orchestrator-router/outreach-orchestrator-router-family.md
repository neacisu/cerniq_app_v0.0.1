# Sinapsă `outreach-orchestrator-router-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-orchestrator-router-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-orchestrator-router/outreach-orchestrator-router-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-orchestrator-router` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `outreach-orchestrator-router` | **Contract:** [`../../../neurons/E2/outreach--orchestrator--router.md`](../../../neurons/E2/outreach--orchestrator--router.md). **Runtime (ADR-0001):** `QUEUES.OUTREACH_ORCHESTRATOR_ROUTER` → `outreach:orchestrator:router`. |
| Destinație (graf) | `e2-orchestrator` | **Nod agregat:** familia **orchestrator** E2. **ADR:** [`../../../../adr/families/e2/orchestrator.md`](../../../../adr/families/e2/orchestrator.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

**Router-ul orchestratorului outreach** este plasat sub **subgraful `e2-orchestrator`** în export (v2: **„specializează familia”**). În runtime, worker-ul routează către cozi dinamice (`targetQueue` din payload) — vezi contract neuron; muchia de familie nu enumeră aceste cozi.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime:** sursa este coadă executabilă; ținta este agregat planificare.
- **Semantic:** `ExecutiveNeuron` pentru router — v2 și catalog.
- **Planificare:** muchie `default`.

## Limite și reconcilieri

- **Forward dinamic:** destinațiile reale ale job-urilor nu sunt fixate de slug-ul `e2-orchestrator` ci de `targetQueue` la runtime.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-orchestrator-router-family\``.
