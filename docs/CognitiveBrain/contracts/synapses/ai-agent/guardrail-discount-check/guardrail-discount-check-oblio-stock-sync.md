# Sinapsă `guardrail-discount-check-oblio-stock-sync`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-discount-check-oblio-stock-sync` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-discount-check/guardrail-discount-check-oblio-stock-sync.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-discount-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-discount-check` | **Matrix:** `guardrail:discount:check` → [`../../../neurons/E3/guardrail--discount--check.md`](../../../neurons/E3/guardrail--discount--check.md). **Registry:** `guardrail:discount:check`. |
| ��intă | `oblio-stock-sync` | **Matrix:** `oblio:stock:sync` → [`../../../neurons/E3/oblio--stock--sync.md`](../../../neurons/E3/oblio--stock--sync.md). **Registry:** `E3_OBLIO_STOCK_SYNC` → `oblio:stock:sync`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** leagă **`oblio-stock-sync`** de **`guardrail-discount-check`** în planificare. v2: **„sinapsă canonică de pipeline”**; nu explică legătura dintre verificarea discount și sincronizarea stocului Oblio. Implementarea este în contractul țintă.

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

- **Runtime (ADR-0001):** `guardrail:discount:check` și `oblio:stock:sync`.
- **Semantic (ADR-0002):** `e3:oblio:stock-sync` — vezi catalog.
- **Planificare:** dependență structurală în graf.

## Limite și reconcilieri

- Reconciliere graf ↔ registry prin Matrix; fără presupuneri despre payload.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-discount-check-oblio-stock-sync\``.
