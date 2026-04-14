# Sinapsă `referral-neighbor-approach-content-seasonal-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-neighbor-approach-content-seasonal-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-neighbor-approach/referral-neighbor-approach-content-seasonal-generate.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-neighbor-approach` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `referral-neighbor-approach` | **Contract:** [`../../../neurons/E5/referral--neighbor--approach.md`](../../../neurons/E5/referral--neighbor--approach.md). |
| Destinație (graf) | `content-seasonal-generate` | **Contract:** [`../../../neurons/E5/content--seasonal--generate.md`](../../../neurons/E5/content--seasonal--generate.md). ADR: [`../../../../adr/families/e5/content.md`](../../../../adr/families/e5/content.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **referral-neighbor-approach** are dependență sintactică față de **content-seasonal-generate**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau ordinea operațională între job-uri.

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

- **Planificare:** v2 §7 — `referral-neighbor-approach` → `content-seasonal-generate`.
- **Runtime / semantic:** vezi neuronii.

## Limite și reconcilieri

- **Sursă:** vezi neuronul neighbor pentru gap complet.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-neighbor-approach-content-seasonal-generate\``.
