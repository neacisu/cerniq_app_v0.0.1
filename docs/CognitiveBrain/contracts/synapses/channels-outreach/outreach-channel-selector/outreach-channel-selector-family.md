# Sinapsă `outreach-channel-selector-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-channel-selector-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-channel-selector/outreach-channel-selector-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-channel-selector` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `outreach-channel-selector` | **Contract:** [`../../../neurons/E2/outreach--channel--selector.md`](../../../neurons/E2/outreach--channel--selector.md). **Runtime (ADR-0001):** `QUEUES.OUTREACH_CHANNEL_SELECTOR` → `outreach:channel:selector`. |
| Destinație (graf) | `e2-orchestrator` | **Nod agregat (subgraf planificat):** familia **orchestrator** E2. **ADR:** [`../../../../adr/families/e2/orchestrator.md`](../../../../adr/families/e2/orchestrator.md). **Semantic:** neuroni orchestrator în catalog (`e2:outreach:channel-selector`, dispatch, router, etc.). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia plasează **selectorul de canal** în **subgraful `e2-orchestrator`** din planificare (v2: **„specializează familia”**). Nu înlocuiește descrierea regulilor de selecție sau lanțul de cozi — acestea sunt în contractul neuronului sursă.

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

- **Runtime:** sursa este coadă executabilă; `e2-orchestrator` este etichetă de planificare, nu coadă unică în registry.
- **Semantic:** `RulesNeuron` / pipeline-control pentru selector — v2 neuron `outreach:channel:selector`.
- **Planificare:** muchie `default` spre subgraf orchestrator.

## Limite și reconcilieri

- Alte sinapse v2 țintesc tot `e2-orchestrator` din noduri distincte; familia este partajată între multiple capete operaționale.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-channel-selector-family\``.
