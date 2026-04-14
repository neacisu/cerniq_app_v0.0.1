# Sinapsă `guardrail-discount-check-oblio-proforma-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-discount-check-oblio-proforma-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-discount-check/guardrail-discount-check-oblio-proforma-create.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-discount-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-discount-check` | **Matrix:** `guardrail:discount:check` → [`../../../neurons/E3/guardrail--discount--check.md`](../../../neurons/E3/guardrail--discount--check.md). **Registry:** `guardrail:discount:check`. |
| Destinație (graf) | `oblio-proforma-create` | **Matrix:** `oblio:proforma:create` → [`../../../neurons/E3/oblio--proforma--create.md`](../../../neurons/E3/oblio--proforma--create.md). **Registry:** `E3_OBLIO_PROFORMA_CREATE` → `oblio:proforma:create`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** plasează **`oblio-proforma-create`** în dependență canonică față de **`guardrail-discount-check`**. v2: **„sinapsă canonică de pipeline”**; nu detaliază cum discountul afectează proforma. Detalii Oblio în contractul neuron.

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

- **Runtime (ADR-0001):** `guardrail:discount:check` și `oblio:proforma:create`.
- **Semantic (ADR-0002):** `e3:oblio:proforma-create` — vezi catalog.
- **Planificare:** dependență guardrail → creare proforma.

## Limite și reconcilieri

- Export-grounded; fără completări inventate.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-discount-check-oblio-proforma-create\``.
