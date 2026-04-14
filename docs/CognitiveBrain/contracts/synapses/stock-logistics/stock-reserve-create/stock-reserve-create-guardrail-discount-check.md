# Sinapsă `stock-reserve-create-guardrail-discount-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `stock-reserve-create-guardrail-discount-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/stock-reserve-create/stock-reserve-create-guardrail-discount-check.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `stock-reserve-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `stock-reserve-create` | **Contract:** [`../../../neurons/E3/stock--reserve--create.md`](../../../neurons/E3/stock--reserve--create.md). v2 **`stock:reserve:create`**; matrice rând **174**. **Runtime:** **`stock:reserve:create`** (`E3_STOCK_RESERVE_CREATE`, `queue-registry.ts` ~L260). |
| Destinație (graf) | `guardrail-discount-check` | **Contract:** [`../../../neurons/E3/guardrail--discount--check.md`](../../../neurons/E3/guardrail--discount--check.md). v2 **`guardrail:discount:check`**; matrice rând **143**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **stock-reserve-create** depinde canonic de **guardrail-discount-check** (guardrail). v2: **„sinapsă canonică de pipeline”**.

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

- **Planificare:** v2 §7 — `stock-reserve-create` → `guardrail-discount-check`.
- **Semantic:** sursă E3 stock; destinație guardrail E3 — matrice rând **143**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`stock-reserve-create-guardrail-discount-check\``.
