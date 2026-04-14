# Sinapsă `pricing-margin-check-stock-reserve-release`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pricing-margin-check-stock-reserve-release` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/pricing-margin-check/pricing-margin-check-stock-reserve-release.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `pricing-margin-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `pricing-margin-check` | **Registry:** `E3_PRICING_MARGIN_CHECK` → `pricing:margin:check`. **Contract:** [`../../../neurons/E3/pricing--margin--check.md`](../../../neurons/E3/pricing--margin--check.md). |
| Destinație (graf) | `stock-reserve-release` | **Registry:** `E3_STOCK_RESERVE_RELEASE` → `stock:reserve:release`. **Contract:** [`../../../neurons/E3/stock--reserve--release.md`](../../../neurons/E3/stock--reserve--release.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Legătură declarativă **margin check** → **eliberare rezervă**. v2: **„sinapsă canonică de pipeline”**; fără semantică operațională în export.

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

- **Runtime (ADR-0001):** ambele cozi în registry.
- **Semantic (ADR-0002):** vezi contracte.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Nu presupuneți ordinea relativă față de alte muchii de stoc fără cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pricing-margin-check-stock-reserve-release\``.
