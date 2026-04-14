# Sinapsă `ai-agent-generate-negotiation-expire-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-generate-negotiation-expire-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-generate/ai-agent-generate-negotiation-expire-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-agent-generate` | **Planificare:** traseu `ai-agent-generate`. **Matrix:** `ai:agent:generate` → [`../../../neurons/E3/ai--agent--generate.md`](../../../neurons/E3/ai--agent--generate.md). Contractul neuron: **gap registry / handler** pentru coada literală; flux efectiv E3 poate fi pe alte cozi — reconciliere obligatorie înainte de a interpreta „sursa” ca job BullMQ cu acest nume. |
| Destinație (graf) | `negotiation-expire-check` | **Matrix:** `negotiation:expire:check` (E3, `negotiation`) → [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md). **Registry:** `E3_NEGOTIATION_EXPIRE_CHECK` → `negotiation:expire:check` (`queue-registry.ts`, vezi contract neuron). **Catalog:** `negotiation:expire:check` / `e3:negotiation:expire-check` (vezi contract neuron). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia de tip **dependency** declară în graful exportat că traseul `ai-agent-generate` precede sau este legat canonic de `negotiation-expire-check` în pipeline. Descrierea confirmată în v2 este generică (**„sinapsă canonică de pipeline”**): exportul nu precizează cum se propagă contextul între generarea agentului și verificarea TTL/expirării negocierilor. În cod, neuronul destinație este documentat ca job D23 cu logică SQL și enfileuire către `negotiation:abandon:process` — aceste detalii apar în contractul neuron destinație, **nu** în registrul sinapsei v2.

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

- **Runtime (ADR-0001):** ținta este executabilă în sensul documentat în contractul neuron (registry + `main.ts`). Sursa rămâne **deschisă la reconciliere** față de același registry — vezi [`ai--agent--generate.md`](../../../neurons/E3/ai--agent--generate.md).
- **Semantic (ADR-0002):** `nodeKey`/swimlane pentru `negotiation:expire:check` conform catalogului; pentru sursă, catalogul poate **lipsi** pentru literalul `ai:agent:generate` (vezi contract neuron sursă).
- **Planificare:** dependență declarată în graf; nu implică automat aceeași unitate de deploy sau același mesaj de coadă.

## Limite și reconcilieri

- Etichete slug în graf vs cozi cu `:` — mapare prin Matrix + contracte, fără presupuneri despre payload.
- Dacă sursa efectivă în producție este `ai:agent:orchestrate` / `ai:e3:response:generate`, muchia din graf rămâne trasabilă ca **planificare**, nu ca dovadă de nume de coadă sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-agent-generate-negotiation-expire-check\``.
