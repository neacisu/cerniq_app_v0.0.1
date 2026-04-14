# Sinapsă `webhook-revolut-ingest-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `webhook-revolut-ingest-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/webhook-revolut-ingest/webhook-revolut-ingest-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `webhook-revolut-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `webhook-revolut-ingest` | **Contract:** [`../../../neurons/E4/webhook--revolut--ingest.md`](../../../neurons/E4/webhook--revolut--ingest.md). **Runtime (ADR-0001):** coada executabilă este **`revolut:webhook:ingest`** (nu șirul graf `webhook:revolut:ingest`) — vezi contract neuron pentru reconciliere A1. |
| Destinație (graf) | `e4-cash` | **Nod agregat:** familia **cash** E4. **ADR:** [`../../../../adr/families/e4/cash.md`](../../../../adr/families/e4/cash.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează **ingest-ul webhook Revolut** sub subgraful **`e4-cash`** în planificare. v2: **„specializează familia”**.

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

- **Runtime:** worker E4 postsale; `e4-cash` este agregat planificare, nu coadă unică.
- **Semantic:** `e4:revolut:webhook-ingest` — catalog (vezi contract pentru tensiuni v2 vs catalog).
- **Planificare:** v2 §7 — `webhook-revolut-ingest` → `e4-cash`.

## Limite și reconcilieri

- **Triplă autoritate:** ordinea cuvintelor în numele cozii graf vs runtime este documentată obligatoriu în contractul neuron sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`webhook-revolut-ingest-family\``.
