# Sinapsă `referral-consent-expire-wa-send-initial`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-consent-expire-wa-send-initial` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-consent-expire/referral-consent-expire-wa-send-initial.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-consent-expire` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `referral-consent-expire` | **Contract:** [`../../../neurons/E5/referral--consent--expire.md`](../../../neurons/E5/referral--consent--expire.md). **Triplă autoritate:** v2 `referral:consent:expire`; **runtime:** vezi contract neuron (gap documentat). |
| Destinație (graf) | `wa-send-initial` | **Contract (E5):** [`../../../neurons/E5/wa--send--initial.md`](../../../neurons/E5/wa--send--initial.md). **Contract (E2):** [`../../../neurons/E2/wa--send--initial.md`](../../../neurons/E2/wa--send--initial.md). Context: [`../../../../adr/families/e5/content.md`](../../../../adr/families/e5/content.md), [`../../../../adr/families/e2/whatsapp.md`](../../../../adr/families/e2/whatsapp.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **referral-consent-expire** are dependență canonică de pipeline față de **wa-send-initial**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `referral-consent-expire` → `wa-send-initial`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L313**; **Destinație (coadă):** `wa:send:initial` la **L115** (E2) și **L268** (E5) în fișier — duplicate.
- **Runtime:** vezi neuronii; **nu** alegem o singură coadă din muchie.

## Limite și reconcilieri

- **Duplicate registry:** același `nodeKey` pe E2 și E5; muchia din graf nu precizează instanța.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-consent-expire-wa-send-initial\``.
