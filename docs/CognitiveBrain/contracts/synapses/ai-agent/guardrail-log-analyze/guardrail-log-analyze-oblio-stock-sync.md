# Sinapsă `guardrail-log-analyze-oblio-stock-sync`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-log-analyze-oblio-stock-sync` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-log-analyze/guardrail-log-analyze-oblio-stock-sync.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-log-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-log-analyze` | **Matrix:** `guardrail:log:analyze` → [`../../../neurons/E3/guardrail--log--analyze.md`](../../../neurons/E3/guardrail--log--analyze.md). **Gap runtime:** vezi contractul neuron. |
| Țintă | `oblio-stock-sync` | **Matrix:** `oblio:stock:sync` → [`../../../neurons/E3/oblio--stock--sync.md`](../../../neurons/E3/oblio--stock--sync.md). **Registry:** `E3_OBLIO_STOCK_SYNC` → `oblio:stock:sync`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** leagă **`oblio-stock-sync`** de **`guardrail-log-analyze`** în planificare. v2: **„sinapsă canonică de pipeline”**; nu explică cum sincronizarea stocului se raportează la analiza logurilor guardrail. Nodul **țintă** este în registry; sursa are gap documentat în contractul neuron.

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

- **Runtime (ADR-0001):** `oblio:stock:sync`; sursă — reconciliere graf ↔ cod.
- **Semantic (ADR-0002):** `e3:oblio:stock-sync`.
- **Planificare:** dependență structurală în export.

## Limite și reconcilieri

- Mapare slug graf vs cozi prin Matrix.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-log-analyze-oblio-stock-sync\``.
