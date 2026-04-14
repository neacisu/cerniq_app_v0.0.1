# Sinapsă `ai-context-build-negotiation-expire-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-context-build-negotiation-expire-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-context-build/ai-context-build-negotiation-expire-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-context-build` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-context-build` | **Registry (ADR-0001):** `E3_AI_CONTEXT_BUILD` → `ai:context:build` (`workers/shared/src/queue-registry.ts`). **Contract:** [`../../../neurons/E3/ai--context--build.md`](../../../neurons/E3/ai--context--build.md). **Planificare:** slug graf `ai-context-build` ↔ coadă executabilă cu `:` — mapare explicită obligatorie. |
| Destinație (graf) | `negotiation-expire-check` | **Registry:** `E3_NEGOTIATION_EXPIRE_CHECK` → `negotiation:expire:check`. **Contract:** [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md). **Matrix:** rând `negotiation:expire:check`, E3, [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). **Catalog (ADR-0002):** `negotiation:expire:check` / `e3:negotiation:expire-check` (vezi `cognitive-node-catalog.ts`, citit la audit). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia de tip **dependency** declară în graful exportat o ordonare canonică între traseul `ai-context-build` și `negotiation-expire-check`. Descrierea v2 (**„sinapsă canonică de pipeline”**) nu precizează cum se propagă starea sau mesajele între asamblarea contextului AI și verificarea expirării negocierii. Comportamentul concret al celor doi neuroni (inclusiv enfileuirea către alte cozi) este în contractele neuron, nu în registrul sinapsei.

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

- **Runtime (ADR-0001):** ambele capete au intrări în `queue-registry.ts` la auditul citit. Fluxul efectiv între joburi se verifică în workeri; muchia rămâne **declarativă** în plan.
- **Semantic (ADR-0002):** `nodeKey`/swimlane — din `cognitive-node-catalog.ts` și contractele neuron.
- **Planificare:** dependență declarată în graf între construirea contextului AI și verificarea expirării negocierii.

## Limite și reconcilieri

- Etichete slug în graf vs cozi cu `:` — mapare prin registry + Matrix + contracte; **fără** presupuneri despre payload pe muchie.
- Dacă sursa efectivă în lanțul rulat enfilează mai întâi către alt neuron (ex. `ai:agent:orchestrate`, conform contractului C13), muchia din graf rămâne trasabilă ca **topologie planificată**, nu ca dovadă unică de rută BullMQ.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-context-build-negotiation-expire-check\``.
