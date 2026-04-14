# Sinapsă `credit-limit-calculate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-limit-calculate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-limit-calculate/credit-limit-calculate-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-limit-calculate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `credit-limit-calculate` | Traseu în graf; contract neuron: [`../../../neurons/E4/credit--limit--calculate.md`](../../../neurons/E4/credit--limit--calculate.md). **Runtime (ADR-0001):** `credit:limit:calculate` — `E4_CREDIT_LIMIT_CALCULATE`. **Semantic (ADR-0002):** `e4:credit:limit-calculate`. **v2 neuron:** criticitate **CRITICAL**, politici HITL/SLA descrise la nivel de neuron — **nu** în câmpurile sinapsei de familie. |
| Destinație (graf) | `e4-credit` | Agregat **familie credit E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e4/credit.md`](../../../adr/families/e4/credit.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **calcul limită credit** (`credit-limit-calculate`) sub agregatul **`e4-credit`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei. Praguri, aprobări și actualizarea profilului documentate în **contractul neuron** și în cod rămân acolo, nu în această muchie.

## Sinapse dependență în același traseu

[`credit-limit-calculate-contract-archive-store.md`](credit-limit-calculate-contract-archive-store.md), [`credit-limit-calculate-contract-clause-assemble.md`](credit-limit-calculate-contract-clause-assemble.md), [`credit-limit-calculate-contract-generate-docx.md`](credit-limit-calculate-contract-generate-docx.md), [`credit-limit-calculate-contract-generate-notice.md`](credit-limit-calculate-contract-generate-notice.md), [`credit-limit-calculate-contract-sign-check-expiry.md`](credit-limit-calculate-contract-sign-check-expiry.md), [`credit-limit-calculate-contract-sign-complete.md`](credit-limit-calculate-contract-sign-complete.md), [`credit-limit-calculate-contract-sign-request.md`](credit-limit-calculate-contract-sign-request.md), [`credit-limit-calculate-contract-template-select.md`](credit-limit-calculate-contract-template-select.md).

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

- **Runtime (ADR-0001):** `e4-credit` nu este cheie în `QUEUES`; sursa folosește `E4_CREDIT_LIMIT_CALCULATE` — vezi contract neuron.
- **Semantic (ADR-0002):** familia `credit` (v2), nod catalog `e4:credit:limit-calculate`.
- **Planificare:** v2 §7 — `credit-limit-calculate` → `e4-credit`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Detaliile HITL (>50K RON, SLA CFO) din **v2** apar la **neuron**, nu la nivelul sinapsei `default` — vezi [`../../../neurons/E4/credit--limit--calculate.md`](../../../neurons/E4/credit--limit--calculate.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-limit-calculate-family\``.
