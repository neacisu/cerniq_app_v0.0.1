# Sinapsă `q-email-cold-email-warm-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-email-cold-email-warm-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-email-cold/q-email-cold-email-warm-send.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-email-cold` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-email-cold` | **Contract:** [`../../../neurons/E2/q--email--cold.md`](../../../neurons/E2/q--email--cold.md). **Runtime (ADR-0001):** `q:email:cold`. **Semantic (ADR-0002):** `e2:email:cold-send`. |
| Destinație (graf) | `email-warm-send` | **Contract:** [`../../../neurons/E2/email--warm--send.md`](../../../neurons/E2/email--warm--send.md). **Runtime (ADR-0001):** v2 queue `email:warm:send` **nu** are intrare literală separată în registry; trimiterea warm rulează pe **`q:email:warm`** cu **`e2:email:warm-send`** — vezi contract neuron (reconciliere explicită). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graf, **email cold** este legat canonic de nodul **`email-warm-send`**. v2: **„sinapsă canonică de pipeline”**. Semantica de rutare către canalul warm efectiv este documentată la neuroni (cold vs `q:email:warm`), nu în câmpurile sinapsei.

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

- **Runtime (ADR-0001):** **reconciliere necesară** între eticheta graf `email-warm-send` și coada **`q:email:warm`** — vezi [`email--warm--send.md`](../../../neurons/E2/email--warm--send.md) și [`q--email--warm.md`](../../../neurons/E2/q--email--warm.md).
- **Semantic (ADR-0002):** `e2:email:cold-send` (sursă) vs `e2:email:warm-send` (țintă operațională).
- **Planificare:** `q-email-cold` → `email-warm-send`.

## Limite și reconcilieri

- **Graf vs registry:** nodul `email-warm-send` nu trebuie confundat cu un literal `QUEUES` omolog fără audit — vezi contracte neuron.
- Fără presupuneri despre payload sau retry din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-email-cold-email-warm-send\``.
