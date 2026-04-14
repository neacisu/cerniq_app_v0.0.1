# Sinapsă `outreach-wa-delay-template-spintax-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-wa-delay-template-spintax-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-wa-delay/outreach-wa-delay-template-spintax-process.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-wa-delay` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `outreach-wa-delay` | **Contract:** [`../../../neurons/E2/outreach--wa--delay.md`](../../../neurons/E2/outreach--wa--delay.md). **Runtime:** gap registry pentru `outreach:wa:delay` la audit — vezi contract. |
| Destinație (graf) | `template-spintax-process` | **Contract:** [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime (ADR-0001):** `template:spintax:process`. **Semantic (ADR-0002):** `e2:template:spintax`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependență declarativă: traseul **outreach-wa-delay** precede sau cere **template-spintax-process** în graful de planificare. v2: **„sinapsă canonică de pipeline”**; nu descrie mecanismul de amânare sau conținutul job-ului.

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

- **Runtime (ADR-0001):** ținta spintax este în registry; sursa **nu** are coadă confirmată la audit — vezi [`outreach--wa--delay.md`](../../../neurons/E2/outreach--wa--delay.md).
- **Semantic (ADR-0002):** orchestrator (sursă planificată) → templates.
- **Planificare:** `outreach-wa-delay` → `template-spintax-process`.

## Limite și reconcilieri

- Muchia poate exista în graf fără worker dedicat pe sursă; interpretarea „dependency” este **pozițională în export**, nu dovadă de enqueue real.
- Fără completări fictive pentru payload sau retry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-wa-delay-template-spintax-process\``.
