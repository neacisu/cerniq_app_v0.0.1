# Sinapsă `ai-agent-generate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-generate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-generate/ai-agent-generate-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `ai-agent-generate` | Nod de familie/traseu în graf. În **Matrix** apare coada literală `ai:agent:generate` (E3, `ai-core`) cu contract [`../../../neurons/E3/ai--agent--generate.md`](../../../neurons/E3/ai--agent--generate.md). Acel contract documentează **gap față de runtime**: la auditul din 2026-04-11, coada **nu** era în `queue-registry.ts` și fluxul efectiv E3 este descris ca `ai:context:build` → `ai:agent:orchestrate` → `ai:e3:response:generate`. Graful rămâne sursa pentru **topologie planificată**; execuția trebuie reconciliată separat. |
| Destinație (graf) | `e3-ai-core` | Nod de **familie / nucleu** E3 în planificare, nu o singură coadă BullMQ; acoperă swimlane-ul semantic `ai-core` pentru neuroni E3. Nu există un fișier `contracts/neurons/...` unic pentru această etichetă agregată de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În registrul v2 §7, muchia **default** leagă traseul `ai-agent-generate` de nucleul de familie `e3-ai-core`, cu descrierea confirmată **„specializează familia”**: planificarea spune că acest traseu se ancorează în familia semantică E3 AI core, fără a detalia handler, payload sau ordinea mesajelor în cozi. Nu se deduce din export dacă specializarea implică o singură coadă sau un lanț; pentru alinierea la cod, contractul neuron sursă și registry-ul (ADR-0001) sunt autorități care pot contrazice eticheta izolată `ai:agent:generate`.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match (`Current evidence level` în sursă).

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001, `workers/shared/src/queue-registry.ts`):** pentru capătul sursă, **nu** se poate afirma fără reconciliere că există o intrare de registry 1:1 cu `ai:agent:generate` — vezi dovada din contractul neuron. Pentru neuroni concreți din aceeași familie semantică, folosiți [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) (filtru etapă E3, swimlane `ai-core`) și verificați fiecare rând în registry.
- **Semantic (ADR-0002, `packages/shared/src/cognitive-node-catalog.ts`):** `nodeKey` / etapă / swimlane pentru capetele operaționale se iau din catalog — eticheta de graf `e3-ai-core` **nu** se echivalează automat cu un singur `nodeKey`.
- **Planificare (graf exportat):** muchie **default** de specializare a familiei; orice comportament dincolo de câmpurile exportului este **nedovedit** de v2 §7 pentru această muchie.

## Limite și reconcilieri

- **Slug graf (`ai-agent-generate`) vs literal coadă (`ai:agent:generate`):** convenții diferite; pentru execuție prevală registry-ul acolo unde există intrare verificată; altfel rămâne gap documentat în contractul neuron.
- Nu inventa schemă payload, retry, safety sau telemetrie per-muchie acolo unde v2 marchează explicit absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — secțiunea **7. Complete synapse contract register**, bloc `SYNAPSE \`ai-agent-generate-family\``.
