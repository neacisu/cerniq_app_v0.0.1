# Sinapsă `compliance-data-anonymize-winback-campaign-enroll`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `compliance-data-anonymize-winback-campaign-enroll` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/compliance-data-anonymize/compliance-data-anonymize-winback-campaign-enroll.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `compliance-data-anonymize` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `compliance-data-anonymize` | **Contract:** [`../../../neurons/E4/compliance--data--anonymize.md`](../../../neurons/E4/compliance--data--anonymize.md). **Runtime (ADR-0001):** **`audit:data:anonymize`** — vezi neuron. |
| Destinație (graf) | `winback-campaign-enroll` | **Contract:** [`../../../neurons/E5/winback--campaign--enroll.md`](../../../neurons/E5/winback--campaign--enroll.md). E5 — vezi [`../../../../adr/families/e5/winback.md`](../../../../adr/families/e5/winback.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **compliance-data-anonymize** are dependență sintactică față de **winback-campaign-enroll**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `compliance-data-anonymize` → `winback-campaign-enroll`.
- **Runtime (ADR-0001):** sursă E4 (`audit:data:anonymize`); ținta E5 winback — vezi neuronii.
- **Semantic (ADR-0002):** `e4:audit:data-anonymize` vs `e5:*` winback — vezi catalog.

## Limite și reconcilieri

- **Sursă:** `compliance:*` (v2) vs `audit:*` (registry) — vezi neuron.
- Muchia leagă noduri din graf; **nu** implică singură execuție cross-stage fără orchestrare suplimentară.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`compliance-data-anonymize-winback-campaign-enroll\``.
