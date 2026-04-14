# Sinapsă `winback-campaign-enroll-hitl-task-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `winback-campaign-enroll-hitl-task-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/winback-campaign-enroll/winback-campaign-enroll-hitl-task-create.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `winback-campaign-enroll` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `winback-campaign-enroll` | **Contract:** [`../../../neurons/E5/winback--campaign--enroll.md`](../../../neurons/E5/winback--campaign--enroll.md). **Runtime:** `winback:campaign:create` (F32). |
| Destinație (graf) | `hitl-task-create` | **Contract:** [`../../../neurons/E5/hitl--task--create.md`](../../../neurons/E5/hitl--task--create.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **winback-campaign-enroll** are dependență sintactică față de **hitl-task-create**. v2: **sinapsă canonică de pipeline**; exportul **nu** fixează payload sau ordinea operațională între job-uri.

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

- **Planificare:** v2 §7 — `winback-campaign-enroll` → `hitl-task-create`.
- **Runtime:** sursă — F32; țintă — neuronul documentează **absența** cozii `hitl:task:create` din registry (gap) — vezi fișier.

## Limite și reconcilieri

- **Graf vs cod:** muchia există în planificare; implementarea cozii `hitl:task:create` **nu** este afirmată din export — vezi `hitl--task--create.md`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`winback-campaign-enroll-hitl-task-create\``.
