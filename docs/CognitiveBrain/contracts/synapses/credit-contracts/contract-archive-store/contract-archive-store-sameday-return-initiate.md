# Sinapsă `contract-archive-store-sameday-return-initiate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-archive-store-sameday-return-initiate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-archive-store/contract-archive-store-sameday-return-initiate.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-archive-store` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-archive-store` | **Contract:** [`../../../neurons/E3/contract--archive--store.md`](../../../neurons/E3/contract--archive--store.md). **Runtime:** `document:archive:store`. **Semantic:** `e3:document:archive-store`. |
| Destinație (graf) | `sameday-return-initiate` | **Contract:** [`../../../neurons/E4/sameday--return--initiate.md`](../../../neurons/E4/sameday--return--initiate.md). **Runtime / catalog:** vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependență de planificare: **contract-archive-store** → **`sameday-return-initiate`**. v2: **„sinapsă canonică de pipeline”**; fără detalii despre inițierea returului SameDay.

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

- **Runtime (ADR-0001):** vezi contracte sursă și țintă.
- **Semantic (ADR-0002):** E3 arhivare → E4 SameDay return.
- **Planificare:** `contract-archive-store` → `sameday-return-initiate`.

## Limite și reconcilieri

- Execuția efectivă se verifică în cod; sinapsa afirmă doar structura din export.
- Fără presupuneri despre payload sau retry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-archive-store-sameday-return-initiate\``.
