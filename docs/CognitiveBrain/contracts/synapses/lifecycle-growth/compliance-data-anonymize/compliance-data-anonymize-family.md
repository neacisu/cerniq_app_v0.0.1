# Sinapsă `compliance-data-anonymize-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `compliance-data-anonymize-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/compliance-data-anonymize/compliance-data-anonymize-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `compliance-data-anonymize` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `compliance-data-anonymize` | Traseu în graf; contract neuron: [`../../../neurons/E4/compliance--data--anonymize.md`](../../../neurons/E4/compliance--data--anonymize.md). **Triplă autoritate:** v2 **`compliance:data:anonymize`**; **etapă neuron E4**; runtime **`audit:data:anonymize`** / **`e4:audit:data-anonymize`** — vezi neuron (prefix `compliance:*` vs `audit:*`). |
| Destinație (graf) | `e5-compliance` | Agregat **familie compliance** în **planificare** (etichetă E5 în graf); neuronul sursă este însă **E4** — vezi reconcilierea de mai jos. ADR indicativ E4: [`../../../../adr/families/e4/compliance.md`](../../../../adr/families/e4/compliance.md); context E5: [`../../../../adr/families/e5/compliance.md`](../../../../adr/families/e5/compliance.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **compliance-data-anonymize** sub agregatul **`e5-compliance`** în exportul de graf. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`compliance-data-anonymize-winback-campaign-enroll.md`](compliance-data-anonymize-winback-campaign-enroll.md), [`compliance-data-anonymize-winback-step-execute.md`](compliance-data-anonymize-winback-step-execute.md), [`compliance-data-anonymize-winback-trigger-subsidy.md`](compliance-data-anonymize-winback-trigger-subsidy.md), [`compliance-data-anonymize-winback-trigger-weather.md`](compliance-data-anonymize-winback-trigger-weather.md).

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

- **Runtime (ADR-0001):** **`audit:data:anonymize`** — vezi neuron și `queue-registry.ts`.
- **Semantic (ADR-0002):** **`e4:audit:data-anonymize`** — vezi `cognitive-node-catalog.ts` (citat în neuron).
- **Planificare:** v2 §7 — `compliance-data-anonymize` → `e5-compliance`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Reconciliere obligatorie:** agregat graf **`e5-compliance`** vs **worker E4** și coada **`audit:*`** — documentat în neuron; **nu** echivala automat etapa din graf cu etapa runtime fără acest contract.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`compliance-data-anonymize-family\``.
