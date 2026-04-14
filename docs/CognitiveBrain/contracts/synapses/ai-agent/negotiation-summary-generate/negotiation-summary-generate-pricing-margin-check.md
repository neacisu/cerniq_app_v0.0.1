# Sinapsă `negotiation-summary-generate-pricing-margin-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `negotiation-summary-generate-pricing-margin-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/negotiation-summary-generate/negotiation-summary-generate-pricing-margin-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `negotiation-summary-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `negotiation-summary-generate` | **Gap runtime** pentru `negotiation:summary:generate` — [`../../../neurons/E3/negotiation--summary--generate.md`](../../../neurons/E3/negotiation--summary--generate.md). **Necesită reconciliere graf ↔ registry.** |
| Destinație (graf) | `pricing-margin-check` | **`pricing:margin:check`** — `QUEUES.E3_PRICING_MARGIN_CHECK`. [`../../../neurons/E3/pricing--margin--check.md`](../../../neurons/E3/pricing--margin--check.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime:** țintă: `QUEUES.E3_PRICING_MARGIN_CHECK`; sursă: fără `QUEUES.*` dovedit — contract neuron.
- **Semantic:** țintă: `e3:pricing:margin-check` (vezi catalog); sursă: nu inventați `nodeKey`.
- **Planificare:** muchie **`dependency`**: `negotiation-summary-generate` precede `pricing-margin-check` în export.

## Limite și reconcilieri

- Sursă: nod **planificat** vs **coadă înregistrată** — distincție obligatorie. Pentru **țintă**: slug ↔ **`pricing:margin:check`**. Fără presupuneri despre payload (absent din export).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`negotiation-summary-generate-pricing-margin-check\``.
