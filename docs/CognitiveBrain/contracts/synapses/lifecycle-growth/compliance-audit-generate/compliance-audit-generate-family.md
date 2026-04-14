# Sinapsă `compliance-audit-generate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `compliance-audit-generate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/compliance-audit-generate/compliance-audit-generate-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `compliance-audit-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `compliance-audit-generate` | Traseu în graf; contract neuron: [`../../../neurons/E5/compliance--audit--generate.md`](../../../neurons/E5/compliance--audit--generate.md). **Triplă autoritate:** v2 **`compliance:audit:generate`**; runtime **fără** literal dedicat în registry — mapare deschisă către K56–K58 / `compliance:gdpr:check` etc. — vezi neuron și [`../../../../adr/families/e5/compliance.md`](../../../../adr/families/e5/compliance.md). |
| Destinație (graf) | `e5-compliance` | Agregat **familie compliance E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/compliance.md`](../../../../adr/families/e5/compliance.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **compliance-audit-generate** sub agregatul **`e5-compliance`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`compliance-audit-generate-winback-campaign-enroll.md`](compliance-audit-generate-winback-campaign-enroll.md), [`compliance-audit-generate-winback-step-execute.md`](compliance-audit-generate-winback-step-execute.md), [`compliance-audit-generate-winback-trigger-subsidy.md`](compliance-audit-generate-winback-trigger-subsidy.md), [`compliance-audit-generate-winback-trigger-weather.md`](compliance-audit-generate-winback-trigger-weather.md).

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

- **Runtime (ADR-0001):** `e5-compliance` nu este cheie în `QUEUES`; vezi neuron pentru cozi înrudite (K56–K58).
- **Semantic (ADR-0002):** `e5:compliance:competition-law` / `e5:compliance:gdpr-check` — vezi `NEURON_MATRIX.csv` și neuron.
- **Planificare:** v2 §7 — `compliance-audit-generate` → `e5-compliance`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Gap:** v2_queue fără procesor dedicat cu același nume — **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`compliance-audit-generate-family\``.
