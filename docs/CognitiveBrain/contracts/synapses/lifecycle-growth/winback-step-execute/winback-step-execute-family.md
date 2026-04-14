# Sinapsă `winback-step-execute-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `winback-step-execute-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/winback-step-execute/winback-step-execute-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `winback-step-execute` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `winback-step-execute` | Traseu în graf; contract neuron: [`../../../neurons/E5/winback--step--execute.md`](../../../neurons/E5/winback--step--execute.md). **Triplă autoritate:** v2 **`winback:step:execute`**; **runtime (ADR-0001):** coadă aliniată registry — **`winback:step:execute`** (F33), `nodeKey` **`e5:winback:step-execute`** — vezi neuron. |
| Destinație (graf) | `e5-winback` | Agregat **familie winback** în planificare. ADR: [`../../../../adr/families/e5/winback.md`](../../../../adr/families/e5/winback.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **winback-step-execute** sub agregatul **`e5-winback`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie.

## Sinapse dependență în același traseu

[`winback-step-execute-hitl-dashboard-metrics.md`](winback-step-execute-hitl-dashboard-metrics.md), [`winback-step-execute-hitl-dashboard-sync.md`](winback-step-execute-hitl-dashboard-sync.md), [`winback-step-execute-hitl-task-create.md`](winback-step-execute-hitl-task-create.md), [`winback-step-execute-hitl-task-expire-check.md`](winback-step-execute-hitl-task-expire-check.md), [`winback-step-execute-hitl-task-nps-followup.md`](winback-step-execute-hitl-task-nps-followup.md), [`winback-step-execute-hitl-task-resolve.md`](winback-step-execute-hitl-task-resolve.md).

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

- **Planificare:** v2 §7 — `winback-step-execute` → `e5-winback`.
- **Semantic / runtime:** execuție pași campanie (F33) — vezi contractul neuronului.

## Limite și reconcilieri

- Pentru comportament operațional și telemetrie, contractul canonic rămâne `winback--step--execute.md`; exportul v2 pentru muchia `default` nu adaugă payload/retry/safety.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`winback-step-execute-family\``.
