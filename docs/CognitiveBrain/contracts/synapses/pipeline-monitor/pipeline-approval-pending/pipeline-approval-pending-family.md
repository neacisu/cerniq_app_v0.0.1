# Sinapsă `pipeline-approval-pending-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-approval-pending-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-approval-pending/pipeline-approval-pending-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-approval-pending` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `pipeline-approval-pending` | Traseu în graf; [`../../../neurons/E1/pipeline--approval--pending.md`](../../../neurons/E1/pipeline--approval--pending.md). **v2 / matrice:** coadă canonică `pipeline:approval:pending`. **Runtime (ADR-0001):** contractul neuron documentează **gap** — **nu** există literal `pipeline:approval:pending` în `workers/shared/src/queue-registry.ts`; starea «pending approvals» este modelată în Postgres și cozi HITL auxiliare (`hitl:escalate`, `hitl:resume`). |
| Țintă | `e1-hitl` | Nod agregat **familie HITL** E1 în planificare; **nu** este o singură coadă executabilă; vezi [`../../../adr/families/e1/hitl.md`](../../../adr/families/e1/hitl.md) și neuroni `hitl:*` din catalog. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul `pipeline-approval-pending` sub agregatul **`e1-hitl`** în graful de planificare (v2: «specializează familia»). Nu afirmăm din export cum se traduce în enqueuing BullMQ între un nod agregat și capabilitățile HITL concrete; reconcilierea graf ↔ registry este în contractul neuronului sursă și în ADR-ul familiei `hitl`.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `pipeline:approval:pending` **nu** apare ca membru `QUEUES` în `queue-registry.ts` la auditul din contractul neuron; `e1-hitl` nu este nume de coadă.
- **Semantic (ADR-0002):** fără `nodeKey` catalog pentru `pipeline:approval:pending` la auditul citat în contractul neuron; familii HITL în `NEURON_MATRIX.csv` / `contracts/neurons/`.
- **Planificare:** v2 §7 — `pipeline-approval-pending` → `e1-hitl`.

## Limite și reconcilieri

- **Graf vs runtime:** slug `pipeline-approval-pending` (graf) vs persistență + `hitl:*` — vezi [`../../../neurons/E1/pipeline--approval--pending.md`](../../../neurons/E1/pipeline--approval--pending.md).
- **Țintă agregat:** `e1-hitl` nu mapează 1:1 la o singură coadă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-approval-pending-family\``.
