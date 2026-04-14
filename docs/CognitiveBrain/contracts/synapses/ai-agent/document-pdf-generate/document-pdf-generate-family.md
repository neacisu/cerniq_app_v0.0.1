# Sinapsă `document-pdf-generate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-pdf-generate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-pdf-generate/document-pdf-generate-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-pdf-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `document-pdf-generate` | **Runtime:** `E3_DOCUMENT_PDF_GENERATE` → **`document:pdf:generate`** — [`../../../neurons/E3/document--pdf--generate.md`](../../../neurons/E3/document--pdf--generate.md). |
| Destinație (graf) | `e3-fiscal-docs` | Agregat **fiscal-docs** (E3) în planificare; nu o coadă unică. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** poziționează traseul `document-pdf-generate` sub **`e3-fiscal-docs`**. v2: **„specializează familia”**; fără payload sau ordine de execuție detaliată în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`document-pdf-generate-channel-email-send.md`](document-pdf-generate-channel-email-send.md), [`document-pdf-generate-channel-routing-decide.md`](document-pdf-generate-channel-routing-decide.md), [`document-pdf-generate-channel-whatsapp-send.md`](document-pdf-generate-channel-whatsapp-send.md).

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

- **Runtime (ADR-0001):** I51 / `document:pdf:generate` — vezi contract neuron (Oblio fetch, nu Handlebars local).
- **Semantic (ADR-0002):** `e3:document:pdf-generate` în catalog — detalii în contract.
- **Planificare:** nucleu fiscal-docs; nu echivalați automat cu toate cozile familiei.

## Limite și reconcilieri

- **v2 vs repo:** descrierea v2 poate menționa Handlebars; implementarea citită în contractul neuron este altă — reconciliere la nivel neuron, nu inventată în sinapsa de familie.
- Slug `document-pdf-generate` vs `document:pdf:generate`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-pdf-generate-family\``.
