# Sinapsă `guardrail-discount-check-oblio-webhook-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-discount-check-oblio-webhook-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-discount-check/guardrail-discount-check-oblio-webhook-process.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-discount-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-discount-check` | **Matrix:** `guardrail:discount:check` → [`../../../neurons/E3/guardrail--discount--check.md`](../../../neurons/E3/guardrail--discount--check.md). **Registry:** `guardrail:discount:check`. |
| ��intă | `oblio-webhook-process` | **Matrix:** `oblio:webhook:process` → [`../../../neurons/E3/oblio--webhook--process.md`](../../../neurons/E3/oblio--webhook--process.md). **Registry:** `E3_OBLIO_WEBHOOK_PROCESS` → `oblio:webhook:process`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** declară că procesarea webhook Oblio (`oblio-webhook-process`) este canonic legată de **`guardrail-discount-check`** în graf. v2: **„sinapsă canonică de pipeline”**; nu specifică evenimente webhook sau filtre. Contractul neuron țintă descrie comportamentul.

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

- **Runtime (ADR-0001):** `guardrail:discount:check` și `oblio:webhook:process`.
- **Semantic (ADR-0002):** `e3:oblio:webhook-process` — vezi catalog.
- **Planificare:** dependență guardrail → procesare webhook Oblio.

## Limite și reconcilieri

- Fără invenție despre securitatea webhook sau semnături; doar contract neuron / cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-discount-check-oblio-webhook-process\``.
