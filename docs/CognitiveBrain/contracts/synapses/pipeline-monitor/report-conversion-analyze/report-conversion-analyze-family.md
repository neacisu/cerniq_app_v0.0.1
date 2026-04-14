# Sinapsă `report-conversion-analyze-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `report-conversion-analyze-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/report-conversion-analyze/report-conversion-analyze-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `report-conversion-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `report-conversion-analyze` | Traseu în graf; contract neuron: [`../../../neurons/E3/report--conversion--analyze.md`](../../../neurons/E3/report--conversion--analyze.md). **Triplă autoritate (parțială):** v2 **`report:conversion:analyze`** este **documentat** în plan; **semantic/runtime:** la auditul din contractul neuron (**2026-04-11**) **nu** există `nodeKey` în `cognitive-node-catalog.ts`, **nu** există coadă în `queue-registry.ts`, **nu** s-au găsit workeri TS — vezi neuron pentru **gap runtime** explicit. |
| Destinație (graf) | `e3-ops` | Agregat **familie ops E3** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e3/ops.md`](../../../../adr/families/e3/ops.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **report-conversion-analyze** sub agregatul **`e3-ops`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

În acest subdirector nu există alte fișiere sinapsă individuale în afara manifestului de familie.

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

- **Planificare:** v2 §7 — `report-conversion-analyze` → `e3-ops`.
- **Semantic (ADR-0002):** [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `report:conversion:analyze`, rând **159**; **`queue_in_registry` = no** — aliniere viitoare catalog/registry **deschisă**, documentată în contractul neuron.
- **Runtime (ADR-0001):** **fără** constantă de coadă confirmată pentru acest `v2_queue` la auditul neuron — **nu** presupunem handler.

## Limite și reconcilieri

- **`e3-ops`** este etichetă de familie în graf; **nu** înlocuiește lipsa de legătură runtime pentru sursă până la reconciliere în cod.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Sinapsele **`human-notification-send-report-conversion-analyze`** și **`human-queue-prioritize-report-conversion-analyze`** (v2 §7) au **ținta** `report-conversion-analyze` — sunt în **alte** trasee de contract; nu le amestecăm cu acest manifest fără fișiere dedicate în repo.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`report-conversion-analyze-family\``.
