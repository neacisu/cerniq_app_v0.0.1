# Sinapsă `contract-clause-assemble-stock-sync-oblio`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-clause-assemble-stock-sync-oblio` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-clause-assemble/contract-clause-assemble-stock-sync-oblio.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-clause-assemble` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-clause-assemble` | **Contract:** [`../../../neurons/E4/contract--clause--assemble.md`](../../../neurons/E4/contract--clause--assemble.md). **Runtime:** `contract:clauses:select`. **Semantic:** `e4:contract:clauses-select`. |
| Destinație (graf) | `stock-sync-oblio` | **Contract:** [`../../../neurons/E4/stock--sync--oblio.md`](../../../neurons/E4/stock--sync--oblio.md). **Runtime / catalog:** vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependență de planificare: **contract-clause-assemble** → **`stock-sync-oblio`**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** vezi contracte sursă și țintă.
- **Semantic (ADR-0002):** E4 contracts → E4 sync stoc Oblio.
- **Planificare:** `contract-clause-assemble` → `stock-sync-oblio`.

## Limite și reconcilieri

- Fără presupuneri despre payload sau retry din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-clause-assemble-stock-sync-oblio\``.
