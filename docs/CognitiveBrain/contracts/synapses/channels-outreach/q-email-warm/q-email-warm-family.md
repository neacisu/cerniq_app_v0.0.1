# Sinapsă `q-email-warm-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-email-warm-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-email-warm/q-email-warm-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-email-warm` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `q-email-warm` | Nod în graf; contract motor warm: [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md). **Runtime (ADR-0001):** `QUEUES.EMAIL_WARM` → literal `q:email:warm` în `queue-registry.ts`, aliniat cu câmpul **Confirmed queue field** din v2 pentru `q:email:warm`. |
| Destinație (graf) | `e2-email-cold` | Agregat **familie E2 email cold** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e2/email-cold.md`](../../../adr/families/e2/email-cold.md). **Semantic (ADR-0002):** subgraf `email-cold`; muchia exprimă clasificare în graf, nu un enqueue concret către un singur handler. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **`q-email-warm`** sub agregatul **`e2-email-cold`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei. Detaliile operaționale (ex. canal Resend, stări lead) stau în contractele neuron și în cod, nu în exportul muchiei de clasificare.

## Sinapse dependență în același traseu

[`q-email-warm-email-warm-document.md`](q-email-warm-email-warm-document.md), [`q-email-warm-email-warm-proforma.md`](q-email-warm-email-warm-proforma.md), [`q-email-warm-email-warm-send.md`](q-email-warm-email-warm-send.md).

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

- **Runtime (ADR-0001):** sursa `q:email:warm` există în registry; ținta `e2-email-cold` nu este cheie în `QUEUES`.
- **Semantic (ADR-0002):** `e2:email:warm-send` / `q:email:warm` în catalog; v2 plasează antetul neuronului `q:email:warm` în **familia `email-cold`** — tensiune taxonomică față de eticheta „warm”, documentată în v2, nu rezolvată de această sinapsă.
- **Planificare:** v2 §7 — `q-email-warm` → `e2-email-cold`.

## Limite și reconcilieri

- Distinge **nod graf** `q-email-warm` de **coadă runtime** `q:email:warm` — vezi contract neuron sursă.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-email-warm-family\``.
