# Sinapsă `guardrail-stock-check-oblio-invoice-cancel`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-stock-check-oblio-invoice-cancel` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-stock-check/guardrail-stock-check-oblio-invoice-cancel.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-stock-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `guardrail-stock-check` | Coadă executabilă **`guardrail:stock:check`** (`QUEUES.E3_GUARDRAIL_STOCK_CHECK`) — [`../../../neurons/E3/guardrail--stock--check.md`](../../../neurons/E3/guardrail--stock--check.md). |
| Destinație (graf) | `oblio-invoice-cancel` | Coadă executabilă **`oblio:invoice:cancel`** (`QUEUES.E3_OBLIO_INVOICE_CANCEL`) — [`../../../neurons/E3/oblio--invoice--cancel.md`](../../../neurons/E3/oblio--invoice--cancel.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

În planificare, anularea facturii Oblio este plasată ca dependentă de guardrail-ul de stoc; fără API Oblio sau câmpuri de business în registrul §7.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `E3_GUARDRAIL_STOCK_CHECK`; `E3_OBLIO_INVOICE_CANCEL`.
- **Semantic (ADR-0002):** destinație (neuron) — `e3:oblio:invoice-cancel` / `oblio:invoice:cancel` — „Anulare factură în Oblio la abandon sau stornare” (~L1880–1886), MotorNeuron, `fiscal-execution`.
- **Planificare:** v2 §7 pentru `guardrail-stock-check-oblio-invoice-cancel`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `queue_in_registry` = `yes`.

## Limite și reconcilieri

- Slug-uri graf vs cozi.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-stock-check-oblio-invoice-cancel\``.
