# Sinapsă `contract-sign-check-expiry-stock-sync-oblio`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-sign-check-expiry-stock-sync-oblio` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-sign-check-expiry/contract-sign-check-expiry-stock-sync-oblio.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-sign-check-expiry` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-sign-check-expiry` | **Contract:** [`../../../neurons/E4/contract--sign--check-expiry.md`](../../../neurons/E4/contract--sign--check-expiry.md). |
| Destinație (graf) | `stock-sync-oblio` | **Contract:** [`../../../neurons/E4/stock--sync--oblio.md`](../../../neurons/E4/stock--sync--oblio.md). **Semantic (ADR-0002):** `e4:stock:sync-oblio`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **contract-sign-check-expiry** depinde în planificare de **sincronizarea stocului cu Oblio** — legătură între monitorizarea contractului și sursa de adevăr contabilă/fiscală pentru inventar. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie API-uri sau frecvență.

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

- **Runtime (ADR-0001):** vezi contract neuron țintă și registry.
- **Semantic (ADR-0002):** E4 stoc / integrare.
- **Planificare:** v2 §7 — `contract-sign-check-expiry` → `stock-sync-oblio`.

## Limite și reconcilieri

- Fără afirmații despre consistență eventuală Oblio ↔ stoc operațional — doar muchia din graf.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-sign-check-expiry-stock-sync-oblio\``.
