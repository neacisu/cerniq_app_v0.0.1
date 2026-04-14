# Sinapsă `q-email-cold-email-warm-proforma`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-email-cold-email-warm-proforma` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-email-cold/q-email-cold-email-warm-proforma.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-email-cold` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-email-cold` | **Contract:** [`../../../neurons/E2/q--email--cold.md`](../../../neurons/E2/q--email--cold.md). **Runtime (ADR-0001):** `q:email:cold`. **Semantic (ADR-0002):** `e2:email:cold-send`. |
| Destinație (graf) | `email-warm-proforma` | **Contract:** [`../../../neurons/E2/email--warm--proforma.md`](../../../neurons/E2/email--warm--proforma.md). **Runtime (ADR-0001):** `email:warm:proforma` (`QUEUES.EMAIL_WARM_PROFORMA`). **Semantic (ADR-0002):** `e2:email:warm-proforma`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependență de planificare între **q-email-cold** și nodul **`email-warm-proforma`**. v2: **„sinapsă canonică de pipeline”**; fără detalii în export despre trigger-ul business sau conținutul job-urilor.

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

- **Runtime (ADR-0001):** cozi distincte în registry pentru cold send și warm proforma — vezi contracte.
- **Semantic (ADR-0002):** cold motor → warm proforma procedural/motor conform catalogului.
- **Planificare:** `q-email-cold` → `email-warm-proforma`.

## Limite și reconcilieri

- Lanțul efectiv (condiții business, idempotență) nu se deduce din sinapsă; vezi workeri și contracte neuron.
- **Semantică runtime vs etichetă:** [`email--warm--proforma.md`](../../../neurons/E2/email--warm--proforma.md) notează **divergență** între denumirea „proforma” și pipeline-ul de **reply / click** warm în cod — muchia rămâne ancorată doar în structura v2 §7.
- Respectă absența din export a schemelor și politicilor.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-email-cold-email-warm-proforma\``.
