# Sinapsă `credit-data-fetch-bilant-contract-archive-store`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-data-fetch-bilant-contract-archive-store` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-data-fetch-bilant/credit-data-fetch-bilant-contract-archive-store.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-data-fetch-bilant` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-data-fetch-bilant` | **Contract:** [`../../../neurons/E4/credit--data--fetch-bilant.md`](../../../neurons/E4/credit--data--fetch-bilant.md). **Runtime (ADR-0001):** `credit:data:fetch-bilant` — `E4_CREDIT_DATA_FETCH_BILANT` în `workers/shared/src/queue-registry.ts`. |
| Destinație (graf) | `contract-archive-store` | **Contract:** [`../../../neurons/E3/contract--archive--store.md`](../../../neurons/E3/contract--archive--store.md). **Semantic (ADR-0002):** `e3:document:archive-store` (vezi neuron). **Etapă:** ținta este în **E3** (documente), sursa în **E4** — tensiune de etapă documentată prin contracte, nu rezolvată de sinapsă. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-data-fetch-bilant** depinde în planificare de **arhivare/stocare contract** — legătură între subgraful de date contabile pentru credit și pipeline-ul documentelor. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie bucket, criptare sau retenție.

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

- **Runtime (ADR-0001):** cozi distincte — vezi contracte neuron sursă (E4) și arhivare (E3, `document:archive:store` în runtime).
- **Semantic (ADR-0002):** credit E4 → arhivare document E3.
- **Planificare:** v2 §7 — `credit-data-fetch-bilant` → `contract-archive-store`.

## Limite și reconcilieri

- Ordinea operațională între job-ul bilanț și arhivare **nu** este encodată în câmpurile sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-data-fetch-bilant-contract-archive-store\``.
