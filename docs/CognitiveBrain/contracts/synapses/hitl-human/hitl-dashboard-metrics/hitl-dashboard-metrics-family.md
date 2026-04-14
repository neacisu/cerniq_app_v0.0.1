# Sinapsă `hitl-dashboard-metrics-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `hitl-dashboard-metrics-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/hitl-dashboard-metrics/hitl-dashboard-metrics-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `hitl-dashboard-metrics` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `hitl-dashboard-metrics` | **Planificare (graf).** **Neuron (contract):** [`../../../neurons/E5/hitl--dashboard--metrics.md`](../../../neurons/E5/hitl--dashboard--metrics.md). **v2:** secțiunea NEURON pentru `hitl:dashboard:metrics` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L8567–L8587). **Runtime (ADR-0001):** contractul neuron raportează **fără** literal `hitl:dashboard:metrics` în `queue-registry.ts` la audit; **ADR e5** [`../../../../adr/families/e5/hitl.md`](../../../../adr/families/e5/hitl.md) notează gap între **6** neuroni graf HITL E5 și **2** cozi `hitl:*` în registry. |
| Destinație (graf) | `e5-hitl` | Agregat familie **`hitl`** etapa **E5**. **v2:** [ADR-FAMILY-e5-hitl](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e5/hitl.md`](../../../../adr/families/e5/hitl.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **hitl-dashboard-metrics** sub **`e5-hitl`**. v2: **„specializează familia”**. Descrierea operațională din v2 (HumanNeuron, OODA HITL) **nu** este contrazisă aici; **conectarea** la o coadă executabilă și worker **este** delegată contractului neuron și registry, unde gap-ul este documentat.

## Muchii planificate din alte trasee (către acest nod)

Trasee **lifecycle-growth** (winback) → `hitl-dashboard-metrics` (v2 §7), ex.: [`../../lifecycle-growth/winback-campaign-enroll/winback-campaign-enroll-hitl-dashboard-metrics.md`](../../lifecycle-growth/winback-campaign-enroll/winback-campaign-enroll-hitl-dashboard-metrics.md), [`../../lifecycle-growth/winback-step-execute/winback-step-execute-hitl-dashboard-metrics.md`](../../lifecycle-growth/winback-step-execute/winback-step-execute-hitl-dashboard-metrics.md), [`../../lifecycle-growth/winback-trigger-subsidy/winback-trigger-subsidy-hitl-dashboard-metrics.md`](../../lifecycle-growth/winback-trigger-subsidy/winback-trigger-subsidy-hitl-dashboard-metrics.md), [`../../lifecycle-growth/winback-trigger-weather/winback-trigger-weather-hitl-dashboard-metrics.md`](../../lifecycle-growth/winback-trigger-weather/winback-trigger-weather-hitl-dashboard-metrics.md).

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | Gap documentat față de coada v2 — vezi contract neuron; cozi HITL E5 cunoscute în registry: `hitl:winback:review`, `hitl:complaint:review`. |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — `hitl:dashboard:metrics`, fără `nodeKey`/catalog populate. |
| **Planificare (export)** | v2 §7 — `hitl-dashboard-metrics` → `e5-hitl`, tip `default`. |

## Limite și reconcilieri

- **UI-only vs coadă:** ADR e5 permite interpretarea unor noduri dashboard ca neînregistrate încă; nu se afirmă aici mecanismul concret fără cod.
- Fără completări inventate despre metrici sau sincronizare.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`hitl-dashboard-metrics-family\``.
