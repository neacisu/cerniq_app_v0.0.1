# Sinapsă `wa-media-send-q-email-cold`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-media-send-q-email-cold` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-media-send/wa-media-send-q-email-cold.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-media-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-media-send` | **Runtime:** **`wa:media:send`** — [`../../../neurons/E2/wa--media--send.md`](../../../neurons/E2/wa--media--send.md); **Registry:** `WA_MEDIA_SEND`. |
| Destinație | `q-email-cold` | **`q:email:cold`** — [`../../../neurons/E2/q--email--cold.md`](../../../neurons/E2/q--email--cold.md); **Registry:** `EMAIL_COLD`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** WA media send ↔ **coada principală email cold**. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie.

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

- **Runtime (ADR-0001):** `WA_MEDIA_SEND` → `EMAIL_COLD`.
- **Semantic (ADR-0002):** `e2:wa:media-send` → `e2:email:cold-send`.
- **Planificare:** nod `q-email-cold`.

## Limite și reconcilieri

- Etichetă graf `q-email-cold` vs coadă **`q:email:cold`**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-media-send-q-email-cold\``.
