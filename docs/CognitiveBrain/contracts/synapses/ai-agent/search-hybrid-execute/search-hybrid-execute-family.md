# Sinapsă `search-hybrid-execute-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-hybrid-execute-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-hybrid-execute/search-hybrid-execute-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-hybrid-execute` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `search-hybrid-execute` | **Planificare:** slug graf agregat. **Contract:** [`../../../neurons/E3/search--hybrid--execute.md`](../../../neurons/E3/search--hybrid--execute.md) — capabilitate **agregată**; **fără** coadă unică `search:hybrid:execute` în `queue-registry.ts`; execuția efectivă este **B7–B10** (`search:query:rewrite`, `search:vector:execute`, `search:bm25:execute`, `search:rrf:fuse`). |
| Destinație (graf) | `e3-product-search` | Agregat **product-search** (E3); nu o coadă unică. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează traseul **execuție căutare hibridă (agregat planificare)** sub **`e3-product-search`**. v2: **„specializează familia”** — fără detalii de orchestrare B7–B10 în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`search-hybrid-execute-ai-agent-generate.md`](search-hybrid-execute-ai-agent-generate.md), [`search-hybrid-execute-ai-agent-orchestrate.md`](search-hybrid-execute-ai-agent-orchestrate.md), [`search-hybrid-execute-ai-agent-response-generate.md`](search-hybrid-execute-ai-agent-response-generate.md), [`search-hybrid-execute-ai-context-build.md`](search-hybrid-execute-ai-context-build.md), [`search-hybrid-execute-ai-feedback-collect.md`](search-hybrid-execute-ai-feedback-collect.md), [`search-hybrid-execute-ai-intent-classify.md`](search-hybrid-execute-ai-intent-classify.md), [`search-hybrid-execute-ai-prompt-optimize.md`](search-hybrid-execute-ai-prompt-optimize.md), [`search-hybrid-execute-ai-tool-execute.md`](search-hybrid-execute-ai-tool-execute.md), [`search-hybrid-execute-mcp-resource-load.md`](search-hybrid-execute-mcp-resource-load.md), [`search-hybrid-execute-mcp-session-manage.md`](search-hybrid-execute-mcp-session-manage.md), [`search-hybrid-execute-mcp-tool-register.md`](search-hybrid-execute-mcp-tool-register.md), [`search-hybrid-execute-sentiment-trend-analyze.md`](search-hybrid-execute-sentiment-trend-analyze.md).

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

- **Runtime (ADR-0001):** cozi atomice B7–B10 în registry; **nu** o singură intrare `search:hybrid:execute`.
- **Semantic (ADR-0002):** `search:hybrid:execute` în Matrix ca rol agregat; sub-neuroni `e3:search:*` în catalog — vezi contract neuron.
- **Planificare:** nucleu product-search agregat (`e3-product-search`).

## Limite și reconcilieri

- Slug `search-hybrid-execute` (graf) nu se mapează 1:1 la un worker; reconciliere obligatorie cu B7–B10.
- Nu inventa payload / retry / safety / telemetrie dincolo de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-hybrid-execute-family\``.
