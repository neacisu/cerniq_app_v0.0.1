# Sinapsă `sameday-status-process-alert-internal-contract-signed`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-status-process-alert-internal-contract-signed` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-status-process/sameday-status-process-alert-internal-contract-signed.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-status-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `sameday-status-process` | **Contract:** [`../../../neurons/E4/sameday--status--process.md`](../../../neurons/E4/sameday--status--process.md). v2 **`sameday:status:process`**; matrice rând **239**. |
| Destinație (graf) | `alert-internal-contract-signed` | **Contract:** [`../../../neurons/E4/alert--internal--contract-signed.md`](../../../neurons/E4/alert--internal--contract-signed.md). v2 **`alert:internal:contract-signed`**; matrice rând **188**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **sameday-status-process** depinde canonic de **alert-internal-contract-signed**. v2: **„sinapsă canonică de pipeline”**.

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

- **Planificare:** v2 §7 — `sameday-status-process` → `alert-internal-contract-signed`.
- **Semantic:** vezi matrice rând **188** și contractul neuron destinație.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-status-process-alert-internal-contract-signed\``.
