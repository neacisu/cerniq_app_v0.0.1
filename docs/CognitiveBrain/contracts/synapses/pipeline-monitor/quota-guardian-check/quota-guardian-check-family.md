# Sinapsă `quota-guardian-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `quota-guardian-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/quota-guardian-check/quota-guardian-check-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `quota-guardian-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `quota-guardian-check` | Traseu în graf; contract neuron: [`../../../neurons/E2/quota--guardian--check.md`](../../../neurons/E2/quota--guardian--check.md). **Triplă autoritate:** v2 **`quota:guardian:check`**; runtime canonic **`e2:quota:guardian-check`** — vezi neuron și registry. |
| Destinație (graf) | `e2-quota` | Agregat **familie quota E2** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e2/quota.md`](../../../../adr/families/e2/quota.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **quota-guardian-check** sub agregatul **`e2-quota`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`quota-guardian-check-outreach-channel-selector.md`](quota-guardian-check-outreach-channel-selector.md), [`quota-guardian-check-outreach-orchestrator-dispatch.md`](quota-guardian-check-outreach-orchestrator-dispatch.md), [`quota-guardian-check-outreach-orchestrator-router.md`](quota-guardian-check-outreach-orchestrator-router.md), [`quota-guardian-check-outreach-phone-allocator.md`](quota-guardian-check-outreach-phone-allocator.md), [`quota-guardian-check-outreach-wa-delay.md`](quota-guardian-check-outreach-wa-delay.md), [`quota-guardian-check-outreach-wa-reschedule.md`](quota-guardian-check-outreach-wa-reschedule.md), [`quota-guardian-check-outreach-wa-send.md`](quota-guardian-check-outreach-wa-send.md).

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

- **Planificare:** v2 §7 — `quota-guardian-check` → `e2-quota`.
- **Semantic (ADR-0002):** [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `quota:guardian:check`, rând **97**; `nodeKey` **`e2:quota:guardian-check`**.
- **Runtime (ADR-0001):** vezi contractul neuron și `queue-registry.ts`.

## Limite și reconcilieri

- **`e2-quota`** este agregat de planificare, nu înlocuitor pentru `nodeKey`-ul sursei.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`quota-guardian-check-family\``.
