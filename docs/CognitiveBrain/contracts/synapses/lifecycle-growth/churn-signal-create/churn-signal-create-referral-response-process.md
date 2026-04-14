# Sinapsă `churn-signal-create-referral-response-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-signal-create-referral-response-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-signal-create/churn-signal-create-referral-response-process.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-signal-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `churn-signal-create` | **Contract:** [`../../../neurons/E5/churn--signal--create.md`](../../../neurons/E5/churn--signal--create.md). **Runtime (ADR-0001):** **`churn:signal:detect`** — vezi neuron. |
| Destinație (graf) | `referral-response-process` | **Contract:** [`../../../neurons/E5/referral--response--process.md`](../../../neurons/E5/referral--response--process.md). E5 — vezi [`../../../../adr/families/e5/referral.md`](../../../../adr/families/e5/referral.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **churn-signal-create** are dependență sintactică față de **referral-response-process**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `churn-signal-create` → `referral-response-process`.
- **Runtime (ADR-0001):** E5 — vezi neuronii.
- **Semantic (ADR-0002):** vezi catalog.

## Limite și reconcilieri

- **Sursă:** reconciliere graf ↔ registry — vezi neuronul churn.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-signal-create-referral-response-process\``.
