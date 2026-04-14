# Sinapsă `ai-agent-orchestrate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-orchestrate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-orchestrate/ai-agent-orchestrate-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-orchestrate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `ai-agent-orchestrate` | Nod de familie/traseu în graf; aliniere runtime: coadă executabilă **`ai:agent:orchestrate`** (constanta `QUEUES.E3_AI_AGENT_ORCHESTRATE` în `workers/shared/src/queue-registry.ts`, ADR-0001), vezi contractul neuron. |
| Destinație (graf) | `e3-ai-core` | Nod de **familie / nucleu** E3 în planificare, nu o singură coadă BullMQ; acoperă swimlane-ul semantic `ai-core` pentru neuroni E3. Nu există un fișier `contracts/neurons/...` unic pentru această etichetă de graf — maparea către `nodeKey`-uri concrete se face prin catalog și matrice. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

Muchia de tip **`default`** leagă traseul `ai-agent-orchestrate` de agregatul de planificare `e3-ai-core`: în topologia exportată, traseul este plasat sub „umbrela” semantică E3 AI core, fără ca registrul §7 să specifice handler unic, payload sau ordine de execuție BullMQ între cozi. Interpretarea operațională a sursei rămâne ancorată în coada `ai:agent:orchestrate`; ținta rămâne etichetă de familie în graf, nu o intrare 1:1 în registry.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001, `workers/shared/src/queue-registry.ts`):** capătul operațional al sursei este **`ai:agent:orchestrate`** (`QUEUES.E3_AI_AGENT_ORCHESTRATE`) — contract: [`../../../neurons/E3/ai--agent--orchestrate.md`](../../../neurons/E3/ai--agent--orchestrate.md). **Destinația** din graf, `e3-ai-core`, este un agregat de plan; pentru neuroni concreți din aceeași familie semantică, folosiți [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) (ex. rând `ai:agent:orchestrate`, etapă E3, swimlane `ai-core`).
- **Semantic (ADR-0002, `packages/shared/src/cognitive-node-catalog.ts`):** pentru `ai:agent:orchestrate`, intrarea catalog este `e3:ai:agent-orchestrate` / `ai:agent:orchestrate` (ExecutiveNeuron, swimlane `ai-reasoning`). Eticheta de graf `e3-ai-core` **nu** este un `nodeKey`; nu o echivalați automat cu o singură intrare din catalog.
- **Planificare (graf exportat):** muchie **default** de specializare a familiei; nu presupune handler sau payload dincolo de ce afirmă exportul.

## Limite și reconcilieri

- Dacă între graf și registry apare divergență de denumire (`ai-agent-orchestrate` vs `ai:agent:orchestrate`), prevală registry-ul pentru execuție; graful rămâne sursa pentru **topologie planificată**.
- Nu inventa schemă payload, retry, safety sau telemetrie per-muchie acolo unde v2 marchează explicit absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — secțiunea **7. Complete synapse contract register**, bloc `SYNAPSE \`ai-agent-orchestrate-family\``.
