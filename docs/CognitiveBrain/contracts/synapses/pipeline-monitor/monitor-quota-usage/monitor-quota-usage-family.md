# Sinapsă `monitor-quota-usage-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `monitor-quota-usage-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/monitor-quota-usage/monitor-quota-usage-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `monitor-quota-usage` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `monitor-quota-usage` | **Contract:** [`../../../neurons/E2/monitor--quota--usage.md`](../../../neurons/E2/monitor--quota--usage.md). **Triplă autoritate:** v2 `monitor:quota:usage`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `e2-monitoring` | Nod **agregat** în export (swimlane E2 / familie monitoring). **Nu** există rând dedicat `e2-monitoring` în [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv); context: [`../../../../adr/families/e2/monitoring.md`](../../../../adr/families/e2/monitoring.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În planificare, traseul **monitor-quota-usage** este legat de nodul agregat **e2-monitoring** printr-o muchie `default`, cu descrierea confirmată **„specializează familia”**: poziționează neuronul de monitorizare a utilizării cotelor în subgraful de monitoring E2. Exportul **nu** fixează payload sau politici de execuție între aceste noduri.

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

- **Planificare:** v2 §7 — `monitor-quota-usage` → `e2-monitoring`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L86** (`monitor:quota:usage`); ținta agregată **e2-monitoring** necesită reconciliere graf ↔ catalog.
- **Runtime:** vezi neuronul sursă.

## Limite și reconcilieri

- Slug graf `monitor-quota-usage` ↔ `v2_queue` `monitor:quota:usage` (conform contract neuron).
- `e2-monitoring`: **necesită reconciliere graf ↔ registry** pentru execuție agregată.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`monitor-quota-usage-family\``.
