# Sinapsă `guardrail-discount-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-discount-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-discount-check/guardrail-discount-check-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-discount-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `guardrail-discount-check` | **Planificare:** traseu în graf. **Matrix:** `guardrail:discount:check` (E3, `guardrails`) → [`../../../neurons/E3/guardrail--discount--check.md`](../../../neurons/E3/guardrail--discount--check.md). **Runtime (ADR-0001):** `QUEUES.E3_GUARDRAIL_DISCOUNT_CHECK` → **`guardrail:discount:check`**. |
| Destinație (graf) | `e3-guardrails` | Nod **agregat** de planificare pentru familia guardrail E3; nu este o coadă executabilă unică. Pentru neuroni `guardrails`, vezi [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **default** leagă traseul `guardrail-discount-check` de agregatul `e3-guardrails`. v2 descrie **„specializează familia”**; exportul nu precizează cum verificarea de discount (M73, logică în `guardrails.ts`) se raportează la toți neuroni guardrail. Detaliile operaționale ale sursei sunt în contractul [`guardrail--discount--check.md`](../../../neurons/E3/guardrail--discount--check.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursa pe **`guardrail:discount:check`**. Nodul `e3-guardrails` din graf **nu** apare ca literal în `QUEUES`.
- **Semantic (ADR-0002):** `e3:guardrail:discount-check` — vezi `cognitive-node-catalog.ts` (citire în contractul neuron).
- **Planificare:** specializare de familie în topologia exportată.

## Limite și reconcilieri

- Praguri și severitate din implementare (ex. `MIN_MARGIN_PERCENT`, `CRITICAL`) sunt în cod și contract neuron sursă, **nu** în registrul sinapsei v2 pentru această muchie `default`.
- Fără invenție payload/retry/safety peste textul v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-discount-check-family\``.
