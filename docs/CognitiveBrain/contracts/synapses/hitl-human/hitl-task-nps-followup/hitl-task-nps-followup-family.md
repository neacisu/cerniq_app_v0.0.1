# Sinapsă `hitl-task-nps-followup-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `hitl-task-nps-followup-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/hitl-task-nps-followup/hitl-task-nps-followup-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `hitl-task-nps-followup` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `hitl-task-nps-followup` | **Planificare (graf).** **Neuron (contract):** [`../../../neurons/E5/hitl--task--nps-followup.md`](../../../neurons/E5/hitl--task--nps-followup.md). **v2:** secțiunea NEURON pentru `hitl:task:nps-followup` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L8655–L8675). **Runtime (ADR-0001):** contractul neuron: **fără** `hitl:task:nps-followup` în registry; există flux **automat** NPS (`feedback:nps:send` / `feedback:nps:process`) — **nu** echivalent demonstrat cu acest neuron HITL granular; vezi contract neuron. |
| Destinație (graf) | `e5-hitl` | Agregat familie **`hitl`** etapa **E5**. **v2:** [ADR-FAMILY-e5-hitl](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e5/hitl.md`](../../../../adr/families/e5/hitl.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **hitl-task-nps-followup** sub **`e5-hitl`**. v2: **„specializează familia”** — follow-up uman post-NPS în planificare. **Nu** se afirmă din această muchie că pipeline-ul NPS existent în cod **este** implementarea acestui nod; distincția este în contractul neuron.

## Muchii planificate din alte trasee (către acest nod)

[`../../lifecycle-growth/winback-campaign-enroll/winback-campaign-enroll-hitl-task-nps-followup.md`](../../lifecycle-growth/winback-campaign-enroll/winback-campaign-enroll-hitl-task-nps-followup.md), [`../../lifecycle-growth/winback-step-execute/winback-step-execute-hitl-task-nps-followup.md`](../../lifecycle-growth/winback-step-execute/winback-step-execute-hitl-task-nps-followup.md), [`../../lifecycle-growth/winback-trigger-subsidy/winback-trigger-subsidy-hitl-task-nps-followup.md`](../../lifecycle-growth/winback-trigger-subsidy/winback-trigger-subsidy-hitl-task-nps-followup.md), [`../../lifecycle-growth/winback-trigger-weather/winback-trigger-weather-hitl-task-nps-followup.md`](../../lifecycle-growth/winback-trigger-weather/winback-trigger-weather-hitl-task-nps-followup.md).

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
| **Runtime (ADR-0001)** | Gap coadă v2; flux H43/H44 separat — contract neuron. |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — `hitl:task:nps-followup`, fără `nodeKey`/catalog populate. |
| **Planificare (export)** | v2 §7 — `hitl-task-nps-followup` → `e5-hitl`, tip `default`. |

## Limite și reconcilieri

- **Slug graf** vs **cozi `feedback:nps:*`** — nu se colapsează fără dovadă; vezi contract neuron.
- Fără inventare de reguli de escaladare NPS din muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`hitl-task-nps-followup-family\``.
