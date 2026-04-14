# Sinapsă `ai-context-build-negotiation-reminder-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-context-build-negotiation-reminder-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-context-build/ai-context-build-negotiation-reminder-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-context-build` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-context-build` | **Registry (ADR-0001):** `E3_AI_CONTEXT_BUILD` → `ai:context:build` (`workers/shared/src/queue-registry.ts`). **Contract:** [`../../../neurons/E3/ai--context--build.md`](../../../neurons/E3/ai--context--build.md). **Planificare:** slug graf `ai-context-build` ↔ coadă executabilă cu `:` — nu se echivalează automat fără mapare explicită. |
| Destinație (graf) | `negotiation-reminder-send` | **Registry:** `E3_NEGOTIATION_REMINDER_SEND` → `negotiation:reminder:send`. **Contract:** [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md). **Matrix:** rând `negotiation:reminder:send`, E3, [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). **Catalog (ADR-0002):** `negotiation:reminder:send` / `e3:negotiation:reminder-send` (vezi `cognitive-node-catalog.ts`, citit la audit). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia de tip **dependency** din export plasează traseul `ai-context-build` înaintea sau în legătură canonică cu `negotiation-reminder-send` în pipeline-ul planificat. Descrierea din v2 §7 pentru această sinapsă este generică (**„sinapsă canonică de pipeline”**): exportul **nu** spune cum se propagă datele între asamblarea contextului AI (C13 în repo, fără LLM în acel pas) și trimiterea memento-urilor de negociere. Detaliile operaționale ale celor doi neuroni stau în contractele neuron respective, nu în registrul sinapsei.

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

- **Runtime (ADR-0001):** ambele capete au intrări în `queue-registry.ts` la momentul auditului (sursă: `ai:context:build`; țintă: `negotiation:reminder:send`). Orice rută efectivă între joburi rămâne de verificat în codul workerilor — muchia din graf este **planificare**, nu dovadă de enfileuire directă.
- **Semantic (ADR-0002):** `nodeKey`/swimlane — din `cognitive-node-catalog.ts` și contractele neuron de mai sus.
- **Planificare:** dependență declarată în graf între construirea contextului AI și trimiterea memento-ului de negociere.

## Limite și reconcilieri

- Etichete slug în graf (`ai-context-build`, `negotiation-reminder-send`) vs cozi cu `:` — mapare prin registry + `NEURON_MATRIX.csv` + contracte neuron; **fără** presupuneri despre payload pe muchie.
- Dacă ordinea efectivă în producție diferă de topologia exportată, prevală evidența din cod; graful rămâne sursa pentru **dependențe declarate în plan**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-context-build-negotiation-reminder-send\``.
