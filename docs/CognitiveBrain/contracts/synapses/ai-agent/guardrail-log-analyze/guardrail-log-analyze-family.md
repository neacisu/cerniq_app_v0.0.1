# Sinapsă `guardrail-log-analyze-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-log-analyze-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-log-analyze/guardrail-log-analyze-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-log-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `guardrail-log-analyze` | **Planificare:** traseu în graf. **Matrix:** rând `guardrail:log:analyze` (E3, `guardrails`) → [`../../../neurons/E3/guardrail--log--analyze.md`](../../../neurons/E3/guardrail--log--analyze.md). **Evidență repo:** la auditul din contractul neuron, **lipsesc** procesor BullMQ și literal **`guardrail:log:analyze`** în `queue-registry.ts`; **necesită reconciliere graf ↔ registry** înainte de a interpreta sursa ca execuție canonică pe această coadă. |
| Țintă | `e3-guardrails` | Nod **agregat** de planificare pentru familia guardrail E3; nu este o coadă în registry. Vezi [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **default** leagă traseul `guardrail-log-analyze` de agregatul `e3-guardrails`. v2 descrie **„specializează familia”**; exportul nu precizează cum analiza logurilor (neuron marcat cu gap în repo) se aliniază familiei guardrail. Muchia rămâne **structură de planificare exportată**; starea runtime a sursei este în contractul [`guardrail--log--analyze.md`](../../../neurons/E3/guardrail--log--analyze.md).

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

- **Runtime (ADR-0001):** **ținta** agregată `e3-guardrails` nu mapă direct la `QUEUES`. **Sursa** `guardrail:log:analyze` — **gap** la nivel de registry documentat în contractul neuron.
- **Semantic (ADR-0002):** catalog — vezi gap în [`guardrail--log--analyze.md`](../../../neurons/E3/guardrail--log--analyze.md).
- **Planificare:** specializare de familie în graf; nu garantează prin ea însăși existența handlerului sursă în runtime.

## Limite și reconcilieri

- Orice dependență downstream față de o coadă neînregistrată trebuie tratată ca **planificare vs implementare**, nu ca dovadă de job executabil.
- Fără invenție payload/retry/safety peste v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-log-analyze-family\``.
