# Sinapsă `hitl-task-create-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `hitl-task-create-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/hitl-task-create/hitl-task-create-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `hitl-task-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `hitl-task-create` | **Planificare (graf).** **Neuron (contract):** [`../../../neurons/E5/hitl--task--create.md`](../../../neurons/E5/hitl--task--create.md). **v2:** secțiunea NEURON pentru `hitl:task:create` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L8611–L8631); **Contract evidence** (L8631): nereconciliat cu registry. **Runtime (ADR-0001):** contractul neuron: **fără** `hitl:task:create` în `queue-registry.ts`; HITL E5 înregistrate: `hitl:winback:review`, `hitl:complaint:review` — vezi [`../../../../adr/families/e5/hitl.md`](../../../../adr/families/e5/hitl.md). |
| Destinație (graf) | `e5-hitl` | Agregat familie **`hitl`** etapa **E5**. **v2:** [ADR-FAMILY-e5-hitl](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e5/hitl.md`](../../../../adr/families/e5/hitl.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **hitl-task-create** sub **`e5-hitl`**. v2: **„specializează familia”** — crearea de task-uri HITL în E5, în planificare, sub același agregat de guvernanță ca celelalte neuroni `hitl:*` din exportul E5. **Implementarea** cozii dedicate **nu** este afirmată din această muchie; vezi contract neuron și gap-ul registry.

## Muchii planificate din alte trasee (către acest nod)

Trasee **lifecycle-growth** (winback) → `hitl-task-create`: [`../../lifecycle-growth/winback-campaign-enroll/winback-campaign-enroll-hitl-task-create.md`](../../lifecycle-growth/winback-campaign-enroll/winback-campaign-enroll-hitl-task-create.md), [`../../lifecycle-growth/winback-step-execute/winback-step-execute-hitl-task-create.md`](../../lifecycle-growth/winback-step-execute/winback-step-execute-hitl-task-create.md), [`../../lifecycle-growth/winback-trigger-subsidy/winback-trigger-subsidy-hitl-task-create.md`](../../lifecycle-growth/winback-trigger-subsidy/winback-trigger-subsidy-hitl-task-create.md), [`../../lifecycle-growth/winback-trigger-weather/winback-trigger-weather-hitl-task-create.md`](../../lifecycle-growth/winback-trigger-weather/winback-trigger-weather-hitl-task-create.md).

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
| **Runtime (ADR-0001)** | Gap documentat — contract neuron; pattern E4 `createTask` **nu** înlocuiește automat această coadă v2 E5. |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — `hitl:task:create`, fără `nodeKey`/catalog populate. |
| **Planificare (export)** | v2 §7 — `hitl-task-create` → `e5-hitl`, tip `default`. |

## Limite și reconcilieri

- Specificații textuale (ex. `etapa5-hitl-system.md`) **nu** înlocuiesc dovada din registry — vezi contract neuron.
- **e5-hitl** este agregat de plan, nu o coadă unică.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`hitl-task-create-family\``.
