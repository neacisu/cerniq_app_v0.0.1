# Sinapsă `wa-send-initial-alert-internal-campaign-launched`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-initial-alert-internal-campaign-launched` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-initial/wa-send-initial-alert-internal-campaign-launched.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-initial` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-send-initial` | **`wa:send:initial`** (graf) — [`../../../neurons/E2/wa--send--initial.md`](../../../neurons/E2/wa--send--initial.md); **runtime:** **`q:wa:phone-NN`**. |
| Destinație | `alert-internal-campaign-launched` | **`alert:internal:campaign-launched`** — [`../../../neurons/E5/alert--internal--campaign-launched.md`](../../../neurons/E5/alert--internal--campaign-launched.md). **Registry (indicativ din CSV):** legături spre `e5:alert:campaign-trigger` — detalii în contractul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** WA inițial → **alertă internă campanie lansată** (planificare). **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie.

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

- **Runtime (ADR-0001):** cozi WA per-telefon → cozi alertă E5 per contract neuron / `queue-registry.ts` unde e cazul.
- **Semantic (ADR-0002):** `e5:alert:campaign-trigger` (indicativ) — vezi CSV.
- **Planificare:** muchie structurală cross-etapă (E2 → E5 în semantica neuronilor).

## Limite și reconcilieri

- Nu se afirmă handler concret fără contractul E5 citit.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-initial-alert-internal-campaign-launched\``.
