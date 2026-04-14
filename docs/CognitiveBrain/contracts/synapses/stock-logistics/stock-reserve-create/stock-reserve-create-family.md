# Sinapsă `stock-reserve-create-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `stock-reserve-create-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/stock-reserve-create/stock-reserve-create-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `stock-reserve-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `stock-reserve-create` | Traseu în graf; contract neuron: [`../../../neurons/E3/stock--reserve--create.md`](../../../neurons/E3/stock--reserve--create.md). **v2 / runtime:** **`stock:reserve:create`**, `e3:stock:reserve-create`, registry ~L260. |
| Destinație (graf) | `e3-stock` | Agregat **familie stock E3** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e3/stock.md`](../../../../adr/families/e3/stock.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **stock-reserve-create** sub **`e3-stock`**. v2: **„specializează familia”**.

## Sinapse dependență în același traseu

[`stock-reserve-create-guardrail-discount-check.md`](stock-reserve-create-guardrail-discount-check.md), [`stock-reserve-create-guardrail-log-analyze.md`](stock-reserve-create-guardrail-log-analyze.md), [`stock-reserve-create-guardrail-price-check.md`](stock-reserve-create-guardrail-price-check.md), [`stock-reserve-create-guardrail-stock-check.md`](stock-reserve-create-guardrail-stock-check.md), [`stock-reserve-create-guardrail-stock-verify.md`](stock-reserve-create-guardrail-stock-verify.md)

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

- **Planificare:** v2 §7 — `stock-reserve-create` → `e3-stock`.
- **Semantic (ADR-0002):** `stock:reserve:create`, rând **174** în [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv).
- **Runtime (ADR-0001):** **`stock:reserve:create`**.

## Limite și reconcilieri

- **`e3-stock`** este agregat graf, nu înlocuitor pentru coada canonică.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`stock-reserve-create-family\``.
