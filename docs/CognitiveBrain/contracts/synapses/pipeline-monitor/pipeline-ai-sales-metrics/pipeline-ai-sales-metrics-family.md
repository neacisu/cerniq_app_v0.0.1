# Sinapsă `pipeline-ai-sales-metrics-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-ai-sales-metrics-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-ai-sales-metrics/pipeline-ai-sales-metrics-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-ai-sales-metrics` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `pipeline-ai-sales-metrics` | **Contract:** [`../../../neurons/E3/pipeline--ai-sales--metrics.md`](../../../neurons/E3/pipeline--ai-sales--metrics.md). **Triplă autoritate:** v2 `pipeline:ai-sales:metrics`; **runtime:** vezi contract neuron (inclusiv gap registry/catalog dacă este înregistrat acolo). |
| Destinație (graf) | `e3-ops` | Nod **agregat** în export (swimlane E3 / familie ops). **Nu** există rând dedicat `e3-ops` în [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv); context: [`../../../../adr/families/e3/ops.md`](../../../../adr/families/e3/ops.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În planificare, traseul **pipeline-ai-sales-metrics** este legat de nodul agregat **e3-ops** printr-o muchie `default`, cu descrierea confirmată **„specializează familia”**: poziționează agregarea/metricile pipeline ai-sales în swimlane-ul operațional E3. Exportul **nu** fixează payload sau politici de execuție între aceste noduri.

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

- **Planificare:** v2 §7 — `pipeline-ai-sales-metrics` → `e3-ops`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L158** (`pipeline:ai-sales:metrics`); ținta agregată **e3-ops** necesită reconciliere graf ↔ catalog.
- **Runtime:** conform contractului neuron (inclusiv `queue_in_registry` din matrice).

## Limite și reconcilieri

- Slug graf `pipeline-ai-sales-metrics` ↔ `v2_queue` `pipeline:ai-sales:metrics`.
- **`e3-ops`:** **necesită reconciliere graf ↔ registry** pentru execuție.
- Layout `synapses/pipeline-monitor/` pentru acest traseu este istoric; neuronul este E3 ops.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-ai-sales-metrics-family\``.
