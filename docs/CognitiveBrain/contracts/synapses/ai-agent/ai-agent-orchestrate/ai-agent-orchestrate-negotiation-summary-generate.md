# Sinapsă `ai-agent-orchestrate-negotiation-summary-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-orchestrate-negotiation-summary-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-orchestrate/ai-agent-orchestrate-negotiation-summary-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-orchestrate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-agent-orchestrate` | Coadă executabilă **`ai:agent:orchestrate`** (`QUEUES.E3_AI_AGENT_ORCHESTRATE` în `workers/shared/src/queue-registry.ts`) — [`../../../neurons/E3/ai--agent--orchestrate.md`](../../../neurons/E3/ai--agent--orchestrate.md). |
| Destinație (graf) | `negotiation-summary-generate` | **Reconciliere deschisă:** eticheta din graf corespunde cozii intenționate **`negotiation:summary:generate`** în metadata contractului neuron, dar această coadă **nu** apare în `workers/shared/src/queue-registry.ts` și **nu** în `packages/shared/src/cognitive-node-catalog.ts` (vezi audit în [`../../../neurons/E3/negotiation--summary--generate.md`](../../../neurons/E3/negotiation--summary--generate.md)). Rândul `negotiation:summary:generate` din [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) are coloana `queue_in_registry` = `no`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

În graful planificat, **`dependency`** indică faptul că pasul `negotiation-summary-generate` depinde (în topologie) de `ai-agent-orchestrate`. Aceasta susține **ordonarea de proiectare** între orchestrarea agentului și generarea rezumatului de negociere; **nu** implică din registrul §7 existența unei cozi executabile pentru destinație sau un payload de legătură — aspect confirmat ca gap față de registry/catalog în contractul neuron al țintei.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursa **`ai:agent:orchestrate`** este în `workers/shared/src/queue-registry.ts` (`QUEUES.E3_AI_AGENT_ORCHESTRATE`). **Capătul destinație** al muchiei — coada `negotiation:summary:generate` — **lipsește** din același registry — tripla autoritate cere documentarea gap-ului, nu echivalarea cu o coadă inventată.
- **Semantic (ADR-0002):** `ai:agent:orchestrate` are intrare în `packages/shared/src/cognitive-node-catalog.ts` (`e3:ai:agent-orchestrate`). **`negotiation:summary:generate`** nu are intrare în catalog la data auditului din contractul neuron.
- **Planificare:** muchie `dependency` din v2 §7 pentru `ai-agent-orchestrate-negotiation-summary-generate`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `ai:agent:orchestrate` (`queue_in_registry` = `yes`); `negotiation:summary:generate` (`queue_in_registry` = `no`).

## Limite și reconcilieri

- **Graf ↔ registry:** muchia există în planificare; execuția cozii destinație **nu** este ancorată în `queue-registry.ts` — implementare sau ADR ulterior necesar pentru închiderea gap-ului.
- Contractul neuron al țintei rămâne sursa pentru detalii despre căutările în cod; această sinapsă nu completează payload/retry/safety/telemetrie absentă din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-agent-orchestrate-negotiation-summary-generate\``.
