# Sinapsă `outreach-wa-send-template-spintax-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-wa-send-template-spintax-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-wa-send/outreach-wa-send-template-spintax-process.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-wa-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `outreach-wa-send` | **Contract:** [`../../../neurons/E2/outreach--wa--send.md`](../../../neurons/E2/outreach--wa--send.md). **Runtime:** trimitere efectivă pe cozi WA per-telefon; eticheta v2 `outreach:wa:send` ≠ literal unic în `QUEUES` — vezi contract. |
| Destinație (graf) | `template-spintax-process` | **Contract:** [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime (ADR-0001):** `template:spintax:process`. **Semantic (ADR-0002):** `e2:template:spintax`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependență de planificare: traseul **outreach-wa-send** este legat canonic de **template-spintax-process** (variație text înainte/după trimitere, conform grafului). v2: **„sinapsă canonică de pipeline”**; nu precizează dacă spintax rulează în același proces cu `processSpintax` din workerul WA sau prin coadă separată.

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

- **Runtime (ADR-0001):** ținta spintax este în registry; sursa este **conceptuală** în graf față de cozile WA reale — vezi contract neuron sursă.
- **Semantic (ADR-0002):** orchestrator / trimitere (v2) → procedural templates.
- **Planificare:** `outreach-wa-send` → `template-spintax-process`.

## Limite și reconcilieri

- Workerul WA apelează `processSpintax` în-proces (`whatsapp.ts`); muchia din graf poate reflecta și coada `template:spintax:process` — **nu** fuziona cele două niveluri fără audit de cod.
- Fără presupuneri despre payload sau retry din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-wa-send-template-spintax-process\``.
