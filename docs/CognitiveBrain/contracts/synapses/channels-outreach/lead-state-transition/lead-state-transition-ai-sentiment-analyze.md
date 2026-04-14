# Sinapsă `lead-state-transition-ai-sentiment-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `lead-state-transition-ai-sentiment-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/lead-state-transition/lead-state-transition-ai-sentiment-analyze.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `lead-state-transition` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `lead-state-transition` | **Contract:** [`../../../neurons/E2/lead--state--transition.md`](../../../neurons/E2/lead--state--transition.md). **Runtime (ADR-0001):** `QUEUES.LEAD_STATE_TRANSITION` → `lead:state:transition`. |
| Destinație (graf) | `ai-sentiment-analyze` | **Contract:** [`../../../neurons/E2/ai--sentiment--analyze.md`](../../../neurons/E2/ai--sentiment--analyze.md). **Runtime:** `QUEUES.AI_SENTIMENT_ANALYZE` → `ai:sentiment:analyze`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **actualizarea stării lead-ului în FSM** și **analiza de sentiment** în graful de planificare. Comportamentul efectiv după tranziție (ex. enfileieri ulterioare) este în worker-ii documentați, nu în câmpurile exportului sinapsei.

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

- **Runtime:** ambele capete au intrări în `queue-registry.ts` — vezi contracte pentru dovezi de consumatori.
- **Semantic:** `e2:lead:state-transition` și `e2:ai:sentiment-analyze`.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- Muchia structurală **nu** afirmă că orice tranziție FSM declanșează analiza de sentiment; verificați producătorii de job din cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`lead-state-transition-ai-sentiment-analyze\``.
