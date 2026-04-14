# Sinapsă `churn-signal-create-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-signal-create-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-signal-create/churn-signal-create-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-signal-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-signal-create` | Traseu în graf; contract neuron: [`../../../neurons/E5/churn--signal--create.md`](../../../neurons/E5/churn--signal--create.md). **Triplă autoritate:** v2 **`churn:signal:create`**; runtime documentat în neuron ca **`churn:signal:detect`** / **`e5:churn:signal-detect`** — vezi `queue-registry.ts` și catalog. |
| Destinație (graf) | `e5-churn` | Agregat **familie churn E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/churn.md`](../../../../adr/families/e5/churn.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **churn-signal-create** sub agregatul **`e5-churn`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`churn-signal-create-campaign-cluster-launch.md`](churn-signal-create-campaign-cluster-launch.md), [`churn-signal-create-referral-consent-expire.md`](churn-signal-create-referral-consent-expire.md), [`churn-signal-create-referral-consent-request.md`](churn-signal-create-referral-consent-request.md), [`churn-signal-create-referral-eligibility-check.md`](churn-signal-create-referral-eligibility-check.md), [`churn-signal-create-referral-neighbor-approach.md`](churn-signal-create-referral-neighbor-approach.md), [`churn-signal-create-referral-potential-tag.md`](churn-signal-create-referral-potential-tag.md), [`churn-signal-create-referral-request-prepare.md`](churn-signal-create-referral-request-prepare.md), [`churn-signal-create-referral-request-send.md`](churn-signal-create-referral-request-send.md), [`churn-signal-create-referral-response-process.md`](churn-signal-create-referral-response-process.md), [`churn-signal-create-referral-reward-process.md`](churn-signal-create-referral-reward-process.md).

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

- **Runtime (ADR-0001):** `e5-churn` nu este cheie în `QUEUES`; coada operațională pentru semnal: **`churn:signal:detect`** — vezi neuron.
- **Semantic (ADR-0002):** `e5:churn:signal-detect` — vezi `cognitive-node-catalog.ts` (citat în neuron).
- **Planificare:** v2 §7 — `churn-signal-create` → `e5-churn`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **create** (v2) vs **detect** (runtime) — **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-signal-create-family\``.
