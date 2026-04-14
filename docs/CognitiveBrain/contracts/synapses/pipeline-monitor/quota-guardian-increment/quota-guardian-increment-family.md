# Sinapsă `quota-guardian-increment-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `quota-guardian-increment-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/quota-guardian-increment/quota-guardian-increment-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `quota-guardian-increment` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `quota-guardian-increment` | Traseu în graf; contract neuron: [`../../../neurons/E2/quota--guardian--increment.md`](../../../neurons/E2/quota--guardian--increment.md). **Triplă autoritate:** v2 **`quota:guardian:increment`**; runtime canonic **`e2:quota:guardian-increment`** — vezi neuron și registry. |
| Destinație (graf) | `e2-quota` | Agregat **familie quota E2** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e2/quota.md`](../../../../adr/families/e2/quota.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **quota-guardian-increment** sub agregatul **`e2-quota`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`quota-guardian-increment-outreach-channel-selector.md`](quota-guardian-increment-outreach-channel-selector.md), [`quota-guardian-increment-outreach-orchestrator-dispatch.md`](quota-guardian-increment-outreach-orchestrator-dispatch.md), [`quota-guardian-increment-outreach-orchestrator-router.md`](quota-guardian-increment-outreach-orchestrator-router.md), [`quota-guardian-increment-outreach-phone-allocator.md`](quota-guardian-increment-outreach-phone-allocator.md), [`quota-guardian-increment-outreach-wa-delay.md`](quota-guardian-increment-outreach-wa-delay.md), [`quota-guardian-increment-outreach-wa-reschedule.md`](quota-guardian-increment-outreach-wa-reschedule.md), [`quota-guardian-increment-outreach-wa-send.md`](quota-guardian-increment-outreach-wa-send.md).

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

- **Planificare:** v2 §7 — `quota-guardian-increment` → `e2-quota`.
- **Semantic (ADR-0002):** [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `quota:guardian:increment`, rând **98**; `nodeKey` **`e2:quota:guardian-increment`**.
- **Runtime (ADR-0001):** vezi contractul neuron.

## Limite și reconcilieri

- **`e2-quota`** este agregat de planificare; sursa are `nodeKey` distinct în catalog.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`quota-guardian-increment-family\``.
