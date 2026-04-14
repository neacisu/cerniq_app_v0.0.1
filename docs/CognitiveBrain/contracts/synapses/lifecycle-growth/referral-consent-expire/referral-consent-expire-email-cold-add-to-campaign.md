# Sinapsă `referral-consent-expire-email-cold-add-to-campaign`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-consent-expire-email-cold-add-to-campaign` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-consent-expire/referral-consent-expire-email-cold-add-to-campaign.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-consent-expire` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `referral-consent-expire` | **Contract:** [`../../../neurons/E5/referral--consent--expire.md`](../../../neurons/E5/referral--consent--expire.md). **Triplă autoritate:** v2 `referral:consent:expire`; **runtime:** vezi contract neuron (gap documentat). |
| Destinație (graf) | `email-cold-add-to-campaign` | **Contract (E5, swimlane content):** [`../../../neurons/E5/email--cold--add-to-campaign.md`](../../../neurons/E5/email--cold--add-to-campaign.md). **Contract (E2):** [`../../../neurons/E2/email--cold--add-to-campaign.md`](../../../neurons/E2/email--cold--add-to-campaign.md). Context: [`../../../../adr/families/e5/content.md`](../../../../adr/families/e5/content.md), [`../../../../adr/families/e2/email-cold.md`](../../../../adr/families/e2/email-cold.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **referral-consent-expire** are dependență canonică de pipeline față de **email-cold-add-to-campaign**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `referral-consent-expire` → `email-cold-add-to-campaign`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L313**; **Destinație (coadă):** `email:cold:add-to-campaign` apare ca **duplicate** la **L65** (E2) și **L267** (E5) în fișier — vezi ambele contracte pentru reconciliere.
- **Runtime:** vezi neuronii; **nu** alegem o singură coadă din muchie.

## Limite și reconcilieri

- **Duplicate registry:** același `nodeKey` v2 apare pe două rânduri (E2 și E5); muchia din graf **nu** spune care instanță este ținta operațională.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-consent-expire-email-cold-add-to-campaign\``.
