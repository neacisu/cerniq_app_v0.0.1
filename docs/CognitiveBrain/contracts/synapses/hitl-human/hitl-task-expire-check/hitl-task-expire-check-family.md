# Sinapsă `hitl-task-expire-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `hitl-task-expire-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/hitl-task-expire-check/hitl-task-expire-check-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `hitl-task-expire-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `hitl-task-expire-check` | **Planificare (graf).** **Neuron (contract):** [`../../../neurons/E5/hitl--task--expire-check.md`](../../../neurons/E5/hitl--task--expire-check.md). **v2:** secțiunea NEURON pentru `hitl:task:expire-check` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L8633–L8653). **Runtime (ADR-0001):** contractul neuron: **fără** literal în registry/workers; **nu confunda** cu `negotiation:expire:check` (E3) — alt domeniu, documentat în contractul neuron. |
| Destinație (graf) | `e5-hitl` | Agregat familie **`hitl`** etapa **E5**. **v2:** [ADR-FAMILY-e5-hitl](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e5/hitl.md`](../../../../adr/families/e5/hitl.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **hitl-task-expire-check** sub **`e5-hitl`**. v2: **„specializează familia”** — verificarea expirării în context HITL E5 în graful de planificare. Semantica temporală și trigger-ele **nu** sunt în exportul muchiei; gap-ul runtime rămâne în contractul neuron.

## Muchii planificate din alte trasee (către acest nod)

[`../../lifecycle-growth/winback-campaign-enroll/winback-campaign-enroll-hitl-task-expire-check.md`](../../lifecycle-growth/winback-campaign-enroll/winback-campaign-enroll-hitl-task-expire-check.md), [`../../lifecycle-growth/winback-step-execute/winback-step-execute-hitl-task-expire-check.md`](../../lifecycle-growth/winback-step-execute/winback-step-execute-hitl-task-expire-check.md), [`../../lifecycle-growth/winback-trigger-subsidy/winback-trigger-subsidy-hitl-task-expire-check.md`](../../lifecycle-growth/winback-trigger-subsidy/winback-trigger-subsidy-hitl-task-expire-check.md), [`../../lifecycle-growth/winback-trigger-weather/winback-trigger-weather-hitl-task-expire-check.md`](../../lifecycle-growth/winback-trigger-weather/winback-trigger-weather-hitl-task-expire-check.md).

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | Gap `hitl:task:expire-check`; separare clară față de E3 — contract neuron. |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — `hitl:task:expire-check`, fără `nodeKey`/catalog populate. |
| **Planificare (export)** | v2 §7 — `hitl-task-expire-check` → `e5-hitl`, tip `default`. |

## Limite și reconcilieri

- Orice potrivire lexicală cu „expire” în alte etape cere verificare în cod — vezi contract neuron.
- Fără presupuneri despre cron sau sursa ceasului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`hitl-task-expire-check-family\``.
