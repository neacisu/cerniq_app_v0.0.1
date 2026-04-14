# Sinapsă `ai-agent-response-generate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-response-generate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-response-generate/ai-agent-response-generate-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-response-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `ai-agent-response-generate` | **Planificare:** nod de traseu în graf. **Matrix:** `ai:agent:response-generate` (E3, `ai-core`) → [`../../../neurons/E3/ai--agent--response-generate.md`](../../../neurons/E3/ai--agent--response-generate.md). **Runtime (ADR-0001, `queue-registry.ts`):** coada executabilă în worker este **`ai:e3:response:generate`** (`QUEUES.E3_AI_RESPONSE_GENERATE`) — **nu** literalul din Matrix/v2 pentru același concept. **Catalog (ADR-0002):** intrare **`e3:ai:response-generate`**; în contractul neuron sunt notate diferențe față de ambele. Reconcilierea slug graf ↔ cozi este obligatorie înainte de a interpreta „sursa” ca un singur nume BullMQ. |
| Destinație (graf) | `e3-ai-core` | Nod de **familie / nucleu** E3 în planificare, nu o singură coadă BullMQ; acoperă swimlane-ul semantic `ai-core` pentru neuroni E3. Nu există un fișier `contracts/neurons/...` unic pentru această etichetă de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **default** leagă traseul `ai-agent-response-generate` de agregatul de planificare `e3-ai-core`. Descrierea confirmată în v2 este **„specializează familia”**: exportul afirmă o relație de specializare în familia E3 AI, fără a preciza handler, payload sau ordinea exactă a joburilor. Detaliile operaționale ale neuronului sursă (post-procesare răspuns, fan-out către alte cozi) apar în contractul neuronului sursă, **nu** în câmpurile muchiei din registrul sinapsei v2.

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

- **Runtime (ADR-0001, `workers/shared/src/queue-registry.ts`):** execuția E3 pentru acest concept este documentată pe **`ai:e3:response:generate`**; a nu se confunda cu **`ai:response:generate`** (E2 outreach, altă intrare în registry). Pentru neuroni concreți din aceeași familie semantică, vezi [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) (filtru etapă E3, swimlane `ai-core`).
- **Semantic (ADR-0002, `packages/shared/src/cognitive-node-catalog.ts`):** `nodeKey` / etapă / swimlane — conform catalogului și contractului neuron; eticheta de graf `e3-ai-core` **nu** se echivalează automat cu un singur `nodeKey`.
- **Planificare (graf exportat):** muchie de specializare a familiei; nu implică singură o mapare 1:1 la o coadă destinație.

## Limite și reconcilieri

- **Triplă denumire sursă:** graf `ai-agent-response-generate` / Matrix `ai:agent:response-generate` / runtime `ai:e3:response:generate` — vezi tabelul self-aware din [`ai--agent--response-generate.md`](../../../neurons/E3/ai--agent--response-generate.md).
- Nu inventa schemă payload, retry, safety sau telemetrie per-muchie acolo unde v2 marchează explicit absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — secțiunea **7. Complete synapse contract register**, bloc `SYNAPSE \`ai-agent-response-generate-family\``.
