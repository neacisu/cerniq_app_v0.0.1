# Sinapsă `credit-profile-create-contract-sign-complete`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-profile-create-contract-sign-complete` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-profile-create/credit-profile-create-contract-sign-complete.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-profile-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-profile-create` | **Contract:** [`../../../neurons/E4/credit--profile--create.md`](../../../neurons/E4/credit--profile--create.md). **Runtime (ADR-0001):** `credit:profile:create` — `E4_CREDIT_PROFILE_CREATE` în `workers/shared/src/queue-registry.ts`. |
| Destinație (graf) | `contract-sign-complete` | **Contract (neuron):** [`../../../neurons/E4/contract--sign--complete.md`](../../../neurons/E4/contract--sign--complete.md). **Traseu sinapse:** [`../contract-sign-complete/`](../contract-sign-complete/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-profile-create** depinde în planificare de **finalizarea semnăturii** contractului. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie probe, hash-uri sau stocare probă.

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
- **Semantic (ADR-0002):** credit E4 ↔ semnătură E4.
- **Planificare:** v2 §7 — `credit-profile-create` → `contract-sign-complete`.

## Limite și reconcilieri

- Nu se inferă din sinapsă dacă finalizarea semnăturii este condiționată de un scor sau limită de credit anume — doar dependența structurală din graf.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-profile-create-contract-sign-complete\``.
