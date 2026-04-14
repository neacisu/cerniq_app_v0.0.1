# Sinapsă `lead-assign-user-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `lead-assign-user-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/lead-assign-user/lead-assign-user-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `lead-assign-user` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `lead-assign-user` | **Contract:** [`../../../neurons/E2/lead--assign--user.md`](../../../neurons/E2/lead--assign--user.md). **Runtime (ADR-0001):** `QUEUES.LEAD_ASSIGN_USER` → `lead:assign:user` — vezi contract neuron. |
| Destinație (graf) | `e2-lead-fsm` | **Nod agregat (subgraf planificat):** familia **lead-fsm** în v2 — nu este un singur `nodeKey` / coadă BullMQ. **ADR:** [`../../../../adr/families/e2/lead-fsm.md`](../../../../adr/families/e2/lead-fsm.md). **Semantic (ADR-0002):** neuroni `lead-fsm` în catalog (ex. `e2:lead:assign-user`, `e2:lead:state-transition`) — reconciliere graf ↔ runtime pe fiecare muchie concretă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În graful de planificare, **`lead-assign-user`** este legat de **subgraful familiei `e2-lead-fsm`**: muchia **„specializează familia”** (formulare v2). Nu afirmă singură ordinea job-urilor sau payload-ul între cozi; trasabilitatea operațională rămâne pe contractele neuronilor din familie.

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

- **Runtime (ADR-0001):** sursa are coadă executabilă (`lead:assign:user`); ținta `e2-lead-fsm` este **etichetă de planificare**, nu nume de coadă din registry.
- **Semantic (ADR-0002):** familia lead-fsm / etapa E2 — vezi ADR și catalog.
- **Planificare:** legătură `default` către subgraf declarativ.

## Limite și reconcilieri

- **`e2-lead-fsm` vs cozi:** orice rutare concretă trebuie citită din muchii și contracte neuron, nu dedusă din singurul slug agregat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`lead-assign-user-family\``.
