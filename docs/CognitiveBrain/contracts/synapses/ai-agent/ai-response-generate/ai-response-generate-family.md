# Sinapsă `ai-response-generate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-response-generate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-response-generate/ai-response-generate-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-response-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `ai-response-generate` | **Planificare:** nod de traseu în graf. **Matrix:** `ai:response:generate` (E3, familie v2 `ai-analysis`) → [`../../../neurons/E3/ai--response--generate.md`](../../../neurons/E3/ai--response--generate.md). **Runtime (ADR-0001):** același concept apare pe **două** cozi: **`ai:e3:response:generate`** (E3 ai-sales, C15) și **`ai:response:generate`** (E2 outreach + intrare catalog); nu există o mapare 1:1 între nodul de graf și un singur nume BullMQ — vezi tabelul self-aware din contractul neuron. |
| Țintă | `e2-ai-analysis` | Nod **agregat** de planificare pentru familia / swimlane-ul de analiză AI în E2 în topologia exportată, nu o singură coadă executabilă și nu un fișier unic `contracts/neurons/...`. Pentru neuroni concreți din zona semantică E2 legată de analiză AI, folosiți [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) (etapă E2, coloane familie/swimlane). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **default** leagă traseul `ai-response-generate` de agregatul `e2-ai-analysis`. Descrierea confirmată în v2 este **„specializează familia”**: exportul indică o relație de specializare în familia de analiză AI (E2) în planificare, **fără** a preciza handler, payload sau corespondență directă cu o coadă. Detaliile operaționale ale neuronului sursă (E3 C15 vs E2 outreach pe `ai:response:generate`) sunt în [`ai--response--generate.md`](../../../neurons/E3/ai--response--generate.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001, `workers/shared/src/queue-registry.ts`):** pentru sursă, **`E3_AI_RESPONSE_GENERATE`** → `ai:e3:response:generate` și **`AI_RESPONSE_GENERATE`** → `ai:response:generate` — **ambele** documentate în contractul neuron; a nu le confunda. Nodul **țintă** din graf (`e2-ai-analysis`) nu este o cheie din registry.
- **Semantic (ADR-0002, `packages/shared/src/cognitive-node-catalog.ts`):** `e3:ai:response-generate` și `e2:ai:response-generate` folosesc `queueName` **`ai:response:generate`** în catalog; registry-ul E3 folosește încă **`ai:e3:response:generate`** — decalaj documentat în contractul neuron.
- **Planificare:** muchie de specializare a familiei; nu implică automat o singură unitate de deploy sau un singur consumator de coadă.

## Limite și reconcilieri

- Eticheta de graf `ai-response-generate` ≠ obligatoriu **`ai:response:generate`** ca unică coadă runtime (E3 vs E2).
- Nu inventa schemă payload, retry, safety sau telemetrie per-muchie acolo unde v2 marchează explicit absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — secțiunea **7. Complete synapse contract register**, bloc `SYNAPSE \`ai-response-generate-family\``.
