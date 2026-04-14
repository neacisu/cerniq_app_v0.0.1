# Sinapsă `guardrail-log-analyze-oblio-invoice-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-log-analyze-oblio-invoice-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-log-analyze/guardrail-log-analyze-oblio-invoice-create.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-log-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-log-analyze` | **Matrix:** `guardrail:log:analyze` → [`../../../neurons/E3/guardrail--log--analyze.md`](../../../neurons/E3/guardrail--log--analyze.md). **Gap runtime:** vezi contractul neuron. |
| Țintă | `oblio-invoice-create` | **Matrix:** `oblio:invoice:create` → [`../../../neurons/E3/oblio--invoice--create.md`](../../../neurons/E3/oblio--invoice--create.md). **Registry:** `E3_OBLIO_INVOICE_CREATE` → `oblio:invoice:create`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** leagă **`oblio-invoice-create`** de **`guardrail-log-analyze`** în graf. v2: **„sinapsă canonică de pipeline”**; nu explică legătura dintre analiza logurilor și emiterea facturii. Nodul **țintă** are coadă în registry; sursa — gap documentat.

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

- **Runtime (ADR-0001):** `oblio:invoice:create` + sursă cu gap — vezi [`guardrail--log--analyze.md`](../../../neurons/E3/guardrail--log--analyze.md).
- **Semantic (ADR-0002):** `e3:oblio:invoice-create`.
- **Planificare:** dependență structurală în export.

## Limite și reconcilieri

- Fără presupuneri despre payload muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-log-analyze-oblio-invoice-create\``.
