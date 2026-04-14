# Sinapsă `guardrail-stock-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-stock-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-stock-check/guardrail-stock-check-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-stock-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `guardrail-stock-check` | Traseu în graf; runtime: coadă executabilă **`guardrail:stock:check`** (`QUEUES.E3_GUARDRAIL_STOCK_CHECK`, `workers/shared/src/queue-registry.ts`, ADR-0001) — [`../../../neurons/E3/guardrail--stock--check.md`](../../../neurons/E3/guardrail--stock--check.md). |
| Destinație (graf) | `e3-guardrails` | Agregat de **familie** E3 în planificare (etichetă de graf), nu o singură coadă; swimlane semantic `guardrails` / neuroni Guardrail din etapa 3. Fără fișier neuron unic pentru etichetă — mapare prin catalog și [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul `guardrail-stock-check` sub agregatul `e3-guardrails` în topologia planificată. Capătul operațional verificabil al sursei este `guardrail:stock:check`; `e3-guardrails` nu este `nodeKey` sau nume de coadă în registry.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `E3_GUARDRAIL_STOCK_CHECK` → `guardrail:stock:check`. `e3-guardrails` nu apare ca nume de coadă.
- **Semantic (ADR-0002):** `e3:guardrail:stock-check` / `guardrail:stock:check` — GuardrailNeuron, swimlane `ai-reasoning`, etapa 3 (~L2161–2168). Agregatul din graf nu se echivalează cu un singur `nodeKey`.
- **Planificare:** muchie `default` de specializare de familie; fără payload/retry din export.

## Limite și reconcilieri

- Slug graf vs coadă (`guardrail-stock-check` vs `guardrail:stock:check`).
- Nu inventa detalii absent din v2 §7 pentru această muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-stock-check-family\``.
