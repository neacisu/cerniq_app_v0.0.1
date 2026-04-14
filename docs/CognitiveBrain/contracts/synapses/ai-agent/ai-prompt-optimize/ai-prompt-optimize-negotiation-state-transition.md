# Sinapsă `ai-prompt-optimize-negotiation-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-prompt-optimize-negotiation-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-prompt-optimize/ai-prompt-optimize-negotiation-state-transition.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-prompt-optimize` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-prompt-optimize` | **Planificare:** traseu `ai-prompt-optimize`. **Matrix:** `ai:prompt:optimize` → [`../../../neurons/E3/ai--prompt--optimize.md`](../../../neurons/E3/ai--prompt--optimize.md). **Gap registry** pentru coada nominală — vezi contractul neuron; nu afirmați execuție canonică fără dovada din `queue-registry.ts`. |
| Destinație (graf) | `negotiation-state-transition` | **Registry:** `E3_NEGOTIATION_STATE_TRANSITION` → `negotiation:state:transition`. **Contract:** [`../../../neurons/E3/negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md). **Matrix:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). **Catalog:** `negotiation:state:transition` / `e3:negotiation:state-transition`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** declară în graf o ordonare canonică între `ai-prompt-optimize` și `negotiation-state-transition`. v2 oferă doar eticheta **„sinapsă canonică de pipeline”**; nu descrie mecanismul FSM sau transferul de stare. Comportamentul tranzițiilor este în contractul neuron destinație și în workerii mapați acolo, nu în sinapsa din §7.

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

- **Runtime (ADR-0001):** ținta executabilă în registry; sursa — nealiniată la registry în auditul documentat în contractul neuron.
- **Semantic (ADR-0002):** ținta în catalog; sursă cu gap catalog.
- **Planificare:** dependență declarată între optimizarea promptului și tranziția de stare în negociere.

## Limite și reconcilieri

- Fără presupuneri despre enfileuire directă BullMQ între sursă și destinație; muchia exprimă **topologie planificată**.
- Reconcilierea sursei cu un worker real este pas separat de validarea acestui contract sinaptic.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-prompt-optimize-negotiation-state-transition\``.
