# Sinapsă `outreach-phone-allocator-template-spintax-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-phone-allocator-template-spintax-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-phone-allocator/outreach-phone-allocator-template-spintax-process.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-phone-allocator` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `outreach-phone-allocator` | **Contract:** [`../../../neurons/E2/outreach--phone--allocator.md`](../../../neurons/E2/outreach--phone--allocator.md). **Runtime:** `outreach:phone:allocator`; **Semantic:** `e2:outreach:phone-allocator`. |
| Destinație (graf) | `template-spintax-process` | **Contract:** [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime (ADR-0001):** `template:spintax:process`. **Semantic (ADR-0002):** `e2:template:spintax`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **alocare telefon** are o dependență canonică spre **procesarea spintax** (variație text șablon). v2: **„sinapsă canonică de pipeline”**; exportul nu precizează ordinea job-urilor sau conținutul mesajului între cei doi pași.

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

- **Runtime (ADR-0001):** ambele capete au cozi în registry — vezi contractele neuron pentru dovezi de handler.
- **Semantic (ADR-0002):** E2 orchestrator (sursă) → E2 templates (destinație).
- **Planificare:** dependență declarativă `outreach-phone-allocator` → `template-spintax-process`.

## Limite și reconcilieri

- Dependența este **structurală** în v2; lanțul efectiv de enqueue între alocare și spintax trebuie verificat în cod, nu dedus din sinapsă.
- Nu completa scheme de payload sau politici de retry din export — lipsesc în v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-phone-allocator-template-spintax-process\``.
