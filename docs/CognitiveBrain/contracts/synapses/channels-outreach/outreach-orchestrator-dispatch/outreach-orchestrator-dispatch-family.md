# Sinapsă `outreach-orchestrator-dispatch-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-orchestrator-dispatch-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-orchestrator-dispatch/outreach-orchestrator-dispatch-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-orchestrator-dispatch` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `outreach-orchestrator-dispatch` | **Contract:** [`../../../neurons/E2/outreach--orchestrator--dispatch.md`](../../../neurons/E2/outreach--orchestrator--dispatch.md). **Runtime (ADR-0001):** `QUEUES.OUTREACH_ORCHESTRATOR_DISPATCH` → `outreach:orchestrator:dispatch`. |
| Destinație (graf) | `e2-orchestrator` | **Nod agregat:** familia **orchestrator** E2. **ADR:** [`../../../../adr/families/e2/orchestrator.md`](../../../../adr/families/e2/orchestrator.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În planificare, **dispatch-ul orchestratorului outreach** este clasificat sub **subgraful `e2-orchestrator`** (v2: **„specializează familia”**). Worker-ul real enfilează spre alte cozi (ex. alocator telefon) conform contractului neuron, nu către o coadă „e2-orchestrator”.

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

- **Runtime:** sursa este coadă executabilă; ținta este agregat de planificare.
- **Semantic:** `ExecutiveNeuron` / criticalitate CRITICAL în v2 pentru dispatch — vezi contract neuron.
- **Planificare:** muchie `default`.

## Limite și reconcilieri

- **v2 vs repo:** contractul neuron documentează absența LLM în handler; nu confunda descrierea v2 „Model routing” cu execuția fără dovada din cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-orchestrator-dispatch-family\``.
