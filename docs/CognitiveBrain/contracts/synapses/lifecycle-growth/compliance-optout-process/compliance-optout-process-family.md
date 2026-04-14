# Sinapsă `compliance-optout-process-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `compliance-optout-process-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/compliance-optout-process/compliance-optout-process-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `compliance-optout-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `compliance-optout-process` | Traseu în graf; contract neuron: [`../../../neurons/E5/compliance--optout--process.md`](../../../neurons/E5/compliance--optout--process.md). **Triplă autoritate:** v2 **`compliance:optout:process`**, etapă **E5** în v2; **runtime:** neuronul documentează **lipsă** cozii `compliance:optout:process` în `queue-registry.ts` și logică împrăștiată în workeri outreach (E2) — vezi neuron. |
| Destinație (graf) | `e5-compliance` | Agregat **familie compliance** în planificare. ADR indicativ: [`../../../../adr/families/e5/compliance.md`](../../../../adr/families/e5/compliance.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **compliance-optout-process** sub agregatul **`e5-compliance`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie.

## Sinapse dependență în același traseu

[`compliance-optout-process-winback-campaign-enroll.md`](compliance-optout-process-winback-campaign-enroll.md), [`compliance-optout-process-winback-step-execute.md`](compliance-optout-process-winback-step-execute.md), [`compliance-optout-process-winback-trigger-subsidy.md`](compliance-optout-process-winback-trigger-subsidy.md), [`compliance-optout-process-winback-trigger-weather.md`](compliance-optout-process-winback-trigger-weather.md).

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

- **Planificare:** v2 §7 — `compliance-optout-process` → `e5-compliance`.
- **Semantic (ADR-0002):** vezi [`../../../neurons/E5/compliance--optout--process.md`](../../../neurons/E5/compliance--optout--process.md) pentru tip neuron v2 și reconciliere cu implementarea outreach (fără mapare 1:1 la o singură coadă în registry).
- **Runtime (ADR-0001):** **gap documentat** — fără coadă omologă în registry; vezi [`../../../neurons/E5/compliance--optout--process.md`](../../../neurons/E5/compliance--optout--process.md).

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Reconciliere obligatorie:** nod **E5** în v2 vs **căi operaționale E2/outreach** în cod — explicit în neuron; graful **nu** înlocuiește dovada runtime.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`compliance-optout-process-family\``.
