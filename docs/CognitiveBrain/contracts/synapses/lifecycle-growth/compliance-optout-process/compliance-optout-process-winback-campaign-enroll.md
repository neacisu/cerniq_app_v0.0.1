# Sinapsă `compliance-optout-process-winback-campaign-enroll`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `compliance-optout-process-winback-campaign-enroll` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/compliance-optout-process/compliance-optout-process-winback-campaign-enroll.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `compliance-optout-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `compliance-optout-process` | **Contract:** [`../../../neurons/E5/compliance--optout--process.md`](../../../neurons/E5/compliance--optout--process.md) — **gap registry** documentat acolo. |
| Destinație (graf) | `winback-campaign-enroll` | **Contract:** [`../../../neurons/E5/winback--campaign--enroll.md`](../../../neurons/E5/winback--campaign--enroll.md). ADR: [`../../../../adr/families/e5/winback.md`](../../../../adr/families/e5/winback.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **compliance-optout-process** are dependență sintactică față de **winback-campaign-enroll**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `compliance-optout-process` → `winback-campaign-enroll`.
- **Runtime:** sursă — vezi gap în neuronul opt-out; ținta winback — vezi neuronul E5 winback.

## Limite și reconcilieri

- Muchia leagă **etichete din graf**; nu afirma execuție directă fără dovezi suplimentare din cod pentru sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`compliance-optout-process-winback-campaign-enroll\``.
