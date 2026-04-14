# Sinapsă `guardrail-stock-verify-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-stock-verify-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-stock-verify/guardrail-stock-verify-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-stock-verify` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `guardrail-stock-verify` | Traseu în graf; **coada intenționată** `guardrail:stock:verify` — [`../../../neurons/E3/guardrail--stock--verify.md`](../../../neurons/E3/guardrail--stock--verify.md) documentează absența din `workers/shared/src/queue-registry.ts` și din `cognitive-node-catalog.ts` (gap față de `guardrail:sku:validate`). Rând CSV: `queue_in_registry` = `no`. |
| Destinație (graf) | `e3-guardrails` | Agregat de **familie** E3 în planificare (etichetă de graf), nu o singură coadă; swimlane semantic `guardrails` / neuroni Guardrail din etapa 3. Fără fișier neuron unic pentru etichetă — mapare prin catalog și [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul `guardrail-stock-verify` sub agregatul `e3-guardrails` în topologia planificată. **Nu** pretinde acest contract că `guardrail:stock:verify` este coadă executabilă în `queue-registry.ts` — contractul neuron al sursei documentează gap-ul; `e3-guardrails` nu este `nodeKey` sau nume de coadă în registry.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `guardrail:stock:verify` **lipsește** din `QUEUES` în `queue-registry.ts`. Agregatul `e3-guardrails` nu este nume de coadă.
- **Semantic (ADR-0002):** **fără** `nodeKey` în catalog pentru `guardrail:stock:verify` (vezi contractul neuron); nu se folosește descrierea `e3:guardrail:stock-check` pentru această coadă. Agregatul din graf nu se echivalează cu un singur `nodeKey`.
- **Planificare:** muchie `default` de specializare de familie; fără payload/retry din export.

## Limite și reconcilieri

- Slug graf vs coadă (`guardrail-stock-verify` vs `guardrail:stock:verify`).
- Nu inventa detalii absent din v2 §7 pentru această muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-stock-verify-family\``.
