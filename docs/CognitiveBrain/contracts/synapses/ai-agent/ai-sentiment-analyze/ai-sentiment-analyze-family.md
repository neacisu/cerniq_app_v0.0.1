# Sinapsă `ai-sentiment-analyze-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-sentiment-analyze-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-sentiment-analyze/ai-sentiment-analyze-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-sentiment-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `ai-sentiment-analyze` | Nod traseu în graf; runtime: coadă executabilă **`ai:sentiment:analyze`** (`QUEUES.AI_SENTIMENT_ANALYZE` în `workers/shared/src/queue-registry.ts`, ADR-0001) — [`../../../neurons/E2/ai--sentiment--analyze.md`](../../../neurons/E2/ai--sentiment--analyze.md). |
| Destinație (graf) | `e2-ai-analysis` | Agregat de **familie / nucleu** E2 în planificare (etichetă de graf), nu o singură coadă BullMQ; swimlane semantic `ai-analysis` pentru neuroni E2 din același palier. Nu există un singur `contracts/neurons/...` pentru această etichetă — mapare prin catalog și [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

Muchia **`default`** atașează traseul `ai-sentiment-analyze` de agregatul `e2-ai-analysis` în topologia planificată: traseul este clasificat sub familia semantică de analiză AI E2. Nu presupune din registrul §7 un handler unic pentru `e2-ai-analysis` sau ordinea de execuție între toate cozile din acea familie; capătul operațional verificabil al sursei rămâne `ai:sentiment:analyze`.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001, `workers/shared/src/queue-registry.ts`):** sursa — `AI_SENTIMENT_ANALYZE` → `ai:sentiment:analyze`. Agregatul planificat `e2-ai-analysis` **nu** este nume de coadă în registry.
- **Semantic (ADR-0002, `packages/shared/src/cognitive-node-catalog.ts`):** `e2:ai:sentiment-analyze` / `ai:sentiment:analyze` — EmotionNeuron, swimlane `ai-analysis`, etapa 2 (în jurul L1313–1320). Eticheta `e2-ai-analysis` din graf **nu** se echivalează automat cu un singur `nodeKey`.
- **Planificare:** muchie `default` de specializare de familie; fără payload sau retry din export.

## Limite și reconcilieri

- Slug graf (`ai-sentiment-analyze`) vs coadă (`ai:sentiment:analyze`): reconciliere obligatorie la trasabilitate operațională.
- Nu inventa schemă payload, retry, safety sau telemetrie per-muchie acolo unde v2 marchează explicit absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — secțiunea **7. Complete synapse contract register**, bloc `SYNAPSE \`ai-sentiment-analyze-family\``.
