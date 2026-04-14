# Sinapsă `email-cold-campaign-pause-email-warm-document`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-campaign-pause-email-warm-document` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-campaign-pause/email-cold-campaign-pause-email-warm-document.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-campaign-pause` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-cold-campaign-pause` | **Runtime:** **`email:cold:campaign:pause`** — [`../../../neurons/E2/email--cold--campaign--pause.md`](../../../neurons/E2/email--cold--campaign--pause.md); **Registry:** `EMAIL_COLD_CAMPAIGN_PAUSE`. |
| Destinație | `email-warm-document` | **Runtime:** **`email:warm:document`** — [`../../../neurons/E2/email--warm--document.md`](../../../neurons/E2/email--warm--document.md); **Registry:** `EMAIL_WARM_DOCUMENT`. Semantica efectivă a cozii (tracking Resend etc.) este în contractul neuron, nu în muchia din export. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

În graful de planificare, după (sau în paralel planificat cu) operația modelată la `email-cold-campaign-pause`, traseul **`email-warm-document`** apare ca succesor prin dependență **dependency**: ordonare DAG între ramura cold (pauză campanie) și ramura warm „document”. **Dovadă muchie:** câmpurile v2 §7 pentru acest `SYNAPSE`. **Nedovedit de export:** payload, retry, safety, telemetrie per muchie — vezi statusuri mai jos. **Risc reconciliere:** numele „document” vs comportamentul real al cozii — documentat în contractul neuron `email:warm:document`.

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

- **Runtime (ADR-0001):** capete mapate la cozile de mai sus în `queue-registry.ts`.
- **Semantic (ADR-0002):** `e2:email:cold-campaign-pause` → `e2:email:warm-document` (vezi `NEURON_MATRIX.csv` / catalog).
- **Planificare:** etichetele `email-cold-campaign-pause` / `email-warm-document` sunt noduri din export; dacă apar divergențe față de registry, prevală evidența registry + contract neuron.

## Limite și reconcilieri

- Nu se inferă din muchie conținutul job-urilor sau ordinea runtime efectivă în afara codului workers.
- Detalii operaționale cold/warm: contractele E2 citate.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-campaign-pause-email-warm-document\``.
