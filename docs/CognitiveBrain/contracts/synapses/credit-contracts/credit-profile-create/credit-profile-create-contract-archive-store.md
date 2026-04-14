# Sinapsă `credit-profile-create-contract-archive-store`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-profile-create-contract-archive-store` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-profile-create/credit-profile-create-contract-archive-store.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-profile-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-profile-create` | **Contract:** [`../../../neurons/E4/credit--profile--create.md`](../../../neurons/E4/credit--profile--create.md). **Runtime (ADR-0001):** `credit:profile:create` — `E4_CREDIT_PROFILE_CREATE` în `workers/shared/src/queue-registry.ts`. |
| Destinație (graf) | `contract-archive-store` | **Contract:** [`../../../neurons/E3/contract--archive--store.md`](../../../neurons/E3/contract--archive--store.md). **Semantic (ADR-0002):** `e3:document:archive-store` (vezi neuron). **Etapă:** ținta este în **E3** (documente), sursa în **E4** — tensiune de etapă documentată prin contracte, nu rezolvată de sinapsă. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-profile-create** depinde în planificare de **arhivare/stocare contract** — cuplare între crearea profilului de credit (și fan-out-ul asociat în implementare) și pipeline-ul documentelor. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie bucket, criptare sau politici de retenție.

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

- **Runtime (ADR-0001):** cozi distincte — sursă E4 vs arhivare document `document:archive:store` (vezi neuron E3).
- **Semantic (ADR-0002):** credit E4 → arhivare document E3.
- **Planificare:** v2 §7 — `credit-profile-create` → `contract-archive-store`.

## Limite și reconcilieri

- Ordinea operațională strictă între job-ul de profil și arhivare **nu** este encodată în câmpurile sinapsei din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-profile-create-contract-archive-store\``.
