# Sinapsă `pricing-discount-calculate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pricing-discount-calculate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/pricing-discount-calculate/pricing-discount-calculate-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `pricing-discount-calculate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `pricing-discount-calculate` | **Runtime:** `E3_PRICING_DISCOUNT_CALCULATE` → **`pricing:discount:calculate`** — [`../../../neurons/E3/pricing--discount--calculate.md`](../../../neurons/E3/pricing--discount--calculate.md). |
| Destinație (graf) | `e3-pricing` | Agregat de planificare **pricing** (E3); nu o coadă unică BullMQ. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** ancorează traseul de **calcul discount** în nucleul **`e3-pricing`**. v2: **„specializează familia”**. Comportamentul efectiv al neuronului sursă (SQL determinist vs descriere LLM în v2) este în contractul neuron, nu în sinapsa din §7.

## Sinapse dependență în același traseu

[`pricing-discount-calculate-stock-reserve-create.md`](pricing-discount-calculate-stock-reserve-create.md), [`pricing-discount-calculate-stock-reserve-release.md`](pricing-discount-calculate-stock-reserve-release.md), [`pricing-discount-calculate-stock-sync-erp.md`](pricing-discount-calculate-stock-sync-erp.md).

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

- **Runtime (ADR-0001):** sursă executabilă — registry + contract E27 (denumire din comentarii plan / worker).
- **Semantic (ADR-0002):** `e3:pricing:discount-calculate` — vezi catalog în contract neuron.
- **Planificare:** specializare familie pricing; fără echivalare automată cu toate cozile `pricing:*`.

## Limite și reconcilieri

- Slug `pricing-discount-calculate` vs `pricing:discount:calculate`.
- Nu inventa payload/retry/safety/telemetrie pentru muchia de familie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pricing-discount-calculate-family\``.
