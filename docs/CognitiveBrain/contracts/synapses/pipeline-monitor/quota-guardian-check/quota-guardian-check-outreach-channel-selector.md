# Sinapsă `quota-guardian-check-outreach-channel-selector`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `quota-guardian-check-outreach-channel-selector` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/quota-guardian-check/quota-guardian-check-outreach-channel-selector.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `quota-guardian-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `quota-guardian-check` | **Contract:** [`../../../neurons/E2/quota--guardian--check.md`](../../../neurons/E2/quota--guardian--check.md). **Triplă autoritate:** v2 **`quota:guardian:check`**; runtime **`e2:quota:guardian-check`**. |
| Destinație (graf) | `outreach-channel-selector` | **Contract:** [`../../../neurons/E2/outreach--channel--selector.md`](../../../neurons/E2/outreach--channel--selector.md). **Triplă autoritate:** v2 **`outreach:channel:selector`**; [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) rând **89**; `nodeKey` **`e2:outreach:channel-selector`**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **quota-guardian-check** depinde canonic de **outreach-channel-selector**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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

- **Planificare:** v2 §7 — `quota-guardian-check` → `outreach-channel-selector`.
- **Semantic:** sursă **quota** **E2** (matrice rând **97**); destinație **E2** rând **89**.
- **Runtime:** vezi contractele neuron.

## Limite și reconcilieri

- Comportament operațional al **guardian check** (citire praguri, Lua, etc.) este în cod — vezi neuron sursă; muchia nu îl encodează.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`quota-guardian-check-outreach-channel-selector\``.
