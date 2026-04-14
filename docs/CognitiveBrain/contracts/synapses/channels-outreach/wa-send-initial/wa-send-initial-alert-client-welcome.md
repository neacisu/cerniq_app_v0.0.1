# Sinapsă `wa-send-initial-alert-client-welcome`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-initial-alert-client-welcome` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-initial/wa-send-initial-alert-client-welcome.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-initial` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-send-initial` | **`wa:send:initial`** (graf) — [`../../../neurons/E2/wa--send--initial.md`](../../../neurons/E2/wa--send--initial.md); **runtime:** **`q:wa:phone-NN`**. |
| Destinație | `alert-client-welcome` | **`alert:client:welcome`** — [`../../../neurons/E5/alert--client--welcome.md`](../../../neurons/E5/alert--client--welcome.md). Contractul neuron notează **lipsă** la audit a cozii cu acest nume literal în `queue-registry.ts` — reconciliere necesară pentru execuție. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** între **WA inițial** și **alertă bun venit client** în graf. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie.

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

- **Runtime (ADR-0001):** sursă — cozi `q:wa:phone-*`; țintă — vezi limită din contract E5.
- **Semantic (ADR-0002):** alertă E5 / nurturing — CSV.
- **Planificare:** capete din export.

## Limite și reconcilieri

- Gap registry pentru `alert:client:welcome` — explicit în contract neuron; **nu** se inventează coadă aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-initial-alert-client-welcome\``.
