# Sinapsă `lead-state-transition-ai-response-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `lead-state-transition-ai-response-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/lead-state-transition/lead-state-transition-ai-response-generate.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `lead-state-transition` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `lead-state-transition` | **Contract:** [`../../../neurons/E2/lead--state--transition.md`](../../../neurons/E2/lead--state--transition.md). **Runtime (ADR-0001):** `QUEUES.LEAD_STATE_TRANSITION` → `lead:state:transition`. |
| Destinație (graf) | `ai-response-generate` | **Contract:** [`../../../neurons/E3/ai--response--generate.md`](../../../neurons/E3/ai--response--generate.md). **Reconciliere E2/E3** pe același etichetă v2 de coadă — vezi contractul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **tranziția FSM** și **generarea răspunsului**. Câmpurile sinapsei din export **nu** despart fluxul E2 outreach de fluxul E3; aceasta este documentată în contractul `ai:response:generate`.

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

- **Runtime:** sursa `lead:state:transition` este în registry; ținta are variante de coadă — ADR-0001.
- **Semantic:** catalog `e2:ai:response-generate` / `e3:ai:response-generate`.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- Graful nu indică care instanță runtime a generării răspunsului consumă muchia.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`lead-state-transition-ai-response-generate\``.
