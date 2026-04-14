# Sinapsă `human-takeover-complete-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `human-takeover-complete-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/human-takeover-complete/human-takeover-complete-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `human-takeover-complete` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `human-takeover-complete` | Traseu în graf; contract neuron: [`../../../neurons/E2/human--takeover--complete.md`](../../../neurons/E2/human--takeover--complete.md). **Triplă autoritate:** v2 **`human:takeover:complete`**; runtime **`human:takeover:complete`** (`QUEUES.HUMAN_TAKEOVER_COMPLETE`) — vezi neuron și `queue-registry.ts`. |
| Destinație (graf) | `e2-human` | Agregat **familie human E2** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e2/human.md`](../../../../adr/families/e2/human.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **human-takeover-complete** sub agregatul **`e2-human`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

În acest folder există doar manifestul **`human-takeover-complete-family.md`**; nu sunt definite muchii `dependency` suplimentare la nivel de contract sinapsă în același director.

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

- **Runtime (ADR-0001):** `e2-human` nu este cheie în `QUEUES`; coada executabilă este **`human:takeover:complete`** — vezi contractul neuron.
- **Semantic (ADR-0002):** **`e2:human:takeover-complete`** — vezi catalog citat în neuron.
- **Planificare:** v2 §7 — `human-takeover-complete` → `e2-human`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Logica de rezoluție (`RETURN_TO_AUTOMATION`, audit) este în contractul neuron, **nu** în câmpurile sinapsei din v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`human-takeover-complete-family\``.
