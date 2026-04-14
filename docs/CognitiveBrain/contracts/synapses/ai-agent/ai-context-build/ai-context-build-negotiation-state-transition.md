# Sinapsă `ai-context-build-negotiation-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-context-build-negotiation-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-context-build/ai-context-build-negotiation-state-transition.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-context-build` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-context-build` | **Registry (ADR-0001):** `E3_AI_CONTEXT_BUILD` → `ai:context:build` (`workers/shared/src/queue-registry.ts`). **Contract:** [`../../../neurons/E3/ai--context--build.md`](../../../neurons/E3/ai--context--build.md). **Planificare:** slug graf `ai-context-build` ↔ coadă executabilă cu `:` — mapare explicită obligatorie. |
| Destinație (graf) | `negotiation-state-transition` | **Registry:** `E3_NEGOTIATION_STATE_TRANSITION` → `negotiation:state:transition`. **Contract:** [`../../../neurons/E3/negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md). **Matrix:** rând `negotiation:state:transition`, E3, [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). **Catalog (ADR-0002):** `negotiation:state:transition` / `e3:negotiation:state-transition` (vezi `cognitive-node-catalog.ts`, citit la audit). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia de tip **dependency** declară în graful exportat o legătură canonică între traseul `ai-context-build` și `negotiation-state-transition`. Descrierea v2 (**„sinapsă canonică de pipeline”**) nu detaliază mecanismul de tranziție FSM sau transferul de context. În repo, C13 construiește context determinist și enfilează în mod documentat către **`ai:agent:orchestrate`**, nu direct către `negotiation:state:transition` — deci muchia este **trasabilitate planificare ↔ neuroni**, nu neapărat enfileuire BullMQ directă între cele două cozi.

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

- **Runtime (ADR-0001):** sursă și țintă apar în registry la audit; fluxul job-to-job efectiv se verifică în workeri (vezi contractul sursă pentru downstream imediat).
- **Semantic (ADR-0002):** `nodeKey`/swimlane — din catalog și contractele neuron.
- **Planificare:** dependență declarată în graf între construirea contextului AI și tranziția de stare în negociere.

## Limite și reconcilieri

- Etichete slug vs cozi `:` — vezi `NEURON_MATRIX.csv` și registry; fără presupuneri despre payload.
- **Reconciliere graf ↔ cod:** dacă implementarea nu enfilează direct din `ai:context:build` către `negotiation:state:transition`, muchia rămâne valabilă ca **ordonare declarativă** în plan, nu ca apel sincron între cozi.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-context-build-negotiation-state-transition\``.
