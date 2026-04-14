# Sinapsă `ai-agent-response-generate-negotiation-expire-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-response-generate-negotiation-expire-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-response-generate/ai-agent-response-generate-negotiation-expire-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-response-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-agent-response-generate` | **Planificare:** traseu `ai-agent-response-generate`. **Matrix:** `ai:agent:response-generate` → [`../../../neurons/E3/ai--agent--response-generate.md`](../../../neurons/E3/ai--agent--response-generate.md). **Runtime:** worker pe **`ai:e3:response:generate`** (`QUEUES.E3_AI_RESPONSE_GENERATE`); v2/Matrix folosesc alt literal pentru același neuron — vezi contractul sursă. |
| Țintă | `negotiation-expire-check` | **Matrix:** `negotiation:expire:check` (E3, `negotiation`) → [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md). **Registry:** `E3_NEGOTIATION_EXPIRE_CHECK` → `negotiation:expire:check`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia de tip **dependency** declară în graful exportat că traseul `ai-agent-response-generate` este legat canonic în pipeline de `negotiation-expire-check`. Descrierea confirmată în v2 este generică (**„sinapsă canonică de pipeline”**): exportul nu precizează cum se propagă contextul între generarea/post-procesarea răspunsului agent (C15) și verificarea TTL/expirării negocierilor (D23). În cod, neuronul țintă este documentat ca job D23 cu logică SQL și enfileuire către `negotiation:abandon:process` — aceste detalii apar în contractul neuron țintă, **nu** în registrul sinapsei v2.

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

- **Runtime (ADR-0001):** ținta este executabilă în sensul documentat în contractul neuron (registry + `main.ts`). Sursa rămâne supusă **reconcilierii** v2/Matrix ↔ `ai:e3:response:generate` — vezi [`ai--agent--response-generate.md`](../../../neurons/E3/ai--agent--response-generate.md).
- **Semantic (ADR-0002):** `nodeKey`/swimlane pentru ambele capete conform catalogului și contractelor; pentru sursă există triplă divergență nume documentată în contractul neuron.
- **Planificare:** dependență declarată în graf; nu implică automat aceeași unitate de deploy sau același mesaj de coadă între capete.

## Limite și reconcilieri

- Slug-uri în graf (`kebab-case`) vs cozi cu `:` — mapare prin Matrix + contracte, fără presupuneri despre payload.
- Dacă ordinea efectivă în producție diferă de topologia statică exportată, muchia rămâne trasabilă ca **planificare**, nu ca dovadă de scheduling runtime.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-agent-response-generate-negotiation-expire-check\``.
