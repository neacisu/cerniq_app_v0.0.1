# Sinapsă `wa-status-sync-q-email-warm`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-status-sync-q-email-warm` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-status-sync/wa-status-sync-q-email-warm.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-status-sync` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `wa-status-sync` | **Contract:** [`../../../neurons/E2/wa--status--sync.md`](../../../neurons/E2/wa--status--sync.md). |
| Destinație (graf) | `q-email-warm` | **Contract:** [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **status sync WA** și **coada email warm** în graful de planificare.

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

- **Runtime / Semantic:** contract țintă + registry.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- Legătura **nu** specifică tipul de job pe coada warm.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-status-sync-q-email-warm\``.
