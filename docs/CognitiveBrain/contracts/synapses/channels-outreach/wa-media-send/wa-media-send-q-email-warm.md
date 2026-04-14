# Sinapsă `wa-media-send-q-email-warm`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-media-send-q-email-warm` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-media-send/wa-media-send-q-email-warm.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-media-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-media-send` | **Runtime:** **`wa:media:send`** — [`../../../neurons/E2/wa--media--send.md`](../../../neurons/E2/wa--media--send.md); **Registry:** `WA_MEDIA_SEND`. |
| Destinație | `q-email-warm` | **`q:email:warm`** — [`../../../neurons/E2/q--email--warm.md`](../../../neurons/E2/q--email--warm.md); **Registry:** `EMAIL_WARM`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** între **`wa-media-send`** și **`q-email-warm`**. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie.

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

- **Runtime (ADR-0001):** `WA_MEDIA_SEND` → `EMAIL_WARM`.
- **Semantic (ADR-0002):** `e2:email:warm-send`.
- **Planificare:** `q-email-warm`.

## Limite și reconcilieri

- Trimitere warm pe **`q:email:warm`** — vezi contract `q--email--warm.md`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-media-send-q-email-warm\``.
