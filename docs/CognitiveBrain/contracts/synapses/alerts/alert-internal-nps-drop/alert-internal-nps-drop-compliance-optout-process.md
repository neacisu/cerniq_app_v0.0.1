# Sinapsă `alert-internal-nps-drop-compliance-optout-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-nps-drop-compliance-optout-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-nps-drop/alert-internal-nps-drop-compliance-optout-process.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-nps-drop` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-internal-nps-drop` | **Contract:** [`../../../neurons/E5/alert--internal--nps-drop.md`](../../../neurons/E5/alert--internal--nps-drop.md). **Runtime:** v2 `alert:internal:nps-drop` fără literal în registry la audit — vezi contract. |
| Destinație (graf) | `compliance-optout-process` | **Contract:** [`../../../neurons/E5/compliance--optout--process.md`](../../../neurons/E5/compliance--optout--process.md). **Gap:** fără coadă literală `compliance:optout:process` în registry; fluxuri înrudite în outreach (email/SMS) — vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Alerta internă scădere NPS** este legată canonic de **procesarea opt-out / retrageri** (etichetă v2). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie canalul sau starea lead-ului.

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

- **Runtime (ADR-0001):** sursă cu gap vs ținta cu gap / fluxuri dispersate — vezi contracte.
- **Semantic (ADR-0002):** alerts E5 vs compliance E5.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Opt-out-ul operațional nu este centralizat pe o coadă unică la audit; muchia rămâne planificare.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-nps-drop-compliance-optout-process\``.
