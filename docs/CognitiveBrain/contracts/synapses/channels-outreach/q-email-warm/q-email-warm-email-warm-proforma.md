# Sinapsă `q-email-warm-email-warm-proforma`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-email-warm-email-warm-proforma` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-email-warm/q-email-warm-email-warm-proforma.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-email-warm` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-email-warm` | **Contract:** [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md). **Runtime (ADR-0001):** `q:email:warm` (`QUEUES.EMAIL_WARM`). |
| Destinație (graf) | `email-warm-proforma` | **Contract:** [`../../../neurons/E2/email--warm--proforma.md`](../../../neurons/E2/email--warm--proforma.md). **Runtime (ADR-0001):** `QUEUES.EMAIL_WARM_PROFORMA` → literal `email:warm:proforma` în `queue-registry.ts`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **email warm** depinde în graf de **generarea / procesarea proformei** asociate aceluiași canal. v2: **„sinapsă canonică de pipeline”**; exportul nu fixează șabloane, câmpuri fiscale sau ordinea exactă a job-urilor.

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

- **Runtime (ADR-0001):** cozi separate în registry — sursă și țintă au contracte neuron dedicate.
- **Semantic (ADR-0002):** `e2:email:warm-proforma` / `email:warm:proforma` pentru țintă; sursa rămâne axată pe trimitere (`e2:email:warm-send`).
- **Planificare:** dependență declarativă `q-email-warm` → `email-warm-proforma`.

## Limite și reconcilieri

- Nu se inferă din muchie dacă proforma este mereu un pre-step sincron sau doar o ramură opțională — doar dependența din export.
- Orice logică fiscală / documente: contract neuron `email:warm:proforma`, nu sinapsa.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-email-warm-email-warm-proforma\``.
