# Sinapsă `metrics-llm-usage-aggregate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `metrics-llm-usage-aggregate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/metrics-llm-usage-aggregate/metrics-llm-usage-aggregate-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `metrics-llm-usage-aggregate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `metrics-llm-usage-aggregate` | Nod de traseu în graf. **Matrix / neuron:** [`../../../neurons/E3/metrics--llm-usage--aggregate.md`](../../../neurons/E3/metrics--llm-usage--aggregate.md) — `metrics:llm-usage:aggregate` (E3, ops). Contractul neuron documentează **gap runtime** la data auditului: fără intrare în catalog pentru acest `v2_queue`, fără literal în `queue-registry.ts`, fără worker mapat sub același nume — **neconcordanță graf ↔ execuție** până la reconciliere. |
| Destinație (graf) | `e3-ops` | Agregat **familie ops E3** în planificare; nu este o singură coadă executabilă și **nu** există un fișier neuron unic pentru eticheta agregată `e3-ops`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** leagă traseul **metrics-llm-usage-aggregate** de nucleul de familie **`e3-ops`**. v2 §7: descrierea confirmată este **„specializează familia”** — ancorare în familia semantică ops E3 fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei.

## Sinapse dependență în același traseu

În acest director există doar manifestul **`metrics-llm-usage-aggregate-family.md`**; nu sunt definite muchii `dependency` suplimentare la nivel de contract sinapsă în același folder (conform registrului v2 §7 pentru acest `synapse_id`).

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

- **Planificare:** v2 §7 — `metrics-llm-usage-aggregate` → `e3-ops`.
- **Runtime (ADR-0001):** **nu** se poate afirma din export singur că există coada **`metrics:llm-usage:aggregate`** în registry — vezi [`metrics--llm-usage--aggregate.md`](../../../neurons/E3/metrics--llm-usage--aggregate.md).
- **Semantic (ADR-0002):** lipsă `nodeKey` verificat pentru acest `v2_queue` la auditul citat; eticheta **`e3-ops`** rămâne agregat de graf.

## Limite și reconcilieri

- **Rol destinație (denumire):** v2 descrie neuronul ca agregare metrici legate de utilizare LLM, fără a impune din sinapsa `default` un contract de payload sau un handler; metrici similare pot exista pe alte căi în cod — vezi neuron.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`metrics-llm-usage-aggregate-family\``.
