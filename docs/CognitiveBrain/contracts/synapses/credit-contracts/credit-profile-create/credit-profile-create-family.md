# Sinapsă `credit-profile-create-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-profile-create-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-profile-create/credit-profile-create-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-profile-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `credit-profile-create` | Traseu în graf; contract neuron: [`../../../neurons/E4/credit--profile--create.md`](../../../neurons/E4/credit--profile--create.md). **Runtime (ADR-0001):** `credit:profile:create` — `E4_CREDIT_PROFILE_CREATE` în `workers/shared/src/queue-registry.ts`. **Semantic (ADR-0002):** `e4:credit:profile-create`. |
| Destinație (graf) | `e4-credit` | Agregat **familie credit E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e4/credit.md`](../../../adr/families/e4/credit.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **creare profil credit** (`credit-profile-create`, neuron `credit:profile:create` în v2) sub agregatul **`e4-credit`**. v2 descrie funcția cognitivă ca *Creare profil credit + fan-out FlowProducer C14+C15+C16 paralel* — detaliile operaționale stau în contractul neuron și în cod, nu în câmpurile sinapsei. v2: **„specializează familia”**; fără payload în exportul muchiei.

## Sinapse dependență în același traseu

[`credit-profile-create-contract-archive-store.md`](credit-profile-create-contract-archive-store.md), [`credit-profile-create-contract-clause-assemble.md`](credit-profile-create-contract-clause-assemble.md), [`credit-profile-create-contract-generate-docx.md`](credit-profile-create-contract-generate-docx.md), [`credit-profile-create-contract-generate-notice.md`](credit-profile-create-contract-generate-notice.md), [`credit-profile-create-contract-sign-check-expiry.md`](credit-profile-create-contract-sign-check-expiry.md), [`credit-profile-create-contract-sign-complete.md`](credit-profile-create-contract-sign-complete.md), [`credit-profile-create-contract-sign-request.md`](credit-profile-create-contract-sign-request.md), [`credit-profile-create-contract-template-select.md`](credit-profile-create-contract-template-select.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** `e4-credit` nu este cheie în `QUEUES`; sursa folosește `E4_CREDIT_PROFILE_CREATE` — vezi contract neuron.
- **Semantic (ADR-0002):** familia `credit` (v2), nod catalog `e4:credit:profile-create`.
- **Planificare:** v2 §7 — `credit-profile-create` → `e4-credit`.

## Limite și reconcilieri

- Nu se inventează payload / retry / safety / telemetrie pentru muchia `default`.
- Intrările externe în graf către `credit-profile-create` (ex. din fluxuri de plată) sunt **sinapse distincte** în v2 §7 — nu fac parte din acest manifest.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-profile-create-family\``.
