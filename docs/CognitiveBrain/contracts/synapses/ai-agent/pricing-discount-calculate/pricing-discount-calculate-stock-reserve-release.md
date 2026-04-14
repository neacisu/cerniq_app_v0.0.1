# Sinapsă `pricing-discount-calculate-stock-reserve-release`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pricing-discount-calculate-stock-reserve-release` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/pricing-discount-calculate/pricing-discount-calculate-stock-reserve-release.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `pricing-discount-calculate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `pricing-discount-calculate` | **Registry:** `E3_PRICING_DISCOUNT_CALCULATE` → `pricing:discount:calculate`. **Contract:** [`../../../neurons/E3/pricing--discount--calculate.md`](../../../neurons/E3/pricing--discount--calculate.md). |
| Destinație (graf) | `stock-reserve-release` | **Registry:** `E3_STOCK_RESERVE_RELEASE` → `stock:reserve:release`. **Contract:** [`../../../neurons/E3/stock--reserve--release.md`](../../../neurons/E3/stock--reserve--release.md). **Matrix:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența leagă **calculul discount-ului** de **eliberarea rezervării** de stoc în planificare. v2: **„sinapsă canonică de pipeline”**; exportul nu precizează trigger-ul de business (anulare, expirare, finalizare comandă).

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
- **Semantic (ADR-0002):** pricing + stock — vezi contracte.
- **Planificare:** discount → eliberare rezervă (declarativ).

## Limite și reconcilieri

- Ordinea efectivă față de `stock-reserve-create` nu este specificată de această sinapsă izolată.
- Fără presupuneri despre payload.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pricing-discount-calculate-stock-reserve-release\``.
