# Sinapsă `wa-status-sync-q-email-cold`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-status-sync-q-email-cold` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-status-sync/wa-status-sync-q-email-cold.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-status-sync` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `wa-status-sync` | **Contract:** [`../../../neurons/E2/wa--status--sync.md`](../../../neurons/E2/wa--status--sync.md). |
| Destinație (graf) | `q-email-cold` | **Contract:** [`../../../neurons/E2/q--email--cold.md`](../../../neurons/E2/q--email--cold.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **status sync WA** și **coada email rece (`q-email-cold`)** în planificare. Mapare BullMQ: vezi contract neuron și registry.

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

- **Runtime (ADR-0001):** `q:email:cold` — vezi neuron.
- **Semantic:** outreach email cold vs monitorizare WA.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- **Slug graf vs coadă:** reconciliere în contractul `q--email--cold`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-status-sync-q-email-cold\``.
