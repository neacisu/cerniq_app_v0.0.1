# Sinapsă `winback-trigger-weather-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `winback-trigger-weather-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/winback-trigger-weather/winback-trigger-weather-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `winback-trigger-weather` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `winback-trigger-weather` | Nod de traseu în graf. **Matrix / neuron:** [`../../../neurons/E5/winback--trigger--weather.md`](../../../neurons/E5/winback--trigger--weather.md) — `winback:trigger:weather` (E5, winback). Contractul neuron documentează **neconcordanță runtime:** nu există coadă unică `winback:trigger:weather` în `queue-registry.ts`; lanțul apropiat în cod este `alerts:weather:monitor` → `alerts:weather:match` → `alerts:campaign:trigger`. Graful rămâne autoritate pentru **topologie planificată**. |
| Destinație (graf) | `e5-winback` | Agregat de **familie winback E5** în planificare; nu este o singură coadă executabilă și **nu** există un fișier `contracts/neurons/...` unic pentru eticheta agregată `e5-winback`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** leagă traseul **winback-trigger-weather** de nucleul de familie **`e5-winback`**. În registrul v2 §7 descrierea confirmată este **„specializează familia”**: planificarea ancorează traseul în familia semantică winback E5, fără a fixa în export handler unic, payload sau ordinea mesajelor în cozi.

## Sinapse dependență în același traseu

În acest director, muchiile **`dependency`** din v2 §7 leagă sursa `winback-trigger-weather` de neuroni HITL / dashboard (câte un fișier contract per destinație): `winback-trigger-weather-hitl-dashboard-metrics.md`, `winback-trigger-weather-hitl-dashboard-sync.md`, `winback-trigger-weather-hitl-task-create.md`, `winback-trigger-weather-hitl-task-expire-check.md`, `winback-trigger-weather-hitl-task-nps-followup.md`, `winback-trigger-weather-hitl-task-resolve.md`.

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

- **Planificare:** v2 §7 — `winback-trigger-weather` → `e5-winback`.
- **Runtime (ADR-0001):** pentru slug-ul graf `winback-trigger-weather`, potrivirea la cozi este **nededusă 1:1** din export; vezi reconcilierea din [`winback--trigger--weather.md`](../../../neurons/E5/winback--trigger--weather.md).
- **Semantic (ADR-0002):** `nodeKey` / etapă pentru capetele operaționale se iau din catalog — eticheta agregată **`e5-winback`** nu se echivalează automat cu un singur `nodeKey`.

## Limite și reconcilieri

- **Slug graf vs cozi BullMQ:** convenții diferite; execuția concretă cere verificare în registry și în contractul neuron sursă.
- Nu inventa schemă payload, retry, safety sau telemetrie per-muchie acolo unde v2 marchează absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`winback-trigger-weather-family\``.
