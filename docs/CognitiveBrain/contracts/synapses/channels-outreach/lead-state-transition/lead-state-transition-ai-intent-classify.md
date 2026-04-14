# Sinapsă `lead-state-transition-ai-intent-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `lead-state-transition-ai-intent-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/lead-state-transition/lead-state-transition-ai-intent-classify.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `lead-state-transition` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `lead-state-transition` | **Contract:** [`../../../neurons/E2/lead--state--transition.md`](../../../neurons/E2/lead--state--transition.md). **Runtime (ADR-0001):** `QUEUES.LEAD_STATE_TRANSITION` → `lead:state:transition`. |
| Destinație (graf) | `ai-intent-classify` | **Contract:** [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md). **Reconciliere slug graf ↔ cozi:** vezi contractul neuron (decalaj `ai:intent:classify` vs `intent:classify` E3 etc.). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **tranziția de stare a lead-ului** și **clasificarea intenției** în modelul de graf. Exportul nu precizează dacă dependența este strict secvențială sau condiționată; interpretarea operațională vine din cod și contracte neuron.

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

- **Runtime:** sursa este deterministă (FSM); ținta are trasee LLM / cozi multiple — vezi tripla autoritate în contractul `ai:intent:classify`.
- **Semantic:** `e2:lead:state-transition` și `e2:ai:intent-classify` (și intrări E3 în registry).
- **Planificare:** `dependency`.

## Limite și reconcilieri

- FSM worker-ul documentat nu trebuie presupus a enfileiza automat intent classify numai din existența muchiei în graf.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`lead-state-transition-ai-intent-classify\``.
