# Sinapsă `compliance-consent-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `compliance-consent-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/compliance-consent-check/compliance-consent-check-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `compliance-consent-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `compliance-consent-check` | Traseu în graf; contract neuron: [`../../../neurons/E5/compliance--consent--check.md`](../../../neurons/E5/compliance--consent--check.md). **Triplă autoritate:** v2 **`compliance:consent:check`**; runtime documentat ca **`compliance:gdpr:check`** (`e5:compliance:gdpr-check`) + fluxuri **`referral:consent:*`** complementare — vezi neuron. |
| Destinație (graf) | `e5-compliance` | Agregat **familie compliance E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/compliance.md`](../../../../adr/families/e5/compliance.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **compliance-consent-check** sub agregatul **`e5-compliance`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`compliance-consent-check-winback-campaign-enroll.md`](compliance-consent-check-winback-campaign-enroll.md), [`compliance-consent-check-winback-step-execute.md`](compliance-consent-check-winback-step-execute.md), [`compliance-consent-check-winback-trigger-subsidy.md`](compliance-consent-check-winback-trigger-subsidy.md), [`compliance-consent-check-winback-trigger-weather.md`](compliance-consent-check-winback-trigger-weather.md).

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

- **Runtime (ADR-0001):** `e5-compliance` nu este cheie în `QUEUES`; **`compliance:gdpr:check`** — vezi neuron și registry.
- **Semantic (ADR-0002):** `e5:compliance:gdpr-check` — vezi `NEURON_MATRIX.csv`.
- **Planificare:** v2 §7 — `compliance-consent-check` → `e5-compliance`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Nume v2** vs **coadă GDPR** + referral consent — **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`compliance-consent-check-family\``.
