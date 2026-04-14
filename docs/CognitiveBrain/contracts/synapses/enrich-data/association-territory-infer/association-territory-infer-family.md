# Sinapsă `association-territory-infer-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-territory-infer-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-territory-infer/association-territory-infer-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-territory-infer` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `association-territory-infer` | Traseu în graf; contract neuron: [`../../../neurons/E5/association--territory--infer.md`](../../../neurons/E5/association--territory--infer.md). **Runtime (ADR-0001):** neuronul documentează **fără** literal `association:territory:infer` în registry; apropiere semantică cu **C17** / **G42** este **distinctă** (vezi neuron). **Semantic (ADR-0002):** E5 / `graph-community`. |
| Destinație (graf) | `e5-graph-community` | Agregat familie **graph-community** E5. Vezi [`../../../adr/families/e5/graph-community.md`](../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **association-territory-infer** sub **`e5-graph-community`**. v2: **„specializează familia”**. În neuron, teritoriul este **inferat în v2** ca rol, dar **runtime** folosește unități cu alte nume de coadă — nu se confundă agregatul de planificare cu o singură coadă.

## Sinapse dependență în același traseu

[`association-territory-infer-geo-cluster-analyze.md`](association-territory-infer-geo-cluster-analyze.md), [`association-territory-infer-geo-delivery-optimize.md`](association-territory-infer-geo-delivery-optimize.md), [`association-territory-infer-geo-neighbor-find.md`](association-territory-infer-geo-neighbor-find.md), [`association-territory-infer-geo-territory-map.md`](association-territory-infer-geo-territory-map.md), [`association-territory-infer-geo-weather-correlate.md`](association-territory-infer-geo-weather-correlate.md).

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

- **Runtime (ADR-0001):** `e5-graph-community` nu este cheie `QUEUES`; sursa necesită reconciliere multi-coadă documentată în neuron.
- **Semantic (ADR-0002):** vezi contract neuron și catalog pentru C17/G42.
- **Planificare:** v2 §7 — `association-territory-infer` → `e5-graph-community`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Triplă autoritate:** graful spune `association-territory-infer`; codul poate expune `geo:territory:calculate` / `association:coverage:update` — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-territory-infer-family\``.
