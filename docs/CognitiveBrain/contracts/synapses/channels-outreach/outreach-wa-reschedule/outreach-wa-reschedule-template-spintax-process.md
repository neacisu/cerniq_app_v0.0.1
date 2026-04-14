# Sinapsă `outreach-wa-reschedule-template-spintax-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-wa-reschedule-template-spintax-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-wa-reschedule/outreach-wa-reschedule-template-spintax-process.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-wa-reschedule` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `outreach-wa-reschedule` | **Contract:** [`../../../neurons/E2/outreach--wa--reschedule.md`](../../../neurons/E2/outreach--wa--reschedule.md). **Runtime:** gap registry — vezi contract. |
| Destinație (graf) | `template-spintax-process` | **Contract:** [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime (ADR-0001):** `template:spintax:process`. **Semantic (ADR-0002):** `e2:template:spintax`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **reprogramare WA** are dependență canonică spre **procesare spintax**. v2: **„sinapsă canonică de pipeline”**; fără detalii despre momentul reprogramării sau variabilele șablonului.

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

- **Runtime (ADR-0001):** ținta are handler în registry; sursa — fără coadă confirmată la audit.
- **Semantic (ADR-0002):** sursă planificată orchestrator → `e2:template:spintax`.
- **Planificare:** `outreach-wa-reschedule` → `template-spintax-process`.

## Limite și reconcilieri

- Execuția end-to-end nu decurge din sinapsă; verificare în cod obligatorie pentru orice afirmație despre ordinea job-urilor.
- Respectă absența din export a schemelor și politicilor.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-wa-reschedule-template-spintax-process\``.
