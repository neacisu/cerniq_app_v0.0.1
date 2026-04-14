# Sinapsă `credit-check-order-contract-sign-check-expiry`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-check-order-contract-sign-check-expiry` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-check-order/credit-check-order-contract-sign-check-expiry.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-check-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-check-order` | **Contract:** [`../../../neurons/E4/credit--check--order.md`](../../../neurons/E4/credit--check--order.md). |
| Destinație (graf) | `contract-sign-check-expiry` | **Contract (neuron):** [`../../../neurons/E4/contract--sign--check-expiry.md`](../../../neurons/E4/contract--sign--check-expiry.md). **Traseu sinapse (același areal):** [`../contract-sign-check-expiry/`](../contract-sign-check-expiry/) — același identificator graf, perspectivă contracte sinapsă vs neuron. **Runtime:** vezi neuron — `contract:status:poll`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **verificare credit la comandă** depinde în planificare de **traseul verificare semnătură / expirare envelope** (`contract-sign-check-expiry`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie stări DocuSign sau cron.

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

- **Runtime (ADR-0001):** D19 sursă vs G35 țintă — registre separate; vezi contracte.
- **Semantic (ADR-0002):** credit E4 ↔ contract status poll E4.
- **Planificare:** v2 §7 — `credit-check-order` → `contract-sign-check-expiry`.

## Limite și reconcilieri

- Nodul țintă este și **nume de subdirector** de sinapse; pentru comportament operațional folosiți contractul neuron, nu doar lista de fișiere din folder.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-check-order-contract-sign-check-expiry\``.
