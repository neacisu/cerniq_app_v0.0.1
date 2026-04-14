# Sinapsă `template-spintax-process-wa-message-retry`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `template-spintax-process-wa-message-retry` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/template-spintax-process/template-spintax-process-wa-message-retry.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `template-spintax-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `template-spintax-process` | **Contract:** [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime (ADR-0001):** `template:spintax:process`. |
| Destinație (graf) | `wa-message-retry` | **Contract:** [`../../../neurons/E2/wa--message--retry.md`](../../../neurons/E2/wa--message--retry.md). **Runtime (ADR-0001):** `wa:message:retry` — contractul neuron documentează **producători cu scheme potențial incompatibile**; vezi fișier neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Spintax** depinde în planificare de **coada de retry mesaje WA**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie politica de retry sau corelarea cu template-uri.

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

- **Runtime (ADR-0001):** vezi `QUEUES.WA_MESSAGE_RETRY` în registry și detaliile din contract neuron.
- **Semantic (ADR-0002):** vezi catalog — contract neuron.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Complexitatea producerilor pe `wa:message:retry` — **nu** rezolvată în sinapsă; vezi [`../../../neurons/E2/wa--message--retry.md`](../../../neurons/E2/wa--message--retry.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`template-spintax-process-wa-message-retry\``.
