# Sinapsă `guardrail-log-analyze-oblio-invoice-cancel`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-log-analyze-oblio-invoice-cancel` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-log-analyze/guardrail-log-analyze-oblio-invoice-cancel.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-log-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-log-analyze` | **Matrix:** `guardrail:log:analyze` → [`../../../neurons/E3/guardrail--log--analyze.md`](../../../neurons/E3/guardrail--log--analyze.md). **Gap runtime:** contractul neuron marchează lipsă handler / `QUEUES` la audit; muchia = **planificare**. |
| Destinație (graf) | `oblio-invoice-cancel` | **Matrix:** `oblio:invoice:cancel` → [`../../../neurons/E3/oblio--invoice--cancel.md`](../../../neurons/E3/oblio--invoice--cancel.md). **Registry:** `E3_OBLIO_INVOICE_CANCEL` → `oblio:invoice:cancel`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** declară în planificare că **`oblio-invoice-cancel`** este legat canonic de traseul **`guardrail-log-analyze`**. v2: **„sinapsă canonică de pipeline”**; nu precizează cum analiza logurilor declanșează sau condiționează anularea facturii. Nodul **destinație** (`oblio:invoice:cancel`) este în registry; sursa rămâne supusă gap-ului din contractul neuron.

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

- **Runtime (ADR-0001):** `oblio:invoice:cancel` executabil; sursă `guardrail:log:analyze` — reconciliere obligatorie.
- **Semantic (ADR-0002):** `e3:oblio:invoice-cancel` — vezi catalog.
- **Planificare:** dependență guardrail-log-analyze → anulare factură Oblio.

## Limite și reconcilieri

- Detalii fiscale — contractul neuron destinație; muchia nu le substituie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-log-analyze-oblio-invoice-cancel\``.
