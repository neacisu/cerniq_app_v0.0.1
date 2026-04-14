# Sinapsă `contract-sign-check-expiry-return-process-stock`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-sign-check-expiry-return-process-stock` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-sign-check-expiry/contract-sign-check-expiry-return-process-stock.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-sign-check-expiry` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-sign-check-expiry` | **Contract:** [`../../../neurons/E4/contract--sign--check-expiry.md`](../../../neurons/E4/contract--sign--check-expiry.md). **Runtime:** vezi contract — graf vs `contract:status:poll`. |
| Destinație (graf) | `return-process-stock` | **Contract:** [`../../../neurons/E4/return--process--stock.md`](../../../neurons/E4/return--process--stock.md). **Semantic (ADR-0002):** `e4:return:process` (vezi neuron / catalog). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **verificare status / expirare semnătură contract** este legat de **procesarea returului în stoc** — dependență de pipeline între subgraful contracte și logistică. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie SKU, cantități sau ordinea job-urilor.

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

- **Runtime (ADR-0001):** cozi concrete — din contractele neuron sursă și destinație; **nu** din label-ul muchiei.
- **Semantic (ADR-0002):** E4 `contracts` ↔ E4 `logistics` (familii v2).
- **Planificare:** v2 §7 — `contract-sign-check-expiry` → `return-process-stock`.

## Limite și reconcilieri

- Sensul cauzal operațional (contract înainte de retur vs. invers) **nu** este encodat în câmpurile sinapsei — doar dependența structurală.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-sign-check-expiry-return-process-stock\``.
