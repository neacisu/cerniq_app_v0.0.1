# Sinapsă `guardrail-discount-check-oblio-invoice-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-discount-check-oblio-invoice-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-discount-check/guardrail-discount-check-oblio-invoice-create.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-discount-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-discount-check` | **Matrix:** `guardrail:discount:check` → [`../../../neurons/E3/guardrail--discount--check.md`](../../../neurons/E3/guardrail--discount--check.md). **Registry:** `guardrail:discount:check`. |
| Destinație (graf) | `oblio-invoice-create` | **Matrix:** `oblio:invoice:create` → [`../../../neurons/E3/oblio--invoice--create.md`](../../../neurons/E3/oblio--invoice--create.md). **Registry:** `E3_OBLIO_INVOICE_CREATE` → `oblio:invoice:create`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** leagă **`oblio-invoice-create`** de **`guardrail-discount-check`** în topologia exportată. v2: **„sinapsă canonică de pipeline”**; nu explică cum valorile de discount validate influențează emiterea facturii. Comportamentul Oblio este în contractul destinație.

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

- **Runtime (ADR-0001):** `guardrail:discount:check` și `oblio:invoice:create`.
- **Semantic (ADR-0002):** `e3:oblio:invoice-create` — vezi catalog și contract.
- **Planificare:** dependență structurală în graf.

## Limite și reconcilieri

- Fără presupuneri despre payload muchie sau despre ordinea efectivă Oblio.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-discount-check-oblio-invoice-create\``.
