# Sinapsă `report-daily-generate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `report-daily-generate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/report-daily-generate/report-daily-generate-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `report-daily-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `report-daily-generate` | **Contract:** [`../../../neurons/E3/report--daily--generate.md`](../../../neurons/E3/report--daily--generate.md). **Triplă autoritate:** v2 `report:daily:generate` (E3 / `ops`); **runtime:** contract neuron documentează **gap** față de `queue-registry.ts` / catalog la data auditului — vezi neuron. |
| Destinație (graf) | `e3-ops` | Nod **agregat** în export (swimlane E3 / familie ops). **Nu** există rând dedicat `e3-ops` în [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv); context: [`../../../../adr/families/e3/ops.md`](../../../../adr/families/e3/ops.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În planificare, traseul **report-daily-generate** este legat de nodul agregat **e3-ops** printr-o muchie `default`, cu descrierea confirmată **„specializează familia”**: poziționează generarea raportului zilnic în swimlane-ul operațional E3. Exportul **nu** fixează payload sau politici de execuție între aceste noduri.

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

- **Planificare:** v2 §7 — `report-daily-generate` → `e3-ops`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L160** (`report:daily:generate`, `queue_in_registry` = `no` în matrice); ținta agregată **e3-ops** necesită reconciliere graf ↔ catalog.
- **Runtime:** vezi contract neuron; nu se afirmă din această sinapsă singură existența unui worker pentru `report:daily:generate`.

## Limite și reconcilieri

- Directorul `synapses/pipeline-monitor/` pentru acest traseu este **layout istoric** din migrare; neuronul este **E3 / ops** (vezi contract neuron).
- Slug graf `report-daily-generate` ↔ `v2_queue` `report:daily:generate` (două puncte în matrice).
- **`e3-ops`:** **necesită reconciliere graf ↔ registry** pentru execuție agregată.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`report-daily-generate-family\``.
