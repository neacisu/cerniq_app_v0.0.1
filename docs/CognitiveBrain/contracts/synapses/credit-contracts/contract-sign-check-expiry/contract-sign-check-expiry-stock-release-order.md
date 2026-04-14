# Sinapsă `contract-sign-check-expiry-stock-release-order`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-sign-check-expiry-stock-release-order` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-sign-check-expiry/contract-sign-check-expiry-stock-release-order.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-sign-check-expiry` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-sign-check-expiry` | **Contract:** [`../../../neurons/E4/contract--sign--check-expiry.md`](../../../neurons/E4/contract--sign--check-expiry.md). |
| Destinație (graf) | `stock-release-order` | **Contract:** [`../../../neurons/E4/stock--release--order.md`](../../../neurons/E4/stock--release--order.md). **Semantic (ADR-0002):** legătură spre `e3:stock:reserve-release` (vezi neuron — mapare catalog). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **contract-sign-check-expiry** depinde în planificare de **eliberarea rezervării de stoc pe comandă** — de ex. aliniere între evoluția contractului (expirare/anulare) și inventar. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie motive de release.

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

- **Runtime (ADR-0001):** vezi contract neuron țintă pentru coadă și idempotență.
- **Semantic (ADR-0002):** E4 ↔ E3 stoc (rezervări).
- **Planificare:** v2 §7 — `contract-sign-check-expiry` → `stock-release-order`.

## Limite și reconcilieri

- Reconcilierea exactă E4 vs E3 pentru rezervări: în contract neuron, nu în sinapsă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-sign-check-expiry-stock-release-order\``.
