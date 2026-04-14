# Sinapsă `monitor-phone-health-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `monitor-phone-health-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/monitor-phone-health/monitor-phone-health-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `monitor-phone-health` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `monitor-phone-health` | **Contract:** [`../../../neurons/E2/monitor--phone--health.md`](../../../neurons/E2/monitor--phone--health.md). **Triplă autoritate:** v2 `monitor:phone:health`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `e2-monitoring` | Nod **agregat** în export (swimlane E2 / familie monitoring). **Nu** există rând dedicat `e2-monitoring` în [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv); context: [`../../../../adr/families/e2/monitoring.md`](../../../../adr/families/e2/monitoring.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În planificare, traseul **monitor-phone-health** este legat de nodul agregat **e2-monitoring** printr-o muchie `default`, cu descrierea confirmată **„specializează familia”**: poziționează neuronul de sănătate telefon în subgraful de monitoring E2. Exportul **nu** fixează payload sau politici de execuție între aceste noduri.

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

- **Planificare:** v2 §7 — `monitor-phone-health` → `e2-monitoring`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L85** (`monitor:phone:health`); ținta agregată **e2-monitoring** necesită reconciliere graf ↔ catalog.
- **Runtime:** vezi neuronul sursă.

## Limite și reconcilieri

- Slug graf `monitor-phone-health` ↔ `v2_queue` `monitor:phone:health` (conform contract neuron).
- `e2-monitoring`: **necesită reconciliere graf ↔ registry** pentru execuție agregată.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`monitor-phone-health-family\``.
