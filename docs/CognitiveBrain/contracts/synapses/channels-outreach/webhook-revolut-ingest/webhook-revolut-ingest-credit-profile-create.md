# Sinapsă `webhook-revolut-ingest-credit-profile-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `webhook-revolut-ingest-credit-profile-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/webhook-revolut-ingest/webhook-revolut-ingest-credit-profile-create.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `webhook-revolut-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `webhook-revolut-ingest` | **Contract:** [`../../../neurons/E4/webhook--revolut--ingest.md`](../../../neurons/E4/webhook--revolut--ingest.md). |
| Destinație (graf) | `credit-profile-create` | **Contract:** [`../../../neurons/E4/credit--profile--create.md`](../../../neurons/E4/credit--profile--create.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2: **„sinapsă canonică de pipeline”** între **ingest Revolut** și **creare profil credit** în graful de planificare.

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

- **Runtime / Semantic:** E4 cash.
- **Planificare:** `dependency`.

## Limite și reconcilieri

- Crearea profilului poate fi condiționată de alți pași din pipeline-ul credit — vezi muchii adiacente în graf și cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`webhook-revolut-ingest-credit-profile-create\``.
