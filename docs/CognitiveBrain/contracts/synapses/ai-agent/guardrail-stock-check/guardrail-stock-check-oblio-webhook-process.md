# Sinapsă `guardrail-stock-check-oblio-webhook-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-stock-check-oblio-webhook-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-stock-check/guardrail-stock-check-oblio-webhook-process.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-stock-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `guardrail-stock-check` | Coadă executabilă **`guardrail:stock:check`** (`QUEUES.E3_GUARDRAIL_STOCK_CHECK`) — [`../../../neurons/E3/guardrail--stock--check.md`](../../../neurons/E3/guardrail--stock--check.md). |
| Destinație (graf) | `oblio-webhook-process` | Coadă executabilă **`oblio:webhook:process`** (`QUEUES.E3_OBLIO_WEBHOOK_PROCESS`) — [`../../../neurons/E3/oblio--webhook--process.md`](../../../neurons/E3/oblio--webhook--process.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

În planificare, procesarea webhook Oblio depinde de traseul guardrail stoc; fără semnătură webhook sau câmpuri eveniment în registrul §7.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `E3_GUARDRAIL_STOCK_CHECK`; `E3_OBLIO_WEBHOOK_PROCESS`.
- **Semantic (ADR-0002):** destinație (neuron) — `e3:oblio:webhook-process` / `oblio:webhook:process` — „Procesare webhook Oblio — actualizare status documente…” (~L1907–1913), SensoryNeuron, `fiscal-execution`.
- **Planificare:** v2 §7 pentru `guardrail-stock-check-oblio-webhook-process`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `queue_in_registry` = `yes`.

## Limite și reconcilieri

- Slug-uri graf vs cozi.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-stock-check-oblio-webhook-process\``.
