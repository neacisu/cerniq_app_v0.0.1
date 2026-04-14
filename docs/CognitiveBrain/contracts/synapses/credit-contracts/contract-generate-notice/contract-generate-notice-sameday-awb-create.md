# Sinapsă `contract-generate-notice-sameday-awb-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-generate-notice-sameday-awb-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-generate-notice/contract-generate-notice-sameday-awb-create.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-generate-notice` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-generate-notice` | **Contract:** [`../../../neurons/E4/contract--generate--notice.md`](../../../neurons/E4/contract--generate--notice.md). **v2:** `contract:generate:notice`. **Runtime / catalog:** gap la neuron — vezi contract. |
| Destinație (graf) | `sameday-awb-create` | **Contract:** [`../../../neurons/E4/sameday--awb--create.md`](../../../neurons/E4/sameday--awb--create.md). **Runtime / catalog:** vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graf, **contract-generate-notice** depinde canonic de **`sameday-awb-create`**. v2: **„sinapsă canonică de pipeline”**.

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
- **Semantic (ADR-0002):** graf notice → E4 SameDay AWB.
- **Planificare:** `contract-generate-notice` → `sameday-awb-create`.

## Limite și reconcilieri

- Sursa traseului — gap runtime documentat; muchia rămâne ancorată în v2 §7.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-generate-notice-sameday-awb-create\``.
