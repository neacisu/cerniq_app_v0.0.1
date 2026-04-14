# Sinapsă `lead-assign-user-ai-response-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `lead-assign-user-ai-response-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/lead-assign-user/lead-assign-user-ai-response-generate.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `lead-assign-user` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `lead-assign-user` | **Contract:** [`../../../neurons/E2/lead--assign--user.md`](../../../neurons/E2/lead--assign--user.md). **Runtime (ADR-0001):** `QUEUES.LEAD_ASSIGN_USER` → `lead:assign:user`. |
| Destinație (graf) | `ai-response-generate` | **Contract:** [`../../../neurons/E3/ai--response--generate.md`](../../../neurons/E3/ai--response--generate.md). **Reconciliere:** același șir canonic v2 `ai:response:generate` apare în **E2** (outreach) și **E3** (ai-sales) cu cozi diferite în registry — vezi contractul neuron; muchia din graf folosește slug-ul `ai-response-generate`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **asignarea lead-ului** și **generarea răspunsului** în modelul de graf. Detaliile de rutare (E2 vs E3) și producătorii de job **nu** sunt în câmpurile sinapsei din export; vezi contractul `ai:response:generate`.

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

- **Runtime:** sursa este coadă outreach; ținta are **mai multe** căi runtime documentate în contractul neuron.
- **Semantic:** lead-fsm / outreach vs generare răspuns — catalog `e2:ai:response-generate` și `e3:ai:response-generate`.
- **Planificare:** dependență `dependency`.

## Limite și reconcilieri

- Muchia din graf **nu** selectează singură etapa E2 sau E3 pentru execuție.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`lead-assign-user-ai-response-generate\``.
