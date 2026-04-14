# Sinapsă `stock-sync-oblio-alert-internal-daily-summary`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `stock-sync-oblio-alert-internal-daily-summary` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/stock-sync-oblio/stock-sync-oblio-alert-internal-daily-summary.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `stock-sync-oblio` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `stock-sync-oblio` | **Contract:** [`../../../neurons/E4/stock--sync--oblio.md`](../../../neurons/E4/stock--sync--oblio.md). **Triplă autoritate:** v2 `stock:sync:oblio`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `alert-internal-daily-summary` | **Contract:** [`../../../neurons/E4/alert--internal--daily-summary.md`](../../../neurons/E4/alert--internal--daily-summary.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **stock-sync-oblio** are dependență canonică de pipeline față de **alert-internal-daily-summary**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `stock-sync-oblio` → `alert-internal-daily-summary`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L243**; **Destinație (coadă):** `alert:internal:daily-summary` la **L190** (`queue_in_registry` = `no` — vezi contract neuron).
- **Runtime:** vezi neuronii.

## Limite și reconcilieri

- Rezumatul zilnic poate agrega mai multe surse; muchia nu limitează conținutul la sync Oblio.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`stock-sync-oblio-alert-internal-daily-summary\``.
