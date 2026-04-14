# Sinapsă `outreach-channel-selector-template-spintax-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-channel-selector-template-spintax-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-channel-selector/outreach-channel-selector-template-spintax-process.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-channel-selector` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `outreach-channel-selector` | **Contract:** [`../../../neurons/E2/outreach--channel--selector.md`](../../../neurons/E2/outreach--channel--selector.md). **Runtime (ADR-0001):** `QUEUES.OUTREACH_CHANNEL_SELECTOR` → `outreach:channel:selector`. |
| Destinație (graf) | `template-spintax-process` | **Contract:** [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime:** `QUEUES.TEMPLATE_SPINTAX_PROCESS` → `template:spintax:process`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **selecția canalului** și **procesarea șabloanelor spintax** în modelul de graf. Exportul **nu** specifică dacă varierea textului precede sau urmează fizic selectarea canalului în runtime; contractele neuron descriu worker-ii și limitele de evidență.

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

- **Runtime:** ambele cozi există în registry — constante `OUTREACH_CHANNEL_SELECTOR`, `TEMPLATE_SPINTAX_PROCESS`.
- **Semantic:** `e2:outreach:channel-selector` și `e2:template:spintax`.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- Contractul selectorului notează limite privind propagarea rezultatului către cozi ulterioare; muchia din graf **nu** le rezolvă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-channel-selector-template-spintax-process\``.
