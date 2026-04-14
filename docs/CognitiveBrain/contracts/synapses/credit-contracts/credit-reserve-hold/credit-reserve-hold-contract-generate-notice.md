# Sinapsă `credit-reserve-hold-contract-generate-notice`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-reserve-hold-contract-generate-notice` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-reserve-hold/credit-reserve-hold-contract-generate-notice.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-reserve-hold` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-reserve-hold` | **Contract:** [`../../../neurons/E4/credit--reserve--hold.md`](../../../neurons/E4/credit--reserve--hold.md). **Runtime (ADR-0001):** `credit:limit:reserve` — `E4_CREDIT_LIMIT_RESERVE` (v2: `credit:reserve:hold`). |
| Destinație (graf) | `contract-generate-notice` | **Contract (neuron):** [`../../../neurons/E4/contract--generate--notice.md`](../../../neurons/E4/contract--generate--notice.md). **Traseu sinapse:** [`../contract-generate-notice/`](../contract-generate-notice/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-reserve-hold** depinde în planificare de **generarea de notificări** legate de contract. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie canale.

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

- **Runtime (ADR-0001):** vezi contracte neuron sursă și țintă.
- **Semantic (ADR-0002):** credit E4 ↔ notificări E4.
- **Planificare:** v2 §7 — `credit-reserve-hold` → `contract-generate-notice`.

## Limite și reconcilieri

- Conținutul notificării **nu** este în exportul sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-reserve-hold-contract-generate-notice\``.
