# Sinapsă `pricing-margin-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pricing-margin-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/pricing-margin-check/pricing-margin-check-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `pricing-margin-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `pricing-margin-check` | **Runtime:** `E3_PRICING_MARGIN_CHECK` → **`pricing:margin:check`** — [`../../../neurons/E3/pricing--margin--check.md`](../../../neurons/E3/pricing--margin--check.md). |
| Destinație (graf) | `e3-pricing` | Agregat **pricing** (E3) în planificare. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** poziționează **verificarea marjei** sub **`e3-pricing`**. v2: **„specializează familia”**. Divergențe v2 (NeMo) vs cod determinist și probleme de payload D21→E30 sunt în contractul neuron, nu aici.

## Sinapse dependență în același traseu

[`pricing-margin-check-stock-reserve-create.md`](pricing-margin-check-stock-reserve-create.md), [`pricing-margin-check-stock-reserve-release.md`](pricing-margin-check-stock-reserve-release.md), [`pricing-margin-check-stock-sync-erp.md`](pricing-margin-check-stock-sync-erp.md).

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

- **Runtime (ADR-0001):** `pricing:margin:check` — registry + E30 în contract.
- **Semantic (ADR-0002):** `e3:pricing:margin-check` — vezi catalog în contract neuron.
- **Planificare:** nucleu pricing agregat.

## Limite și reconcilieri

- Slug `pricing-margin-check` vs `pricing:margin:check`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pricing-margin-check-family\``.
