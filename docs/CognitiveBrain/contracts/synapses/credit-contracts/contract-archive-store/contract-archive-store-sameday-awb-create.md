# Sinapsă `contract-archive-store-sameday-awb-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-archive-store-sameday-awb-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-archive-store/contract-archive-store-sameday-awb-create.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-archive-store` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-archive-store` | **Contract:** [`../../../neurons/E3/contract--archive--store.md`](../../../neurons/E3/contract--archive--store.md). **Runtime:** `document:archive:store`. **Semantic:** `e3:document:archive-store`. |
| Destinație (graf) | `sameday-awb-create` | **Contract:** [`../../../neurons/E4/sameday--awb--create.md`](../../../neurons/E4/sameday--awb--create.md). **Runtime / catalog:** vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graf, **contract-archive-store** depinde canonic de **`sameday-awb-create`**. v2: **„sinapsă canonică de pipeline”**; exportul nu specifică legătura logistică AWB față de pasul de arhivare.

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

- **Runtime (ADR-0001):** sursa — registry E3; ținta — vezi [`sameday--awb--create.md`](../../../neurons/E4/sameday--awb--create.md).
- **Semantic (ADR-0002):** E3 fiscal-docs → E4 logistică SameDay.
- **Planificare:** `contract-archive-store` → `sameday-awb-create`.

## Limite și reconcilieri

- Dependența este declarativă; ordinea job-urilor în producție cere audit de orchestrare.
- Fără completări fictive pentru payload sau retry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-archive-store-sameday-awb-create\``.
