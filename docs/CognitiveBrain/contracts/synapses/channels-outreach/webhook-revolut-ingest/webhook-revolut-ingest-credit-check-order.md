# Sinapsă `webhook-revolut-ingest-credit-check-order`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `webhook-revolut-ingest-credit-check-order` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/webhook-revolut-ingest/webhook-revolut-ingest-credit-check-order.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `webhook-revolut-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `webhook-revolut-ingest` | **Contract:** [`../../../neurons/E4/webhook--revolut--ingest.md`](../../../neurons/E4/webhook--revolut--ingest.md). **Reconciliere coadă:** vezi contract (graf vs `revolut:webhook:ingest`). |
| Destinație (graf) | `credit-check-order` | **Contract:** [`../../../neurons/E4/credit--check--order.md`](../../../neurons/E4/credit--check--order.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **ingest webhook Revolut** și **credit check order** în graful de planificare (familia cash E4).

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

- **Runtime (ADR-0001):** A1 ingest → cozi credit — vezi contracte E4 și registry.
- **Semantic (ADR-0002):** etapa E4 cash — catalog.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- Lanțul concret după ingest (A2/A6 etc.) este în contractul sursă neuron, nu în câmpurile sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`webhook-revolut-ingest-credit-check-order\``.
