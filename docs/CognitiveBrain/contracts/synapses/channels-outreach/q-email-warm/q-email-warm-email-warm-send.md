# Sinapsă `q-email-warm-email-warm-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-email-warm-email-warm-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-email-warm/q-email-warm-email-warm-send.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-email-warm` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-email-warm` | **Contract:** [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md). **Runtime (ADR-0001):** trimiterea warm este implementată pe **`q:email:warm`** (`QUEUES.EMAIL_WARM`). |
| Destinație (graf) | `email-warm-send` | **Contract:** [`../../../neurons/E2/email--warm--send.md`](../../../neurons/E2/email--warm--send.md). **Runtime (ADR-0001):** **nu** există coadă literală `email:warm:send` în `queue-registry.ts`; reconcilierea graf ↔ runtime este documentată în contractul neuron destinație (equiv. `q:email:warm` + `e2:email:warm-send`). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graf, traseul **`q-email-warm`** este legat de nodul **`email-warm-send`** ca dependență de pipeline pentru acțiunea de trimitere. v2: **„sinapsă canonică de pipeline”**. Exportul nu spune cum se propagă starea între noduri sau dacă ambele etichete descriu același flux fizic — reconcilierea este în contractele neuron, inclusiv pentru denumirea cozii.

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

- **Runtime (ADR-0001):** **atenție:** nod graf `email-warm-send` ≠ nume de coadă în registry; executabilul de trimitere este `q:email:warm`.
- **Semantic (ADR-0002):** `e2:email:warm-send` în catalog, mapat la **`q:email:warm`** — vezi `cognitive-node-catalog.ts` și contract `q--email--warm.md`.
- **Planificare:** dependență declarativă `q-email-warm` → `email-warm-send`.

## Limite și reconcilieri

- Această muchie poate reflecta o **dublare conceptuală** în graf (același scop operațional sub două etichete) sau o descompunere planificată — nu se alege o interpretare fără dovezi suplimentare din cod sau din v2 în afara câmpurilor sinapsei.
- Citire obligatorie: [`../../../neurons/E2/email--warm--send.md`](../../../neurons/E2/email--warm--send.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-email-warm-email-warm-send\``.
