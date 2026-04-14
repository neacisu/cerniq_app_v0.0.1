# Sinapsă `alert-client-delivered-audit-log-write`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-client-delivered-audit-log-write` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-client-delivered/alert-client-delivered-audit-log-write.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-client-delivered` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-client-delivered` | **Matrix:** `alert:client:delivered` — [`../../../neurons/E4/alert--client--delivered.md`](../../../neurons/E4/alert--client--delivered.md). **Gap** registry pentru coada granulară; procesorii generici de alertă scriu în audit prin `createAlertProcessor` (vezi contractul neuron). |
| Destinație (graf) | `audit-log-write` | **Coadă:** `audit:log:write` — [`../../../neurons/E4/audit--log--write.md`](../../../neurons/E4/audit--log--write.md). **Registry:** `QUEUES.E4_AUDIT_LOG_WRITE` (`queue-registry.ts`, ex. L481). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența leagă traseul de alertă livrare de scrierea în jurnalul audit (J45). v2: **„sinapsă canonică de pipeline”**. În cod, alertele I39–I44 inserează rânduri de audit; muchia din graf exprimă poziția canonică față de coada `audit:log:write`, fără a pretinde că alerta granulară enfilează un job separat cu acel nume.

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

- **Runtime (ADR-0001):** `audit:log:write` în registry; sursă granulară — gap; contractul J45 notează nealiniere catalog ↔ span.
- **Semantic (ADR-0002):** vezi contractele neuron.
- **Planificare:** dependență în graf între alertă client și scriere audit.

## Limite și reconcilieri

- Două căi posibile spre audit (procesor alertă vs J45) coexistă; sinapsa nu le ordonează în export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-client-delivered-audit-log-write\``.
