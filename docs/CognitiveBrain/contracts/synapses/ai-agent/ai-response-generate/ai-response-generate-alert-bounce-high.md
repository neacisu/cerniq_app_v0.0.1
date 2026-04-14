# Sinapsă `ai-response-generate-alert-bounce-high`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-response-generate-alert-bounce-high` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-response-generate/ai-response-generate-alert-bounce-high.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-response-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-response-generate` | **Planificare:** traseu `ai-response-generate`. **Matrix:** `ai:response:generate` (E3) → [`../../../neurons/E3/ai--response--generate.md`](../../../neurons/E3/ai--response--generate.md). **Runtime:** `ai:e3:response:generate` (E3) și/sau `ai:response:generate` (E2 outreach) — **reconciliere obligatorie**; v2 nu spune care ramură alimentează muchia. |
| Destinație (graf) | `alert-bounce-high` | **Matrix:** `alert:bounce:high` (E2, `monitoring`) → [`../../../neurons/E2/alert--bounce--high.md`](../../../neurons/E2/alert--bounce--high.md). **Registry:** `ALERT_BOUNCE_HIGH` → `alert:bounce:high`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** plasează în graf, în pipeline canonic, **`alert-bounce-high`** ca dependent de traseul **`ai-response-generate`**. v2 confirmă doar **„sinapsă canonică de pipeline”**; nu există în export mecanismul de propagare (ex. același job, același tenant). În cod, alerta de bounce este documentată ca flux E2 (monitor deliverability → prag bounce → coada `alert:bounce:high`) — vezi contractul destinație; legătura cu generarea răspunsului AI rămâne **planificare topologică**, nu dovadă din registrul sinapsei că sursa enfilează direct **ținta**.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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

- **Runtime (ADR-0001):** ținta este executabilă pe **`alert:bounce:high`** conform registry și contractului E2. Sursa: **dublă** semnificație runtime pentru `ai:response:generate` — vezi [`ai--response--generate.md`](../../../neurons/E3/ai--response--generate.md).
- **Semantic (ADR-0002):** `nodeKey` / swimlane — catalog + contracte (E3 `ai-reasoning` vs familie v2 `ai-analysis`; E2 `monitoring`).
- **Planificare:** dependență declarată între traseul de răspuns AI și nodul de alertă bounce ridicat.

## Limite și reconcilieri

- Slug graf vs cozi cu `:` — mapare prin Matrix + `queue-registry.ts`, fără presupuneri despre payload muchie.
- Divergențe de payload observate în contractul neuron destinație (ex. câmpuri alertă) **nu** se extrapolează ca fiind „ale sinapsei” din v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-response-generate-alert-bounce-high\``.
