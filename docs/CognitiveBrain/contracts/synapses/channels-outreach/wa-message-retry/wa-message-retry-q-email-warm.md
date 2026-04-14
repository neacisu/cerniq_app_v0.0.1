# Sinapsă `wa-message-retry-q-email-warm`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-message-retry-q-email-warm` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-message-retry/wa-message-retry-q-email-warm.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-message-retry` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-message-retry` | **Runtime:** **`wa:message:retry`** — [`../../../neurons/E2/wa--message--retry.md`](../../../neurons/E2/wa--message--retry.md); **Registry:** `WA_MESSAGE_RETRY`. |
| Destinație | `q-email-warm` | **`q:email:warm`** — [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md); **Registry:** `EMAIL_WARM`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** între **`wa-message-retry`** și **`q-email-warm`**. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie.

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

- **Runtime (ADR-0001):** `WA_MESSAGE_RETRY` → `EMAIL_WARM`.
- **Semantic (ADR-0002):** `e2:email:warm-send`.
- **Planificare:** `q-email-warm`.

## Limite și reconcilieri

- Coada warm — **`q:email:warm`**; vezi contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-message-retry-q-email-warm\``.
