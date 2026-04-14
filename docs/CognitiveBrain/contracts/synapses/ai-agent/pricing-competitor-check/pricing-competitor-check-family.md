# Sinapsă `pricing-competitor-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pricing-competitor-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/pricing-competitor-check/pricing-competitor-check-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `pricing-competitor-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `pricing-competitor-check` | Slug traseu în graf. **Execuție (ADR-0001):** **`pricing:competitor:check`** (`QUEUES.E3_PRICING_COMPETITOR_CHECK`). [`../../../neurons/E3/pricing--competitor--check.md`](../../../neurons/E3/pricing--competitor--check.md). |
| Destinație (graf) | `e3-pricing` | Agregat de planificare pentru familia **pricing** (E3); nu este o singură coadă BullMQ. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** sursă = `QUEUES.E3_PRICING_COMPETITOR_CHECK` — `workers/shared/src/queue-registry.ts`. Destinație agregat `e3-pricing`; neuroni concreți: [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) (filtru `pricing` / E3).
- **Semantic (ADR-0002):** `e3:pricing:competitor-check` — catalog + contract neuron.
- **Planificare:** muchie **default** „specializează familia”; fără detalii suplimentare în v2 §7.

## Limite și reconcilieri

- Slug **`pricing-competitor-check`** ↔ **`pricing:competitor:check`**. Nu reduceți `e3-pricing` la un singur `nodeKey` fără dovezi din catalog.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pricing-competitor-check-family\``.
