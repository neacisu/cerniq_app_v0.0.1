# Sinapsă `pricing-margin-check-stock-reserve-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pricing-margin-check-stock-reserve-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/pricing-margin-check/pricing-margin-check-stock-reserve-create.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `pricing-margin-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `pricing-margin-check` | **Registry:** `E3_PRICING_MARGIN_CHECK` → `pricing:margin:check`. **Contract:** [`../../../neurons/E3/pricing--margin--check.md`](../../../neurons/E3/pricing--margin--check.md). |
| Destinație (graf) | `stock-reserve-create` | **Registry:** `E3_STOCK_RESERVE_CREATE` → `stock:reserve:create`. **Contract:** [`../../../neurons/E3/stock--reserve--create.md`](../../../neurons/E3/stock--reserve--create.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Verificarea marjei** este ordonată canonic față de **crearea rezervării** de stoc. v2: **„sinapsă canonică de pipeline”**. Sens declarativ: guardrail de preț și alocarea fizică a stocului apar legate în același pipeline planificat.

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

- **Runtime (ADR-0001):** ambele în registry.
- **Semantic (ADR-0002):** pricing + stock.
- **Planificare:** margin check → reserve create.

## Limite și reconcilieri

- Verificați în cod lanțul efectiv (inclusiv payload D21 discutat în contractul E30).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pricing-margin-check-stock-reserve-create\``.
