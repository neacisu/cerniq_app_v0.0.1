# Sinapsă `feedback-entity-store-churn-signal-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `feedback-entity-store-churn-signal-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/feedback-entity-store/feedback-entity-store-churn-signal-create.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `feedback-entity-store` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `feedback-entity-store` | **Contract:** [`../../../neurons/E5/feedback--entity--store.md`](../../../neurons/E5/feedback--entity--store.md). **Triplă:** v2 `feedback:entity:store` — vezi neuron pentru gap registry. |
| Destinație (graf) | `churn-signal-create` | **Contract:** [`../../../neurons/E5/churn--signal--create.md`](../../../neurons/E5/churn--signal--create.md). **Notă:** v2 `churn:signal:create` vs runtime `churn:signal:detect` — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **feedback-entity-store** are dependență sintactică față de **churn-signal-create**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `feedback-entity-store` → `churn-signal-create`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** vezi contractele neuron.

## Limite și reconcilieri

- Muchia exprimă doar structura grafului exportat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`feedback-entity-store-churn-signal-create\`` (L21889–L21900).
