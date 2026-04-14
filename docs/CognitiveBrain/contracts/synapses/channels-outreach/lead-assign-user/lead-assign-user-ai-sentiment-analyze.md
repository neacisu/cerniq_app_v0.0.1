# Sinapsă `lead-assign-user-ai-sentiment-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `lead-assign-user-ai-sentiment-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/lead-assign-user/lead-assign-user-ai-sentiment-analyze.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `lead-assign-user` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `lead-assign-user` | **Contract:** [`../../../neurons/E2/lead--assign--user.md`](../../../neurons/E2/lead--assign--user.md). **Runtime (ADR-0001):** `QUEUES.LEAD_ASSIGN_USER` → `lead:assign:user`. |
| Destinație (graf) | `ai-sentiment-analyze` | **Contract:** [`../../../neurons/E2/ai--sentiment--analyze.md`](../../../neurons/E2/ai--sentiment--analyze.md). **Runtime:** `QUEUES.AI_SENTIMENT_ANALYZE` → `ai:sentiment:analyze` — vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **asignarea lead-ului** și **analiza de sentiment** în graful de planificare. Ordinea efectivă a job-urilor și condițiile de enfileiere **nu** sunt în exportul sinapsei; contractul neuron `ai:sentiment:analyze` descrie comportamentul worker-ului E2.

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

- **Runtime (ADR-0001):** ambele capete au mapare directă la cozi în registry (cu precizarea că intent-classify istoric este unificat parțial în sentiment — vezi contractul destinație).
- **Semantic (ADR-0002):** `e2:lead:assign-user` și `e2:ai:sentiment-analyze`.
- **Planificare:** dependență `dependency`.

## Limite și reconcilieri

- Muchia structurală **nu** înlocuiește dovada că `createLeadAssignUserWorker` enfilează direct sentiment (contractul sursă descrie actualizarea `assigned_to_user`).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`lead-assign-user-ai-sentiment-analyze\``.
