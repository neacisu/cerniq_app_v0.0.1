# Sinapsă `credit-reserve-expire-contract-sign-check-expiry`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-reserve-expire-contract-sign-check-expiry` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-reserve-expire/credit-reserve-expire-contract-sign-check-expiry.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-reserve-expire` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-reserve-expire` | **Contract:** [`../../../neurons/E4/credit--reserve--expire.md`](../../../neurons/E4/credit--reserve--expire.md). **Runtime (ADR-0001):** `pipeline:reservation:expire` — `E4_RESERVATION_EXPIRE` (v2: `credit:reserve:expire`). |
| Destinație (graf) | `contract-sign-check-expiry` | **Contract (neuron):** [`../../../neurons/E4/contract--sign--check-expiry.md`](../../../neurons/E4/contract--sign--check-expiry.md). **Traseu sinapse:** [`../contract-sign-check-expiry/`](../contract-sign-check-expiry/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-reserve-expire** depinde în planificare de **verificarea expirării semnăturii**. v2: **„sinapsă canonică de pipeline”**; exportul nu conține reguli de expirare.

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
- **Semantic (ADR-0002):** pipeline rezervări ↔ semnătură E4.
- **Planificare:** v2 §7 — `credit-reserve-expire` → `contract-sign-check-expiry`.

## Limite și reconcilieri

- Două concepte de „expirare” (rezervare vs semnătură) coexistă în planificare; sinapsa **nu** le unifică semantic.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-reserve-expire-contract-sign-check-expiry\``.
