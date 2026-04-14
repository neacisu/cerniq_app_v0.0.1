# Sinapsă `compliance-audit-generate-winback-trigger-subsidy`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `compliance-audit-generate-winback-trigger-subsidy` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/compliance-audit-generate/compliance-audit-generate-winback-trigger-subsidy.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `compliance-audit-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `compliance-audit-generate` | **Contract:** [`../../../neurons/E5/compliance--audit--generate.md`](../../../neurons/E5/compliance--audit--generate.md). **Runtime (ADR-0001):** fără literal v2 — vezi neuron. |
| Destinație (graf) | `winback-trigger-subsidy` | **Contract:** [`../../../neurons/E5/winback--trigger--subsidy.md`](../../../neurons/E5/winback--trigger--subsidy.md). E5 — vezi [`../../../../adr/families/e5/winback.md`](../../../../adr/families/e5/winback.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **compliance-audit-generate** are dependență sintactică față de **winback-trigger-subsidy**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `compliance-audit-generate` → `winback-trigger-subsidy`.
- **Runtime (ADR-0001):** vezi neuronii.
- **Semantic (ADR-0002):** E5 — vezi catalog.

## Limite și reconcilieri

- **Sursă:** reconciliere graf ↔ registry — vezi neuronul audit.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`compliance-audit-generate-winback-trigger-subsidy\``.
