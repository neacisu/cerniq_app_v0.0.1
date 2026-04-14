# Sinapsă `hitl-dashboard-sync-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `hitl-dashboard-sync-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/hitl-dashboard-sync/hitl-dashboard-sync-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `hitl-dashboard-sync` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `hitl-dashboard-sync` | **Planificare (graf).** **Neuron (contract):** [`../../../neurons/E5/hitl--dashboard--sync.md`](../../../neurons/E5/hitl--dashboard--sync.md). **v2:** secțiunea NEURON pentru `hitl:dashboard:sync` — [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (L8589–L8609). **Runtime (ADR-0001):** contractul neuron: **fără** literal în `queue-registry.ts` la audit; vezi **ADR e5** [`../../../../adr/families/e5/hitl.md`](../../../../adr/families/e5/hitl.md) pentru gap registry vs export. |
| Destinație (graf) | `e5-hitl` | Agregat familie **`hitl`** etapa **E5**. **v2:** [ADR-FAMILY-e5-hitl](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). **ADR:** [`../../../../adr/families/e5/hitl.md`](../../../../adr/families/e5/hitl.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **hitl-dashboard-sync** sub **`e5-hitl`**. v2: **„specializează familia”**. În planificare, nodul este un punct HITL E5 pentru sincronizare dashboard; **detaliile** de date, frecvență sau canal **nu** sunt în câmpurile muchiei — exportul nu le encodează.

## Muchii planificate din alte trasee (către acest nod)

[`../../lifecycle-growth/winback-campaign-enroll/winback-campaign-enroll-hitl-dashboard-sync.md`](../../lifecycle-growth/winback-campaign-enroll/winback-campaign-enroll-hitl-dashboard-sync.md), [`../../lifecycle-growth/winback-step-execute/winback-step-execute-hitl-dashboard-sync.md`](../../lifecycle-growth/winback-step-execute/winback-step-execute-hitl-dashboard-sync.md), [`../../lifecycle-growth/winback-trigger-subsidy/winback-trigger-subsidy-hitl-dashboard-sync.md`](../../lifecycle-growth/winback-trigger-subsidy/winback-trigger-subsidy-hitl-dashboard-sync.md), [`../../lifecycle-growth/winback-trigger-weather/winback-trigger-weather-hitl-dashboard-sync.md`](../../lifecycle-growth/winback-trigger-weather/winback-trigger-weather-hitl-dashboard-sync.md).

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
| **Runtime (ADR-0001)** | Gap coadă `hitl:dashboard:sync` — contract neuron; compară cozi HITL E5 înregistrate (`hitl:winback:review`, `hitl:complaint:review`). |
| **Semantic (ADR-0002)** | **NEURON_MATRIX.csv** — `hitl:dashboard:sync`, fără `nodeKey`/catalog populate. |
| **Planificare (export)** | v2 §7 — `hitl-dashboard-sync` → `e5-hitl`, tip `default`. |

## Limite și reconcilieri

- **Slug graf** `hitl-dashboard-sync` **nu** echivalează automat cu o coadă BullMQ activă — vezi contract neuron și ADR.
- Fără presupuneri despre sursa de date sau conflict resolution.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`hitl-dashboard-sync-family\``.
