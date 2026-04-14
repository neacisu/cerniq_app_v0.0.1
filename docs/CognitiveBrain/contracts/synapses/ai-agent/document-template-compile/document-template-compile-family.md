# Sinapsă `document-template-compile-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-template-compile-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-template-compile/document-template-compile-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-template-compile` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `document-template-compile` | **Runtime:** `E3_DOCUMENT_TEMPLATE_COMPILE` → **`document:template:compile`** — [`../../../neurons/E3/document--template--compile.md`](../../../neurons/E3/document--template--compile.md) (I54, Handlebars). |
| Destinație (graf) | `e3-fiscal-docs` | Agregat **fiscal-docs** în planificare. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** leagă traseul de **compilare template** de nucleul **`e3-fiscal-docs`**. v2: **„specializează familia”**; fără payload în registrul sinapsei.

## Sinapse dependență în același traseu

[`document-template-compile-channel-email-send.md`](document-template-compile-channel-email-send.md), [`document-template-compile-channel-routing-decide.md`](document-template-compile-channel-routing-decide.md), [`document-template-compile-channel-whatsapp-send.md`](document-template-compile-channel-whatsapp-send.md).

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

- **Runtime (ADR-0001):** I54 înregistrat cu coada din registry — vezi contract.
- **Semantic (ADR-0002):** `e3:document:template-compile`, tip procedural în catalog (detalii în contract).
- **Planificare:** familie fiscal-docs agregată.

## Limite și reconcilieri

- Slug `document-template-compile` vs `document:template:compile`.
- Nu extindeți sinapsa cu comportament Handlebars — rămâne la nivel declarativ v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-template-compile-family\``.
