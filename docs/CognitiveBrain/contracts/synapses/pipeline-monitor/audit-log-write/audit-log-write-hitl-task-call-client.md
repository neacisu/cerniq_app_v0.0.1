# Sinapsă `audit-log-write-hitl-task-call-client`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `audit-log-write-hitl-task-call-client` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/audit-log-write/audit-log-write-hitl-task-call-client.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `audit-log-write` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `audit-log-write` | **Contract:** [`../../../neurons/E4/audit--log--write.md`](../../../neurons/E4/audit--log--write.md). |
| Destinație (graf) | `hitl-task-call-client` | **Contract:** [`../../../neurons/E4/hitl--task--call-client.md`](../../../neurons/E4/hitl--task--call-client.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **audit-log-write** are dependență sintactică față de **hitl-task-call-client**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `audit-log-write` → `hitl-task-call-client`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** vezi contractele neuron sursă și țintă.

## Limite și reconcilieri

- Contactul cu clientul este modelat în HITL; sinapsa nu specifică trigger-ul față de J45.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`audit-log-write-hitl-task-call-client\``.
