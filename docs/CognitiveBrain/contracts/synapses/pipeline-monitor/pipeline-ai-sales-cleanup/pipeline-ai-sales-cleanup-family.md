# Sinapsă `pipeline-ai-sales-cleanup-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-ai-sales-cleanup-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-ai-sales-cleanup/pipeline-ai-sales-cleanup-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-ai-sales-cleanup` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `pipeline-ai-sales-cleanup` | **Contract:** [`../../../neurons/E3/pipeline--ai-sales--cleanup.md`](../../../neurons/E3/pipeline--ai-sales--cleanup.md). **Triplă autoritate:** v2 `pipeline:ai-sales:cleanup`; **runtime:** contract neuron documentează **gap** față de `queue-registry.ts` / catalog — vezi neuron. |
| Destinație (graf) | `e3-ops` | Nod **agregat** în export (swimlane E3 / familie ops). **Nu** există rând dedicat `e3-ops` în [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv); context: [`../../../../adr/families/e3/ops.md`](../../../../adr/families/e3/ops.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În planificare, traseul **pipeline-ai-sales-cleanup** este legat de nodul agregat **e3-ops** printr-o muchie `default`, cu descrierea confirmată **„specializează familia”**: plasează mentenanța/curățarea datelor pipeline ai-sales în swimlane-ul operațional E3. Exportul **nu** fixează payload sau politici de execuție între aceste noduri.

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

- **Planificare:** v2 §7 — `pipeline-ai-sales-cleanup` → `e3-ops`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L156** (`pipeline:ai-sales:cleanup`, `queue_in_registry` = `no` în matrice); ținta agregată **e3-ops** necesită reconciliere graf ↔ catalog.
- **Runtime:** vezi contract neuron — fără literal garantat în registry la momentul auditului documentat acolo.

## Limite și reconcilieri

- Slug graf `pipeline-ai-sales-cleanup` (cratimă) ↔ `v2_queue` `pipeline:ai-sales:cleanup` (două puncte) — mapare prin contract neuron, nu prin identitate textuală brută.
- **`e3-ops`:** nod agregat planificare; **necesită reconciliere graf ↔ registry** pentru orice afirmație despre o singură coadă executabilă.
- Directorul `pipeline-monitor` pentru acest traseu este **layout istoric** din migrare; neuronul este **E3 / ops** (vezi contract neuron).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-ai-sales-cleanup-family\``.
