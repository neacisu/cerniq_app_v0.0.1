# Sinapsă `sameday-awb-create-alert-client-credit-insufficient`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-awb-create-alert-client-credit-insufficient` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-awb-create/sameday-awb-create-alert-client-credit-insufficient.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-awb-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `sameday-awb-create` | **Contract:** [`../../../neurons/E4/sameday--awb--create.md`](../../../neurons/E4/sameday--awb--create.md). v2 **`sameday:awb:create`**; matrice rând **234**. |
| Destinație (graf) | `alert-client-credit-insufficient` | **Contract:** [`../../../neurons/E4/alert--client--credit-insufficient.md`](../../../neurons/E4/alert--client--credit-insufficient.md). v2 **`alert:client:credit-insufficient`**; matrice rând **179**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **sameday-awb-create** depinde canonic de **alert-client-credit-insufficient**. v2: **„sinapsă canonică de pipeline**”.

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

- **Planificare:** v2 §7 — `sameday-awb-create` → `alert-client-credit-insufficient`.
- **Semantic:** **E4** → **E4** (alerts); vezi matrice și neuroni.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-awb-create-alert-client-credit-insufficient\``.
