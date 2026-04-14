# Sinapsă `human-takeover-initiate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `human-takeover-initiate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/human-takeover-initiate/human-takeover-initiate-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `human-takeover-initiate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `human-takeover-initiate` | **Planificare (graf):** nod pentru inițiere preluare umană. **v2_queue / catalog:** `human:takeover:initiate`, `e2:human:takeover-initiate`. Contract neuron: [`../../../neurons/E2/human--takeover--initiate.md`](../../../neurons/E2/human--takeover--initiate.md). **Runtime (ADR-0001):** `HUMAN_TAKEOVER_INITIATE` în `queue-registry.ts` — vezi contract pentru dovezi worker. |
| Destinație (graf) | `e2-human` | Agregat de **familie** `human` în etapa E2 (plan export). Nu este o singură coadă executabilă. v2: [`### ADR-FAMILY-e2-human`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR: [`../../../adr/families/e2/human.md`](../../../adr/families/e2/human.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **human-takeover-initiate** sub agregatul **`e2-human`**. v2 descrie destinația ca **„specializează familia”**: în planificare, inițierea takeover-ului uman este clasificată în familia `human` E2, aliniată politicii de guvernanță pentru acel agregat. Comportamentul operațional (journey, review, `sequence:stop`) este în **contractul neuron** și în workerii citați acolo, nu în câmpurile sinapsei din export.

## Sinapse dependență în același traseu

Nu există alte fișiere sinapsă în acest director; traseul conține **doar** manifestul `*-family.md`.

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
| **Runtime (ADR-0001)** | Coadă executabilă și worker — [`../../../neurons/E2/human--takeover--initiate.md`](../../../neurons/E2/human--takeover--initiate.md). |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — intrare `human:takeover:initiate` la **L78** (fișier). |
| **Planificare** | v2 §7 — `human-takeover-initiate` → `e2-human`, tip `default`. |

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs runtime:** nodul `human-takeover-initiate` se mapează la contracte cu `human:takeover:initiate` / `e2:human:takeover-initiate` — detalii în neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`human-takeover-initiate-family\``.
