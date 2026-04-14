# Sinapsă `ai-tool-execute-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-tool-execute-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-tool-execute/ai-tool-execute-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-tool-execute` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `ai-tool-execute` | Nod de familie/traseu în graf. În **Matrix** apare coada literală `ai:tool:execute` (E3, `ai-core`) cu contract [`../../../neurons/E3/ai--tool--execute.md`](../../../neurons/E3/ai--tool--execute.md). Contractul neuron documentează **gap față de runtime**: la auditul din 2026-04-11, `ai:tool:execute` **nu** era în `queue-registry.ts`, în `cognitive-node-catalog.ts` sau în `processors` din `main.ts`; execuția tool-urilor este descrisă ca flux în **C14** (parsare `<tool_call>`), fără job BullMQ dedicat cu acest nume. Graful rămâne sursa pentru **topologie planificată**; execuția trebuie reconciliată separat. |
| Destinație (graf) | `e3-ai-core` | Nod agregat de **familie / nucleu** E3 în planificare, nu o singură coadă BullMQ; acoperă swimlane-ul semantic `ai-core`. Nu există un fișier `contracts/neurons/...` unic pentru această etichetă de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În registrul v2 §7, muchia **default** leagă traseul `ai-tool-execute` de `e3-ai-core`, cu descrierea confirmată **„specializează familia”**: planificarea ancorează traseul de execuție tool în familia semantică E3 AI core, fără a preciza handler, payload sau dacă execuția este o coadă distinctă sau logică înglobată în orchestrare (cum indică contractul neuron sursă față de cod).

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

- **Runtime (ADR-0001, `workers/shared/src/queue-registry.ts`):** pentru `ai:tool:execute`, contractul neuron raportează **lipsă** de intrare în registry la audit; nu se afirmă execuție pe această coadă fără reverificare în cod. Pentru alți neuroni din `ai-core`, vezi [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) (E3, swimlane `ai-core`).
- **Semantic (ADR-0002, `packages/shared/src/cognitive-node-catalog.ts`):** contractul neuron: **fără potrivire** pentru `ai:tool:execute` la audit; eticheta `e3-ai-core` nu se echivalează cu un singur `nodeKey`.
- **Planificare (graf exportat):** muchie **default** de specializare a familiei; comportament dincolo de export = **nedovedit** aici.

## Limite și reconcilieri

- **Slug graf (`ai-tool-execute`) vs coadă (`ai:tool:execute`):** convenții diferite; execuția efectivă poate fi pe alte artefacte (ex. orchestrare C14) — vezi [`ai--tool--execute.md`](../../../neurons/E3/ai--tool--execute.md).
- Nu inventa payload, retry, safety sau telemetrie per-muchie acolo unde v2 marchează absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — secțiunea **7. Complete synapse contract register**, bloc `SYNAPSE \`ai-tool-execute-family\``.
