# Sinapsă `pipeline-monitor-rate-sync-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-monitor-rate-sync-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-monitor-rate-sync/pipeline-monitor-rate-sync-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-monitor-rate-sync` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `pipeline-monitor-rate-sync` | Traseu în graf; [`../../../neurons/E1/pipeline--monitor--rate-sync.md`](../../../neurons/E1/pipeline--monitor--rate-sync.md). **v2 / matrice:** `pipeline:monitor:rate-sync`. **Runtime (ADR-0001):** aceeași coadă `pipeline:monitor` ca și «health»; secțiunea «rate/backlog» în `p3-pipeline-monitor.ts` (gauge `queueDepth` din `queueRegistry`) — vezi contractul neuron. |
| Destinație (graf) | `e1-monitor` | Nod agregat **familie monitor** E1; **nu** este o singură coadă executabilă; [`../../../adr/families/e1/monitor.md`](../../../adr/families/e1/monitor.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul `pipeline-monitor-rate-sync` sub **`e1-monitor`**. În export, «rate-sync» este planificat ca neuron distinct; în cod este **capabilitate** în cadrul aceluiași worker pe `pipeline:monitor` — fără a deduce din sinapsă detalii de eșantionare sau praguri (acestea sunt în implementare, nu în registrul §7).

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `pipeline:monitor`; `e1-monitor` nu este nume `QUEUES`.
- **Semantic (ADR-0002):** `e1:pipeline:monitor` (catalog).
- **Planificare:** v2 §7 — `pipeline-monitor-rate-sync` → `e1-monitor`.

## Limite și reconcilieri

- **v2:** doi neuroni `health` / `rate-sync`; **cod:** un procesor — vezi [`../../../neurons/E1/pipeline--monitor--rate-sync.md`](../../../neurons/E1/pipeline--monitor--rate-sync.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-monitor-rate-sync-family\``.
