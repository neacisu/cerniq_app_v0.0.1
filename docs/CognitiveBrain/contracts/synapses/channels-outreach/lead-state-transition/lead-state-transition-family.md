# Sinapsă `lead-state-transition-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `lead-state-transition-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/lead-state-transition/lead-state-transition-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `lead-state-transition` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `lead-state-transition` | **Contract:** [`../../../neurons/E2/lead--state--transition.md`](../../../neurons/E2/lead--state--transition.md). **Runtime (ADR-0001):** `QUEUES.LEAD_STATE_TRANSITION` → `lead:state:transition` — vezi contract neuron. |
| Destinație (graf) | `e2-lead-fsm` | **Nod agregat (subgraf planificat):** familia **lead-fsm**. **ADR:** [`../../../../adr/families/e2/lead-fsm.md`](../../../../adr/families/e2/lead-fsm.md). **Semantic:** neuroni familie în catalog — reconciliere pe muchii atomice. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia leagă **nodul de tranziție FSM** de **subgraful familiei `e2-lead-fsm`** în planificare (v2: **„specializează familia”**). Nu definește singură validarea tranzițiilor sau persistența — acestea sunt în contractul neuronului sursă și în cod.

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

- **Runtime:** sursa este coadă executabilă; ținta `e2-lead-fsm` este etichetă de planificare, nu intrare în `queue-registry.ts`.
- **Semantic:** `ProceduralNeuron` / pipeline-control pentru tranziție — v2 §6 neuron `lead:state:transition`.
- **Planificare:** muchie `default` spre subgraf.

## Limite și reconcilieri

- **`e2-lead-fsm`** nu trebuie confundat cu numele unei cozi; pentru telemetrie per-neuron, folosiți `nodeKey` din catalog.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`lead-state-transition-family\``.
