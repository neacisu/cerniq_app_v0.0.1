# Sinapsă `association-sync-schedule-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-sync-schedule-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-sync-schedule/association-sync-schedule-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-sync-schedule` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `association-sync-schedule` | Traseu în graf; contract neuron: [`../../../neurons/E5/association--sync--schedule.md`](../../../neurons/E5/association--sync--schedule.md). **Runtime (ADR-0001):** neuronul documentează **gap** — fără coadă `association:sync:schedule` în `queue-registry.ts` la auditul din contract. **Semantic (ADR-0002):** aliniere destinație cu etapa E5 / familie `graph-community` — vezi catalog și contract neuron. |
| Destinație (graf) | `e5-graph-community` | Agregat **familie graph-community E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e5/graph-community.md`](../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **association-sync-schedule** sub agregatul **`e5-graph-community`**. În v2 §7: **„specializează familia”**. Contractul neuron sursă descrie **planificare sincronizare asociații** în v2, dar **fără** implementare coadă cu același literal în cod — reconcilierea runtime rămâne în neuron și ADR, nu în câmpurile acestei sinapse.

## Sinapse dependență în același traseu

[`association-sync-schedule-geo-cluster-analyze.md`](association-sync-schedule-geo-cluster-analyze.md), [`association-sync-schedule-geo-delivery-optimize.md`](association-sync-schedule-geo-delivery-optimize.md), [`association-sync-schedule-geo-neighbor-find.md`](association-sync-schedule-geo-neighbor-find.md), [`association-sync-schedule-geo-territory-map.md`](association-sync-schedule-geo-territory-map.md), [`association-sync-schedule-geo-weather-correlate.md`](association-sync-schedule-geo-weather-correlate.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** `e5-graph-community` nu este o intrare `QUEUES`; sursa este tratată în contractul neuron (gap explicit față de registry).
- **Semantic (ADR-0002):** familia `graph-community` (v2), neuron `association:sync:schedule` — vezi `cognitive-node-catalog.ts` în contract neuron.
- **Planificare:** v2 §7 — `association-sync-schedule` → `e5-graph-community`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Slug-ul graf `association-sync-schedule` ≠ nume coadă BullMQ până la reconciliere documentată în neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-sync-schedule-family\``.
