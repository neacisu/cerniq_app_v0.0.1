# Sinapsă `human-review-queue-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `human-review-queue-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/human-review-queue/human-review-queue-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `human-review-queue` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `human-review-queue` | Traseu în graf; contract neuron: [`../../../neurons/E2/human--review--queue.md`](../../../neurons/E2/human--review--queue.md). **Triplă autoritate:** v2 **`human:review:queue`**; runtime **`human:review:queue`** (`QUEUES.HUMAN_REVIEW_QUEUE`) — vezi neuron, `hitl.ts` și `queue-registry.ts`. |
| Destinație (graf) | `e2-human` | Agregat **familie human E2** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e2/human.md`](../../../../adr/families/e2/human.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **human-review-queue** sub agregatul **`e2-human`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

În acest folder există doar manifestul **`human-review-queue-family.md`**; nu sunt definite muchii `dependency` suplimentare la nivel de contract sinapsă în același director.

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

- **Runtime (ADR-0001):** `e2-human` nu este cheie în `QUEUES`; coada executabilă este **`human:review:queue`** — vezi contractul neuron.
- **Semantic (ADR-0002):** **`e2:human:review-queue`** — vezi catalog citat în neuron.
- **Planificare:** v2 §7 — `human-review-queue` → `e2-human`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Detaliile persistenței (`human_review_queue`, `lead_journey`, SLA) sunt în contractul neuron, **nu** în exportul muchiei `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`human-review-queue-family\``.
