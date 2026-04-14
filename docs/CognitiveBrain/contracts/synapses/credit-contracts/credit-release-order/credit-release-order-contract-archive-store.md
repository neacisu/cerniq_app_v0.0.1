# Sinapsă `credit-release-order-contract-archive-store`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-release-order-contract-archive-store` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-release-order/credit-release-order-contract-archive-store.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-release-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-release-order` | **Contract:** [`../../../neurons/E4/credit--release--order.md`](../../../neurons/E4/credit--release--order.md). **Runtime (ADR-0001):** `credit:limit:release` — `E4_CREDIT_LIMIT_RELEASE` (v2: `credit:release:order` — vezi neuron). |
| Destinație (graf) | `contract-archive-store` | **Contract:** [`../../../neurons/E3/contract--archive--store.md`](../../../neurons/E3/contract--archive--store.md). **Semantic (ADR-0002):** `e3:document:archive-store` (vezi neuron). **Etapă:** ținta în **E3**, sursa în **E4**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-release-order** depinde în planificare de **arhivare/stocare contract** — legătură între eliberarea rezervării de credit și pipeline-ul documentelor. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie bucket sau retenție.

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

- **Runtime (ADR-0001):** cozi distincte — sursă limit-release vs `document:archive:store` (E3).
- **Semantic (ADR-0002):** credit E4 → arhivare document E3.
- **Planificare:** v2 §7 — `credit-release-order` → `contract-archive-store`.

## Limite și reconcilieri

- Ordinea operațională între eliberare și arhivare **nu** este encodată în câmpurile sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-release-order-contract-archive-store\``.
