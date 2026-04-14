# Sinapsă `wa-send-initial-q-email-cold`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-initial-q-email-cold` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-initial/wa-send-initial-q-email-cold.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-initial` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-send-initial` | **`wa:send:initial`** (graf) — [`../../../neurons/E2/wa--send--initial.md`](../../../neurons/E2/wa--send--initial.md); **runtime:** **`q:wa:phone-NN`**. |
| Destinație | `q-email-cold` | **`q:email:cold`** — [`../../../neurons/E2/q--email--cold.md`](../../../neurons/E2/q--email--cold.md); **Registry:** `EMAIL_COLD`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** WA inițial ↔ **coada principală email cold**. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie.

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

- **Runtime (ADR-0001):** `q:wa:phone-*` → `EMAIL_COLD`.
- **Semantic (ADR-0002):** `e2:email:cold-send`.
- **Planificare:** `q-email-cold`.

## Limite și reconcilieri

- Etichetă graf vs coadă **`q:email:cold`**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-initial-q-email-cold\``.
