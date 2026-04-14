# Sinapsă `guardrail-price-check-oblio-invoice-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-price-check-oblio-invoice-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-price-check/guardrail-price-check-oblio-invoice-create.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-price-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `guardrail-price-check` | Coadă executabilă **`guardrail:price:check`** (`QUEUES.E3_GUARDRAIL_PRICE_CHECK`) — [`../../../neurons/E3/guardrail--price--check.md`](../../../neurons/E3/guardrail--price--check.md). |
| Țintă | `oblio-invoice-create` | Coadă executabilă **`oblio:invoice:create`** (`QUEUES.E3_OBLIO_INVOICE_CREATE`) — [`../../../neurons/E3/oblio--invoice--create.md`](../../../neurons/E3/oblio--invoice--create.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

**Dependency:** emiterea facturii în Oblio este ordonată în graf după guardrail-ul de preț; nu se deduce din export momentul confirmării clientului sau payload-ul job-ului.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `E3_GUARDRAIL_PRICE_CHECK`; `E3_OBLIO_INVOICE_CREATE`.
- **Semantic (ADR-0002):** țintă — `e3:oblio:invoice-create` / `oblio:invoice:create` — „Emitere factură finală în Oblio după confirmare client” (~L1871–1877), MotorNeuron, `fiscal-execution`.
- **Planificare:** v2 §7 — `guardrail-price-check` → `oblio-invoice-create`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `queue_in_registry` = `yes`.

## Limite și reconcilieri

- Slug-uri graf vs cozi.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-price-check-oblio-invoice-create\``.
