# Sinapsă `q-email-cold-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-email-cold-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-email-cold/q-email-cold-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-email-cold` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `q-email-cold` | Traseu în graf; [`../../../neurons/E2/q--email--cold.md`](../../../neurons/E2/q--email--cold.md). **Runtime (ADR-0001):** `q:email:cold` (`QUEUES.EMAIL_COLD`). **Semantic (ADR-0002):** `e2:email:cold-send`. |
| Destinație (graf) | `e2-email-cold` | Nod agregat **familie email-cold** E2; vezi [`../../../../adr/families/e2/email-cold.md`](../../../../adr/families/e2/email-cold.md) și v2 `ADR-FAMILY-e2-email-cold`. Nu este o singură coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **coadă trimitere email cold** sub agregatul **`e2-email-cold`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; operațiunea (Instantly, `communication_log`, garduri ADR) este la neuron și în cod.

## Sinapse dependență în același traseu

[`q-email-cold-email-warm-document.md`](q-email-cold-email-warm-document.md), [`q-email-cold-email-warm-proforma.md`](q-email-cold-email-warm-proforma.md), [`q-email-cold-email-warm-send.md`](q-email-cold-email-warm-send.md).

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

- **Runtime (ADR-0001):** sursa are coadă în registry; `e2-email-cold` este agregat de familie, nu intrare `QUEUES`.
- **Semantic (ADR-0002):** `e2:email:cold-send`, swimlane `fiscal-execution` — vezi catalog / contract neuron.
- **Planificare:** v2 §7 — `q-email-cold` → `e2-email-cold`.

## Limite și reconcilieri

- În v2 există și alte intrări pentru fluxuri cold (ex. alias `email:cold:add-to-campaign`) — vezi contract neuron pentru mapare încrucișată; sinapsa de față privește doar **`q-email-cold-family`**.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-email-cold-family\``.
